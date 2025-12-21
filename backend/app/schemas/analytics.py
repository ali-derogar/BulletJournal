from pydantic import BaseModel
from typing import Optional, List, Dict

class TaskDetail(BaseModel):
    id: str
    date: str
    status: str
    accumulated_time: int
    estimated_time: int
    is_useful: bool

class TaskAnalyticsResponse(BaseModel):
    total_tasks_created: int
    total_tasks_completed: int
    total_time_spent: int  # minutes
    active_days: int
    completed_tasks_by_day: Dict[str, int]  # date -> count
    time_spent_by_day: Dict[str, int]  # date -> minutes
    tasks: List[TaskDetail]  # Individual task details for advanced analytics

class AnalyticsRequest(BaseModel):
    period_type: str  # 'weekly' or 'monthly'
    year: int
    period: int  # week number or month number