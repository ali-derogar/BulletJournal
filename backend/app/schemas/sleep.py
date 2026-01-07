from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class SleepInfoBase(BaseModel):
    id: str
    userId: str
    date: str
    sleepTime: Optional[str] = Field(default=None, alias='sleep_time')
    sleep_time: Optional[str] = None
    wakeTime: Optional[str] = Field(default=None, alias='wake_time')
    wake_time: Optional[str] = None
    hoursSlept: Optional[float] = Field(default=0.0, alias='hours_slept')
    hours_slept: Optional[float] = 0.0
    quality: int

class SleepInfoCreate(SleepInfoBase):
    pass

class SleepInfoUpdate(BaseModel):
    sleep_time: Optional[str] = None
    wake_time: Optional[str] = None
    hours_slept: Optional[float] = None
    quality: Optional[int] = None

class SleepInfo(SleepInfoBase):
    createdAt: Optional[datetime] = Field(default=None, alias='created_at')
    created_at: Optional[datetime] = None
    updatedAt: Optional[datetime] = None
    deletedAt: Optional[datetime] = None

    class Config:
        from_attributes = True
        populate_by_name = True