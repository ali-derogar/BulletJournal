from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.sql import func
from app.db.session import Base

class DailyJournal(Base):
    __tablename__ = "daily_journals"

    id = Column(String, primary_key=True, index=True)
    userId = Column(String, name='user_id', nullable=False, index=True)
    date = Column(String, nullable=False, index=True)
    tasks = Column(Text, nullable=False, default="[]")  # JSON array of task IDs
    expenses = Column(Text, nullable=False, default="[]")  # JSON array of expense IDs
    sleep_id = Column(String, nullable=True)
    mood_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updatedAt = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deletedAt = Column(DateTime(timezone=True), nullable=True)