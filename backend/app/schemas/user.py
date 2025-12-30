from pydantic import BaseModel, EmailStr
from datetime import datetime

class UserBase(BaseModel):
    id: str
    name: str
    username: str | None = None
    avatar_url: str | None = None
    email: EmailStr
    education_level: str | None = None
    job_title: str | None = None
    general_goal: str | None = None
    income_level: str | None = None
    mbti_type: str | None = None
    bio: str | None = None
    skills: str | None = None
    location: str | None = None
    level: str = "Iron"
    xp: int = 0

class UserCreate(UserBase):
    password: str

class User(UserBase):
    created_at: datetime
    updatedAt: datetime
    deletedAt: datetime | None = None

    class Config:
        from_attributes = True