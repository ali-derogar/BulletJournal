from fastapi import APIRouter, Depends, HTTPException
from app.auth.dependencies import get_current_active_user
from pydantic_ai import Agent, RunContext
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider
from openai import AsyncOpenAI
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from sqlalchemy.orm import Session
import uuid
from datetime import datetime, timezone
import logging
import os

from app.db.session import get_db
from app.models.task import Task
from app.models.goal import Goal
from app.models.calendar_note import CalendarNote
from app.models.expense import Expense
from app.models.mood import MoodInfo
from app.models.sleep import SleepInfo
from app.models.reflection import Reflection
from app.models.user import User
from app.core.config import settings
from app.services.ai_service import ai_service

logger = logging.getLogger(__name__)

router = APIRouter()

class AIChatRequest(BaseModel):
    message: str
    currentDate: str



class AgentDependencies:
    def __init__(self, db: Session, user: User, current_date: str):
        self.db = db
        self.user = user
        self.current_date = current_date

# Configure default model (will be overridden during rotation)
# Use the first available key, or a placeholder
first_key = settings.NEXT_PUBLIC_OPENROUTER_API_KEYS[0] if settings.NEXT_PUBLIC_OPENROUTER_API_KEYS else "no-key"
default_provider = OpenAIProvider(
    api_key=first_key,
    base_url='https://openrouter.ai/api/v1'
)

default_model = OpenAIChatModel(
    'google/gemma-3-27b-it:free',
    provider=default_provider
)

SYSTEM_PROMPT = (
    "You are a helpful and intelligent productivity assistant for the BulletJournal app. "
    "Your goal is to help the user manage their tasks, goals, calendar notes, expenses, mood, sleep, and reflections using natural language. "
    "You have access to tools to create, list, and update these items. "
    "When a user asks to do something, use the appropriate tool. "
    "Always be concise and encouraging. "
    "Important: Date formats are strict. Tasks, expenses, mood, and sleep use Gregorian (YYYY-MM-DD). Notes use Persian (YYYY-MM-DD). "
    "Today's date is provided in context."
)

# Define the Agent
agent: Agent[AgentDependencies, str] = Agent(
    default_model,

    deps_type=AgentDependencies,
    system_prompt=SYSTEM_PROMPT
)

@agent.tool
async def create_task(ctx: RunContext[AgentDependencies], title: str, date: Optional[str] = None) -> str:
    """
    Create a new task for the user.
    Args:
        title: The title of the task.
        date: The date for the task in YYYY-MM-DD format (Gregorian). Defaults to current date.
    """
    target_date = date or ctx.deps.current_date
    task_id = str(uuid.uuid4())
    new_task = Task(
        id=task_id,
        userId=ctx.deps.user.id,
        date=target_date,
        title=title,
        status="todo",
        spentTime=0.0,
        estimated_time=None,
        timer_running=False,
        is_useful=None,
        created_at=datetime.now(timezone.utc),
        updatedAt=datetime.now(timezone.utc)
    )
    ctx.deps.db.add(new_task)
    ctx.deps.db.commit()
    return f"Created task: '{title}' for {target_date}."

@agent.tool
async def create_goal(
    ctx: RunContext[AgentDependencies], 
    title: str, 
    type: Literal["yearly", "quarterly", "monthly", "weekly"],
    target_value: float,
    unit: str,
    year: int,
    quarter: Optional[int] = None,
    month: Optional[int] = None,
    week: Optional[int] = None
) -> str:
    """
    Create a new goal for the user.
    """
    goal_id = str(uuid.uuid4())
    new_goal = Goal(
        id=goal_id,
        userId=ctx.deps.user.id,
        title=title,
        type=type,
        year=year,
        quarter=quarter,
        month=month,
        week=week,
        targetValue=target_value,
        currentValue=0.0,
        unit=unit,
        status="active",
        progressType="manual",
        createdAt=datetime.now(timezone.utc),
        updatedAt=datetime.now(timezone.utc)
    )
    ctx.deps.db.add(new_goal)
    ctx.deps.db.commit()
    return f"Added goal: '{title}' ({type})."

@agent.tool
async def add_calendar_note(ctx: RunContext[AgentDependencies], note: str, date: Optional[str] = None) -> str:
    """
    Add a note to a specific date in the calendar.
    Args:
        note: The content of the note.
        date: The date in Persian YYYY-MM-DD format. Defaults to current date (assume users provide Persian dates for notes).
    """
    target_date = date or ctx.deps.current_date
    note_id = str(uuid.uuid4())
    new_note = CalendarNote(
        id=note_id,
        userId=ctx.deps.user.id,
        date=target_date,
        note=note,
        createdAt=datetime.now(timezone.utc),
        updatedAt=datetime.now(timezone.utc)
    )
    ctx.deps.db.add(new_note)
    ctx.deps.db.commit()
    return f"Added note for {target_date}."

@agent.tool
async def list_tasks(ctx: RunContext[AgentDependencies], date: Optional[str] = None) -> List[dict]:
    """List the user's tasks for a specific date."""
    target_date = date or ctx.deps.current_date
    tasks = ctx.deps.db.query(Task).filter(
        Task.userId == ctx.deps.user.id,
        Task.date == target_date
    ).all()
    return [{"title": t.title, "status": t.status, "id": t.id} for t in tasks]

@agent.tool
async def list_goals(ctx: RunContext[AgentDependencies], year: Optional[int] = None) -> List[dict]:
    """List the user's goals. Optionally filter by year."""
    query = ctx.deps.db.query(Goal).filter(Goal.userId == ctx.deps.user.id)
    if year:
        query = query.filter(Goal.year == year)
    goals = query.all()
    return [{
        "title": g.title, 
        "type": g.type, 
        "target": g.targetValue, 
        "current": g.currentValue,
        "unit": g.unit,
        "status": g.status
    } for g in goals]

@agent.tool
async def list_calendar_notes(ctx: RunContext[AgentDependencies], date: Optional[str] = None) -> List[dict]:
    """List the calendar notes for a specific date (Persian YYYY-MM-DD)."""
    target_date = date or ctx.deps.current_date
    notes = ctx.deps.db.query(CalendarNote).filter(
        CalendarNote.userId == ctx.deps.user.id,
        CalendarNote.date == target_date
    ).all()
    return [{"date": n.date, "note": n.note} for n in notes]


@agent.tool
async def record_expense(ctx: RunContext[AgentDependencies], title: str, amount: float, date: Optional[str] = None) -> str:
    """Record a new expense."""
    target_date = date or ctx.deps.current_date
    expense_id = str(uuid.uuid4())
    new_expense = Expense(
        id=expense_id,
        userId=ctx.deps.user.id,
        date=target_date,
        title=title,
        amount=amount,
        created_at=datetime.now(timezone.utc),
        updatedAt=datetime.now(timezone.utc)
    )
    ctx.deps.db.add(new_expense)
    ctx.deps.db.commit()
    return f"Recorded expense: '{title}' ({amount}) for {target_date}."

@agent.tool
async def list_expenses(ctx: RunContext[AgentDependencies], date: Optional[str] = None) -> List[dict]:
    """List expenses for a specific date."""
    target_date = date or ctx.deps.current_date
    expenses = ctx.deps.db.query(Expense).filter(
        Expense.userId == ctx.deps.user.id,
        Expense.date == target_date
    ).all()
    return [{"title": e.title, "amount": e.amount} for e in expenses]

@agent.tool
async def record_mood(
    ctx: RunContext[AgentDependencies], 
    rating: float, 
    day_score: float, 
    notes: str = "", 
    water_intake: int = 0, 
    study_minutes: int = 0,
    date: Optional[str] = None
) -> str:
    """Record user's mood and daily metrics."""
    target_date = date or ctx.deps.current_date
    mood_id = str(uuid.uuid4())
    new_mood = MoodInfo(
        id=mood_id,
        userId=ctx.deps.user.id,
        date=target_date,
        rating=rating,
        day_score=day_score,
        notes=notes,
        water_intake=water_intake,
        study_minutes=study_minutes,
        created_at=datetime.now(timezone.utc),
        updatedAt=datetime.now(timezone.utc)
    )
    ctx.deps.db.add(new_mood)
    ctx.deps.db.commit()
    return f"Mood recorded for {target_date}."

@agent.tool
async def record_sleep(
    ctx: RunContext[AgentDependencies], 
    hours_slept: float, 
    quality: int, 
    sleep_time: Optional[str] = None, 
    wake_time: Optional[str] = None,
    date: Optional[str] = None
) -> str:
    """Record user's sleep information."""
    target_date = date or ctx.deps.current_date
    sleep_id = str(uuid.uuid4())
    new_sleep = SleepInfo(
        id=sleep_id,
        userId=ctx.deps.user.id,
        date=target_date,
        hours_slept=hours_slept,
        quality=quality,
        sleep_time=sleep_time,
        wake_time=wake_time,
        created_at=datetime.now(timezone.utc),
        updatedAt=datetime.now(timezone.utc)
    )
    ctx.deps.db.add(new_sleep)
    ctx.deps.db.commit()
    return f"Sleep info recorded for {target_date}."

@agent.tool
async def record_reflection(
    ctx: RunContext[AgentDependencies], 
    notes: str, 
    water_intake: int = 0, 
    study_minutes: int = 0,
    date: Optional[str] = None
) -> str:
    """Record user's daily reflection."""
    target_date = date or ctx.deps.current_date
    reflection_id = str(uuid.uuid4())
    new_reflection = Reflection(
        id=reflection_id,
        userId=ctx.deps.user.id,
        date=target_date,
        notes=notes,
        water_intake=water_intake,
        study_minutes=study_minutes,
        created_at=datetime.now(timezone.utc),
        updatedAt=datetime.now(timezone.utc)
    )
    ctx.deps.db.add(new_reflection)
    ctx.deps.db.commit()
    return f"Reflection recorded for {target_date}."

@agent.tool
async def update_task(
    ctx: RunContext[AgentDependencies], 
    task_id: str, 
    status: Optional[str] = None, 
    title: Optional[str] = None
) -> str:
    """Update an existing task's status or title."""
    task = ctx.deps.db.query(Task).filter(Task.id == task_id, Task.userId == ctx.deps.user.id).first()
    if not task:
        return f"Task with id {task_id} not found."
    
    updates = []
    if status is not None:
        task.status = status
        updates.append(f"status to '{status}'")
    if title is not None:
        task.title = title
        updates.append(f"title to '{title}'")
    
    if not updates:
        return "No updates provided."
    
    task.updatedAt = datetime.now(timezone.utc)
    ctx.deps.db.commit()
    return f"Updated task {task.title}: " + ", ".join(updates)


# Models to try in order of preference
@router.post("/chat")
async def chat_with_agent(
    request: AIChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    deps = AgentDependencies(db=db, user=current_user, current_date=request.currentDate)
    
    if not settings.NEXT_PUBLIC_OPENROUTER_API_KEYS:
        return {
            "success": False,
            "message": "AI API Key is not configured on the server. (NEXT_PUBLIC_OPENROUTER_API_KEYS is empty)",
            "data": {}
        }

    # Delegate execution to the robust AI Service
    # This handles key rotation, model fallback, validation retries, and raw fallback
    output = await ai_service.execute_agent(agent, request.message, deps)
    
    return {
        "success": True, 
        "message": output,
        "data": {}
    }

