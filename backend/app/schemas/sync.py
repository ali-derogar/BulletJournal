from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# Import existing schemas
from app.schemas.task import TaskCreate, Task
from app.schemas.expense import ExpenseCreate, Expense
from app.schemas.journal import DailyJournalCreate, DailyJournal
from app.schemas.reflection import ReflectionCreate, Reflection

class SyncData(BaseModel):
    tasks: List[Task] = []
    expenses: List[Expense] = []
    journals: List[DailyJournal] = []
    reflections: List[Reflection] = []

class SyncResponse(BaseModel):
    synced_tasks: int = 0
    synced_expenses: int = 0
    synced_journals: int = 0
    synced_reflections: int = 0
    conflicts_resolved: int = 0