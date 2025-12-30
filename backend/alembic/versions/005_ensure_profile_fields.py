"""ensure profile fields exist
Revision ID: 005
Revises: 004
Create Date: 2025-12-30 10:59:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '005'
down_revision: Union[str, None] = '004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Get connection to check existing columns
    conn = op.get_bind()

    # List of profile fields to ensure
    profile_fields = [
        ('education_level', sa.String()),
        ('job_title', sa.String()),
        ('general_goal', sa.Text()),
        ('income_level', sa.String()),
        ('mbti_type', sa.String()),
        ('bio', sa.Text()),
        ('skills', sa.Text()),
        ('location', sa.String())
    ]

    for field_name, field_type in profile_fields:
        # Try to add the column, catch the error if it already exists
        try:
            with op.batch_alter_table('users') as batch_op:
                batch_op.add_column(sa.Column(field_name, field_type, nullable=True))
            print(f"✅ Added column {field_name} to users table")
        except Exception as e:
            # Column likely already exists
            if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                print(f"ℹ️ Column {field_name} already exists in users table")
            else:
                # Re-raise if it's a different error
                raise

def downgrade() -> None:
    # No-op for safety, we generally don't want to drop columns in a fix-up migration
    pass
