"""
Chatroom Router
Provides endpoints for real-time chat functionality
"""
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from datetime import datetime, timezone
import uuid
import logging
from collections import deque, defaultdict

from app.db.session import get_db
from app.models.user import User
from app.auth.dependencies import get_current_active_user

router = APIRouter(prefix="/chatroom", tags=["chatroom"])
logger = logging.getLogger(__name__)

# Levels configuration
LEVELS = ["Iron", "Bronze", "Silver", "Gold", "Platinum", "Diamond"]

def get_level_index(level: str) -> int:
    try:
        return LEVELS.index(level)
    except ValueError:
        return 0

# In-memory storage for chat messages per room
# key: room_name, value: deque of messages
chat_messages: Dict[str, deque] = defaultdict(lambda: deque(maxlen=500))

# WebSocket connections per room
# key: room_name, value: set of websockets
chat_websockets: Dict[str, set] = defaultdict(set)


# ===== SCHEMAS =====

class ChatMessageCreate(BaseModel):
    text: str
    room: str


class ChatMessageResponse(BaseModel):
    id: str
    userId: str
    nickname: str
    avatar_url: Optional[str]
    color: str
    text: str
    timestamp: int
    room: str

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
    """Send a chat message to a specific room"""
    room = message.room if message.room in LEVELS else "Iron"
    
    # Level Check
    user_level_idx = get_level_index(current_user.level or "Iron")
    room_level_idx = get_level_index(room)
    
    if user_level_idx < room_level_idx:
        raise HTTPException(
            status_code=403, 
            detail="برای دسترسی به این چت‌روم باید سطح خود را ارتقا دهید."
        )

    if not message.text.strip():
        raise HTTPException(status_code=400, detail="Message text cannot be empty")

    # Create message
    chat_message = {
        "id": str(uuid.uuid4()),
        "userId": current_user.id,
        "nickname": current_user.username or current_user.name,
        "avatar_url": current_user.avatar_url,
        "color": "#6366f1", 
        "text": message.text.strip(),
        "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000),
        "room": room
    }

    # Add to in-memory storage for that room
    chat_messages[room].append(chat_message)

    # Broadcast to all WebSocket connections in that room
    room_sockets = chat_websockets[room]
    for ws in list(room_sockets): # list to avoid concurrent modification errors
        try:
            await ws.send_json({
                "type": "new_message",
                "message": chat_message
            })
        except Exception as e:
            logger.error(f"Error sending message to WebSocket in {room}: {e}")
            room_sockets.discard(ws)

    logger.info(f"User {current_user.id} sent a chat message to {room}")
    
    # Award XP for participation
    from app.services.leveling_service import gain_xp
    gain_xp(db, current_user, amount=5)
    
    return ChatMessageResponse(**chat_message)


@router.get("/messages", response_model=ChatMessagesResponse)
async def get_messages(
    room: str = "Iron",
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get recent chat messages from a specific room"""
    if room not in LEVELS:
        room = "Iron"
        
    # Level Check
    user_level_idx = get_level_index(current_user.level or "Iron")
    room_level_idx = get_level_index(room)
    
    if user_level_idx < room_level_idx:
        raise HTTPException(
            status_code=403, 
            detail="این چت‌روم هنوز برای شما قفل است. با فعالیت بیشتر سطح خود را ارتقا دهید!"
        )

    messages_list = list(chat_messages[room])
    if limit > 0:
        messages_list = messages_list[-limit:]

    return ChatMessagesResponse(
        messages=[ChatMessageResponse(**msg) for msg in messages_list],
        total=len(messages_list)
    )


# ===== WEBSOCKET ENDPOINT =====

@router.websocket("/ws")
async def chatroom_websocket(websocket: WebSocket, room: str = "Iron", token: str = None):
    """WebSocket endpoint for real-time chatroom updates for a specific room"""
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
            
            # Fetch user to check level
            from app.db.session import SessionLocal
            with SessionLocal() as db:
                user = db.query(User).filter(User.id == user_id).first()
                if not user:
                    await websocket.close(code=1008, reason="User not found")
                    return
                
                # Level Check
                user_level_idx = get_level_index(user.level or "Iron")
                room_level_idx = get_level_index(room)
                
                if user_level_idx < room_level_idx:
                    await websocket.close(code=1008, reason="Level too low for this room")
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
    if room not in LEVELS:
        room = "Iron"
        
    chat_websockets[room].add(websocket)

    try:
        # Send initial connection confirmation
        await websocket.send_json({
            "type": "connected",
            "message": f"Connected to {room} chatroom"
        })

        # Send recent messages for this room
        room_msgs = chat_messages[room]
        if room_msgs:
            await websocket.send_json({
                "type": "messages",
                "messages": list(room_msgs)[-50:]
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
                logger.error(f"Error in WebSocket receive loop in {room}: {e}")
                break

    finally:
        chat_websockets[room].discard(websocket)
        logger.info(f"Chatroom WebSocket connection closed for room {room}")

