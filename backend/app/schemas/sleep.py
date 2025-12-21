from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class SleepInfoBase(BaseModel):
    id: str
    user_id: str
    date: str
    sleep_time: Optional[str]
    wake_time: Optional[str]
    hours_slept: float
    quality: int

class SleepInfoCreate(SleepInfoBase):
    pass

class SleepInfoUpdate(BaseModel):
    sleep_time: Optional[str] = None
    wake_time: Optional[str] = None
    hours_slept: Optional[float] = None
    quality: Optional[int] = None

class SleepInfo(SleepInfoBase):
    created_at: datetime

    class Config:
        from_attributes = True