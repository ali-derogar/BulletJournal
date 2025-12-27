from pydantic import BaseModel
from datetime import datetime

class CalendarNoteBase(BaseModel):
    date: str  # YYYY-MM-DD Persian format
    note: str

class CalendarNoteCreate(CalendarNoteBase):
    id: str
    userId: str

class CalendarNote(CalendarNoteBase):
    id: str
    userId: str
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True
