"""Add missing mood timestamp columns

Revision ID: 014_add_missing_mood_timestamps
Revises: 013_add_email_verification_fields
Create Date: 2026-02-21 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "014_add_missing_mood_timestamps"
down_revision: Union[str, None] = "013_add_email_verification_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = set(inspector.get_table_names())

    # Some legacy DBs were created before mood timestamps existed.
    if "mood" not in tables:
        return

    mood_columns = {col["name"] for col in inspector.get_columns("mood")}

    if "updatedAt" not in mood_columns:
        op.add_column(
            "mood",
            sa.Column(
                "updatedAt",
                sa.DateTime(timezone=True),
                nullable=True,
                server_default=sa.text("(CURRENT_TIMESTAMP)"),
            ),
        )
    if "deletedAt" not in mood_columns:
        op.add_column("mood", sa.Column("deletedAt", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = set(inspector.get_table_names())

    if "mood" not in tables:
        return

    mood_columns = {col["name"] for col in inspector.get_columns("mood")}

    if "deletedAt" in mood_columns:
        op.drop_column("mood", "deletedAt")
    if "updatedAt" in mood_columns:
        op.drop_column("mood", "updatedAt")
