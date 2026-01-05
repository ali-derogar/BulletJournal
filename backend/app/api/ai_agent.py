from pydantic_ai import Agent, RunContext
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from sqlalchemy.orm import Session
import uuid
from datetime import datetime, timezone
import logging

from app.db.session import get_db
from app.models.task import Task
from app.models.goal import Goal
from app.models.calendar_note import CalendarNote
from app.models.user import User

logger = logging.getLogger(__name__)

class AgentDependencies:
    def __init__(self, db: Session, user: User, current_date: str):
        self.db = db
        self.user = user
        self.current_date = current_date

# Define the Agent
agent = Agent(
    'openai:google/gemma-2-9b-it:free', # Using OpenRouter via OpenAI compatibility
    deps_type=AgentDependencies,
    system_prompt=(
        "You are a helpful and intelligent productivity assistant for the BulletJournal app. "
        "Your goal is to help the user manage their tasks, goals, and calendar notes using natural language. "
        "You have access to tools to create, list, and update these items. "
        "When a user asks to do something, use the appropriate tool. "
        "Always be concise and encouraging. "
        "Important: Date formats are strict. Tasks use Gregorian (YYYY-MM-DD). Notes use Persian (YYYY-MM-DD). "
        "Today's date is provided in context."
    )
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
