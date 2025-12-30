"""
WebSocket Connection Manager for Real-time Notifications
"""
import json
import logging
from typing import Dict, Set
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections for real-time notifications"""

    def __init__(self):
        # Maps user_id to set of WebSocket connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        """Accept and register a new WebSocket connection"""
        await websocket.accept()

        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()

        self.active_connections[user_id].add(websocket)
        logger.info(f"User {user_id} connected. Total connections: {len(self.active_connections[user_id])}")

    def disconnect(self, websocket: WebSocket, user_id: str):
        """Remove a WebSocket connection"""
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)

            # Clean up empty user entries
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

            logger.info(f"User {user_id} disconnected. Remaining connections: {len(self.active_connections.get(user_id, []))}")

    async def send_personal_message(self, message: dict, user_id: str):
        """Send a message to a specific user's all connections"""
        if user_id not in self.active_connections:
            logger.debug(f"No active connections for user {user_id}")
            return

        disconnected = set()
        for connection in self.active_connections[user_id]:
            try:
                await connection.send_json(message)
                logger.debug(f"Message sent to user {user_id}")
            except Exception as e:
                logger.error(f"Error sending message to user {user_id}: {e}")
                disconnected.add(connection)

        # Clean up disconnected connections
        for connection in disconnected:
            self.disconnect(connection, user_id)

    async def broadcast(self, message: dict):
        """Send a message to all connected users"""
        for user_id in list(self.active_connections.keys()):
            await self.send_personal_message(message, user_id)

    async def send_notification_update(
        self,
        user_id: str,
        notification_id: str,
        title: str,
        message: str,
        notification_type: str = "info",
        link: str = None
    ):
        """Send a notification update to a user"""
        notification_data = {
            "type": "notification",
            "data": {
                "id": notification_id,
                "title": title,
                "message": message,
                "notification_type": notification_type,
                "link": link
            }
        }
        await self.send_personal_message(notification_data, user_id)

    async def send_stats_update(self, user_id: str, stats: dict):
        """Send notification stats update to a user"""
        stats_data = {
            "type": "stats_update",
            "data": stats
        }
        await self.send_personal_message(stats_data, user_id)

    def get_user_connection_count(self, user_id: str) -> int:
        """Get the number of active connections for a user"""
        return len(self.active_connections.get(user_id, set()))

    def get_total_connections(self) -> int:
        """Get total number of active connections"""
        return sum(len(connections) for connections in self.active_connections.values())

    def get_connected_users_count(self) -> int:
        """Get the number of users with active connections"""
        return len(self.active_connections)


# Global instance
manager = ConnectionManager()
