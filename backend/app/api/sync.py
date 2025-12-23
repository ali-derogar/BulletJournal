from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from slowapi import Limiter
from slowapi.util import get_remote_address
import logging

from app.db.session import get_db
from app.models.task import Task
from app.models.expense import Expense
from app.models.journal import DailyJournal
from app.models.reflection import Reflection
from app.schemas.sync import SyncData, SyncResponse
from app.auth.router import get_current_user
from app.models.user import User

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)
logger = logging.getLogger(__name__)

def upsert_task(db: Session, task_data: dict, user_id: str) -> bool:
    """Upsert a task. Returns True if conflict was resolved."""
    task_id = task_data["id"]
    client_updated_at = task_data.get("updatedAt")

    # Parse client_updated_at if it's a string
    if isinstance(client_updated_at, str):
        try:
            from dateutil import parser
            client_updated_at = parser.parse(client_updated_at)
        except:
            client_updated_at = None

    # Check if task exists AND belongs to the current user
    existing_task = db.query(Task).filter(Task.id == task_id, Task.userId == user_id).first()

    if existing_task:
        # Compare updatedAt for conflict resolution (last-write-wins)
        if client_updated_at and existing_task.updatedAt:
            if client_updated_at > existing_task.updatedAt:
                # Client has newer version, update
                for key, value in task_data.items():
                    if hasattr(existing_task, key) and key != "id":
                        setattr(existing_task, key, value)
                existing_task.updatedAt = datetime.utcnow()
                db.commit()
                return False  # No conflict, just updated
            else:
                # Server has newer or equal version, keep server version
                return True  # Conflict resolved by keeping server version
        else:
            # No updatedAt comparison possible, update with client data
            for key, value in task_data.items():
                if hasattr(existing_task, key) and key != "id":
                    setattr(existing_task, key, value)
            existing_task.updatedAt = datetime.utcnow()
            db.commit()
            return False
    else:
        # Check if task exists but belongs to another user (security check)
        existing_task_other_user = db.query(Task).filter(Task.id == task_id).first()
        if existing_task_other_user:
            # Task exists but belongs to another user - this is a security violation
            raise HTTPException(
                status_code=403,
                detail=f"Cannot modify task {task_id} belonging to another user"
            )

        # Create new task
        task_data["userId"] = user_id
        new_task = Task(**task_data)
        new_task.updatedAt = datetime.utcnow()
        db.add(new_task)
        db.commit()
        db.refresh(new_task)
        return False

def upsert_expense(db: Session, expense_data: dict, user_id: str) -> bool:
    """Upsert an expense. Returns True if conflict was resolved."""
    expense_id = expense_data["id"]
    client_updated_at = expense_data.get("updatedAt")

    # Parse client_updated_at if it's a string
    if isinstance(client_updated_at, str):
        try:
            from dateutil import parser
            client_updated_at = parser.parse(client_updated_at)
        except:
            client_updated_at = None

    existing_expense = db.query(Expense).filter(Expense.id == expense_id, Expense.userId == user_id).first()

    if existing_expense:
        if client_updated_at and existing_expense.updatedAt:
            if client_updated_at > existing_expense.updatedAt:
                for key, value in expense_data.items():
                    if hasattr(existing_expense, key) and key != "id":
                        setattr(existing_expense, key, value)
                existing_expense.updatedAt = datetime.utcnow()
                db.commit()
                return False
            else:
                return True
        else:
            for key, value in expense_data.items():
                if hasattr(existing_expense, key) and key != "id":
                    setattr(existing_expense, key, value)
            existing_expense.updatedAt = datetime.utcnow()
            db.commit()
            return False
    else:
        # Check if expense exists but belongs to another user (security check)
        existing_expense_other_user = db.query(Expense).filter(Expense.id == expense_id).first()
        if existing_expense_other_user:
            # Expense exists but belongs to another user - this is a security violation
            raise HTTPException(
                status_code=403,
                detail=f"Cannot modify expense {expense_id} belonging to another user"
            )

        expense_data["userId"] = user_id
        new_expense = Expense(**expense_data)
        new_expense.updatedAt = datetime.utcnow()
        db.add(new_expense)
        db.commit()
        db.refresh(new_expense)
        return False

def upsert_journal(db: Session, journal_data: dict, user_id: str) -> bool:
    """Upsert a journal. Returns True if conflict was resolved."""
    journal_id = journal_data["id"]
    client_updated_at = journal_data.get("updatedAt")

    # Parse client_updated_at if it's a string
    if isinstance(client_updated_at, str):
        try:
            from dateutil import parser
            client_updated_at = parser.parse(client_updated_at)
        except:
            client_updated_at = None

    existing_journal = db.query(DailyJournal).filter(DailyJournal.id == journal_id, DailyJournal.userId == user_id).first()

    if existing_journal:
        if client_updated_at and existing_journal.updatedAt:
            if client_updated_at > existing_journal.updatedAt:
                for key, value in journal_data.items():
                    if hasattr(existing_journal, key) and key != "id":
                        setattr(existing_journal, key, value)
                existing_journal.updatedAt = datetime.utcnow()
                db.commit()
                return False
            else:
                return True
        else:
            for key, value in journal_data.items():
                if hasattr(existing_journal, key) and key != "id":
                    setattr(existing_journal, key, value)
            existing_journal.updatedAt = datetime.utcnow()
            db.commit()
            return False
    else:
        # Check if journal exists but belongs to another user (security check)
        existing_journal_other_user = db.query(DailyJournal).filter(DailyJournal.id == journal_id).first()
        if existing_journal_other_user:
            # Journal exists but belongs to another user - this is a security violation
            raise HTTPException(
                status_code=403,
                detail=f"Cannot modify journal {journal_id} belonging to another user"
            )

        journal_data["userId"] = user_id
        new_journal = DailyJournal(**journal_data)
        new_journal.updatedAt = datetime.utcnow()
        db.add(new_journal)
        db.commit()
        db.refresh(new_journal)
        return False

def upsert_reflection(db: Session, reflection_data: dict, user_id: str) -> bool:
    """Upsert a reflection. Returns True if conflict was resolved."""
    reflection_id = reflection_data["id"]
    client_updated_at = reflection_data.get("updatedAt")

    # Parse client_updated_at if it's a string
    if isinstance(client_updated_at, str):
        try:
            from dateutil import parser
            client_updated_at = parser.parse(client_updated_at)
        except:
            client_updated_at = None

    existing_reflection = db.query(Reflection).filter(Reflection.id == reflection_id, Reflection.userId == user_id).first()

    if existing_reflection:
        if client_updated_at and existing_reflection.updatedAt:
            if client_updated_at > existing_reflection.updatedAt:
                for key, value in reflection_data.items():
                    if hasattr(existing_reflection, key) and key != "id":
                        setattr(existing_reflection, key, value)
                existing_reflection.updatedAt = datetime.utcnow()
                db.commit()
                return False
            else:
                return True
        else:
            for key, value in reflection_data.items():
                if hasattr(existing_reflection, key) and key != "id":
                    setattr(existing_reflection, key, value)
            existing_reflection.updatedAt = datetime.utcnow()
            db.commit()
            return False
    else:
        # Check if reflection exists but belongs to another user (security check)
        existing_reflection_other_user = db.query(Reflection).filter(Reflection.id == reflection_id).first()
        if existing_reflection_other_user:
            # Reflection exists but belongs to another user - this is a security violation
            raise HTTPException(
                status_code=403,
                detail=f"Cannot modify reflection {reflection_id} belonging to another user"
            )

        reflection_data["userId"] = user_id
        new_reflection = Reflection(**reflection_data)
        new_reflection.updatedAt = datetime.utcnow()
        db.add(new_reflection)
        db.commit()
        db.refresh(new_reflection)
        return False

@router.post("/sync", response_model=SyncResponse)
@limiter.limit("30/minute")  # Rate limit: 30 syncs per minute per user
async def sync_data(
    request: Request,
    sync_data: SyncData,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Sync client data with server using upsert and conflict resolution."""
    try:
        synced_tasks = 0
        synced_expenses = 0
        synced_journals = 0
        synced_reflections = 0
        conflicts_resolved = 0

        # Input validation: Check for reasonable data sizes
        total_items = (
            len(sync_data.tasks) +
            len(sync_data.expenses) +
            len(sync_data.journals) +
            len(sync_data.reflections)
        )

        if total_items > 1000:
            logger.warning(f"User {current_user.id} attempted to sync {total_items} items")
            raise HTTPException(
                status_code=400,
                detail="Too many items to sync at once. Maximum is 1000 items."
            )

        # Security: Verify user owns all items by checking userId fields
        for task in sync_data.tasks:
            task_dict = task.dict() if hasattr(task, 'dict') else task.__dict__
            if task_dict.get("userId") and task_dict["userId"] != current_user.id:
                raise HTTPException(
                    status_code=403,
                    detail="Cannot sync items belonging to another user"
                )

        # Sync tasks (batch operations for better performance)
        for task in sync_data.tasks:
            task_dict = task.dict() if hasattr(task, 'dict') else task.__dict__
            if upsert_task(db, task_dict, current_user.id):
                conflicts_resolved += 1
            synced_tasks += 1

        # Sync expenses
        for expense in sync_data.expenses:
            expense_dict = expense.dict() if hasattr(expense, 'dict') else expense.__dict__
            if upsert_expense(db, expense_dict, current_user.id):
                conflicts_resolved += 1
            synced_expenses += 1

        # Sync journals
        for journal in sync_data.journals:
            journal_dict = journal.dict() if hasattr(journal, 'dict') else journal.__dict__
            if upsert_journal(db, journal_dict, current_user.id):
                conflicts_resolved += 1
            synced_journals += 1

        # Sync reflections
        for reflection in sync_data.reflections:
            reflection_dict = reflection.dict() if hasattr(reflection, 'dict') else reflection.__dict__
            if upsert_reflection(db, reflection_dict, current_user.id):
                conflicts_resolved += 1
            synced_reflections += 1

        logger.info(
            f"User {current_user.id} synced {total_items} items "
            f"(tasks={synced_tasks}, expenses={synced_expenses}, "
            f"journals={synced_journals}, reflections={synced_reflections}, "
            f"conflicts={conflicts_resolved})"
        )

        return SyncResponse(
            synced_tasks=synced_tasks,
            synced_expenses=synced_expenses,
            synced_journals=synced_journals,
            synced_reflections=synced_reflections,
            conflicts_resolved=conflicts_resolved
        )

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Sync failed for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Sync failed: {str(e)}"
        )

@router.post("/sync/download", response_model=SyncResponse)
@limiter.limit("30/minute")  # Rate limit: 30 downloads per minute per user
async def download_data(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Download all user data from server."""
    try:
        # Fetch all data for the current user
        tasks = db.query(Task).filter(Task.userId == current_user.id).all()
        expenses = db.query(Expense).filter(Expense.userId == current_user.id).all()
        journals = db.query(DailyJournal).filter(DailyJournal.userId == current_user.id).all()
        reflections = db.query(Reflection).filter(Reflection.userId == current_user.id).all()

        logger.info(
            f"User {current_user.id} downloaded data: "
            f"tasks={len(tasks)}, expenses={len(expenses)}, "
            f"journals={len(journals)}, reflections={len(reflections)}"
        )

        # Return counts (frontend will handle actual data separately)
        return SyncResponse(
            synced_tasks=len(tasks),
            synced_expenses=len(expenses),
            synced_journals=len(journals),
            synced_reflections=len(reflections),
            conflicts_resolved=0
        )

    except Exception as e:
        logger.error(f"Download failed for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Download failed: {str(e)}"
        )