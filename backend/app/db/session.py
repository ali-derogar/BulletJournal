from sqlalchemy import create_engine, event, pool
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.declarative import declarative_base
import os

# Support environment variable for easy Postgres migration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./bullet_journal.db")

# Determine if using SQLite
is_sqlite = DATABASE_URL.startswith("sqlite")

# Create engine with optimizations
if is_sqlite:
    # SQLite optimizations
    engine = create_engine(
        DATABASE_URL,
        connect_args={
            "check_same_thread": False,
            "timeout": 30,  # Increase timeout for concurrent operations
        },
        pool_pre_ping=True,  # Verify connections before using
        pool_size=5,  # Connection pool size
        max_overflow=10,  # Allow overflow connections
    )

    # Enable SQLite performance optimizations
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        # Enable WAL mode for better concurrency
        cursor.execute("PRAGMA journal_mode=WAL")
        # Increase cache size (negative = KB, -64000 = 64MB)
        cursor.execute("PRAGMA cache_size=-64000")
        # Synchronous=NORMAL for better performance with WAL
        cursor.execute("PRAGMA synchronous=NORMAL")
        # Store temp tables in memory
        cursor.execute("PRAGMA temp_store=MEMORY")
        # Increase page size for better performance
        cursor.execute("PRAGMA page_size=4096")
        cursor.close()
else:
    # PostgreSQL optimizations
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=20,  # Larger pool for Postgres
        max_overflow=40,
        pool_recycle=3600,  # Recycle connections after 1 hour
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db() -> Session:
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
