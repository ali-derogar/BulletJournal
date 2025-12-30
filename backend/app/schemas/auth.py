from pydantic import BaseModel, EmailStr
from typing import Optional

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    user_id: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    education_level: Optional[str] = None
    job_title: Optional[str] = None
    general_goal: Optional[str] = None
    income_level: Optional[str] = None
    mbti_type: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[str] = None
    location: Optional[str] = None