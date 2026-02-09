"""
Email service for sending verification and password reset emails via Gmail SMTP
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails via Gmail SMTP"""

    def __init__(self):
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.sender_email = os.getenv("EMAIL", "")
        self.sender_password = os.getenv("PASSWORD", "")
        self.sender_password = " ".join(
            self.sender_password[i:i+4] for i in range(0, len(self.sender_password), 4)
        )
        self.frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")

    def _send_email(self, recipient_email: str, subject: str, html_content: str) -> bool:
        """
        Send an email via Gmail SMTP
        
        Args:
            recipient_email: Email address of the recipient
            subject: Email subject
            html_content: HTML content of the email
            
        Returns:
            True if email was sent successfully, False otherwise
        """
        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = self.sender_email
            message["To"] = recipient_email

            # Attach HTML content
            part = MIMEText(html_content, "html")
            message.attach(part)

            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.sender_email, self.sender_password)
                server.sendmail(self.sender_email, recipient_email, message.as_string())

            logger.info(f"Email sent successfully to {recipient_email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {recipient_email}: {str(e)}")
            return False

    def send_verification_email(self, recipient_email: str, verification_token: str) -> bool:
        """
        Send email verification link
        
        Args:
            recipient_email: Email address of the user
            verification_token: One-time verification token
            
        Returns:
            True if email was sent successfully, False otherwise
        """
        verification_url = f"{self.frontend_url}/auth/verify-email?token={verification_token}&email={recipient_email}"

        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2c3e50;">Welcome to BulletJournal!</h2>
                    <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{verification_url}" 
                           style="background-color: #3498db; color: white; padding: 12px 30px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;">
                            Verify Email Address
                        </a>
                    </div>
                    
                    <p>Or copy and paste this link in your browser:</p>
                    <p style="word-break: break-all; color: #7f8c8d;">
                        <a href="{verification_url}">{verification_url}</a>
                    </p>
                    
                    <p style="color: #7f8c8d; font-size: 12px;">
                        This link will expire in 24 hours.
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 20px 0;">
                    <p style="color: #7f8c8d; font-size: 12px;">
                        If you didn't create this account, please ignore this email.
                    </p>
                </div>
            </body>
        </html>
        """

        return self._send_email(recipient_email, "Verify Your Email - BulletJournal", html_content)

    def send_password_reset_email(self, recipient_email: str, reset_token: str) -> bool:
        """
        Send password reset link
        
        Args:
            recipient_email: Email address of the user
            reset_token: One-time password reset token
            
        Returns:
            True if email was sent successfully, False otherwise
        """
        reset_url = f"{self.frontend_url}/auth/reset-password?token={reset_token}&email={recipient_email}"

        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2c3e50;">Password Reset Request</h2>
                    <p>We received a request to reset your password. Click the button below to create a new password:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{reset_url}" 
                           style="background-color: #e74c3c; color: white; padding: 12px 30px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;">
                            Reset Password
                        </a>
                    </div>
                    
                    <p>Or copy and paste this link in your browser:</p>
                    <p style="word-break: break-all; color: #7f8c8d;">
                        <a href="{reset_url}">{reset_url}</a>
                    </p>
                    
                    <p style="color: #7f8c8d; font-size: 12px;">
                        This link will expire in 1 hour.
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 20px 0;">
                    <p style="color: #7f8c8d; font-size: 12px;">
                        If you didn't request a password reset, please ignore this email or contact support if you have concerns.
                    </p>
                </div>
            </body>
        </html>
        """

        return self._send_email(recipient_email, "Reset Your Password - BulletJournal", html_content)


# Create a singleton instance
email_service = EmailService()
