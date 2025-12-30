#!/usr/bin/env python3
"""
Initialize database tables if they don't exist.
"""
import sys
import os

sys.path.append(os.getcwd())

from app.db.session import Base, engine
from app.models.user import User

def init_db():
    """Create all database tables"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✓ Database tables created successfully!")

if __name__ == "__main__":
    init_db()
