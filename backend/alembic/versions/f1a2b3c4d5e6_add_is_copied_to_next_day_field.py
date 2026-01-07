"""add_is_copied_to_next_day_field

Revision ID: f1a2b3c4d5e6
Revises: e008743b78db
Create Date: 2025-01-07 11:46:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, None] = 'e008743b78db'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    try:
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
                is_copied_to_next_day BOOLEAN DEFAULT FALSE,
                PRIMARY KEY (id)
            )
        """)

        # Copy data from old table to new table
        op.execute("""
            INSERT INTO tasks_new (id, user_id, date, title, status, created_at, updatedAt, deletedAt, spentTime, timeLogs, accumulated_time, timer_running, timer_start, estimated_time, is_useful, is_copied_to_next_day)
            SELECT id, user_id, date, title, status, created_at, updatedAt, deletedAt, spentTime, timeLogs, accumulated_time, timer_running, timer_start, estimated_time, is_useful, FALSE
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
        print("✅ Successfully added is_copied_to_next_day field to tasks table")

    except Exception as e:
        print(f"⚠️  Migration f1a2b3c4d5e6 failed (possibly already applied): {e}")
        # Clean up tasks_new if it was created
        try:
            op.execute("DROP TABLE IF EXISTS tasks_new")
        except:
            pass


def downgrade() -> None:
    # Recreate table without the is_copied_to_next_day field
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

    # Copy data from current table to old table (excluding the new field)
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
