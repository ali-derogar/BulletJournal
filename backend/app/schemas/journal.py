from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional, List, Any
import json

class DailyJournalBase(BaseModel):
    id: str
    userId: str
    date: str
    tasks: Optional[Any] = None  # Can accept array or JSON string
    expenses: Optional[Any] = None  # Can accept array or JSON string
    sleep_id: Optional[str] = Field(default=None, alias='sleepId')
    mood_id: Optional[str] = Field(default=None, alias='moodId')

    @field_validator('tasks', 'expenses', mode='before')
    @classmethod
    def convert_arrays(cls, v):
        """Convert arrays to JSON string if needed"""
        if v is None:
            return None
        if isinstance(v, list):
            return json.dumps(v)
        if isinstance(v, str):
            return v
        return json.dumps(v)

    class Config:
        populate_by_name = True

class DailyJournalCreate(DailyJournalBase):
    pass

class DailyJournalUpdate(BaseModel):
    tasks: Optional[Any] = None  # Can accept array or JSON string
    expenses: Optional[Any] = None  # Can accept array or JSON string
    sleep_id: Optional[str] = None
    mood_id: Optional[str] = None

    @field_validator('tasks', 'expenses', mode='before')
    @classmethod
    def convert_arrays(cls, v):
        """Convert arrays to JSON string if needed"""
        if v is None:
            return None
        if isinstance(v, list):
            return json.dumps(v)
        if isinstance(v, str):
            return v
        return json.dumps(v)

class DailyJournal(DailyJournalBase):
    createdAt: Optional[str] = None
    created_at: Optional[datetime] = None
    updatedAt: Optional[datetime] = None
    deletedAt: Optional[datetime] = None
    sleepId: Optional[str] = Field(default=None, alias='sleep_id')
    moodId: Optional[str] = Field(default=None, alias='mood_id')

    class Config:
        from_attributes = True
        populate_by_name = True