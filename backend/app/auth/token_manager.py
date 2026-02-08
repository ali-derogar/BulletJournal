"""
Token management for email verification and password reset
Handles one-time use tokens with expiration
"""
import os
import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Tuple
from passlib.context import CryptContext

# Token hashing context
token_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class TokenManager:
    """Manages one-time use tokens for email verification and password reset"""

    # Token expiration times
    EMAIL_VERIFICATION_EXPIRY_HOURS = 24
    PASSWORD_RESET_EXPIRY_HOURS = 1

    @staticmethod
    def generate_token() -> str:
        """
        Generate a secure random token
        
        Returns:
            A URL-safe random token string
        """
        return secrets.token_urlsafe(32)

    @staticmethod
    def hash_token(token: str) -> str:
        """
        Hash a token for secure storage in database
        
        Args:
            token: The plain token to hash
            
        Returns:
            Hashed token
        """
        try:
            return token_context.hash(token)
        except Exception:
            # Fallback to SHA256 if bcrypt fails
            return hashlib.sha256(token.encode()).hexdigest()

    @staticmethod
    def verify_token(plain_token: str, hashed_token: str) -> bool:
        """
        Verify a plain token against its hash
        
        Args:
            plain_token: The plain token to verify
            hashed_token: The hashed token from database
            
        Returns:
            True if token matches, False otherwise
        """
        try:
            return token_context.verify(plain_token, hashed_token)
        except Exception:
            # Fallback to SHA256 comparison if bcrypt fails
            return hashed_token == hashlib.sha256(plain_token.encode()).hexdigest()

    @staticmethod
    def get_email_verification_expiry() -> datetime:
        """
        Get expiration time for email verification token
        
        Returns:
            Datetime object for token expiration
        """
        return datetime.utcnow() + timedelta(hours=TokenManager.EMAIL_VERIFICATION_EXPIRY_HOURS)

    @staticmethod
    def get_password_reset_expiry() -> datetime:
        """
        Get expiration time for password reset token
        
        Returns:
            Datetime object for token expiration
        """
        return datetime.utcnow() + timedelta(hours=TokenManager.PASSWORD_RESET_EXPIRY_HOURS)

    @staticmethod
    def is_token_expired(expiry_time: Optional[datetime]) -> bool:
        """
        Check if a token has expired
        
        Args:
            expiry_time: The expiration datetime of the token
            
        Returns:
            True if token is expired, False otherwise
        """
        if expiry_time is None:
            return True
        return datetime.utcnow() > expiry_time

    @staticmethod
    def create_email_verification_token() -> Tuple[str, str, datetime]:
        """
        Create a new email verification token
        
        Returns:
            Tuple of (plain_token, hashed_token, expiry_datetime)
        """
        plain_token = TokenManager.generate_token()
        hashed_token = TokenManager.hash_token(plain_token)
        expiry = TokenManager.get_email_verification_expiry()
        return plain_token, hashed_token, expiry

    @staticmethod
    def create_password_reset_token() -> Tuple[str, str, datetime]:
        """
        Create a new password reset token
        
        Returns:
            Tuple of (plain_token, hashed_token, expiry_datetime)
        """
        plain_token = TokenManager.generate_token()
        hashed_token = TokenManager.hash_token(plain_token)
        expiry = TokenManager.get_password_reset_expiry()
        return plain_token, hashed_token, expiry


# Create a singleton instance
token_manager = TokenManager()
