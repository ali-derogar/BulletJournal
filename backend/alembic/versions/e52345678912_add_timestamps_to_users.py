"""add timestamps and verify users schema

Revision ID: e52345678912
Revises: e52345678911
Create Date: 2026-02-01 12:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import func


# revision identifiers, used by Alembic.
revision: str = 'e52345678912'
down_revision: Union[str, None] = 'e52345678911'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'users' in tables:
        columns = [col['name'] for col in inspector.get_columns('users')]

        # Fix: Add missing timestamps
        if 'updatedAt' not in columns:
            op.add_column('users', sa.Column('updatedAt', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True))
        
        if 'deletedAt' not in columns:
            op.add_column('users', sa.Column('deletedAt', sa.DateTime(timezone=True), nullable=True))

        # Fix: Final verification of other critical columns potentially missing in broken states
        if 'userId' not in columns:
             op.add_column('users', sa.Column('userId', sa.String(), nullable=True)) 
             op.execute("UPDATE users SET userId = id WHERE userId IS NULL")
             op.create_index(op.f('ix_users_userId'), 'users', ['userId'], unique=False)

        if 'username' not in columns:
             op.add_column('users', sa.Column('username', sa.String(), nullable=True))
             op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)
             
        if 'level' not in columns:
            op.add_column('users', sa.Column('level', sa.String(), server_default='Iron'))
            
        if 'xp' not in columns:
            op.add_column('users', sa.Column('xp', sa.Integer(), server_default='0'))
            
        if 'role' not in columns:
            op.add_column('users', sa.Column('role', sa.String(), server_default='USER'))
            
        if 'is_banned' not in columns:
            op.add_column('users', sa.Column('is_banned', sa.Boolean(), server_default='0'))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    
    if 'users' in tables:
        columns = [col['name'] for col in inspector.get_columns('users')]
        
        if 'updatedAt' in columns:
            op.drop_column('users', 'updatedAt')
        if 'deletedAt' in columns:
            op.drop_column('users', 'deletedAt')
