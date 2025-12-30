"""add userId column to users table

Revision ID: 009_add_userid_column
Revises: 008_add_role_is_banned
Create Date: 2025-12-30 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '009_add_userid_column'
down_revision: Union[str, None] = '008_add_role_is_banned'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = {col['name'] for col in inspector.get_columns('users')}

    if 'userId' not in columns:
        # Add userId column, default to same as id
        op.execute("ALTER TABLE users ADD COLUMN userId TEXT")
        # Update existing rows to have userId same as id
        op.execute("UPDATE users SET userId = id WHERE userId IS NULL")
        # Create index
        op.create_index('ix_users_userId', 'users', ['userId'], unique=False)
        print("✅ Added userId column to users table")


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = {col['name'] for col in inspector.get_columns('users')}

    if 'userId' in columns:
        op.drop_index('ix_users_userId', table_name='users')
        op.execute("ALTER TABLE users DROP COLUMN userId")
