from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone
from slowapi import Limiter
from slowapi.util import get_remote_address
import logging

from app.db.session import get_db
from app.models.task import Task
from app.models.expense import Expense
from app.models.journal import DailyJournal
from app.models.reflection import Reflection
from app.models.goal import Goal
from app.models.calendar_note import CalendarNote
from app.schemas.sync import SyncData, SyncResponse
from app.auth.router import get_current_user
from app.models.user import User
from app.services.leveling_service import gain_xp

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
            # Ensure timezone-aware (add UTC if naive)
            if client_updated_at.tzinfo is None:
                client_updated_at = client_updated_at.replace(tzinfo=timezone.utc)
        except:
            client_updated_at = None

    # Map frontend field names to database field names
    db_task_data = task_data.copy()
    task_field_mappings = {
        'createdAt': 'created_at',
        'timerRunning': 'timer_running',
        'timerStart': 'timer_start',
        'estimatedTime': 'estimated_time',
        'isUseful': 'is_useful',
        'accumulatedTime': 'accumulated_time',
        'isCopiedToNextDay': 'is_copied_to_next_day',
    }
    for frontend_field, db_field in task_field_mappings.items():
        if frontend_field in db_task_data:
            db_task_data[db_field] = db_task_data.pop(frontend_field)

    # Convert string datetime fields to datetime objects
    datetime_fields = ['created_at', 'updatedAt', 'deletedAt', 'timer_start']
    for field in datetime_fields:
        if field in db_task_data and isinstance(db_task_data[field], str):
            try:
                from dateutil import parser
                parsed_dt = parser.parse(db_task_data[field])
                # Ensure timezone-aware (add UTC if naive)
                if parsed_dt.tzinfo is None:
                    parsed_dt = parsed_dt.replace(tzinfo=timezone.utc)
                db_task_data[field] = parsed_dt
            except:
                db_task_data[field] = None

    # Check if task exists AND belongs to the current user
    existing_task = db.query(Task).filter(Task.id == task_id, Task.userId == user_id).first()

    if existing_task:
        # Compare updatedAt for conflict resolution (last-write-wins)
        if client_updated_at and existing_task.updatedAt:
            # Ensure server updatedAt is timezone-aware for comparison
            server_updated_at = existing_task.updatedAt
            if server_updated_at.tzinfo is None:
                server_updated_at = server_updated_at.replace(tzinfo=timezone.utc)
            if client_updated_at > server_updated_at:
                # Check for completion (todo/in-progress -> done)
                was_done = (existing_task.status == "done")
                is_done = (db_task_data.get("status") == "done")
                
                # Client has newer version, update
                for key, value in db_task_data.items():
                    if hasattr(existing_task, key) and key != "id" and key != "userId":
                        setattr(existing_task, key, value)
                existing_task.updatedAt = datetime.now(timezone.utc)
                db.commit()
                
                # Award XP if completed
                if is_done and not was_done:
                    user = db.query(User).filter(User.id == user_id).first()
                    if user:
                        gain_xp(db, user, amount=10)
                
                return False  # No conflict, just updated
            else:
                # Server has newer or equal version, keep server version
                return True  # Conflict resolved by keeping server version
        else:
            # No updatedAt comparison possible, update with client data
            for key, value in db_task_data.items():
                if hasattr(existing_task, key) and key != "id" and key != "userId":
                    setattr(existing_task, key, value)
            existing_task.updatedAt = datetime.now(timezone.utc)
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
        db_task_data["userId"] = user_id
        new_task = Task(**db_task_data)
        new_task.updatedAt = datetime.now(timezone.utc)
        db.add(new_task)
        db.commit()
        db.refresh(new_task)
        
        # Award XP for creation
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            gain_xp(db, user, amount=2)
            
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
            # Ensure timezone-aware (add UTC if naive)
            if client_updated_at.tzinfo is None:
                client_updated_at = client_updated_at.replace(tzinfo=timezone.utc)
        except:
            client_updated_at = None

    # Map frontend field names to database field names
    db_expense_data = expense_data.copy()
    expense_mappings = {
        'createdAt': 'created_at',
    }
    for frontend_field, db_field in expense_mappings.items():
        if frontend_field in db_expense_data:
            db_expense_data[db_field] = db_expense_data.pop(frontend_field)

    # Convert string datetime fields to datetime objects
    datetime_fields = ['created_at', 'updatedAt', 'deletedAt']
    for field in datetime_fields:
        if field in db_expense_data and isinstance(db_expense_data[field], str):
            try:
                from dateutil import parser
                parsed_dt = parser.parse(db_expense_data[field])
                # Ensure timezone-aware (add UTC if naive)
                if parsed_dt.tzinfo is None:
                    parsed_dt = parsed_dt.replace(tzinfo=timezone.utc)
                db_expense_data[field] = parsed_dt
            except:
                db_expense_data[field] = None

    existing_expense = db.query(Expense).filter(Expense.id == expense_id, Expense.userId == user_id).first()

    if existing_expense:
        if client_updated_at and existing_expense.updatedAt:
            # Ensure server updatedAt is timezone-aware for comparison
            server_updated_at = existing_expense.updatedAt
            if server_updated_at.tzinfo is None:
                server_updated_at = server_updated_at.replace(tzinfo=timezone.utc)
            if client_updated_at > server_updated_at:
                for key, value in db_expense_data.items():
                    if hasattr(existing_expense, key) and key != "id" and key != "userId":
                        setattr(existing_expense, key, value)
                existing_expense.updatedAt = datetime.now(timezone.utc)
                db.commit()
                return False
            else:
                return True
        else:
            for key, value in db_expense_data.items():
                if hasattr(existing_expense, key) and key != "id" and key != "userId":
                    setattr(existing_expense, key, value)
            existing_expense.updatedAt = datetime.now(timezone.utc)
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

        db_expense_data["userId"] = user_id
        new_expense = Expense(**db_expense_data)
        new_expense.updatedAt = datetime.now(timezone.utc)
        db.add(new_expense)
        db.commit()
        db.refresh(new_expense)
        
        # Award XP for expense tracking
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            gain_xp(db, user, amount=3)
            
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
            # Ensure timezone-aware (add UTC if naive)
            if client_updated_at.tzinfo is None:
                client_updated_at = client_updated_at.replace(tzinfo=timezone.utc)
        except:
            client_updated_at = None

    # Map frontend field names to database field names
    db_journal_data = journal_data.copy()
    if "sleepId" in db_journal_data:
        db_journal_data["sleep_id"] = db_journal_data.pop("sleepId")
    if "moodId" in db_journal_data:
        db_journal_data["mood_id"] = db_journal_data.pop("moodId")
    if "createdAt" in db_journal_data:
        db_journal_data["created_at"] = db_journal_data.pop("createdAt")

    # Convert string datetime fields to datetime objects
    datetime_fields = ['created_at', 'updatedAt', 'deletedAt']
    for field in datetime_fields:
        if field in db_journal_data and isinstance(db_journal_data[field], str):
            try:
                from dateutil import parser
                parsed_dt = parser.parse(db_journal_data[field])
                # Ensure timezone-aware (add UTC if naive)
                if parsed_dt.tzinfo is None:
                    parsed_dt = parsed_dt.replace(tzinfo=timezone.utc)
                db_journal_data[field] = parsed_dt
            except:
                db_journal_data[field] = None

    existing_journal = db.query(DailyJournal).filter(DailyJournal.id == journal_id, DailyJournal.userId == user_id).first()

    if existing_journal:
        if client_updated_at and existing_journal.updatedAt:
            # Ensure server updatedAt is timezone-aware for comparison
            server_updated_at = existing_journal.updatedAt
            if server_updated_at.tzinfo is None:
                server_updated_at = server_updated_at.replace(tzinfo=timezone.utc)
            if client_updated_at > server_updated_at:
                for key, value in db_journal_data.items():
                    if hasattr(existing_journal, key) and key != "id" and key != "userId":
                        setattr(existing_journal, key, value)
                existing_journal.updatedAt = datetime.now(timezone.utc)
                db.commit()
                return False
            else:
                return True
        else:
            for key, value in db_journal_data.items():
                if hasattr(existing_journal, key) and key != "id" and key != "userId":
                    setattr(existing_journal, key, value)
            existing_journal.updatedAt = datetime.now(timezone.utc)
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

        db_journal_data["userId"] = user_id
        new_journal = DailyJournal(**db_journal_data)
        new_journal.updatedAt = datetime.now(timezone.utc)
        db.add(new_journal)
        db.commit()
        db.refresh(new_journal)
        
        # Award XP for journaling
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            gain_xp(db, user, amount=15)
            
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
            # Ensure timezone-aware (add UTC if naive)
            if client_updated_at.tzinfo is None:
                client_updated_at = client_updated_at.replace(tzinfo=timezone.utc)
        except:
            client_updated_at = None

    existing_reflection = db.query(Reflection).filter(Reflection.id == reflection_id, Reflection.userId == user_id).first()

    if existing_reflection:
        if client_updated_at and existing_reflection.updatedAt:
            # Ensure server updatedAt is timezone-aware for comparison
            server_updated_at = existing_reflection.updatedAt
            if server_updated_at.tzinfo is None:
                server_updated_at = server_updated_at.replace(tzinfo=timezone.utc)
            if client_updated_at > server_updated_at:
                for key, value in reflection_data.items():
                    if hasattr(existing_reflection, key) and key != "id":
                        setattr(existing_reflection, key, value)
                existing_reflection.updatedAt = datetime.now(timezone.utc)
                db.commit()
                return False
            else:
                return True
        else:
            for key, value in reflection_data.items():
                if hasattr(existing_reflection, key) and key != "id":
                    setattr(existing_reflection, key, value)
            existing_reflection.updatedAt = datetime.now(timezone.utc)
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

        # Map frontend field names to database field names
        db_reflection_data = reflection_data.copy()
        reflection_mappings = {
            'createdAt': 'created_at',
            'updatedAt': 'updatedAt',
            'deletedAt': 'deletedAt',
        }
        for frontend_field, db_field in reflection_mappings.items():
            if frontend_field in db_reflection_data:
                db_reflection_data[db_field] = db_reflection_data.pop(frontend_field)

        # Convert string datetime fields to datetime objects
        datetime_fields = ['created_at', 'updatedAt', 'deletedAt']
        for field in datetime_fields:
            if field in db_reflection_data and isinstance(db_reflection_data[field], str):
                try:
                    from dateutil import parser
                    parsed_dt = parser.parse(db_reflection_data[field])
                    # Ensure timezone-aware (add UTC if naive)
                    if parsed_dt.tzinfo is None:
                        parsed_dt = parsed_dt.replace(tzinfo=timezone.utc)
                    db_reflection_data[field] = parsed_dt
                except:
                    db_reflection_data[field] = None

        db_reflection_data["userId"] = user_id
        new_reflection = Reflection(**db_reflection_data)
        new_reflection.updatedAt = datetime.now(timezone.utc)
        db.add(new_reflection)
        db.commit()
        db.refresh(new_reflection)
        
        # Award XP for reflection
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            gain_xp(db, user, amount=20)
            
        return False

def upsert_goal(db: Session, goal_data: dict, user_id: str) -> bool:
    """Upsert a goal. Returns True if conflict was resolved."""
    goal_id = goal_data["id"]
    client_updated_at = goal_data.get("updatedAt")

    # Parse client_updated_at if it's a string
    if isinstance(client_updated_at, str):
        try:
            from dateutil import parser
            client_updated_at = parser.parse(client_updated_at)
            # Ensure timezone-aware (add UTC if naive)
            if client_updated_at.tzinfo is None:
                client_updated_at = client_updated_at.replace(tzinfo=timezone.utc)
        except:
            client_updated_at = None

    # Convert string datetime fields to datetime objects
    db_goal_data = goal_data.copy()
    datetime_fields = ['createdAt', 'updatedAt', 'completedAt']
    for field in datetime_fields:
        if field in db_goal_data and isinstance(db_goal_data[field], str):
            try:
                from dateutil import parser
                parsed_dt = parser.parse(db_goal_data[field])
                # Ensure timezone-aware (add UTC if naive)
                if parsed_dt.tzinfo is None:
                    parsed_dt = parsed_dt.replace(tzinfo=timezone.utc)
                db_goal_data[field] = parsed_dt
            except:
                db_goal_data[field] = None

    existing_goal = db.query(Goal).filter(Goal.id == goal_id, Goal.userId == user_id).first()

    if existing_goal:
        if client_updated_at and existing_goal.updatedAt:
            # Ensure server updatedAt is timezone-aware for comparison
            server_updated_at = existing_goal.updatedAt
            if server_updated_at.tzinfo is None:
                server_updated_at = server_updated_at.replace(tzinfo=timezone.utc)
            if client_updated_at > server_updated_at:
                for key, value in db_goal_data.items():
                    if hasattr(existing_goal, key) and key != "id" and key != "userId":
                        setattr(existing_goal, key, value)
                existing_goal.updatedAt = datetime.now(timezone.utc)
                db.commit()
                return False
            else:
                return True
        else:
            for key, value in db_goal_data.items():
                if hasattr(existing_goal, key) and key != "id" and key != "userId":
                    setattr(existing_goal, key, value)
            existing_goal.updatedAt = datetime.now(timezone.utc)
            db.commit()
            return False
    else:
        # Check if goal exists but belongs to another user (security check)
        existing_goal_other_user = db.query(Goal).filter(Goal.id == goal_id).first()
        if existing_goal_other_user:
            raise HTTPException(
                status_code=403,
                detail=f"Cannot modify goal {goal_id} belonging to another user"
            )

        db_goal_data["userId"] = user_id
        new_goal = Goal(**db_goal_data)
        new_goal.updatedAt = datetime.now(timezone.utc)
        db.add(new_goal)
        db.commit()
        db.refresh(new_goal)
        
        # Award XP for goal creation
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            gain_xp(db, user, amount=25)
            
        return False

def upsert_calendar_note(db: Session, note_data: dict, user_id: str) -> bool:
    """Upsert a calendar note. Returns True if conflict was resolved."""
    note_id = note_data["id"]
    client_updated_at = note_data.get("updatedAt")

    # Parse client_updated_at if it's a string
    if isinstance(client_updated_at, str):
        try:
            from dateutil import parser
            client_updated_at = parser.parse(client_updated_at)
            # Ensure timezone-aware (add UTC if naive)
            if client_updated_at.tzinfo is None:
                client_updated_at = client_updated_at.replace(tzinfo=timezone.utc)
        except:
            client_updated_at = None

    # Convert string datetime fields to datetime objects
    db_note_data = note_data.copy()
    datetime_fields = ['createdAt', 'updatedAt']
    for field in datetime_fields:
        if field in db_note_data and isinstance(db_note_data[field], str):
            try:
                from dateutil import parser
                parsed_dt = parser.parse(db_note_data[field])
                # Ensure timezone-aware (add UTC if naive)
                if parsed_dt.tzinfo is None:
                    parsed_dt = parsed_dt.replace(tzinfo=timezone.utc)
                db_note_data[field] = parsed_dt
            except:
                db_note_data[field] = None

    existing_note = db.query(CalendarNote).filter(CalendarNote.id == note_id, CalendarNote.userId == user_id).first()

    if existing_note:
        if client_updated_at and existing_note.updatedAt:
            # Ensure server updatedAt is timezone-aware for comparison
            server_updated_at = existing_note.updatedAt
            if server_updated_at.tzinfo is None:
                server_updated_at = server_updated_at.replace(tzinfo=timezone.utc)
            if client_updated_at > server_updated_at:
                for key, value in db_note_data.items():
                    if hasattr(existing_note, key) and key != "id" and key != "userId":
                        setattr(existing_note, key, value)
                existing_note.updatedAt = datetime.now(timezone.utc)
                db.commit()
                return False
            else:
                return True
        else:
            for key, value in db_note_data.items():
                if hasattr(existing_note, key) and key != "id" and key != "userId":
                    setattr(existing_note, key, value)
            existing_note.updatedAt = datetime.now(timezone.utc)
            db.commit()
            return False
    else:
        # Check if note exists but belongs to another user (security check)
        existing_note_other_user = db.query(CalendarNote).filter(CalendarNote.id == note_id).first()
        if existing_note_other_user:
            raise HTTPException(
                status_code=403,
                detail=f"Cannot modify calendar note {note_id} belonging to another user"
            )

        db_note_data["userId"] = user_id
        new_note = CalendarNote(**db_note_data)
        new_note.updatedAt = datetime.now(timezone.utc)
        db.add(new_note)
        db.commit()
        db.refresh(new_note)
        
        # Award XP for calendar note
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            gain_xp(db, user, amount=5)
            
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
        synced_goals = 0
        synced_calendar_notes = 0
        synced_reflections = 0
        conflicts_resolved = 0

        # Input validation: Check for reasonable data sizes
        total_items = (
            len(sync_data.tasks) +
            len(sync_data.expenses) +
            len(sync_data.journals) +
            len(sync_data.goals) +
            len(sync_data.calendarNotes) +
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

        # Sync goals
        for goal in sync_data.goals:
            goal_dict = goal.dict() if hasattr(goal, 'dict') else goal.__dict__
            if upsert_goal(db, goal_dict, current_user.id):
                conflicts_resolved += 1
            synced_goals += 1

        # Sync calendar notes
        for note in sync_data.calendarNotes:
            note_dict = note.dict() if hasattr(note, 'dict') else note.__dict__
            if upsert_calendar_note(db, note_dict, current_user.id):
                conflicts_resolved += 1
            synced_calendar_notes += 1

        # Sync reflections
        for reflection in sync_data.reflections:
            reflection_dict = reflection.dict() if hasattr(reflection, 'dict') else reflection.__dict__
            if upsert_reflection(db, reflection_dict, current_user.id):
                conflicts_resolved += 1
            synced_reflections += 1

        logger.info(
            f"User {current_user.id} synced {total_items} items "
            f"(tasks={synced_tasks}, expenses={synced_expenses}, "
            f"journals={synced_journals}, goals={synced_goals}, "
            f"calendar_notes={synced_calendar_notes}, reflections={synced_reflections}, "
            f"conflicts={conflicts_resolved})"
        )

        return SyncResponse(
            synced_tasks=synced_tasks,
            synced_expenses=synced_expenses,
            synced_journals=synced_journals,
            synced_goals=synced_goals,
            synced_calendar_notes=synced_calendar_notes,
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

@router.post("/sync/download", response_model=SyncData)
@limiter.limit("30/minute")  # Rate limit: 30 downloads per minute per user
async def download_data(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Download all user data from server."""
    try:
        # Fetch all data for the current user
        # Handle potential column issues gracefully
        try:
            tasks = db.query(Task).filter(Task.userId == current_user.id).all()
        except Exception as e:
            if "no such column" in str(e).lower():
                logger.warning(f"Task table missing columns for user {current_user.id}, returning empty")
                tasks = []
            else:
                raise

        try:
            expenses = db.query(Expense).filter(Expense.userId == current_user.id).all()
        except Exception as e:
            if "no such column" in str(e).lower():
                logger.warning(f"Expense table missing columns for user {current_user.id}, returning empty")
                expenses = []
            else:
                raise

        try:
            journals = db.query(DailyJournal).filter(DailyJournal.userId == current_user.id).all()
        except Exception as e:
            if "no such column" in str(e).lower():
                logger.warning(f"Journal table missing columns for user {current_user.id}, returning empty")
                journals = []
            else:
                raise

        try:
            goals = db.query(Goal).filter(Goal.userId == current_user.id).all()
        except Exception as e:
            if "no such column" in str(e).lower() or "no such table" in str(e).lower():
                logger.warning(f"Goal table missing or has missing columns for user {current_user.id}, returning empty")
                goals = []
            else:
                raise

        try:
            calendar_notes = db.query(CalendarNote).filter(CalendarNote.userId == current_user.id).all()
        except Exception as e:
            if "no such column" in str(e).lower() or "no such table" in str(e).lower():
                logger.warning(f"CalendarNote table missing or has missing columns for user {current_user.id}, returning empty")
                calendar_notes = []
            else:
                raise

        try:
            reflections = db.query(Reflection).filter(Reflection.userId == current_user.id).all()
        except Exception as e:
            if "no such column" in str(e).lower():
                logger.warning(f"Reflection table missing columns for user {current_user.id}, returning empty")
                reflections = []
            else:
                raise

        logger.info(
            f"User {current_user.id} downloaded data: "
            f"tasks={len(tasks)}, expenses={len(expenses)}, "
            f"journals={len(journals)}, goals={len(goals)}, "
            f"calendar_notes={len(calendar_notes)}, reflections={len(reflections)}"
        )

        # Return actual data for frontend to save to IndexedDB
        return SyncData(
            tasks=tasks,
            expenses=expenses,
            journals=journals,
            goals=goals,
            calendarNotes=calendar_notes,
            reflections=reflections
        )

    except Exception as e:
        logger.error(f"Download failed for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Download failed: {str(e)}"
        )