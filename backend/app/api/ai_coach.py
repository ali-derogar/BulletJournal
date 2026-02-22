from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_active_user
from app.db.session import get_db
from app.models.ai_coach import AICoachPreference, AIDigestReport
from app.models.user import User
from app.schemas.ai_coach import (
    AICoachDigestRunRequest,
    AICoachDigestReportResponse,
    AICoachMemoryResponse,
    AICoachPreferenceResponse,
    AICoachPreferenceUpdate,
)
from app.services.ai_digest_service import ai_digest_service
from app.services.ai_memory_service import ai_memory_service

router = APIRouter(prefix="/ai-coach", tags=["ai-coach"])


@router.get("/preferences", response_model=AICoachPreferenceResponse)
async def get_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    pref = ai_digest_service.get_or_create_preferences(db, current_user.id)
    return pref


@router.put("/preferences", response_model=AICoachPreferenceResponse)
async def update_preferences(
    payload: AICoachPreferenceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    pref = ai_digest_service.get_or_create_preferences(db, current_user.id)

    pref.timezone = payload.timezone
    pref.language = payload.language

    pref.daily_digest_enabled = payload.daily_digest_enabled
    pref.daily_digest_hour = payload.daily_digest_hour
    pref.daily_digest_minute = payload.daily_digest_minute

    pref.weekly_digest_enabled = payload.weekly_digest_enabled
    pref.monthly_digest_enabled = payload.monthly_digest_enabled
    pref.yearly_digest_enabled = payload.yearly_digest_enabled

    pref.critique_style = payload.critique_style

    pref.quiet_hours_enabled = payload.quiet_hours_enabled
    pref.quiet_hours_start = payload.quiet_hours_start
    pref.quiet_hours_end = payload.quiet_hours_end

    db.commit()
    db.refresh(pref)
    return pref


@router.get("/reports", response_model=list[AICoachDigestReportResponse])
async def get_reports(
    limit: int = Query(default=20, ge=1, le=100),
    digest_type: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = db.query(AIDigestReport).filter(AIDigestReport.user_id == current_user.id)
    if digest_type:
        query = query.filter(AIDigestReport.digest_type == digest_type)

    reports = query.order_by(AIDigestReport.created_at.desc()).limit(limit).all()
    return [ai_digest_service.serialize_report(r) for r in reports]


@router.post("/run-digest")
async def run_digest(
    payload: AICoachDigestRunRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    target: Optional[date] = None
    if payload.target_date:
        try:
            target = date.fromisoformat(payload.target_date)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="target_date must be YYYY-MM-DD") from exc

    result = await ai_digest_service.generate_digest_for_user(
        db,
        current_user.id,
        digest_type=payload.digest_type,
        target_date=target,
        force=payload.force,
        created_by="manual",
        deliver_notification=payload.deliver_notification,
        require_push_subscription=False,
    )
    return result


@router.get("/memory", response_model=list[AICoachMemoryResponse])
async def get_memory(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return ai_memory_service.get_memory_context(db, current_user.id, limit=limit)


@router.delete("/memory/{memory_id}")
async def delete_memory(
    memory_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    deleted = ai_memory_service.delete_memory(db, current_user.id, memory_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Memory item not found")

    db.commit()
    return {"message": "Memory item deleted"}


@router.post("/memory/decay")
async def run_memory_decay(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    changed = ai_memory_service.decay_memories(db, user_id=current_user.id)
    db.commit()
    return {"updated": changed}
