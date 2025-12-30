from sqlalchemy import Column, String, DateTime, Boolean, Text
from sqlalchemy.sql import func
from app.db.session import Base

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)  # Target user
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String, nullable=False, default="info")  # info, success, warning, error
    link = Column(String, nullable=True)  # Optional link to navigate to
    is_read = Column(Boolean, nullable=False, default=False, index=True)
    is_muted = Column(Boolean, nullable=False, default=False)  # User muted this notification
    sent_by = Column(String, nullable=True)  # Admin/Superuser who sent it
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    read_at = Column(DateTime(timezone=True), nullable=True)


class PushSubscription(Base):
    """Store web push notification subscriptions"""
    __tablename__ = "push_subscriptions"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    endpoint = Column(Text, nullable=False, unique=True)
    p256dh = Column(Text, nullable=False)
    auth = Column(Text, nullable=False)
    user_agent = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_used = Column(DateTime(timezone=True), server_default=func.now())
