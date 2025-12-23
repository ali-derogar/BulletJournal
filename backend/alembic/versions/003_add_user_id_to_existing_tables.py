"""add user_id to existing tables

Revision ID: 003
Revises: 002
Create Date: 2025-12-24 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '003'
down_revision: Union[str, None] = '002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Get connection to check existing columns
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # Add user_id to tasks table if missing
    tasks_columns = {col['name'] for col in inspector.get_columns('tasks')}

    if 'user_id' not in tasks_columns:
        # Add user_id column with default value 'default' for backward compatibility
        op.add_column('tasks', sa.Column('user_id', sa.String(), nullable=False, server_default='default'))
        # Create index on user_id
        op.create_index(op.f('ix_tasks_user_id'), 'tasks', ['user_id'], unique=False)
        print("✅ Added user_id column to tasks table")

    # Add user_id to expenses table if missing
    expenses_columns = {col['name'] for col in inspector.get_columns('expenses')}

    if 'user_id' not in expenses_columns:
        op.add_column('expenses', sa.Column('user_id', sa.String(), nullable=False, server_default='default'))
        op.create_index(op.f('ix_expenses_user_id'), 'expenses', ['user_id'], unique=False)
        print("✅ Added user_id column to expenses table")

    # Add user_id to daily_journals table if missing
    journals_columns = {col['name'] for col in inspector.get_columns('daily_journals')}

    if 'user_id' not in journals_columns:
        op.add_column('daily_journals', sa.Column('user_id', sa.String(), nullable=False, server_default='default'))
        op.create_index(op.f('ix_daily_journals_user_id'), 'daily_journals', ['user_id'], unique=False)
        print("✅ Added user_id column to daily_journals table")


def downgrade() -> None:
    # Remove user_id columns and indexes
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # Check and drop from tasks
    tasks_columns = {col['name'] for col in inspector.get_columns('tasks')}
    if 'user_id' in tasks_columns:
        op.drop_index(op.f('ix_tasks_user_id'), table_name='tasks')
        op.drop_column('tasks', 'user_id')

    # Check and drop from expenses
    expenses_columns = {col['name'] for col in inspector.get_columns('expenses')}
    if 'user_id' in expenses_columns:
        op.drop_index(op.f('ix_expenses_user_id'), table_name='expenses')
        op.drop_column('expenses', 'user_id')

    # Check and drop from daily_journals
    journals_columns = {col['name'] for col in inspector.get_columns('daily_journals')}
    if 'user_id' in journals_columns:
        op.drop_index(op.f('ix_daily_journals_user_id'), table_name='daily_journals')
        op.drop_column('daily_journals', 'user_id')
