from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ReflectionBase(BaseModel):
    id: str
    date: str
    notes: str
    water_intake: int
    study_minutes: int

class ReflectionCreate(ReflectionBase):
    pass

class Reflection(ReflectionBase):
    userId: str
    created_at: Optional[datetime] = None
    updatedAt: Optional[datetime] = None
    deletedAt: Optional[datetime] = None

    class Config:
        from_attributes = True