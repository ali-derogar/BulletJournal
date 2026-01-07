from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# Import existing schemas
from app.schemas.task import TaskCreate, Task
from app.schemas.expense import ExpenseCreate, Expense
from app.schemas.journal import DailyJournalCreate, DailyJournal
from app.schemas.reflection import ReflectionCreate, Reflection
from app.schemas.goal import GoalCreate, Goal
from app.schemas.calendar_note import CalendarNoteCreate, CalendarNote
from app.schemas.sleep import SleepInfo
from app.schemas.mood import MoodInfo

class SyncData(BaseModel):
    tasks: List[Task] = []
    expenses: List[Expense] = []
    journals: List[DailyJournal] = []
    sleep: List[SleepInfo] = []
    mood: List[MoodInfo] = []
    goals: List[Goal] = []
    calendarNotes: List[CalendarNote] = []
    reflections: List[Reflection] = []

class SyncResponse(BaseModel):
    synced_tasks: int = 0
    synced_expenses: int = 0
    synced_journals: int = 0
    synced_sleep: int = 0
    synced_mood: int = 0
    synced_goals: int = 0
    synced_calendar_notes: int = 0
    synced_reflections: int = 0
    conflicts_resolved: int = 0