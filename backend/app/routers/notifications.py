from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import uuid

from app.db.session import get_db
from app.models.user import User
from app.models.notification import Notification, PushSubscription
from app.auth.dependencies import get_current_active_user, get_current_admin
from app.core.roles import Role

router = APIRouter(prefix="/notifications", tags=["notifications"])


# ===== SCHEMAS =====

class NotificationCreate(BaseModel):
    title: str
    message: str
    type: str = "info"  # info, success, warning, error
    link: Optional[str] = None


class NotificationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    type: str
    link: Optional[str]
    is_read: bool
    is_muted: bool
    sent_by: Optional[str]
    created_at: datetime
    read_at: Optional[datetime]

    class Config:
        from_attributes = True


class BulkNotificationCreate(BaseModel):
    title: str
    message: str
    type: str = "info"
    link: Optional[str] = None
    user_ids: Optional[List[str]] = None  # Specific users, or None for all
    role: Optional[str] = None  # Send to specific role: USER, ADMIN, SUPERUSER


class PushSubscriptionCreate(BaseModel):
    endpoint: str
    p256dh: str
    auth: str


class NotificationStats(BaseModel):
    total: int
    unread: int
    muted: int


# ===== USER ENDPOINTS =====

@router.get("/", response_model=List[NotificationResponse])
async def get_my_notifications(
    limit: int = 50,
    offset: int = 0,
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get current user's notifications"""
    query = db.query(Notification).filter(Notification.user_id == current_user.id)

    if unread_only:
        query = query.filter(Notification.is_read == False)

    notifications = query.order_by(desc(Notification.created_at)).limit(limit).offset(offset).all()
    return notifications


@router.get("/stats", response_model=NotificationStats)
async def get_notification_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get notification statistics for current user"""
    total = db.query(Notification).filter(Notification.user_id == current_user.id).count()
    unread = db.query(Notification).filter(
        and_(Notification.user_id == current_user.id, Notification.is_read == False)
    ).count()
    muted = db.query(Notification).filter(
        and_(Notification.user_id == current_user.id, Notification.is_muted == True)
    ).count()

    return {"total": total, "unread": unread, "muted": muted}


@router.patch("/{notification_id}/read")
async def mark_as_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Mark a notification as read"""
    notification = db.query(Notification).filter(
        and_(Notification.id == notification_id, Notification.user_id == current_user.id)
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = True
    notification.read_at = datetime.utcnow()
    db.commit()

    return {"message": "Notification marked as read"}


@router.patch("/read-all")
async def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Mark all notifications as read"""
    db.query(Notification).filter(
        and_(Notification.user_id == current_user.id, Notification.is_read == False)
    ).update({"is_read": True, "read_at": datetime.utcnow()})
    db.commit()

    return {"message": "All notifications marked as read"}


@router.patch("/{notification_id}/mute")
async def mute_notification(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Mute a notification"""
    notification = db.query(Notification).filter(
        and_(Notification.id == notification_id, Notification.user_id == current_user.id)
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_muted = True
    db.commit()

    return {"message": "Notification muted"}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a notification"""
    notification = db.query(Notification).filter(
        and_(Notification.id == notification_id, Notification.user_id == current_user.id)
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    db.delete(notification)
    db.commit()

    return {"message": "Notification deleted"}


# ===== PUSH SUBSCRIPTION ENDPOINTS =====

@router.post("/subscribe")
async def subscribe_to_push(
    subscription: PushSubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Subscribe to push notifications"""
    # Check if subscription already exists
    existing = db.query(PushSubscription).filter(
        PushSubscription.endpoint == subscription.endpoint
    ).first()

    if existing:
        # Update user_id if changed
        if existing.user_id != current_user.id:
            existing.user_id = current_user.id
        existing.last_used = datetime.utcnow()
        db.commit()
        return {"message": "Subscription updated", "id": existing.id}

    # Create new subscription
    new_subscription = PushSubscription(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        endpoint=subscription.endpoint,
        p256dh=subscription.p256dh,
        auth=subscription.auth
    )
    db.add(new_subscription)
    db.commit()

    return {"message": "Subscribed to push notifications", "id": new_subscription.id}


@router.delete("/unsubscribe")
async def unsubscribe_from_push(
    endpoint: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Unsubscribe from push notifications"""
    subscription = db.query(PushSubscription).filter(
        and_(PushSubscription.endpoint == endpoint, PushSubscription.user_id == current_user.id)
    ).first()

    if subscription:
        db.delete(subscription)
        db.commit()

    return {"message": "Unsubscribed from push notifications"}


# ===== ADMIN ENDPOINTS =====

@router.post("/send", status_code=status.HTTP_201_CREATED)
async def send_notification(
    notification: BulkNotificationCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Send notification to users (Admin/Superuser only)"""

    # Determine target users
    if notification.user_ids:
        # Send to specific users
        target_users = db.query(User).filter(User.id.in_(notification.user_ids)).all()
    elif notification.role:
        # Send to all users with specific role
        target_users = db.query(User).filter(User.role == notification.role).all()
    else:
        # Send to all users
        target_users = db.query(User).all()

    if not target_users:
        raise HTTPException(status_code=404, detail="No users found")

    # Create notifications for all target users
    notifications_created = []
    for user in target_users:
        new_notification = Notification(
            id=str(uuid.uuid4()),
            user_id=user.id,
            title=notification.title,
            message=notification.message,
            type=notification.type,
            link=notification.link,
            sent_by=admin.id
        )
        db.add(new_notification)
        notifications_created.append(new_notification.id)

    db.commit()

    return {
        "message": f"Notification sent to {len(target_users)} users",
        "count": len(target_users),
        "notification_ids": notifications_created
    }


@router.get("/admin/all")
async def get_all_notifications(
    limit: int = 100,
    offset: int = 0,
    user_id: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Get all notifications (Admin/Superuser only)"""
    query = db.query(Notification)

    if user_id:
        query = query.filter(Notification.user_id == user_id)

    total = query.count()
    notifications = query.order_by(desc(Notification.created_at)).limit(limit).offset(offset).all()

    return {
        "notifications": notifications,
        "total": total,
        "limit": limit,
        "offset": offset
    }


@router.get("/admin/stats")
async def get_admin_notification_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Get global notification statistics (Admin/Superuser only)"""
    total = db.query(Notification).count()
    total_unread = db.query(Notification).filter(Notification.is_read == False).count()
    total_muted = db.query(Notification).filter(Notification.is_muted == True).count()
    total_subscriptions = db.query(PushSubscription).count()

    return {
        "total_notifications": total,
        "total_unread": total_unread,
        "total_muted": total_muted,
        "total_push_subscriptions": total_subscriptions
    }
