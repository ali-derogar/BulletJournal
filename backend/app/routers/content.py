"""
Content Management Admin Router

Provides admin endpoints for managing all user content:
- Tasks, Journals, Goals
- Content statistics
- Reported content
- Bulk operations
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from pydantic import BaseModel
from datetime import datetime, timedelta

from app.db.session import get_db
from app.models.task import Task
from app.models.journal import DailyJournal
from app.models.goal import Goal
from app.models.report import Report
from app.models.user import User
from app.auth.dependencies import get_current_admin, get_current_superuser

router = APIRouter(
    prefix="/admin/content",
    tags=["admin-content"],
    responses={404: {"description": "Not found"}},
)

# ===== SCHEMAS =====

class ContentStats(BaseModel):
    total_tasks: int
    total_journals: int
    total_goals: int
    total_reports: int
    pending_reports: int
    tasks_today: int
    active_goals: int
    completed_goals: int

class TaskItem(BaseModel):
    id: str
    userId: str
    user_email: str | None
    user_name: str | None
    date: str
    title: str
    status: str
    created_at: datetime
    spentTime: float | None

    class Config:
        from_attributes = True

class JournalItem(BaseModel):
    id: str
    userId: str
    user_email: str | None
    user_name: str | None
    date: str
    created_at: datetime

    class Config:
        from_attributes = True

class GoalItem(BaseModel):
    id: str
    userId: str
    user_email: str | None
    user_name: str | None
    title: str
    description: str | None
    type: str
    year: int
    quarter: int | None
    month: int | None
    status: str
    targetValue: float
    currentValue: float
    unit: str
    createdAt: datetime

    class Config:
        from_attributes = True

class ReportItem(BaseModel):
    id: str
    reporter_id: str
    reporter_email: str | None
    reported_user_id: str
    reported_user_email: str | None
    content_type: str
    content_id: str
    reason: str
    description: str | None
    status: str
    admin_notes: str | None
    reviewed_by: str | None
    reviewed_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True

class ReportReview(BaseModel):
    status: str  # "reviewed", "dismissed", "actioned"
    admin_notes: str | None = None

class DeleteContentRequest(BaseModel):
    reason: str

# ===== ENDPOINTS =====

@router.get("/stats", response_model=ContentStats)
async def get_content_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Get overall content statistics"""

    total_tasks = db.query(Task).filter(Task.deletedAt == None).count()
    total_journals = db.query(DailyJournal).filter(DailyJournal.deletedAt == None).count()
    try:
        total_goals = db.query(Goal).count()
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error querying total goals: {str(e)}")
        total_goals = 0
    total_reports = db.query(Report).count()
    pending_reports = db.query(Report).filter(Report.status == "pending").count()

    # Tasks created today
    today = datetime.utcnow().date().isoformat()
    tasks_today = db.query(Task).filter(
        Task.date == today,
        Task.deletedAt == None
    ).count()

    # Goal statistics with error handling for SQLite missing table
    try:
        active_goals = db.query(Goal).filter(Goal.status == "active").count()
        completed_goals = db.query(Goal).filter(Goal.status == "completed").count()
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error querying goals table: {str(e)}")
        
        # If table is missing, try to create it
        if "no such table: goals" in str(e).lower():
            try:
                from app.db.session import engine, Base
                # Import Goal to ensure it's registered in Base.metadata
                from app.models.goal import Goal
                Base.metadata.create_all(bind=engine, tables=[Goal.__table__])
                logger.info("Created goals table on demand")
            except Exception as create_error:
                logger.error(f"Failed to create goals table: {str(create_error)}")
        
        active_goals = 0
        completed_goals = 0

    return ContentStats(
        total_tasks=total_tasks,
        total_journals=total_journals,
        total_goals=total_goals,
        total_reports=total_reports,
        pending_reports=pending_reports,
        tasks_today=tasks_today,
        active_goals=active_goals,
        completed_goals=completed_goals
    )

@router.get("/tasks")
async def list_tasks(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    user_id: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """List all tasks with filters"""

    query = db.query(Task).filter(Task.deletedAt == None)

    if user_id:
        query = query.filter(Task.userId == user_id)

    if status:
        query = query.filter(Task.status == status)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(Task.title.ilike(search_filter))

    # Order by most recent
    query = query.order_by(desc(Task.created_at))

    total = query.count()
    tasks = query.offset((page - 1) * size).limit(size).all()

    # Enrich with user info
    result = []
    for task in tasks:
        user = db.query(User).filter(User.id == task.userId).first()
        result.append({
            **task.__dict__,
            "user_email": user.email if user else None,
            "user_name": user.name if user else None
        })

    return {
        "tasks": result,
        "total": total,
        "page": page,
        "size": size
    }

@router.get("/journals")
async def list_journals(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    user_id: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """List all journals with filters"""

    query = db.query(DailyJournal).filter(DailyJournal.deletedAt == None)

    if user_id:
        query = query.filter(DailyJournal.userId == user_id)

    query = query.order_by(desc(DailyJournal.created_at))

    total = query.count()
    journals = query.offset((page - 1) * size).limit(size).all()

    # Enrich with user info
    result = []
    for journal in journals:
        user = db.query(User).filter(User.id == journal.userId).first()
        result.append({
            **journal.__dict__,
            "user_email": user.email if user else None,
            "user_name": user.name if user else None
        })

    return {
        "journals": result,
        "total": total,
        "page": page,
        "size": size
    }

@router.get("/goals")
async def list_goals(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    user_id: Optional[str] = None,
    status: Optional[str] = None,
    type: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """List all goals with filters"""

    try:
        query = db.query(Goal)

        if user_id:
            query = query.filter(Goal.userId == user_id)

        if status:
            query = query.filter(Goal.status == status)

        if type:
            query = query.filter(Goal.type == type)

        query = query.order_by(desc(Goal.createdAt))

        total = query.count()
        goals = query.offset((page - 1) * size).limit(size).all()
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error querying goals list: {str(e)}")
        return {
            "goals": [],
            "total": 0,
            "page": page,
            "size": size,
            "error": "Goals table is being initialized" if "no such table" in str(e).lower() else str(e)
        }

    # Enrich with user info
    result = []
    for goal in goals:
        user = db.query(User).filter(User.id == goal.userId).first()
        result.append({
            **goal.__dict__,
            "user_email": user.email if user else None,
            "user_name": user.name if user else None
        })

    return {
        "goals": result,
        "total": total,
        "page": page,
        "size": size
    }

@router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: str,
    request: DeleteContentRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Soft delete a task (mark as deleted)"""

    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.deletedAt = datetime.utcnow()
    db.commit()

    return {"message": "Task deleted successfully", "reason": request.reason}

@router.delete("/journals/{journal_id}")
async def delete_journal(
    journal_id: str,
    request: DeleteContentRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Soft delete a journal"""

    journal = db.query(DailyJournal).filter(DailyJournal.id == journal_id).first()
    if not journal:
        raise HTTPException(status_code=404, detail="Journal not found")

    journal.deletedAt = datetime.utcnow()
    db.commit()

    return {"message": "Journal deleted successfully", "reason": request.reason}

@router.delete("/goals/{goal_id}")
async def delete_goal(
    goal_id: str,
    request: DeleteContentRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Delete a goal (permanent delete for goals)"""

    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    db.delete(goal)
    db.commit()

    return {"message": "Goal deleted successfully", "reason": request.reason}

# ===== REPORTS MANAGEMENT =====

@router.get("/reports")
async def list_reports(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    content_type: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """List all content reports"""

    query = db.query(Report)

    if status:
        query = query.filter(Report.status == status)

    if content_type:
        query = query.filter(Report.content_type == content_type)

    query = query.order_by(desc(Report.created_at))

    total = query.count()
    reports = query.offset((page - 1) * size).limit(size).all()

    # Enrich with user info
    result = []
    for report in reports:
        reporter = db.query(User).filter(User.id == report.reporter_id).first()
        reported_user = db.query(User).filter(User.id == report.reported_user_id).first()

        result.append({
            **report.__dict__,
            "reporter_email": reporter.email if reporter else None,
            "reported_user_email": reported_user.email if reported_user else None
        })

    return {
        "reports": result,
        "total": total,
        "page": page,
        "size": size
    }

@router.patch("/reports/{report_id}")
async def review_report(
    report_id: str,
    review: ReportReview,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Review a content report"""

    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    report.status = review.status
    report.admin_notes = review.admin_notes
    report.reviewed_by = admin.id
    report.reviewed_at = datetime.utcnow()

    db.commit()
    db.refresh(report)

    return {"message": "Report reviewed successfully", "report": report}
