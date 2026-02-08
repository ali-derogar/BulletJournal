from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import JWTError, jwt

from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    UserCreate, UserLogin, Token, TokenData, UserUpdate,
    VerifyEmailRequest, ForgotPasswordRequest, ResetPasswordRequest,
    EmailVerificationResponse, PasswordResetResponse
)
from app.schemas.user import User as UserSchema
from app.auth.auth import (
    authenticate_user,
    create_access_token,
    get_user_by_email,
    get_user_by_username,
    create_user,
    verify_email_token,
    initiate_password_reset,
    reset_password,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    SECRET_KEY,
    ALGORITHM
)
from app.auth.token_manager import token_manager
from app.services.email_service import email_service

router = APIRouter()

from app.auth.dependencies import get_current_user, get_current_active_user

router = APIRouter()

@router.post("/register", response_model=UserSchema)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    # Check if user already exists
    if get_user_by_email(db, user.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    if get_user_by_username(db, user.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )

    # Create new user
    try:
        db_user = create_user(db, user)
        
        # MODIFIED: Generate email verification token and send verification email
        plain_token, hashed_token, expiry = token_manager.create_email_verification_token()
        db_user.email_verification_token_hash = hashed_token
        db_user.email_verification_token_expires = expiry
        db.commit()
        db.refresh(db_user)
        
        # Send verification email
        email_service.send_verification_email(db_user.email, plain_token)
        
        return db_user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login with email and password"""
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserSchema)
async def read_users_me(current_user: User = Depends(get_current_user)):
    """Get current user info"""
    return current_user

@router.patch("/me", response_model=UserSchema)
async def update_user_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user profile"""
    if user_update.name is not None:
        # Validate name is not empty
        if not user_update.name.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Name cannot be empty"
            )
        current_user.name = user_update.name.strip()

    if user_update.username is not None:
        username = user_update.username.strip()
        if not username:
             raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username cannot be empty"
            )
        # Check uniqueness if changed
        if username != current_user.username:
            if get_user_by_username(db, username):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already taken"
                )
            current_user.username = username

    if user_update.avatar_url is not None:
        current_user.avatar_url = user_update.avatar_url
    
    # Update profile fields
    if user_update.education_level is not None:
        current_user.education_level = user_update.education_level
    if user_update.job_title is not None:
        current_user.job_title = user_update.job_title
    if user_update.general_goal is not None:
        current_user.general_goal = user_update.general_goal
    if user_update.income_level is not None:
        current_user.income_level = user_update.income_level
    if user_update.mbti_type is not None:
        current_user.mbti_type = user_update.mbti_type
    if user_update.bio is not None:
        current_user.bio = user_update.bio
    if user_update.skills is not None:
        current_user.skills = user_update.skills
    if user_update.location is not None:
        current_user.location = user_update.location

    try:
        db.commit()
        db.refresh(current_user)
        return current_user
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user: {str(e)}"
        )


# NEW: Email Verification & Password Reset Endpoints

@router.get("/verify-email", response_model=EmailVerificationResponse)
async def verify_email(token: str, db: Session = Depends(get_db)):
    """
    Verify user email with token
    
    Args:
        token: Email verification token from email link
        db: Database session
        
    Returns:
        EmailVerificationResponse with success status and message
    """
    # Find user with this verification token
    user = db.query(User).filter(
        User.email_verification_token_hash.isnot(None)
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification token."
        )
    
    # Verify the token
    success, message = verify_email_token(db, user, token)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    return EmailVerificationResponse(
        message=message,
        email_verified=True
    )


@router.post("/forgot-password", response_model=PasswordResetResponse)
async def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Initiate password reset flow
    
    Args:
        request: ForgotPasswordRequest with user email
        db: Database session
        
    Returns:
        PasswordResetResponse with success status and message
    """
    # Find user by email
    user = get_user_by_email(db, request.email)
    
    if not user:
        # Don't reveal if email exists (security best practice)
        return PasswordResetResponse(
            message="If an account exists with this email, a password reset link has been sent.",
            success=True
        )
    
    # Initiate password reset
    plain_token, message, success = initiate_password_reset(db, user)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=message
        )
    
    # Send password reset email
    email_sent = email_service.send_password_reset_email(user.email, plain_token)
    
    if not email_sent:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send password reset email. Please try again later."
        )
    
    return PasswordResetResponse(
        message="If an account exists with this email, a password reset link has been sent.",
        success=True
    )


@router.post("/reset-password", response_model=PasswordResetResponse)
async def reset_password_endpoint(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Reset password with token
    
    Args:
        request: ResetPasswordRequest with token and new password
        db: Database session
        
    Returns:
        PasswordResetResponse with success status and message
    """
    # Find user with this reset token
    user = db.query(User).filter(
        User.password_reset_token_hash.isnot(None)
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid password reset token."
        )
    
    # Reset the password
    success, message = reset_password(db, user, request.token, request.new_password)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    return PasswordResetResponse(
        message=message,
        success=True
    )
