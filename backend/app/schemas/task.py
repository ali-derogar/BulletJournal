from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class TaskBase(BaseModel):
    id: str
    userId: str
    date: str
    title: str
    status: str  # "todo", "in-progress", "done"

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    accumulated_time: Optional[int] = None
    timer_running: Optional[bool] = None
    timer_start: Optional[datetime] = None
    estimated_time: Optional[int] = None
    is_useful: Optional[bool] = None

class Task(TaskBase):
    created_at: Optional[datetime] = None
    updatedAt: Optional[datetime] = None
    deletedAt: Optional[datetime] = None
    accumulated_time: Optional[int] = 0
    timer_running: Optional[bool] = False
    timer_start: Optional[datetime] = None
    estimated_time: Optional[int] = None
    is_useful: Optional[bool] = None

    class Config:
        from_attributes = True