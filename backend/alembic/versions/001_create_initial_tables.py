"""create initial tables

Revision ID: 001
Revises:
Create Date: 2025-12-20 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    # Create users table
    if 'users' not in tables:
        op.create_table('users',
            sa.Column('id', sa.String(), nullable=False),
            sa.Column('name', sa.String(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)

    # Create tasks table
    if 'tasks' not in tables:
        op.create_table('tasks',
            sa.Column('id', sa.String(), nullable=False),
            sa.Column('user_id', sa.String(), nullable=False),
            sa.Column('date', sa.String(), nullable=False),
            sa.Column('title', sa.String(), nullable=False),
            sa.Column('status', sa.String(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
            sa.Column('accumulated_time', sa.Integer(), nullable=True),
            sa.Column('timer_running', sa.Boolean(), nullable=True),
            sa.Column('timer_start', sa.DateTime(timezone=True), nullable=True),
            sa.Column('estimated_time', sa.Integer(), nullable=True),
            sa.Column('is_useful', sa.Boolean(), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_tasks_id'), 'tasks', ['id'], unique=False)
        op.create_index(op.f('ix_tasks_user_id'), 'tasks', ['user_id'], unique=False)
        op.create_index(op.f('ix_tasks_date'), 'tasks', ['date'], unique=False)

    # Create expenses table
    if 'expenses' not in tables:
        op.create_table('expenses',
            sa.Column('id', sa.String(), nullable=False),
            sa.Column('user_id', sa.String(), nullable=False),
            sa.Column('date', sa.String(), nullable=False),
            sa.Column('title', sa.String(), nullable=False),
            sa.Column('amount', sa.Float(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_expenses_id'), 'expenses', ['id'], unique=False)
        op.create_index(op.f('ix_expenses_user_id'), 'expenses', ['user_id'], unique=False)
        op.create_index(op.f('ix_expenses_date'), 'expenses', ['date'], unique=False)

    # Create sleep table
    if 'sleep' not in tables:
        op.create_table('sleep',
            sa.Column('id', sa.String(), nullable=False),
            sa.Column('user_id', sa.String(), nullable=False),
            sa.Column('date', sa.String(), nullable=False),
            sa.Column('sleep_time', sa.String(), nullable=True),
            sa.Column('wake_time', sa.String(), nullable=True),
            sa.Column('hours_slept', sa.Float(), nullable=False),
            sa.Column('quality', sa.Integer(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_sleep_id'), 'sleep', ['id'], unique=False)
        op.create_index(op.f('ix_sleep_user_id'), 'sleep', ['user_id'], unique=False)
        op.create_index(op.f('ix_sleep_date'), 'sleep', ['date'], unique=False)

    # Create mood table
    if 'mood' not in tables:
        op.create_table('mood',
            sa.Column('id', sa.String(), nullable=False),
            sa.Column('user_id', sa.String(), nullable=False),
            sa.Column('date', sa.String(), nullable=False),
            sa.Column('rating', sa.Float(), nullable=False),
            sa.Column('day_score', sa.Float(), nullable=False),
            sa.Column('notes', sa.Text(), nullable=False),
            sa.Column('water_intake', sa.Integer(), nullable=False),
            sa.Column('study_minutes', sa.Integer(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_mood_id'), 'mood', ['id'], unique=False)
        op.create_index(op.f('ix_mood_user_id'), 'mood', ['user_id'], unique=False)
        op.create_index(op.f('ix_mood_date'), 'mood', ['date'], unique=False)

    # Create daily_journals table
    if 'daily_journals' not in tables:
        op.create_table('daily_journals',
            sa.Column('id', sa.String(), nullable=False),
            sa.Column('user_id', sa.String(), nullable=False),
            sa.Column('date', sa.String(), nullable=False),
            sa.Column('tasks', sa.Text(), nullable=False),
            sa.Column('expenses', sa.Text(), nullable=False),
            sa.Column('sleep_id', sa.String(), nullable=True),
            sa.Column('mood_id', sa.String(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_daily_journals_id'), 'daily_journals', ['id'], unique=False)
        op.create_index(op.f('ix_daily_journals_user_id'), 'daily_journals', ['user_id'], unique=False)
        op.create_index(op.f('ix_daily_journals_date'), 'daily_journals', ['date'], unique=False)


def downgrade() -> None:
    op.drop_table('daily_journals')
    op.drop_table('mood')
    op.drop_table('sleep')
    op.drop_table('expenses')
    op.drop_table('tasks')
    op.drop_table('users')