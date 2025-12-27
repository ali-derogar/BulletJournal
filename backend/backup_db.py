
import sqlite3
import os
import shutil
from datetime import datetime
import argparse
import sys

# Default paths based on Docker container structure
# /app is the working directory, mapped to backend/ on host
DEFAULT_DB_PATH = "./data/bullet_journal.db"
DEFAULT_BACKUP_DIR = "./backups"

def perform_backup(db_path, backup_dir, retention_days=7):
    """
    Performs a hot backup of the SQLite database.
    """
    if not os.path.exists(db_path):
        print(f"Error: Database file not found at {db_path}")
        return False

    # Create backup directory if it doesn't exist
    if not os.path.exists(backup_dir):
        try:
            os.makedirs(backup_dir)
            print(f"Created backup directory at {backup_dir}")
        except OSError as e:
            print(f"Error creating backup directory: {e}")
            return False

    # Generate timestamped filename
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_filename = f"bullet_journal_backup_{timestamp}.db"
    backup_path = os.path.join(backup_dir, backup_filename)

    try:
        # Connect to the source database
        # uri=True allows opening read-only if needed, but standard connect is fine
        with sqlite3.connect(db_path) as source_db:
             # Connect to the destination backup file
            with sqlite3.connect(backup_path) as dest_db:
                print(f"Starting backup from {db_path} to {backup_path}...")
                
                # Use the SQLite online backup API
                # pages=0 copies all pages; -1 copies all remaining. 
                # Converting to run in steps is possible but simple full backup is fine for this size.
                source_db.backup(dest_db)
                
        print(f"Backup completed successfully: {backup_path}")
        
        # Cleanup old backups
        cleanup_old_backups(backup_dir, retention_days)
        return True

    except sqlite3.Error as e:
        print(f"SQLite error during backup: {e}")
        # Try to remove the partial file if it exists
        if os.path.exists(backup_path):
            os.remove(backup_path)
        return False
    except Exception as e:
        print(f"Unexpected error: {e}")
        return False

def cleanup_old_backups(backup_dir, retention_days):
    """
    Removes backups older than retention_days.
    """
    if retention_days <= 0:
        return

    print(f"Checking for backups older than {retention_days} days...")
    now = datetime.now().timestamp()
    count = 0
    
    for filename in os.listdir(backup_dir):
        if not filename.startswith("bullet_journal_backup_") or not filename.endswith(".db"):
            continue
            
        file_path = os.path.join(backup_dir, filename)
        try:
            file_stat = os.stat(file_path)
            file_age_days = (now - file_stat.st_mtime) / (24 * 3600)
            
            if file_age_days > retention_days:
                os.remove(file_path)
                print(f"Deleted old backup: {filename}")
                count += 1
        except OSError as e:
            print(f"Error processing file {filename}: {e}")
            
    if count > 0:
        print(f"Cleaned up {count} old backup(s).")
    else:
        print("No old backups found to clean.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SQLite Hot Backup Script")
    parser.add_argument("--db-path", default=DEFAULT_DB_PATH, help="Path to the SQLite database file")
    parser.add_argument("--backup-dir", default=DEFAULT_BACKUP_DIR, help="Directory to store backups")
    parser.add_argument("--retention", type=int, default=7, help="Days to keep backups (0 to disable cleanup)")
    
    args = parser.parse_args()
    
    perform_backup(args.db_path, args.backup_dir, args.retention)
