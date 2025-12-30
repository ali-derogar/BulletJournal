#!/usr/bin/env python3
"""
Create or promote a superuser.

This is a security-critical script intended for bootstrapping the first superuser.
Should be run via CLI ONLY, never exposed via API.

Usage:
    python3 create_superuser.py <email>
    python3 create_superuser.py --create <email> <name> <username> <password>
"""

import sys
import os
import argparse
import uuid

# Add current directory to path to allow imports
sys.path.append(os.getcwd())

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.user import User
from app.core.roles import Role
from app.auth.auth import get_password_hash

def create_or_promote_superuser(email: str, name: str = None, username: str = None, password: str = None):
    """
    Create a new superuser or promote existing user to SUPERUSER.

    Args:
        email: User email address
        name: User name (required for new user creation)
        username: Username (required for new user creation)
        password: Password (required for new user creation)
    """
    db: Session = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()

        if user:
            # User exists - promote to SUPERUSER
            if user.role == Role.SUPERUSER:
                print(f"✓ User {user.name} ({user.email}) is already a SUPERUSER.")
            else:
                print(f"Promoting user {user.name} ({user.email}) to SUPERUSER...")
                user.role = Role.SUPERUSER
                user.is_banned = False  # Ensure not banned
                db.commit()
                print("✓ Success! User is now a SUPERUSER.")
        else:
            # User doesn't exist - create new superuser
            if not all([name, username, password]):
                print("Error: User not found. To create a new superuser, provide --create flag with name, username, and password.")
                print("Usage: python3 create_superuser.py --create <email> <name> <username> <password>")
                return False

            # Check if username is taken
            existing_username = db.query(User).filter(User.username == username).first()
            if existing_username:
                print(f"Error: Username '{username}' is already taken.")
                return False

            print(f"Creating new SUPERUSER: {name} ({email})...")

            new_user = User(
                id=str(uuid.uuid4()),
                userId=str(uuid.uuid4()),
                email=email,
                name=name,
                username=username,
                password_hash=get_password_hash(password),
                role=Role.SUPERUSER,
                is_banned=False,
                level="Iron",
                xp=0
            )

            db.add(new_user)
            db.commit()
            db.refresh(new_user)

            print("✓ Success! SUPERUSER created.")
            print(f"   ID: {new_user.id}")
            print(f"   Email: {new_user.email}")
            print(f"   Username: {new_user.username}")

        return True

    except Exception as e:
        db.rollback()
        print(f"✗ Error: {e}")
        return False
    finally:
        db.close()

def main():
    parser = argparse.ArgumentParser(
        description='Create or promote a superuser (CLI ONLY - never expose via API)'
    )
    parser.add_argument('--create', action='store_true', help='Create a new user as SUPERUSER')
    parser.add_argument('email', help='User email address')
    parser.add_argument('name', nargs='?', help='User name (required with --create)')
    parser.add_argument('username', nargs='?', help='Username (required with --create)')
    parser.add_argument('password', nargs='?', help='Password (required with --create)')

    args = parser.parse_args()

    if args.create:
        if not all([args.name, args.username, args.password]):
            print("Error: --create requires email, name, username, and password")
            print("Usage: python3 create_superuser.py --create <email> <name> <username> <password>")
            sys.exit(1)

        success = create_or_promote_superuser(args.email, args.name, args.username, args.password)
    else:
        success = create_or_promote_superuser(args.email)

    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
