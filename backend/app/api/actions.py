from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
from slowapi import Limiter
from slowapi.util import get_remote_address
import logging
import uuid

from app.db.session import get_db
from app.models.task import Task
from app.models.goal import Goal
from app.models.calendar_note import CalendarNote
from app.auth.router import get_current_user
from app.models.user import User

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)
logger = logging.getLogger(__name__)


# Pydantic schemas for request validation
class CreateTaskRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    date: str = Field(..., description="Persian date in YYYY-MM-DD format")
    status: str = Field(default="todo", pattern="^(todo|in-progress|done)$")
    estimatedTime: Optional[float] = Field(None, ge=0, description="Estimated time in minutes")


class CreateGoalRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    type: str = Field(..., pattern="^(yearly|quarterly|monthly|weekly)$")
    year: int = Field(..., ge=1400, le=1500)
    quarter: Optional[int] = Field(None, ge=1, le=4)
    month: Optional[int] = Field(None, ge=1, le=12)
    week: Optional[int] = Field(None, ge=1, le=53)
    targetValue: float = Field(..., gt=0)
    unit: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None


class CreateCalendarNoteRequest(BaseModel):
    date: str = Field(..., description="Persian date in YYYY-MM-DD format")
    note: str = Field(..., min_length=1)


class UpdateTaskRequest(BaseModel):
    taskId: str
    status: Optional[str] = Field(None, pattern="^(todo|in-progress|done)$")
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    spentTime: Optional[float] = Field(None, ge=0)


class ListTasksRequest(BaseModel):
    date: Optional[str] = Field(None, description="Filter by Persian date YYYY-MM-DD")
    status: Optional[str] = Field(None, pattern="^(todo|in-progress|done)$")


# Response models
class TaskResponse(BaseModel):
    id: str
    title: str
    date: str
    status: str
    estimatedTime: Optional[float]
    spentTime: float
    createdAt: datetime

    class Config:
        from_attributes = True


class GoalResponse(BaseModel):
    id: str
    title: str
    type: str
    year: int
    targetValue: float
    currentValue: float
    unit: str
    status: str

    class Config:
        from_attributes = True


class CalendarNoteResponse(BaseModel):
    id: str
    date: str
    note: str
    createdAt: datetime

    class Config:
        from_attributes = True


class ActionResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None


@router.post("/actions/create-task", response_model=ActionResponse)
@limiter.limit("60/minute")
async def create_task_action(
    request: Request,
    task_request: CreateTaskRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new task from AI chat action."""
    try:
        # Generate unique ID
        task_id = str(uuid.uuid4())

        # Create task
        new_task = Task(
            id=task_id,
            userId=current_user.id,
            date=task_request.date,
            title=task_request.title,
            status=task_request.status,
            spentTime=0.0,
            estimated_time=task_request.estimatedTime,
            timer_running=False,
            is_useful=None,
            created_at=datetime.now(timezone.utc),
            updatedAt=datetime.now(timezone.utc)
        )

        db.add(new_task)
        db.commit()
        db.refresh(new_task)

        logger.info(f"User {current_user.id} created task {task_id} via AI action: {task_request.title}")

        return ActionResponse(
            success=True,
            message=f"تسک «{task_request.title}» برای {task_request.date} اضافه شد",
            data={
                "id": new_task.id,
                "title": new_task.title,
                "date": new_task.date,
                "status": new_task.status
            }
        )

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create task for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"خطا در ساخت تسک: {str(e)}"
        )


@router.post("/actions/create-goal", response_model=ActionResponse)
@limiter.limit("60/minute")
async def create_goal_action(
    request: Request,
    goal_request: CreateGoalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new goal from AI chat action."""
    try:
        # Validate period fields based on goal type
        if goal_request.type == "quarterly" and goal_request.quarter is None:
            raise HTTPException(status_code=400, detail="Quarter is required for quarterly goals")
        if goal_request.type == "monthly" and goal_request.month is None:
            raise HTTPException(status_code=400, detail="Month is required for monthly goals")
        if goal_request.type == "weekly" and goal_request.week is None:
            raise HTTPException(status_code=400, detail="Week is required for weekly goals")

        # Generate unique ID
        goal_id = str(uuid.uuid4())

        # Create goal
        new_goal = Goal(
            id=goal_id,
            userId=current_user.id,
            title=goal_request.title,
            description=goal_request.description,
            type=goal_request.type,
            year=goal_request.year,
            quarter=goal_request.quarter,
            month=goal_request.month,
            week=goal_request.week,
            targetValue=goal_request.targetValue,
            currentValue=0.0,
            unit=goal_request.unit,
            status="active",
            progressType="manual",
            createdAt=datetime.now(timezone.utc),
            updatedAt=datetime.now(timezone.utc)
        )

        db.add(new_goal)
        db.commit()
        db.refresh(new_goal)

        # Build period description
        period_desc = {
            "yearly": f"سال {goal_request.year}",
            "quarterly": f"فصل {goal_request.quarter} سال {goal_request.year}",
            "monthly": f"ماه {goal_request.month} سال {goal_request.year}",
            "weekly": f"هفته {goal_request.week} سال {goal_request.year}"
        }

        logger.info(f"User {current_user.id} created goal {goal_id} via AI action: {goal_request.title}")

        return ActionResponse(
            success=True,
            message=f"هدف «{goal_request.title}» برای {period_desc[goal_request.type]} اضافه شد",
            data={
                "id": new_goal.id,
                "title": new_goal.title,
                "type": new_goal.type,
                "targetValue": new_goal.targetValue,
                "unit": new_goal.unit
            }
        )

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create goal for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"خطا در ساخت هدف: {str(e)}"
        )


@router.post("/actions/create-calendar-note", response_model=ActionResponse)
@limiter.limit("60/minute")
async def create_calendar_note_action(
    request: Request,
    note_request: CreateCalendarNoteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new calendar note from AI chat action."""
    try:
        # Generate unique ID
        note_id = str(uuid.uuid4())

        # Create calendar note
        new_note = CalendarNote(
            id=note_id,
            userId=current_user.id,
            date=note_request.date,
            note=note_request.note,
            createdAt=datetime.now(timezone.utc),
            updatedAt=datetime.now(timezone.utc)
        )

        db.add(new_note)
        db.commit()
        db.refresh(new_note)

        logger.info(f"User {current_user.id} created calendar note {note_id} via AI action for {note_request.date}")

        return ActionResponse(
            success=True,
            message=f"یادداشت در تقویم برای {note_request.date} اضافه شد",
            data={
                "id": new_note.id,
                "date": new_note.date,
                "note": new_note.note
            }
        )

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create calendar note for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"خطا در ساخت یادداشت تقویم: {str(e)}"
        )


@router.post("/actions/update-task", response_model=ActionResponse)
@limiter.limit("60/minute")
async def update_task_action(
    request: Request,
    update_request: UpdateTaskRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing task from AI chat action."""
    try:
        # Find task
        task = db.query(Task).filter(
            Task.id == update_request.taskId,
            Task.userId == current_user.id
        ).first()

        if not task:
            raise HTTPException(
                status_code=404,
                detail=f"تسک با شناسه {update_request.taskId} یافت نشد"
            )

        # Update fields
        if update_request.status:
            task.status = update_request.status
        if update_request.title:
            task.title = update_request.title
        if update_request.spentTime is not None:
            task.spentTime = update_request.spentTime

        task.updatedAt = datetime.now(timezone.utc)

        db.commit()
        db.refresh(task)

        logger.info(f"User {current_user.id} updated task {update_request.taskId} via AI action")

        return ActionResponse(
            success=True,
            message=f"تسک «{task.title}» به‌روزرسانی شد",
            data={
                "id": task.id,
                "title": task.title,
                "status": task.status
            }
        )

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update task for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"خطا در به‌روزرسانی تسک: {str(e)}"
        )


@router.post("/actions/list-tasks")
@limiter.limit("60/minute")
async def list_tasks_action(
    request: Request,
    list_request: ListTasksRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List tasks with optional filters from AI chat action."""
    try:
        # Build query
        query = db.query(Task).filter(Task.userId == current_user.id)

        if list_request.date:
            query = query.filter(Task.date == list_request.date)

        if list_request.status:
            query = query.filter(Task.status == list_request.status)

        # Order by date descending
        tasks = query.order_by(Task.date.desc()).limit(50).all()

        logger.info(f"User {current_user.id} listed {len(tasks)} tasks via AI action")

        # Format response
        task_list = []
        for task in tasks:
            task_list.append({
                "id": task.id,
                "title": task.title,
                "date": task.date,
                "status": task.status,
                "spentTime": task.spentTime or 0,
                "estimatedTime": task.estimated_time
            })

        return ActionResponse(
            success=True,
            message=f"{len(tasks)} تسک یافت شد",
            data={"tasks": task_list}
        )

    except Exception as e:
        logger.error(f"Failed to list tasks for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"خطا در دریافت لیست تسک‌ها: {str(e)}"
        )


@router.post("/actions/complete-task", response_model=ActionResponse)
@limiter.limit("60/minute")
async def complete_task_action(
    request: Request,
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a task as completed from AI chat action."""
    try:
        # Find task
        task = db.query(Task).filter(
            Task.id == task_id,
            Task.userId == current_user.id
        ).first()

        if not task:
            raise HTTPException(
                status_code=404,
                detail=f"تسک یافت نشد"
            )

        # Mark as done
        task.status = "done"
        task.updatedAt = datetime.now(timezone.utc)

        db.commit()
        db.refresh(task)

        logger.info(f"User {current_user.id} completed task {task_id} via AI action")

        return ActionResponse(
            success=True,
            message=f"تسک «{task.title}» به عنوان انجام شده علامت‌گذاری شد",
            data={
                "id": task.id,
                "title": task.title,
                "status": task.status
            }
        )

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to complete task for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"خطا در تکمیل تسک: {str(e)}"
        )
