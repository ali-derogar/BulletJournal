"""
Application configuration and settings
"""
import os
from typing import Optional


class Settings:
    """Application settings and configuration"""

    # VAPID keys for Web Push Notifications
    VAPID_PRIVATE_KEY: Optional[str] = os.getenv(
        "VAPID_PRIVATE_KEY",
        "8_FT-eZviG3xeZTLjzXLG22ynSHOnTA5ZLl1ZctfWiQ"  # Default for development
    )
    VAPID_PUBLIC_KEY: Optional[str] = os.getenv(
        "VAPID_PUBLIC_KEY",
        "FcHznVOX-BwovOOyzwksbwIuhZdtlAXhVHC2z3j9T4EXBGz9wnuIPfQg24cwiTgZPzUHqqrJI5B0FnQpsaq-Fxc"  # Default for development
    )
    VAPID_CLAIMS: dict = {
        "sub": os.getenv("VAPID_CLAIMS_EMAIL", "mailto:admin@bulletjournal.local")
    }

    # AI Settings
    _keys_str: str = os.getenv("NEXT_PUBLIC_OPENROUTER_API_KEYS", "")
    NEXT_PUBLIC_OPENROUTER_API_KEYS: list[str] = [
        key.strip() for key in _keys_str.split(",") if key.strip()
    ]

    # WebSocket settings

    # WebSocket settings
    WS_HEARTBEAT_INTERVAL: int = int(os.getenv("WS_HEARTBEAT_INTERVAL", "30"))
    WS_MESSAGE_QUEUE_SIZE: int = int(os.getenv("WS_MESSAGE_QUEUE_SIZE", "100"))


settings = Settings()
