#!/usr/bin/env python3
"""
Migration script to update task time tracking system
- Migrate accumulated_time to spentTime
- Initialize timeLogs for existing tasks
"""
import sqlite3
import json
from datetime import datetime

def migrate_task_time_system():
    """Migrate existing task data to new time tracking system"""

    # Connect to database
    conn = sqlite3.connect('bullet_journal.db')
    cursor = conn.cursor()

    try:
        # Check if spentTime column exists, if not add it
        cursor.execute("PRAGMA table_info(tasks)")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]

        if 'spentTime' not in column_names:
            print("Adding spentTime column...")
            cursor.execute("ALTER TABLE tasks ADD COLUMN spentTime INTEGER DEFAULT 0")

        if 'timeLogs' not in column_names:
            print("Adding timeLogs column...")
            cursor.execute("ALTER TABLE tasks ADD COLUMN timeLogs TEXT")

        # Get all tasks with accumulated_time > 0
        cursor.execute("SELECT id, accumulated_time FROM tasks WHERE accumulated_time > 0")
        tasks_to_migrate = cursor.fetchall()

        print(f"Found {len(tasks_to_migrate)} tasks to migrate")

        for task_id, accumulated_time in tasks_to_migrate:
            # Create initial time log entry for migrated time
            time_log_entry = {
                "id": f"migrate_{task_id}",
                "type": "timer",
                "minutes": accumulated_time,
                "createdAt": datetime.utcnow().isoformat()
            }

            # Update the task
            cursor.execute("""
                UPDATE tasks
                SET spentTime = ?, timeLogs = ?
                WHERE id = ?
            """, (
                accumulated_time,
                json.dumps([time_log_entry]),
                task_id
            ))

        conn.commit()
        print(f"Successfully migrated {len(tasks_to_migrate)} tasks")

        # Verify migration
        cursor.execute("SELECT COUNT(*) FROM tasks WHERE spentTime > 0")
        migrated_count = cursor.fetchone()[0]
        print(f"Verification: {migrated_count} tasks now have spentTime > 0")

    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_task_time_system()