from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class AICoachPreferenceBase(BaseModel):
    timezone: str = Field(default="UTC", max_length=64)
    language: str = Field(default="fa", max_length=8)

    daily_digest_enabled: bool = True
    daily_digest_hour: int = Field(default=20, ge=0, le=23)
    daily_digest_minute: int = Field(default=0, ge=0, le=59)

    weekly_digest_enabled: bool = True
    monthly_digest_enabled: bool = True
    yearly_digest_enabled: bool = True

    critique_style: Literal["gentle", "balanced", "strict"] = "balanced"

    quiet_hours_enabled: bool = False
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None


class AICoachPreferenceUpdate(AICoachPreferenceBase):
    pass


class AICoachPreferenceResponse(AICoachPreferenceBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class AICoachDigestRunRequest(BaseModel):
    digest_type: Literal["daily", "weekly", "monthly", "yearly"] = "daily"
    target_date: Optional[str] = None  # YYYY-MM-DD
    force: bool = False
    deliver_notification: bool = True


class AICoachDigestReportResponse(BaseModel):
    id: str
    user_id: str
    digest_type: str
    period_key: str
    target_date: str
    language: str
    title: str
    summary: str
    score: Optional[float] = None
    delivered: bool
    delivered_at: Optional[str] = None
    delivery_channel: Optional[str] = None
    created_by: str
    created_at: Optional[str] = None
    parsed: Optional[dict[str, Any]] = None
    raw: Optional[str] = None


class AICoachMemoryResponse(BaseModel):
    id: str
    type: str
    key: str
    summary: str
    value: Optional[dict[str, Any]] = None
    confidence: float
    salience: float
    last_reinforced_at: Optional[str] = None
