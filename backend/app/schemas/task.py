from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional, List, Any
import json

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
    accumulated_time: Optional[float] = None
    timer_running: Optional[bool] = None
    timer_start: Optional[datetime] = None
    estimated_time: Optional[float] = None
    is_useful: Optional[bool] = None

class Task(TaskBase):
    created_at: Optional[datetime] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[datetime] = None
    deletedAt: Optional[datetime] = None
    spentTime: Optional[float] = 0.0  # Total time spent in minutes
    timeLogs: Optional[Any] = None  # Can accept array or JSON string
    accumulatedTime: Optional[float] = 0.0  # Legacy field for migration (camelCase)
    accumulated_time: Optional[float] = 0.0  # Legacy field for migration (snake_case)
    timerRunning: Optional[bool] = False  # camelCase
    timer_running: Optional[bool] = False  # snake_case
    timerStart: Optional[str] = None  # camelCase
    timer_start: Optional[datetime] = None  # snake_case
    estimatedTime: Optional[float] = None  # camelCase
    estimated_time: Optional[float] = None  # snake_case
    isUseful: Optional[bool] = None  # camelCase
    is_useful: Optional[bool] = None  # snake_case

    @field_validator('timeLogs', mode='before')
    @classmethod
    def convert_time_logs(cls, v):
        """Convert timeLogs array to JSON string if needed"""
        if v is None:
            return None
        if isinstance(v, list):
            return json.dumps(v)
        if isinstance(v, str):
            return v
        return json.dumps(v)

    class Config:
        from_attributes = True
        populate_by_name = True