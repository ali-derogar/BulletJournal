"""
Application configuration and settings
"""
import os
from typing import Optional


class Settings:
    """Application settings and configuration"""

    # VAPID keys for Web Push Notifications
    VAPID_PRIVATE_KEY: Optional[str] = os.getenv("VAPID_PRIVATE_KEY")
    VAPID_PUBLIC_KEY: Optional[str] = os.getenv("VAPID_PUBLIC_KEY")
    VAPID_CLAIMS: dict = {
        "sub": os.getenv("VAPID_CLAIMS_EMAIL", "mailto:admin@bulletjournal.local")
    }

    # AI Settings
    _keys_str: str = os.getenv("OPENROUTER_API_KEYS", "") or os.getenv("NEXT_PUBLIC_OPENROUTER_API_KEYS", "")
    OPENROUTER_API_KEYS: list[str] = [
        key.strip() for key in _keys_str.split(",") if key.strip()
    ]

    # WebSocket settings

    # WebSocket settings
    WS_HEARTBEAT_INTERVAL: int = int(os.getenv("WS_HEARTBEAT_INTERVAL", "30"))
    WS_MESSAGE_QUEUE_SIZE: int = int(os.getenv("WS_MESSAGE_QUEUE_SIZE", "100"))

    # AI coach scheduler settings
    AI_DIGEST_SCHEDULER_ENABLED: bool = os.getenv("AI_DIGEST_SCHEDULER_ENABLED", "true").lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
    AI_DIGEST_SCHEDULER_INTERVAL_SECONDS: int = int(
        os.getenv("AI_DIGEST_SCHEDULER_INTERVAL_SECONDS", "60")
    )


settings = Settings()
