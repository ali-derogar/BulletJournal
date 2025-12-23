from sqlalchemy import Column, String, DateTime, Float, Integer
from sqlalchemy.sql import func
from app.db.session import Base

class SleepInfo(Base):
    __tablename__ = "sleep"

    id = Column(String, primary_key=True, index=True)
    userId = Column(String, name='user_id', nullable=False, index=True)
    date = Column(String, nullable=False, index=True)
    sleep_time = Column(String, nullable=True)
    wake_time = Column(String, nullable=True)
    hours_slept = Column(Float, nullable=False)
    quality = Column(Integer, nullable=False)  # 1-10 scale
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updatedAt = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deletedAt = Column(DateTime(timezone=True), nullable=True)