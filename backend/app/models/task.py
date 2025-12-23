from sqlalchemy import Column, String, DateTime, Integer, Boolean, Float, Text
from sqlalchemy.sql import func
from app.db.session import Base

class Task(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True, index=True)
    userId = Column(String, name='user_id', nullable=False, index=True)
    date = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    status = Column(String, nullable=False)  # "todo", "in-progress", "done"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updatedAt = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deletedAt = Column(DateTime(timezone=True), nullable=True)

    # Time tracking fields
    spentTime = Column(Integer, default=0)  # Total time spent in minutes (single source of truth)
    timeLogs = Column(Text, nullable=True)  # JSON array of time log entries
    accumulated_time = Column(Integer, default=0)  # Legacy field for migration

    # Timer fields
    timer_running = Column(Boolean, default=False)
    timer_start = Column(DateTime(timezone=True), nullable=True)

    # Estimation and usefulness
    estimated_time = Column(Integer, nullable=True)  # Time in minutes
    is_useful = Column(Boolean, nullable=True)