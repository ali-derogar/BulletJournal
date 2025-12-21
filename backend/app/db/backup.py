"""
Database backup utilities for SQLite
Supports automatic backups and manual backup triggers
"""
import os
import shutil
import sqlite3
from datetime import datetime
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

# Backup configuration
BACKUP_DIR = os.getenv("BACKUP_DIR", "./backups")
MAX_BACKUPS = int(os.getenv("MAX_BACKUPS", "7"))  # Keep last 7 backups
DB_PATH = "bullet_journal.db"


def ensure_backup_dir():
    """Ensure backup directory exists"""
    Path(BACKUP_DIR).mkdir(parents=True, exist_ok=True)


def get_backup_filename():
    """Generate timestamped backup filename"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"bullet_journal_backup_{timestamp}.db"


def backup_sqlite(source_db: str = DB_PATH) -> str:
    """
    Create a backup of SQLite database using SQLite's backup API
    This is safer than file copy as it handles locks properly

    Returns:
        str: Path to backup file
    """
    ensure_backup_dir()

    backup_file = os.path.join(BACKUP_DIR, get_backup_filename())

    try:
        # Use SQLite's backup API for safe backup
        source = sqlite3.connect(source_db)
        dest = sqlite3.connect(backup_file)

        with dest:
            source.backup(dest)

        source.close()
        dest.close()

        logger.info(f"Database backed up successfully to: {backup_file}")

        # Clean up old backups
        cleanup_old_backups()

        return backup_file

    except Exception as e:
        logger.error(f"Backup failed: {str(e)}")
        raise


def cleanup_old_backups():
    """Remove old backups, keeping only MAX_BACKUPS most recent"""
    try:
        ensure_backup_dir()

        # Get all backup files sorted by modification time
        backup_files = []
        for file in Path(BACKUP_DIR).glob("bullet_journal_backup_*.db"):
            backup_files.append((file, file.stat().st_mtime))

        # Sort by modification time (newest first)
        backup_files.sort(key=lambda x: x[1], reverse=True)

        # Remove old backups
        for file, _ in backup_files[MAX_BACKUPS:]:
            file.unlink()
            logger.info(f"Removed old backup: {file}")

    except Exception as e:
        logger.error(f"Cleanup failed: {str(e)}")


def restore_backup(backup_file: str, target_db: str = DB_PATH):
    """
    Restore database from backup

    WARNING: This will replace the current database
    """
    if not os.path.exists(backup_file):
        raise FileNotFoundError(f"Backup file not found: {backup_file}")

    try:
        # Create a safety backup before restore
        safety_backup = f"{target_db}.pre_restore_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        shutil.copy2(target_db, safety_backup)
        logger.info(f"Created safety backup: {safety_backup}")

        # Restore from backup
        source = sqlite3.connect(backup_file)
        dest = sqlite3.connect(target_db)

        with dest:
            source.backup(dest)

        source.close()
        dest.close()

        logger.info(f"Database restored from: {backup_file}")

    except Exception as e:
        logger.error(f"Restore failed: {str(e)}")
        raise


def list_backups():
    """List all available backups"""
    ensure_backup_dir()

    backups = []
    for file in Path(BACKUP_DIR).glob("bullet_journal_backup_*.db"):
        stat = file.stat()
        backups.append({
            "filename": file.name,
            "path": str(file),
            "size_mb": round(stat.st_size / (1024 * 1024), 2),
            "created": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        })

    # Sort by creation time (newest first)
    backups.sort(key=lambda x: x["created"], reverse=True)

    return backups


def verify_backup(backup_file: str) -> bool:
    """Verify backup file integrity"""
    try:
        conn = sqlite3.connect(backup_file)
        cursor = conn.cursor()

        # Run integrity check
        cursor.execute("PRAGMA integrity_check")
        result = cursor.fetchone()

        conn.close()

        is_valid = result[0] == "ok"

        if is_valid:
            logger.info(f"Backup verified successfully: {backup_file}")
        else:
            logger.error(f"Backup integrity check failed: {backup_file}")

        return is_valid

    except Exception as e:
        logger.error(f"Backup verification failed: {str(e)}")
        return False
