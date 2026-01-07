from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import Dict
import calendar
import json

from app.db.session import get_db
from app.models.task import Task
from app.models.goal import Goal
from app.models.expense import Expense
from app.models.sleep import SleepInfo
from app.models.mood import MoodInfo
from app.schemas.analytics import TaskAnalyticsResponse, AnalyticsRequest, WellbeingAnalyticsResponse, WellbeingSeries, AIReviewRequest, AIReviewResponse
from app.auth.router import get_current_user
from app.models.user import User
from app.services.ai_service import ai_service
from app.api.ai_agent import agent as bj_agent, AgentDependencies

router = APIRouter()

def get_period_dates(period_type: str, year: int, period: int) -> tuple[datetime, datetime]:
    """Get start and end dates for a period."""
    if period_type == 'weekly':
        # ISO week: Monday is start of week
        start_date = datetime.fromisocalendar(year, period, 1)
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
            AND DATE(date) >= :start_date
            AND DATE(date) <= :end_date
        """)

        result = db.execute(query, {
            'user_id': current_user.id,
            'start_date': start_date.strftime('%Y-%m-%d'),
            'end_date': end_date.strftime('%Y-%m-%d')
        })

        # Convert to list to count
        tasks_data = list(result)
        result = iter(tasks_data)  # Reset iterator

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
            # Normalize task date to YYYY-MM-DD
            task_date = str(task.date)[:10] if task.date else "unknown"
            
            if task.status == 'done':
                completed_by_day[task_date] = completed_by_day.get(task_date, 0) + 1
                active_days.add(task_date) # Count day as active if a task was completed
            
            time_spent = getattr(task, 'spentTime', 0) or 0
            if time_spent > 0:
                time_by_day[task_date] = time_by_day.get(task_date, 0) + time_spent
                active_days.add(task_date)

        # Convert tasks to TaskDetail format
        task_details = []
        for task in tasks:
            task_date = str(task.date)[:10] if task.date else "unknown"
            task_details.append({
                'id': task.id,
                'date': task_date,
                'status': task.status,
                'accumulated_time': getattr(task, 'spentTime', 0) or 0,
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


@router.get("/wellbeing/{period_type}/{year}/{period}", response_model=WellbeingAnalyticsResponse)
async def get_wellbeing_analytics(
    period_type: str,
    year: int,
    period: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        start_date, end_date = get_period_dates(period_type, year, period)
        from sqlalchemy import text

        sleep_query = text("""
            SELECT DATE(date) as d,
                   AVG(hours_slept) as avg_hours,
                   AVG(quality) as avg_quality
            FROM sleep
            WHERE user_id = :user_id
              AND DATE(date) >= :start_date
              AND DATE(date) <= :end_date
            GROUP BY DATE(date)
        """)

        mood_query = text("""
            SELECT DATE(date) as d,
                   AVG(rating) as avg_rating,
                   AVG(day_score) as avg_day_score,
                   SUM(water_intake) as sum_water,
                   SUM(study_minutes) as sum_study
            FROM mood
            WHERE user_id = :user_id
              AND DATE(date) >= :start_date
              AND DATE(date) <= :end_date
            GROUP BY DATE(date)
        """)

        params = {
            'user_id': current_user.id,
            'start_date': start_date.strftime('%Y-%m-%d'),
            'end_date': end_date.strftime('%Y-%m-%d'),
        }

        try:
            sleep_rows = list(db.execute(sleep_query, params))
        except Exception as e:
            if "no such table" in str(e).lower() or "no such column" in str(e).lower():
                sleep_rows = []
            else:
                raise

        try:
            mood_rows = list(db.execute(mood_query, params))
        except Exception as e:
            if "no such table" in str(e).lower() or "no such column" in str(e).lower():
                mood_rows = []
            else:
                raise

        sleep_hours_by_day: Dict[str, float] = {}
        sleep_quality_by_day: Dict[str, float] = {}
        for row in sleep_rows:
            m = dict(row._mapping)
            d = m.get('d')
            if d:
                sleep_hours_by_day[str(d)] = float(m.get('avg_hours') or 0)
                sleep_quality_by_day[str(d)] = float(m.get('avg_quality') or 0)

        mood_rating_by_day: Dict[str, float] = {}
        day_score_by_day: Dict[str, float] = {}
        water_intake_by_day: Dict[str, int] = {}
        study_minutes_by_day: Dict[str, int] = {}
        for row in mood_rows:
            m = dict(row._mapping)
            d = m.get('d')
            if d:
                mood_rating_by_day[str(d)] = float(m.get('avg_rating') or 0)
                day_score_by_day[str(d)] = float(m.get('avg_day_score') or 0)
                water_intake_by_day[str(d)] = int(m.get('sum_water') or 0)
                study_minutes_by_day[str(d)] = int(m.get('sum_study') or 0)

        sleep_days = len(sleep_hours_by_day)
        mood_days = len(mood_rating_by_day)

        avg_sleep_hours = (sum(sleep_hours_by_day.values()) / sleep_days) if sleep_days else 0.0
        avg_sleep_quality = (sum(sleep_quality_by_day.values()) / sleep_days) if sleep_days else 0.0
        avg_mood_rating = (sum(mood_rating_by_day.values()) / mood_days) if mood_days else 0.0
        avg_day_score = (sum(day_score_by_day.values()) / mood_days) if mood_days else 0.0
        total_water_intake = sum(water_intake_by_day.values())
        total_study_minutes = sum(study_minutes_by_day.values())

        return WellbeingAnalyticsResponse(
            avg_sleep_hours=avg_sleep_hours,
            avg_sleep_quality=avg_sleep_quality,
            sleep_days=sleep_days,
            avg_mood_rating=avg_mood_rating,
            avg_day_score=avg_day_score,
            mood_days=mood_days,
            total_water_intake=total_water_intake,
            total_study_minutes=total_study_minutes,
            series=WellbeingSeries(
                sleep_hours_by_day=sleep_hours_by_day,
                sleep_quality_by_day=sleep_quality_by_day,
                mood_rating_by_day=mood_rating_by_day,
                day_score_by_day=day_score_by_day,
                water_intake_by_day=water_intake_by_day,
                study_minutes_by_day=study_minutes_by_day,
            )
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Wellbeing analytics failed: {str(e)}")


@router.post("/ai-review", response_model=AIReviewResponse)
async def ai_review(
    req: AIReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        start_date, end_date = get_period_dates(req.period_type, req.year, req.period)
        start_str = start_date.strftime('%Y-%m-%d')
        end_str = end_date.strftime('%Y-%m-%d')

        try:
            tasks = db.query(Task).filter(
                Task.userId == current_user.id,
                Task.date >= start_str,
                Task.date <= end_str,
            ).all()
        except Exception as e:
            if "no such table" in str(e).lower() or "no such column" in str(e).lower():
                tasks = []
            else:
                raise

        try:
            expenses = db.query(Expense).filter(
                Expense.userId == current_user.id,
                Expense.date >= start_str,
                Expense.date <= end_str,
            ).all()
        except Exception as e:
            if "no such table" in str(e).lower() or "no such column" in str(e).lower():
                expenses = []
            else:
                raise

        try:
            sleep = db.query(SleepInfo).filter(
                SleepInfo.userId == current_user.id,
                SleepInfo.date >= start_str,
                SleepInfo.date <= end_str,
            ).all()
        except Exception as e:
            if "no such table" in str(e).lower() or "no such column" in str(e).lower():
                sleep = []
            else:
                raise

        try:
            mood = db.query(MoodInfo).filter(
                MoodInfo.userId == current_user.id,
                MoodInfo.date >= start_str,
                MoodInfo.date <= end_str,
            ).all()
        except Exception as e:
            if "no such table" in str(e).lower() or "no such column" in str(e).lower():
                mood = []
            else:
                raise

        try:
            goals_q = db.query(Goal).filter(Goal.userId == current_user.id)
            if req.period_type == 'weekly':
                goals_q = goals_q.filter(Goal.type == 'weekly', Goal.year == req.year, Goal.week == req.period)
            elif req.period_type == 'monthly':
                goals_q = goals_q.filter(Goal.type == 'monthly', Goal.year == req.year, Goal.month == req.period)
            goals = goals_q.all()
        except Exception as e:
            if "no such table" in str(e).lower() or "no such column" in str(e).lower():
                goals = []
            else:
                raise

        def safe_float(v, default=0.0):
            try:
                return float(v)
            except Exception:
                return default

        total_spent_time = sum(safe_float(getattr(t, 'spentTime', 0) or 0) for t in tasks)
        total_estimated = sum(safe_float(getattr(t, 'estimated_time', 0) or 0) for t in tasks)
        done_tasks = [t for t in tasks if getattr(t, 'status', None) == 'done']
        carry_over = [t for t in tasks if bool(getattr(t, 'is_copied_to_next_day', False))]
        total_expense = sum(safe_float(getattr(e, 'amount', 0) or 0) for e in expenses)

        top_time_tasks = sorted(tasks, key=lambda t: safe_float(getattr(t, 'spentTime', 0) or 0), reverse=True)[:10]
        top_carry_tasks = carry_over[:10]

        goal_items = []
        for g in goals[:20]:
            goal_items.append({
                'title': g.title,
                'type': g.type,
                'status': g.status,
                'currentValue': safe_float(getattr(g, 'currentValue', 0) or 0),
                'targetValue': safe_float(getattr(g, 'targetValue', 0) or 0),
                'unit': g.unit,
                'linkedTaskIds': g.linkedTaskIds,
            })

        wellbeing_summary = {
            'sleep_days': len(sleep),
            'avg_sleep_hours': (sum(safe_float(s.hours_slept) for s in sleep) / len(sleep)) if sleep else 0.0,
            'avg_sleep_quality': (sum(safe_float(s.quality) for s in sleep) / len(sleep)) if sleep else 0.0,
            'mood_days': len(mood),
            'avg_mood_rating': (sum(safe_float(m.rating) for m in mood) / len(mood)) if mood else 0.0,
            'avg_day_score': (sum(safe_float(m.day_score) for m in mood) / len(mood)) if mood else 0.0,
            'total_water_intake': sum(int(getattr(m, 'water_intake', 0) or 0) for m in mood),
            'total_study_minutes': sum(int(getattr(m, 'study_minutes', 0) or 0) for m in mood),
        }

        profile = {
            'name': current_user.name,
            'general_goal': current_user.general_goal,
            'mbti_type': current_user.mbti_type,
            'level': current_user.level,
            'xp': current_user.xp,
            'income_level': current_user.income_level,
            'job_title': current_user.job_title,
            'skills': current_user.skills,
            'education_level': current_user.education_level,
        }

        payload = {
            'period': {
                'type': req.period_type,
                'year': req.year,
                'period': req.period,
                'start': start_str,
                'end': end_str,
            },
            'profile': profile,
            'stats': {
                'tasks_total': len(tasks),
                'tasks_done': len(done_tasks),
                'tasks_completion_rate': (len(done_tasks) / len(tasks) * 100.0) if tasks else 0.0,
                'total_spent_time': total_spent_time,
                'total_estimated_time': total_estimated,
                'estimated_vs_actual_diff': total_spent_time - total_estimated,
                'carry_over_count': len(carry_over),
                'carry_over_rate': (len(carry_over) / len(tasks) * 100.0) if tasks else 0.0,
                'expenses_total': total_expense,
            },
            'wellbeing': wellbeing_summary,
            'goals': goal_items,
            'samples': {
                'top_time_tasks': [
                    {
                        'title': t.title,
                        'date': t.date,
                        'status': t.status,
                        'spentTime': safe_float(getattr(t, 'spentTime', 0) or 0),
                        'estimated_time': safe_float(getattr(t, 'estimated_time', 0) or 0),
                        'is_copied_to_next_day': bool(getattr(t, 'is_copied_to_next_day', False)),
                    }
                    for t in top_time_tasks
                ],
                'carry_over_tasks': [
                    {
                        'title': t.title,
                        'date': t.date,
                        'status': t.status,
                    }
                    for t in top_carry_tasks
                ],
            },
        }

        strictness = req.strictness or 3
        focus = req.focus or 'overall'

        instructions = (
            "شما یک تحلیل‌گر بسیار حرفه‌ای برای BulletJournal هستید. پاسخ را فقط به زبان فارسی بده. "
            "۷۰٪ تحلیل باید دقیقاً بر اساس داده‌های JSON ورودی باشد و ۳۰٪ پیشنهاد آزاد اما کاملاً همسو با هدف کلی و اهداف کاربر باشد. "
            "اگر general_goal یا goals موجود است، محور تحلیل باید همان باشد. اگر هدف‌ها خالی هستند، ابتدا ۲ سوال کوتاه برای روشن شدن هدف بپرس. "
            "لحن: منتقدانه اما سازنده. سطح سخت‌گیری: " + str(strictness) + ". "
            "تمرکز تحلیل: " + focus + ". "
            "خروجی باید فقط و فقط یک JSON معتبر باشد (بدون متن اضافه، بدون markdown، بدون ```). "
            "کلیدها باید دقیقاً این‌ها باشند: summary, strengths, critiques, root_causes, recommendations, goal_alignment, plan_7_days, plan_30_days, questions. "
            "مقادیر strengths/critiques/root_causes/recommendations/questions/plan_7_days/plan_30_days باید آرایه‌ای از رشته‌های کوتاه و خوانا باشد. "
            "goal_alignment می‌تواند یک رشته باشد."
        )

        deps = AgentDependencies(db=db, user=current_user, current_date=end_str)
        message = "INPUT_JSON:\n" + json.dumps(payload, ensure_ascii=False)
        raw = await ai_service.execute_agent(
            bj_agent,
            message,
            deps,
            history=None,
            instructions=instructions,
        )

        parsed = None
        try:
            parsed = json.loads(raw)
        except Exception:
            try:
                cleaned = raw.strip()
                if cleaned.startswith('```'):
                    cleaned = cleaned.strip('`')
                first = cleaned.find('{')
                last = cleaned.rfind('}')
                if first >= 0 and last > first:
                    parsed = json.loads(cleaned[first:last + 1])
                else:
                    parsed = None
            except Exception:
                parsed = None

        return AIReviewResponse(raw=raw, parsed=parsed)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI review failed: {str(e)}")