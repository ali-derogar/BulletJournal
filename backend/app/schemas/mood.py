from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class MoodInfoBase(BaseModel):
    id: str
    user_id: str
    date: str
    rating: float
    day_score: float
    notes: str
    water_intake: int
    study_minutes: int

class MoodInfoCreate(MoodInfoBase):
    pass

class MoodInfoUpdate(BaseModel):
    rating: Optional[float] = None
    day_score: Optional[float] = None
    notes: Optional[str] = None
    water_intake: Optional[int] = None
    study_minutes: Optional[int] = None

class MoodInfo(MoodInfoBase):
    created_at: datetime

    class Config:
        from_attributes = True