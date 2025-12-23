from pydantic import BaseModel
from typing import Optional, List, Dict

class TaskDetail(BaseModel):
    id: str
    date: str
    status: str
    accumulated_time: float
    estimated_time: Optional[float]
    is_useful: Optional[bool]

class TaskAnalyticsResponse(BaseModel):
    total_tasks_created: int
    total_tasks_completed: int
    total_time_spent: float  # minutes
    active_days: int
    completed_tasks_by_day: Dict[str, int]  # date -> count
    time_spent_by_day: Dict[str, float]  # date -> minutes
    tasks: List[TaskDetail]  # Individual task details for advanced analytics

class AnalyticsRequest(BaseModel):
    period_type: str  # 'weekly' or 'monthly'
    year: int
    period: int  # week number or month number