from pydantic import BaseModel
from typing import Optional, List, Dict, Any, Literal

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

class WellbeingSeries(BaseModel):
    sleep_hours_by_day: Dict[str, float]
    sleep_quality_by_day: Dict[str, float]
    mood_rating_by_day: Dict[str, float]
    day_score_by_day: Dict[str, float]
    water_intake_by_day: Dict[str, int]
    study_minutes_by_day: Dict[str, int]

class WellbeingAnalyticsResponse(BaseModel):
    avg_sleep_hours: float
    avg_sleep_quality: float
    sleep_days: int
    avg_mood_rating: float
    avg_day_score: float
    mood_days: int
    total_water_intake: int
    total_study_minutes: int
    series: WellbeingSeries

class AIReviewRequest(BaseModel):
    period_type: Literal['weekly', 'monthly']
    year: int
    period: int
    focus: Optional[Literal['overall', 'goals', 'productivity', 'finance', 'wellbeing']] = 'overall'
    strictness: Optional[int] = 3

class AIReviewResponse(BaseModel):
    raw: str
    parsed: Optional[Dict[str, Any]] = None