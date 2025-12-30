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
    inspector = sa.inspect(conn)
    columns = {col['name'] for col in inspector.get_columns('users')}

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
        if field_name not in columns:
            op.add_column('users', sa.Column(field_name, field_type, nullable=True))
            print(f"✅ Added missing column {field_name} to users table")
        else:
            print(f"ℹ️ Column {field_name} already exists in users table")

def downgrade() -> None:
    # No-op for safety, we generally don't want to drop columns in a fix-up migration
    pass
