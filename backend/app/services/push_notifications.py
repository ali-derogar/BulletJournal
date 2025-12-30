"""
Web Push Notification Service
Handles sending push notifications to subscribed browsers
"""
import json
import logging
from typing import Optional, Dict, Any
from pywebpush import webpush, WebPushException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.notification import PushSubscription

logger = logging.getLogger(__name__)


def send_web_push(
    db: Session,
    user_id: str,
    title: str,
    message: str,
    notification_type: str = "info",
    link: Optional[str] = None
) -> Dict[str, Any]:
    """
    Send web push notification to all subscriptions for a user

    Args:
        db: Database session
        user_id: Target user ID
        title: Notification title
        message: Notification message
        notification_type: Type (info, success, warning, error)
        link: Optional URL to navigate to

    Returns:
        Dict with success/failure counts
    """
    # Get all active subscriptions for the user
    subscriptions = db.query(PushSubscription).filter(
        PushSubscription.user_id == user_id
    ).all()

    if not subscriptions:
        logger.info(f"No push subscriptions found for user {user_id}")
        return {"sent": 0, "failed": 0, "expired": 0}

    # Prepare push payload
    payload = {
        "title": title,
        "body": message,
        "icon": "/icon-192x192.png",
        "badge": "/badge-72x72.png",
        "tag": notification_type,
        "data": {
            "url": link,
            "type": notification_type
        }
    }

    # Set requireInteraction for warnings and errors
    if notification_type in ["warning", "error"]:
        payload["requireInteraction"] = True

    sent_count = 0
    failed_count = 0
    expired_count = 0
    expired_subscriptions = []

    for subscription in subscriptions:
        try:
            # Prepare subscription info
            subscription_info = {
                "endpoint": subscription.endpoint,
                "keys": {
                    "p256dh": subscription.p256dh,
                    "auth": subscription.auth
                }
            }

            # Send push notification
            webpush(
                subscription_info=subscription_info,
                data=json.dumps(payload),
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims=settings.VAPID_CLAIMS
            )

            sent_count += 1
            logger.info(f"Push sent successfully to subscription {subscription.id}")

        except WebPushException as e:
            logger.error(f"WebPushException for subscription {subscription.id}: {e}")

            # Check if subscription is expired (410 Gone or 404 Not Found)
            if e.response and e.response.status_code in [404, 410]:
                expired_subscriptions.append(subscription)
                expired_count += 1
                logger.info(f"Subscription {subscription.id} marked for deletion (expired)")
            else:
                failed_count += 1

        except Exception as e:
            logger.error(f"Unexpected error sending push to subscription {subscription.id}: {e}")
            failed_count += 1

    # Clean up expired subscriptions
    for expired_sub in expired_subscriptions:
        try:
            db.delete(expired_sub)
            logger.info(f"Deleted expired subscription {expired_sub.id}")
        except Exception as e:
            logger.error(f"Error deleting expired subscription {expired_sub.id}: {e}")

    if expired_subscriptions:
        db.commit()

    result = {
        "sent": sent_count,
        "failed": failed_count,
        "expired": expired_count,
        "total_subscriptions": len(subscriptions)
    }

    logger.info(f"Push notification summary for user {user_id}: {result}")
    return result


def send_web_push_to_multiple_users(
    db: Session,
    user_ids: list[str],
    title: str,
    message: str,
    notification_type: str = "info",
    link: Optional[str] = None
) -> Dict[str, Any]:
    """
    Send web push notifications to multiple users

    Args:
        db: Database session
        user_ids: List of target user IDs
        title: Notification title
        message: Notification message
        notification_type: Type (info, success, warning, error)
        link: Optional URL to navigate to

    Returns:
        Dict with aggregated success/failure counts
    """
    total_sent = 0
    total_failed = 0
    total_expired = 0
    users_notified = 0

    for user_id in user_ids:
        result = send_web_push(
            db=db,
            user_id=user_id,
            title=title,
            message=message,
            notification_type=notification_type,
            link=link
        )

        if result["sent"] > 0:
            users_notified += 1

        total_sent += result["sent"]
        total_failed += result["failed"]
        total_expired += result["expired"]

    return {
        "users_notified": users_notified,
        "total_users": len(user_ids),
        "sent": total_sent,
        "failed": total_failed,
        "expired": total_expired
    }
