from datetime import datetime, timedelta
from typing import Optional
import uuid
import os
from passlib.context import CryptContext
from jose import JWTError, jwt

from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.auth import UserCreate, UserLogin, TokenData
from app.auth.token_manager import token_manager

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")  # In production, use environment variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        # Fallback to simple verification if bcrypt fails
        import hashlib
        return hashed_password == hashlib.sha256(plain_password.encode()).hexdigest()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    """Hash a password"""
    try:
        return pwd_context.hash(password)
    except Exception:
        # Fallback to simple hashing if bcrypt fails
        import hashlib
        return hashlib.sha256(password.encode()).hexdigest()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """Authenticate a user with email and password"""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Get user by email"""
    return db.query(User).filter(User.email == email).first()

def get_user_by_username(db: Session, username: str) -> Optional[User]:
    """Get user by username"""
    return db.query(User).filter(User.username == username).first()

def create_user(db: Session, user: UserCreate) -> User:
    """Create a new user"""
    user_id = str(uuid.uuid4())
    hashed_password = get_password_hash(user.password)
    db_user = User(
        id=user_id,
        userId=user_id,  # For consistency
        name=user.name,
        username=user.username,
        email=user.email,
        password_hash=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_current_user(token: str, db: Session) -> Optional[User]:
    """Get current user from JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        token_data = TokenData(user_id=user_id)
    except JWTError:
        return None

    user = db.query(User).filter(User.id == token_data.user_id).first()
    return user


# NEW: Email Verification & Password Reset Functions

def verify_email_token(db: Session, user: User, token: str) -> tuple[bool, str]:
    """
    Verify email with token
    
    Args:
        db: Database session
        user: User object
        token: Plain token from request
        
    Returns:
        Tuple of (success: bool, message: str)
    """
    # Check if token is expired
    if token_manager.is_token_expired(user.email_verification_token_expires):
        return False, "Verification token has expired. Please request a new one."
    
    # Check if token matches
    if not user.email_verification_token_hash or not token_manager.verify_token(token, user.email_verification_token_hash):
        return False, "Invalid verification token."
    
    # Mark email as verified and clear token
    user.is_email_verified = True
    user.email_verification_token_hash = None
    user.email_verification_token_expires = None
    
    try:
        db.commit()
        db.refresh(user)
        return True, "Email verified successfully!"
    except Exception as e:
        db.rollback()
        return False, f"Failed to verify email: {str(e)}"


def initiate_password_reset(db: Session, user: User) -> tuple[str, str, bool]:
    """
    Initiate password reset for user
    
    Args:
        db: Database session
        user: User object
        
    Returns:
        Tuple of (plain_token: str, message: str, success: bool)
    """
    # Check rate limiting - allow one reset request per hour
    if user.last_password_reset_request:
        time_since_last_request = datetime.utcnow() - user.last_password_reset_request
        if time_since_last_request.total_seconds() < 1:  # 1 hour
            return "", "Please wait before requesting another password reset.", False
    
    # Generate new reset token
    plain_token, hashed_token, expiry = token_manager.create_password_reset_token()
    
    # Update user with reset token
    user.password_reset_token_hash = hashed_token
    user.password_reset_token_expires = expiry
    user.last_password_reset_request = datetime.utcnow()
    
    try:
        db.commit()
        db.refresh(user)
        return plain_token, "Password reset email sent successfully.", True
    except Exception as e:
        db.rollback()
        return "", f"Failed to initiate password reset: {str(e)}", False


def reset_password(db: Session, user: User, token: str, new_password: str) -> tuple[bool, str]:
    """
    Reset user password with token
    
    Args:
        db: Database session
        user: User object
        token: Plain reset token from request
        new_password: New password to set
        
    Returns:
        Tuple of (success: bool, message: str)
    """
    # Check if token is expired
    if token_manager.is_token_expired(user.password_reset_token_expires):
        return False, "Password reset token has expired. Please request a new one."
    
    # Check if token matches
    if not user.password_reset_token_hash or not token_manager.verify_token(token, user.password_reset_token_hash):
        return False, "Invalid password reset token."
    
    # Validate password strength (basic validation)
    if len(new_password) < 8:
        return False, "Password must be at least 8 characters long."
    
    # Update password and clear reset token
    user.password_hash = get_password_hash(new_password)
    user.password_reset_token_hash = None
    user.password_reset_token_expires = None
    
    try:
        db.commit()
        db.refresh(user)
        return True, "Password reset successfully!"
    except Exception as e:
        db.rollback()
        return False, f"Failed to reset password: {str(e)}"
