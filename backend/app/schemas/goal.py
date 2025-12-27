from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class GoalBase(BaseModel):
    title: str
    description: Optional[str] = None
    type: str  # "yearly", "quarterly", "monthly", "weekly"
    year: int
    quarter: Optional[int] = None
    month: Optional[int] = None
    week: Optional[int] = None
    targetValue: float
    currentValue: float = 0.0
    unit: str
    linkedTaskIds: Optional[str] = None  # JSON array
    status: str = "active"
    progressType: str = "manual"

class GoalCreate(GoalBase):
    id: str
    userId: str

class Goal(GoalBase):
    id: str
    userId: str
    createdAt: datetime
    updatedAt: datetime
    completedAt: Optional[datetime] = None

    class Config:
        from_attributes = True
