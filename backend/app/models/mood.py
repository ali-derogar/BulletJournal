from sqlalchemy import Column, String, DateTime, Float, Integer, Text
from sqlalchemy.sql import func
from app.db.session import Base

class MoodInfo(Base):
    __tablename__ = "mood"

    id = Column(String, primary_key=True, index=True)
    userId = Column(String, nullable=False, index=True)
    date = Column(String, nullable=False, index=True)
    rating = Column(Float, nullable=False)  # Mood rating
    day_score = Column(Float, nullable=False)  # Overall day score
    notes = Column(Text, nullable=False, default="")
    water_intake = Column(Integer, nullable=False, default=0)  # Glasses of water
    study_minutes = Column(Integer, nullable=False, default=0)  # Study time in minutes
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updatedAt = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deletedAt = Column(DateTime(timezone=True), nullable=True)