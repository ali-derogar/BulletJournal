"""
Chatroom Router
Provides endpoints for real-time chat functionality
"""
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import logging
from collections import deque

from app.db.session import get_db
from app.models.user import User
from app.auth.dependencies import get_current_active_user
from app.services.websocket_manager import manager

router = APIRouter(prefix="/chatroom", tags=["chatroom"])
logger = logging.getLogger(__name__)

# In-memory storage for chat messages (in production, use Redis or database)
chat_messages: deque = deque(maxlen=1000)  # Store last 1000 messages
chat_websockets: set = set()  # Store all WebSocket connections for chatroom


# ===== SCHEMAS =====

class ChatMessageCreate(BaseModel):
    text: str


class ChatMessageResponse(BaseModel):
    id: str
    userId: str
    nickname: str
    avatar_url: Optional[str]
    color: str
    text: str
    timestamp: int

    class Config:
        from_attributes = True


class ChatMessagesResponse(BaseModel):
    messages: List[ChatMessageResponse]
    total: int


# ===== REST API ENDPOINTS =====

@router.post("/messages", response_model=ChatMessageResponse, status_code=201)
async def send_message(
    message: ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Send a chat message"""
    if not message.text.strip():
        raise HTTPException(status_code=400, detail="Message text cannot be empty")

    # Create message
    chat_message = {
        "id": str(uuid.uuid4()),
        "userId": current_user.id,
        "nickname": current_user.username or current_user.name,
        "avatar_url": current_user.avatar_url,
        "color": "#6366f1",  # Default color, can be improved
        "text": message.text.strip(),
        "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000)
    }

    # Add to in-memory storage
    chat_messages.append(chat_message)

    # Broadcast to all WebSocket connections
    for ws in chat_websockets:
        try:
            await ws.send_json({
                "type": "new_message",
                "message": chat_message
            })
        except Exception as e:
            logger.error(f"Error sending message to WebSocket: {e}")

    logger.info(f"User {current_user.id} sent a chat message")
    return ChatMessageResponse(**chat_message)


@router.get("/messages", response_model=ChatMessagesResponse)
async def get_messages(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get recent chat messages"""
    messages_list = list(chat_messages)
    if limit > 0:
        messages_list = messages_list[-limit:]

    return ChatMessagesResponse(
        messages=[ChatMessageResponse(**msg) for msg in messages_list],
        total=len(messages_list)
    )


# ===== WEBSOCKET ENDPOINT =====

@router.websocket("/ws")
async def chatroom_websocket(websocket: WebSocket, token: str = None):
    """WebSocket endpoint for real-time chatroom updates"""
    # Authenticate user via token
    try:
        from jose import jwt, JWTError
        from app.auth.auth import SECRET_KEY, ALGORITHM

        if not token:
            await websocket.close(code=1008, reason="Token required")
            return

        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id: str = payload.get("sub")
            if user_id is None:
                await websocket.close(code=1008, reason="Invalid token")
                return
        except JWTError as e:
            logger.warning(f"Chatroom WebSocket JWT validation failed: {e}")
            await websocket.close(code=1008, reason="Invalid token")
            return
    except Exception as e:
        logger.error(f"Chatroom WebSocket authentication error: {e}")
        await websocket.close(code=1011, reason="Authentication failed")
        return

    await websocket.accept()
    chat_websockets.add(websocket)

    try:
        # Send initial connection confirmation
        await websocket.send_json({
            "type": "connected",
            "message": "Connected to chatroom"
        })

        # Send recent messages
        if chat_messages:
            await websocket.send_json({
                "type": "messages",
                "messages": list(chat_messages)[-50:]  # Send last 50 messages
            })

        # Keep connection alive
        while True:
            try:
                data = await websocket.receive_text()
                if data == "ping":
                    await websocket.send_json({"type": "pong"})
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"Error in WebSocket receive loop: {e}")
                break

    finally:
        chat_websockets.discard(websocket)
        logger.info("Chatroom WebSocket connection closed")

