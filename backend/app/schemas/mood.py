from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class MoodInfoBase(BaseModel):
    id: str
    userId: str
    date: str
    rating: float
    dayScore: float = Field(default=0.0, alias='day_score')
    day_score: Optional[float] = 0.0
    notes: str
    waterIntake: Optional[int] = Field(default=0, alias='water_intake')
    water_intake: Optional[int] = 0
    studyMinutes: Optional[int] = Field(default=0, alias='study_minutes')
    study_minutes: Optional[int] = 0

class MoodInfoCreate(MoodInfoBase):
    pass

class MoodInfoUpdate(BaseModel):
    rating: Optional[float] = None
    day_score: Optional[float] = None
    notes: Optional[str] = None
    water_intake: Optional[int] = None
    study_minutes: Optional[int] = None

class MoodInfo(MoodInfoBase):
    createdAt: Optional[datetime] = Field(default=None, alias='created_at')
    created_at: Optional[datetime] = None
    updatedAt: Optional[datetime] = None
    deletedAt: Optional[datetime] = None

    class Config:
        from_attributes = True
        populate_by_name = True