from pydantic import BaseModel, EmailStr
from typing import Optional

class UserCreate(BaseModel):
    name: str
    username: str
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
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    education_level: Optional[str] = None
    job_title: Optional[str] = None
    general_goal: Optional[str] = None
    income_level: Optional[str] = None
    mbti_type: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[str] = None
    location: Optional[str] = None


# NEW: Email Verification & Password Reset Schemas
class VerifyEmailRequest(BaseModel):
    """Request to verify email with token"""
    token: str


class ForgotPasswordRequest(BaseModel):
    """Request to initiate password reset"""
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Request to reset password with token"""
    token: str
    new_password: str


class EmailVerificationResponse(BaseModel):
    """Response for email verification"""
    message: str
    email_verified: bool


class PasswordResetResponse(BaseModel):
    """Response for password reset"""
    message: str
    success: bool
