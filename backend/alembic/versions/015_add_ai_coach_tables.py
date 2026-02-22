"""add ai coach tables

Revision ID: 015_add_ai_coach_tables
Revises: 014_add_missing_mood_timestamps
Create Date: 2026-02-22 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "015_add_ai_coach_tables"
down_revision: Union[str, None] = "014_add_missing_mood_timestamps"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ai_coach_preferences",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("timezone", sa.String(), nullable=False, server_default="UTC"),
        sa.Column("language", sa.String(), nullable=False, server_default="fa"),
        sa.Column("daily_digest_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("daily_digest_hour", sa.Integer(), nullable=False, server_default="20"),
        sa.Column("daily_digest_minute", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("weekly_digest_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("monthly_digest_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("yearly_digest_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("critique_style", sa.String(), nullable=False, server_default="balanced"),
        sa.Column("quiet_hours_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("quiet_hours_start", sa.String(), nullable=True),
        sa.Column("quiet_hours_end", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index(op.f("ix_ai_coach_preferences_id"), "ai_coach_preferences", ["id"], unique=False)
    op.create_index(op.f("ix_ai_coach_preferences_user_id"), "ai_coach_preferences", ["user_id"], unique=True)

    op.create_table(
        "ai_memory_items",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("memory_type", sa.String(), nullable=False),
        sa.Column("key", sa.String(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("value_json", sa.Text(), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=False, server_default="0.5"),
        sa.Column("salience", sa.Float(), nullable=False, server_default="0.5"),
        sa.Column("decay", sa.Float(), nullable=False, server_default="0.95"),
        sa.Column("source", sa.String(), nullable=True),
        sa.Column("last_observed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_reinforced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_ai_memory_items_id"), "ai_memory_items", ["id"], unique=False)
    op.create_index(op.f("ix_ai_memory_items_key"), "ai_memory_items", ["key"], unique=False)
    op.create_index(op.f("ix_ai_memory_items_memory_type"), "ai_memory_items", ["memory_type"], unique=False)
    op.create_index(op.f("ix_ai_memory_items_user_id"), "ai_memory_items", ["user_id"], unique=False)

    op.create_table(
        "ai_daily_snapshots",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("date", sa.String(), nullable=False),
        sa.Column("tasks_total", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("tasks_done", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("completion_rate", sa.Float(), nullable=False, server_default="0"),
        sa.Column("total_spent_time", sa.Float(), nullable=False, server_default="0"),
        sa.Column("total_estimated_time", sa.Float(), nullable=False, server_default="0"),
        sa.Column("carry_over_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("goals_total", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("goals_progress_avg", sa.Float(), nullable=False, server_default="0"),
        sa.Column("wellbeing_score", sa.Float(), nullable=True),
        sa.Column("sleep_hours_avg", sa.Float(), nullable=True),
        sa.Column("mood_avg", sa.Float(), nullable=True),
        sa.Column("expenses_total", sa.Float(), nullable=False, server_default="0"),
        sa.Column("score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("payload_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "date", name="uq_ai_daily_snapshot_user_date"),
    )
    op.create_index(op.f("ix_ai_daily_snapshots_id"), "ai_daily_snapshots", ["id"], unique=False)
    op.create_index(op.f("ix_ai_daily_snapshots_user_id"), "ai_daily_snapshots", ["user_id"], unique=False)
    op.create_index(op.f("ix_ai_daily_snapshots_date"), "ai_daily_snapshots", ["date"], unique=False)

    op.create_table(
        "ai_digest_reports",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("digest_type", sa.String(), nullable=False),
        sa.Column("period_key", sa.String(), nullable=False),
        sa.Column("target_date", sa.String(), nullable=False),
        sa.Column("language", sa.String(), nullable=False, server_default="fa"),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("raw", sa.Text(), nullable=True),
        sa.Column("parsed_json", sa.Text(), nullable=True),
        sa.Column("score", sa.Float(), nullable=True),
        sa.Column("delivered", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("delivery_channel", sa.String(), nullable=True),
        sa.Column("created_by", sa.String(), nullable=False, server_default="scheduler"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "digest_type", "period_key", name="uq_ai_digest_user_period"),
    )
    op.create_index(op.f("ix_ai_digest_reports_id"), "ai_digest_reports", ["id"], unique=False)
    op.create_index(op.f("ix_ai_digest_reports_user_id"), "ai_digest_reports", ["user_id"], unique=False)
    op.create_index(op.f("ix_ai_digest_reports_digest_type"), "ai_digest_reports", ["digest_type"], unique=False)
    op.create_index(op.f("ix_ai_digest_reports_period_key"), "ai_digest_reports", ["period_key"], unique=False)
    op.create_index(op.f("ix_ai_digest_reports_target_date"), "ai_digest_reports", ["target_date"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_ai_digest_reports_target_date"), table_name="ai_digest_reports")
    op.drop_index(op.f("ix_ai_digest_reports_period_key"), table_name="ai_digest_reports")
    op.drop_index(op.f("ix_ai_digest_reports_digest_type"), table_name="ai_digest_reports")
    op.drop_index(op.f("ix_ai_digest_reports_user_id"), table_name="ai_digest_reports")
    op.drop_index(op.f("ix_ai_digest_reports_id"), table_name="ai_digest_reports")
    op.drop_table("ai_digest_reports")

    op.drop_index(op.f("ix_ai_daily_snapshots_date"), table_name="ai_daily_snapshots")
    op.drop_index(op.f("ix_ai_daily_snapshots_user_id"), table_name="ai_daily_snapshots")
    op.drop_index(op.f("ix_ai_daily_snapshots_id"), table_name="ai_daily_snapshots")
    op.drop_table("ai_daily_snapshots")

    op.drop_index(op.f("ix_ai_memory_items_user_id"), table_name="ai_memory_items")
    op.drop_index(op.f("ix_ai_memory_items_memory_type"), table_name="ai_memory_items")
    op.drop_index(op.f("ix_ai_memory_items_key"), table_name="ai_memory_items")
    op.drop_index(op.f("ix_ai_memory_items_id"), table_name="ai_memory_items")
    op.drop_table("ai_memory_items")

    op.drop_index(op.f("ix_ai_coach_preferences_user_id"), table_name="ai_coach_preferences")
    op.drop_index(op.f("ix_ai_coach_preferences_id"), table_name="ai_coach_preferences")
    op.drop_table("ai_coach_preferences")
