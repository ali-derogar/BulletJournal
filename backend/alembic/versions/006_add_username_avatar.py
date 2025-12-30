"""add username and avatar columns

Revision ID: 006_add_username_avatar
Revises: 004
Create Date: 2025-12-30 12:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '006_add_username_avatar'
down_revision: Union[str, None] = '004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = {col['name'] for col in inspector.get_columns('users')}

    if 'username' not in columns:
        op.add_column('users', sa.Column('username', sa.String(), nullable=True))
        # Note: We create it as nullable first to avoid issues with existing data, 
        # but logic should treat it as unique/required for new users.
        # Ideally we would backfill it, but for now we'll leave it nullable.
        try:
             op.create_index('ix_users_username', 'users', ['username'], unique=True)
        except Exception:
             print("Index ix_users_username might already exist, skipping.")

    if 'avatar_url' not in columns:
        op.add_column('users', sa.Column('avatar_url', sa.Text(), nullable=True))


def downgrade() -> None:
    # SQLite doesn't strictly support drop column in older versions, 
    # but Alembic batch mode (used in env.py) handles it.
    op.drop_column('users', 'avatar_url')
    op.drop_index('ix_users_username', table_name='users')
    op.drop_column('users', 'username')
