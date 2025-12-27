from sqlalchemy import Column, String, DateTime, Integer, Float, Text
from sqlalchemy.sql import func
from app.db.session import Base

class Goal(Base):
    __tablename__ = "goals"

    id = Column(String, primary_key=True, index=True)
    userId = Column(String, name='user_id', nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    type = Column(String, nullable=False)  # "yearly", "quarterly", "monthly", "weekly"

    # Period identification
    year = Column(Integer, nullable=False, index=True)
    quarter = Column(Integer, nullable=True)  # 1-4 for quarterly goals
    month = Column(Integer, nullable=True)   # 1-12 for monthly goals
    week = Column(Integer, nullable=True)    # ISO week number for weekly goals

    # Progress tracking
    targetValue = Column(Float, nullable=False)
    currentValue = Column(Float, default=0.0)
    unit = Column(String, nullable=False)  # Unit of measurement

    # Task linking
    linkedTaskIds = Column(Text, nullable=True)  # JSON array of task IDs

    # Status and metadata
    status = Column(String, nullable=False, default="active")  # "active", "completed", "failed", "paused"
    progressType = Column(String, nullable=False, default="manual")  # "manual", "task-linked"

    createdAt = Column(DateTime(timezone=True), server_default=func.now())
    updatedAt = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    completedAt = Column(DateTime(timezone=True), nullable=True)
