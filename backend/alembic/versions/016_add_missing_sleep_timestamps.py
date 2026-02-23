"""Add missing sleep timestamp columns

Revision ID: 016_add_missing_sleep_timestamps
Revises: 015_add_ai_coach_tables
Create Date: 2026-02-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "016_add_missing_sleep_timestamps"
down_revision: Union[str, None] = "015_add_ai_coach_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = set(inspector.get_table_names())

    # Legacy SQLite DBs may have sleep without sync timestamp columns.
    if "sleep" not in tables:
        return

    sleep_columns = {col["name"] for col in inspector.get_columns("sleep")}

    if "updatedAt" not in sleep_columns:
        op.add_column(
            "sleep",
            sa.Column(
                "updatedAt",
                sa.DateTime(timezone=True),
                nullable=True,
                server_default=sa.text("(CURRENT_TIMESTAMP)"),
            ),
        )

    if "deletedAt" not in sleep_columns:
        op.add_column(
            "sleep",
            sa.Column("deletedAt", sa.DateTime(timezone=True), nullable=True),
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = set(inspector.get_table_names())

    if "sleep" not in tables:
        return

    sleep_columns = {col["name"] for col in inspector.get_columns("sleep")}

    if "deletedAt" in sleep_columns:
        op.drop_column("sleep", "deletedAt")

    if "updatedAt" in sleep_columns:
        op.drop_column("sleep", "updatedAt")
