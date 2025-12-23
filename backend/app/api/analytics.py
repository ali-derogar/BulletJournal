from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import Dict
import calendar

from app.db.session import get_db
from app.models.task import Task
from app.schemas.analytics import TaskAnalyticsResponse, AnalyticsRequest
from app.auth.router import get_current_user
from app.models.user import User

router = APIRouter()

def get_period_dates(period_type: str, year: int, period: int) -> tuple[datetime, datetime]:
    """Get start and end dates for a period."""
    if period_type == 'weekly':
        # ISO week: Monday is start of week
        # Find the first day of the year
        first_day = datetime(year, 1, 1)
        # Find Monday of week 1
        days_to_monday = (first_day.weekday() - 0) % 7  # 0 = Monday
        if days_to_monday > 3:  # If more than 3 days before Monday, it's week 53 of previous year
            first_monday = first_day - timedelta(days=days_to_monday - 7)
        else:
            first_monday = first_day - timedelta(days=days_to_monday)

        # Calculate start of requested week
        start_date = first_monday + timedelta(weeks=period-1)
        end_date = start_date + timedelta(days=6, hours=23, minutes=59, seconds=59)

    elif period_type == 'monthly':
        # Get first and last day of month
        start_date = datetime(year, period, 1)
        _, last_day = calendar.monthrange(year, period)
        end_date = datetime(year, period, last_day, 23, 59, 59)
    else:
        raise ValueError(f"Invalid period type: {period_type}")

    return start_date, end_date

@router.get("/tasks/{period_type}/{year}/{period}", response_model=TaskAnalyticsResponse)
async def get_task_analytics(
    period_type: str,
    year: int,
    period: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get task analytics for a specific period."""
    try:
        start_date, end_date = get_period_dates(period_type, year, period)

        # Get all tasks for the user in this period
        # Use raw SQL to avoid column name issues
        from sqlalchemy import text
        query = text("""
            SELECT id, user_id, date, title, status, created_at, spentTime, accumulated_time, timer_running, timer_start, estimated_time, is_useful
            FROM tasks
            WHERE user_id = :user_id
            AND date >= :start_date
            AND date <= :end_date
        """)

        # Debug logging
        print(f"Analytics query for user {current_user.id}: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")

        result = db.execute(query, {
            'user_id': current_user.id,
            'start_date': start_date.strftime('%Y-%m-%d'),
            'end_date': end_date.strftime('%Y-%m-%d')
        })

        # Convert to list to count
        rows = list(result)
        print(f"Found {len(rows)} tasks for analytics")
        result = iter(rows)  # Reset iterator

        # Convert to dict-like objects
        tasks = []
        for row in result:
            task_dict = dict(row._mapping)
            # Create a simple object with the attributes we need
            class TaskObj:
                def __init__(self, data):
                    for key, value in data.items():
                        setattr(self, key, value)
                    # Map user_id to userId for consistency
                    self.userId = data.get('user_id')
            tasks.append(TaskObj(task_dict))

        # Calculate analytics
        total_tasks_created = len(tasks)
        total_tasks_completed = len([t for t in tasks if t.status == 'done'])
        total_time_spent = sum(getattr(t, 'spentTime', 0) or 0 for t in tasks)

        # Group by day
        completed_by_day: Dict[str, int] = {}
        time_by_day: Dict[str, float] = {}
        active_days = set()

        for task in tasks:
            if task.status == 'done':
                completed_by_day[task.date] = completed_by_day.get(task.date, 0) + 1
            time_spent = getattr(task, 'spentTime', 0) or 0
            if time_spent > 0:
                time_by_day[task.date] = time_by_day.get(task.date, 0) + time_spent
                active_days.add(task.date)

        # Convert tasks to TaskDetail format
        task_details = []
        for task in tasks:
            task_details.append({
                'id': task.id,
                'date': task.date,
                'status': task.status,
                'accumulated_time': getattr(task, 'accumulated_time', 0) or 0,
                'estimated_time': getattr(task, 'estimated_time', None),
                'is_useful': getattr(task, 'is_useful', None)
            })

        return TaskAnalyticsResponse(
            total_tasks_created=total_tasks_created,
            total_tasks_completed=total_tasks_completed,
            total_time_spent=total_time_spent,
            active_days=len(active_days),
            completed_tasks_by_day=completed_by_day,
            time_spent_by_day=time_by_day,
            tasks=task_details
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # If database columns don't exist, return empty analytics instead of error
        error_str = str(e)
        if "no such column" in error_str.lower():
            # Return empty analytics when database schema is incomplete
            return TaskAnalyticsResponse(
                total_tasks_created=0,
                total_tasks_completed=0,
                total_time_spent=0,
                active_days=0,
                completed_tasks_by_day={},
                time_spent_by_day={},
                tasks=[]
            )
        raise HTTPException(status_code=500, detail=f"Analytics calculation failed: {str(e)}")