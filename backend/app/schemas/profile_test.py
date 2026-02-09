from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime


class HollandTestAnswerRequest(BaseModel):
    """Request for Holland Career Interest Test answers"""
    answers: Dict[int, str]  # question_id -> answer (R, I, A, S, E, C)


class HollandTestResult(BaseModel):
    """Holland test result"""
    scores: Dict[str, int]  # {"R": 10, "I": 8, ...}
    dominant: str  # "RIS" (top 3 codes)


class MBTITestAnswerRequest(BaseModel):
    """Request for MBTI Personality Test answers"""
    answers: Dict[int, str]  # question_id -> answer (E/I, S/N, T/F, J/P)


class MBTITestResult(BaseModel):
    """MBTI test result"""
    type: str  # "INTJ"
    scores: Dict[str, int]  # {"E": 45, "I": 55, ...}


class ProfileTestResponse(BaseModel):
    """User's profile test results"""
    id: str
    user_id: str
    holland_scores: Optional[Dict[str, int]] = None
    holland_dominant: Optional[str] = None
    mbti_type: Optional[str] = None
    mbti_scores: Optional[Dict[str, int]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ShareTestResultRequest(BaseModel):
    """Request to share a test result"""
    test_type: str  # "holland" or "mbti"
    expires_in_days: Optional[int] = None  # Optional expiry


class ShareTestResultResponse(BaseModel):
    """Response with share token and link"""
    share_token: str
    share_url: str
    expires_at: Optional[datetime] = None


class SharedTestResultPublic(BaseModel):
    """Public view of shared test result (no private user info)"""
    test_type: str
    holland_scores: Optional[Dict[str, int]] = None
    holland_dominant: Optional[str] = None
    mbti_type: Optional[str] = None
    mbti_scores: Optional[Dict[str, int]] = None
    created_at: datetime
    expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True
