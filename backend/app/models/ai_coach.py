from sqlalchemy import Column, String, DateTime, Text, Float, Integer, Boolean, UniqueConstraint
from sqlalchemy.sql import func
from app.db.session import Base


class AICoachPreference(Base):
    __tablename__ = "ai_coach_preferences"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, nullable=False, unique=True, index=True)
    timezone = Column(String, nullable=False, default="UTC")
    language = Column(String, nullable=False, default="fa")

    daily_digest_enabled = Column(Boolean, nullable=False, default=True)
    daily_digest_hour = Column(Integer, nullable=False, default=20)
    daily_digest_minute = Column(Integer, nullable=False, default=0)

    weekly_digest_enabled = Column(Boolean, nullable=False, default=True)
    monthly_digest_enabled = Column(Boolean, nullable=False, default=True)
    yearly_digest_enabled = Column(Boolean, nullable=False, default=True)

    critique_style = Column(String, nullable=False, default="balanced")  # gentle, balanced, strict

    quiet_hours_enabled = Column(Boolean, nullable=False, default=False)
    quiet_hours_start = Column(String, nullable=True)  # HH:MM
    quiet_hours_end = Column(String, nullable=True)  # HH:MM

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AIMemoryItem(Base):
    __tablename__ = "ai_memory_items"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    memory_type = Column(String, nullable=False, index=True)  # preference, habit, risk, goal_signal
    key = Column(String, nullable=False, index=True)

    summary = Column(Text, nullable=False)
    value_json = Column(Text, nullable=True)

    confidence = Column(Float, nullable=False, default=0.5)
    salience = Column(Float, nullable=False, default=0.5)
    decay = Column(Float, nullable=False, default=0.95)

    source = Column(String, nullable=True)  # chat, analytics, digest
    last_observed_at = Column(DateTime(timezone=True), nullable=True)
    last_reinforced_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AIDailySnapshot(Base):
    __tablename__ = "ai_daily_snapshots"
    __table_args__ = (UniqueConstraint("user_id", "date", name="uq_ai_daily_snapshot_user_date"),)

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    date = Column(String, nullable=False, index=True)  # YYYY-MM-DD

    tasks_total = Column(Integer, nullable=False, default=0)
    tasks_done = Column(Integer, nullable=False, default=0)
    completion_rate = Column(Float, nullable=False, default=0.0)

    total_spent_time = Column(Float, nullable=False, default=0.0)
    total_estimated_time = Column(Float, nullable=False, default=0.0)
    carry_over_count = Column(Integer, nullable=False, default=0)

    goals_total = Column(Integer, nullable=False, default=0)
    goals_progress_avg = Column(Float, nullable=False, default=0.0)

    wellbeing_score = Column(Float, nullable=True)
    sleep_hours_avg = Column(Float, nullable=True)
    mood_avg = Column(Float, nullable=True)

    expenses_total = Column(Float, nullable=False, default=0.0)

    score = Column(Float, nullable=False, default=0.0)
    payload_json = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AIDigestReport(Base):
    __tablename__ = "ai_digest_reports"
    __table_args__ = (UniqueConstraint("user_id", "digest_type", "period_key", name="uq_ai_digest_user_period"),)

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)

    digest_type = Column(String, nullable=False, index=True)  # daily, weekly, monthly, yearly
    period_key = Column(String, nullable=False, index=True)  # 2026-02-22, 2026-W08, 2026-02, 2026

    target_date = Column(String, nullable=False, index=True)
    language = Column(String, nullable=False, default="fa")

    title = Column(String, nullable=False)
    summary = Column(Text, nullable=False)

    raw = Column(Text, nullable=True)
    parsed_json = Column(Text, nullable=True)

    score = Column(Float, nullable=True)
    delivered = Column(Boolean, nullable=False, default=False)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    delivery_channel = Column(String, nullable=True)  # in_app, push, mixed

    created_by = Column(String, nullable=False, default="scheduler")  # scheduler, manual
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
