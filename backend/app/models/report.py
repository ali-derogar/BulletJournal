from sqlalchemy import Column, String, DateTime, Text, Boolean
from sqlalchemy.sql import func
from app.db.session import Base

class Report(Base):
    """User-generated reports for inappropriate content"""
    __tablename__ = "reports"

    id = Column(String, primary_key=True, index=True)
    reporter_id = Column(String, nullable=False, index=True)  # User who reported
    reported_user_id = Column(String, nullable=False, index=True)  # Owner of content
    content_type = Column(String, nullable=False, index=True)  # "task", "journal", "goal", "profile"
    content_id = Column(String, nullable=False, index=True)  # ID of the reported item
    reason = Column(String, nullable=False)  # "spam", "inappropriate", "harassment", "other"
    description = Column(Text, nullable=True)  # Additional details from reporter
    status = Column(String, nullable=False, default="pending", index=True)  # "pending", "reviewed", "dismissed", "actioned"
    admin_notes = Column(Text, nullable=True)  # Admin's notes on the report
    reviewed_by = Column(String, nullable=True)  # Admin who reviewed
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
