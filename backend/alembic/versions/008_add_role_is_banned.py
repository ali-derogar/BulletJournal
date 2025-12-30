"""add role and is_banned columns

Revision ID: 008_add_role_is_banned
Revises: 007_add_level_xp
Create Date: 2025-12-30 14:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '008_add_role_is_banned'
down_revision: Union[str, None] = '007_add_level_xp'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = {col['name'] for col in inspector.get_columns('users')}

    if 'role' not in columns:
        op.add_column('users', sa.Column('role', sa.String(), server_default='USER', nullable=True))
    
    if 'is_banned' not in columns:
        op.add_column('users', sa.Column('is_banned', sa.Boolean(), server_default=sa.sql.expression.false(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'role')
    op.drop_column('users', 'is_banned')
