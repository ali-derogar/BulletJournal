from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class DailyJournalBase(BaseModel):
    id: str
    userId: str
    date: str
    tasks: Optional[str] = None  # JSON string in database
    expenses: Optional[str] = None  # JSON string in database
    sleep_id: Optional[str] = None
    mood_id: Optional[str] = None

class DailyJournalCreate(DailyJournalBase):
    pass

class DailyJournalUpdate(BaseModel):
    tasks: Optional[str] = None
    expenses: Optional[str] = None
    sleep_id: Optional[str] = None
    mood_id: Optional[str] = None

class DailyJournal(DailyJournalBase):
    created_at: Optional[datetime] = None
    updatedAt: Optional[datetime] = None
    deletedAt: Optional[datetime] = None

    class Config:
        from_attributes = True