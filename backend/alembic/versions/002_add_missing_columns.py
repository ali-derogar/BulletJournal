"""add missing columns

Revision ID: 002
Revises: 001
Create Date: 2025-12-24 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Get connection to check existing columns
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # Add missing columns to tasks table
    tasks_columns = {col['name'] for col in inspector.get_columns('tasks')}

    if 'updatedAt' not in tasks_columns:
        op.add_column('tasks', sa.Column('updatedAt', sa.DateTime(timezone=True), nullable=True))
    if 'deletedAt' not in tasks_columns:
        op.add_column('tasks', sa.Column('deletedAt', sa.DateTime(timezone=True), nullable=True))
    if 'spentTime' not in tasks_columns:
        op.add_column('tasks', sa.Column('spentTime', sa.Integer(), nullable=True, server_default='0'))
    if 'timeLogs' not in tasks_columns:
        op.add_column('tasks', sa.Column('timeLogs', sa.Text(), nullable=True))

    # Add missing columns to expenses table
    expenses_columns = {col['name'] for col in inspector.get_columns('expenses')}

    if 'updatedAt' not in expenses_columns:
        op.add_column('expenses', sa.Column('updatedAt', sa.DateTime(timezone=True), nullable=True))
    if 'deletedAt' not in expenses_columns:
        op.add_column('expenses', sa.Column('deletedAt', sa.DateTime(timezone=True), nullable=True))

    # Add missing columns to daily_journals table
    journals_columns = {col['name'] for col in inspector.get_columns('daily_journals')}

    if 'updatedAt' not in journals_columns:
        op.add_column('daily_journals', sa.Column('updatedAt', sa.DateTime(timezone=True), nullable=True))
    if 'deletedAt' not in journals_columns:
        op.add_column('daily_journals', sa.Column('deletedAt', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    # Remove added columns
    op.drop_column('tasks', 'timeLogs')
    op.drop_column('tasks', 'spentTime')
    op.drop_column('tasks', 'deletedAt')
    op.drop_column('tasks', 'updatedAt')

    op.drop_column('expenses', 'deletedAt')
    op.drop_column('expenses', 'updatedAt')

    op.drop_column('daily_journals', 'deletedAt')
    op.drop_column('daily_journals', 'updatedAt')
