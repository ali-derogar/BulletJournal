from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone
import uuid
import logging

from app.db.session import get_db
from app.models.user import User
from app.models.notification import Notification, PushSubscription
from app.models.system_config import SystemConfig
from app.schemas.system_config import SystemConfigResponse
from app.auth.dependencies import get_current_active_user, get_current_admin
from app.core.roles import Role
from app.core.config import settings
from app.services.push_notifications import send_web_push, send_web_push_to_multiple_users
from app.services.websocket_manager import manager

router = APIRouter(prefix="/notifications", tags=["notifications"])
logger = logging.getLogger(__name__)


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
    notification.read_at = datetime.now(timezone.utc)
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
    ).update({"is_read": True, "read_at": datetime.now(timezone.utc)})
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


# ===== WEBSOCKET ENDPOINT =====

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str,
    token: str
):
    """
    WebSocket endpoint for real-time notifications

    Usage: ws://localhost:8000/api/notifications/ws/{user_id}?token={jwt_token}
    """
    # Authenticate the user via token
    try:
        # We need to validate the token manually since WebSocket doesn't support Depends
        from jose import jwt, JWTError
        from app.auth.auth import SECRET_KEY, ALGORITHM

        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            token_user_id: str = payload.get("sub")

            if token_user_id is None or token_user_id != user_id:
                logger.warning(f"WebSocket auth failed: token user_id {token_user_id} != requested {user_id}")
                await websocket.close(code=1008, reason="Unauthorized")
                return
        except JWTError as e:
            logger.warning(f"WebSocket JWT validation failed: {e}")
            await websocket.close(code=1008, reason="Invalid token")
            return

    except Exception as e:
        logger.error(f"WebSocket authentication error: {e}")
        await websocket.close(code=1011, reason="Authentication failed")
        return

    # Connect the user
    await manager.connect(websocket, user_id)

    try:
        # Send initial connection confirmation
        await websocket.send_json({
            "type": "connected",
            "message": "WebSocket connection established"
        })

        # Keep connection alive and listen for messages
        while True:
            try:
                # Receive messages from client (ping/pong for keepalive)
                data = await websocket.receive_text()

                if data == "ping":
                    await websocket.send_json({"type": "pong"})

            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"Error in WebSocket receive loop: {e}")
                break

    finally:
        manager.disconnect(websocket, user_id)


# ===== PUSH SUBSCRIPTION ENDPOINTS =====

@router.get("/vapid-public-key")
async def get_vapid_public_key():
    """Get VAPID public key for push notifications"""
    if not settings.VAPID_PUBLIC_KEY:
        raise HTTPException(status_code=503, detail="Push notifications are not configured")
    return {"publicKey": settings.VAPID_PUBLIC_KEY}


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
        existing.last_used = datetime.now(timezone.utc)
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

    # Send real-time WebSocket notifications to connected users
    websocket_sent = 0
    for user in target_users:
        try:
            await manager.send_notification_update(
                user_id=user.id,
                notification_id=notifications_created[target_users.index(user)],
                title=notification.title,
                message=notification.message,
                notification_type=notification.type,
                link=notification.link
            )
            websocket_sent += 1
        except Exception as e:
            logger.error(f"Error sending WebSocket notification to user {user.id}: {e}")

    # Send web push notifications to all target users
    user_ids = [user.id for user in target_users]
    push_result = send_web_push_to_multiple_users(
        db=db,
        user_ids=user_ids,
        title=notification.title,
        message=notification.message,
        notification_type=notification.type,
        link=notification.link
    )

    return {
        "message": f"Notification sent to {len(target_users)} users",
        "count": len(target_users),
        "notification_ids": notifications_created,
        "websocket_sent": websocket_sent,
        "push_notifications": push_result
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


@router.get("/config", response_model=SystemConfigResponse)
async def get_notification_config(
    db: Session = Depends(get_db)
):
    """Get system-wide notification configuration"""
    config = db.query(SystemConfig).filter(SystemConfig.key == "notification_prompt_message").first()
    if not config:
        # Return default if not set in DB
        return {
            "key": "notification_prompt_message",
            "value": "To receive AI-generated messages and important updates, please allow notification access.",
            "updated_at": datetime.now(timezone.utc)
        }
    return config
