"""add level and xp columns

Revision ID: 007_add_level_xp
Revises: 006_add_username_avatar
Create Date: 2025-12-30 14:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '007_add_level_xp'
down_revision: Union[str, None] = '006_add_username_avatar'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = {col['name'] for col in inspector.get_columns('users')}

    if 'level' not in columns:
        op.add_column('users', sa.Column('level', sa.String(), server_default='Iron', nullable=True))
    
    if 'xp' not in columns:
        op.add_column('users', sa.Column('xp', sa.Integer(), server_default='0', nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'level')
    op.drop_column('users', 'xp')
