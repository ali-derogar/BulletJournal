"""change_task_time_fields_to_float

Revision ID: e008743b78db
Revises: 003
Create Date: 2025-12-23 12:28:58.320894+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e008743b78db'
down_revision: Union[str, None] = '003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # SQLite doesn't support ALTER COLUMN TYPE, so we need to recreate the table
    # First, create a temporary table with the new schema
    op.execute("""
        CREATE TABLE tasks_new (
            id VARCHAR NOT NULL,
            user_id VARCHAR NOT NULL,
            date VARCHAR NOT NULL,
            title VARCHAR NOT NULL,
            status VARCHAR NOT NULL,
            created_at DATETIME,
            updatedAt DATETIME,
            deletedAt DATETIME,
            spentTime FLOAT DEFAULT 0.0,
            timeLogs TEXT,
            accumulated_time FLOAT DEFAULT 0.0,
            timer_running BOOLEAN,
            timer_start DATETIME,
            estimated_time FLOAT,
            is_useful BOOLEAN,
            PRIMARY KEY (id)
        )
    """)

    # Copy data from old table to new table
    op.execute("""
        INSERT INTO tasks_new (id, user_id, date, title, status, created_at, updatedAt, deletedAt, spentTime, timeLogs, accumulated_time, timer_running, timer_start, estimated_time, is_useful)
        SELECT id, user_id, date, title, status, created_at, updatedAt, deletedAt, spentTime, timeLogs, accumulated_time, timer_running, timer_start, estimated_time, is_useful
        FROM tasks
    """)

    # Drop old table
    op.drop_table('tasks')

    # Rename new table to tasks
    op.rename_table('tasks_new', 'tasks')

    # Recreate indexes
    op.create_index('ix_tasks_id', 'tasks', ['id'], unique=False)
    op.create_index('ix_tasks_user_id', 'tasks', ['user_id'], unique=False)
    op.create_index('ix_tasks_date', 'tasks', ['date'], unique=False)


def downgrade() -> None:
    # Recreate table with Integer types
    op.execute("""
        CREATE TABLE tasks_old (
            id VARCHAR NOT NULL,
            user_id VARCHAR NOT NULL,
            date VARCHAR NOT NULL,
            title VARCHAR NOT NULL,
            status VARCHAR NOT NULL,
            created_at DATETIME,
            updatedAt DATETIME,
            deletedAt DATETIME,
            spentTime INTEGER DEFAULT 0,
            timeLogs TEXT,
            accumulated_time INTEGER DEFAULT 0,
            timer_running BOOLEAN,
            timer_start DATETIME,
            estimated_time INTEGER,
            is_useful BOOLEAN,
            PRIMARY KEY (id)
        )
    """)

    # Copy data from current table to old table
    op.execute("""
        INSERT INTO tasks_old (id, user_id, date, title, status, created_at, updatedAt, deletedAt, spentTime, timeLogs, accumulated_time, timer_running, timer_start, estimated_time, is_useful)
        SELECT id, user_id, date, title, status, created_at, updatedAt, deletedAt, spentTime, timeLogs, accumulated_time, timer_running, timer_start, estimated_time, is_useful
        FROM tasks
    """)

    # Drop current table
    op.drop_table('tasks')

    # Rename old table to tasks
    op.rename_table('tasks_old', 'tasks')

    # Recreate indexes
    op.create_index('ix_tasks_id', 'tasks', ['id'], unique=False)
    op.create_index('ix_tasks_user_id', 'tasks', ['user_id'], unique=False)
    op.create_index('ix_tasks_date', 'tasks', ['date'], unique=False)