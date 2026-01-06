from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.session import get_db
from app.models.user import User
from app.schemas.user import User as UserSchema
from app.auth.dependencies import get_current_admin, get_current_superuser
from app.core.roles import Role

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    responses={404: {"description": "Not found"}},
)

class UserListResponse(BaseModel):
    users: List[UserSchema]
    total: int
    page: int
    size: int

class RoleUpdate(BaseModel):
    role: Role

class StatusUpdate(BaseModel):
    is_banned: bool

class GamificationUpdate(BaseModel):
    xp: Optional[int] = None
    level: Optional[str] = None

@router.get("/users", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[str] = None,
    is_banned: Optional[bool] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    List users with pagination, search, and filters.

    Filters:
    - search: Search by email, name, or username
    - role: Filter by role (USER, ADMIN, SUPERUSER)
    - is_banned: Filter by banned status (true/false)
    """
    query = db.query(User)

    # Search filter
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (User.email.ilike(search_filter)) |
            (User.name.ilike(search_filter)) |
            (User.username.ilike(search_filter))
        )

    # Role filter
    if role:
        try:
            role_enum = Role(role.upper())
            query = query.filter(User.role == role_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role. Must be one of: USER, ADMIN, SUPERUSER"
            )

    # Banned status filter
    if is_banned is not None:
        query = query.filter(User.is_banned == is_banned)

    # Order by created date descending (newest first)
    query = query.order_by(User.created_at.desc())

    total = query.count()
    users = query.offset((page - 1) * size).limit(size).all()

    return {
        "users": users,
        "total": total,
        "page": page,
        "size": size
    }

@router.get("/stats")
async def get_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    from datetime import datetime, timedelta

    # Basic counts
    total_users = db.query(User).count()
    banned_users = db.query(User).filter(User.is_banned == True).count()
    superusers = db.query(User).filter(User.role == Role.SUPERUSER).count()
    admins = db.query(User).filter(User.role == Role.ADMIN).count()

    # Active today (users updated today)
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    active_today = db.query(User).filter(User.updatedAt >= today_start).count()

    # New users in last 7 days
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    new_users_7d = db.query(User).filter(User.created_at >= seven_days_ago).count()

    return {
        "totalUsers": total_users,
        "activeToday": active_today,
        "bannedUsers": banned_users,
        "newUsers7d": new_users_7d,
        "distribution": {
            "superusers": superusers,
            "admins": admins,
            "users": total_users - superusers - admins
        }
    }

@router.patch("/users/{user_id}/role", response_model=UserSchema)
async def update_user_role(
    user_id: str,
    role_update: RoleUpdate,
    db: Session = Depends(get_db),
    superuser: User = Depends(get_current_superuser)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent demoting self
    if user.id == superuser.id and role_update.role != Role.SUPERUSER:
         raise HTTPException(status_code=400, detail="Cannot demote yourself")

    user.role = role_update.role
    db.commit()
    db.refresh(user)
    return user

@router.patch("/users/{user_id}/status", response_model=UserSchema)
async def update_user_status(
    user_id: str,
    status_update: StatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Prevent banning self or superusers (unless you are superuser, but even then caution)
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot ban yourself")
    
    if user.role == Role.SUPERUSER and admin.role != Role.SUPERUSER:
        raise HTTPException(status_code=403, detail="Admins cannot ban Superusers")

    user.is_banned = status_update.is_banned
    db.commit()
    db.refresh(user)
    return user

@router.patch("/users/{user_id}/gamification", response_model=UserSchema)
async def update_user_gamification(
    user_id: str,
    gamification: GamificationUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if gamification.xp is not None:
        user.xp = gamification.xp
        # Auto-calculate level if not explicitly provided
        if gamification.level is None:
            from app.services.leveling_service import calculate_level_from_xp
            user.level = calculate_level_from_xp(user.xp)
            
    if gamification.level is not None:
        user.level = gamification.level

    db.commit()
    db.refresh(user)
    return user
