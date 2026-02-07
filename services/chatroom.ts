/**
 * Chatroom Service
 * Handles chatroom API communication
 */
import { get, post } from './api';
import { getToken } from './auth';
import { getWebSocketBaseUrl } from './api';

export interface ChatMessage {
  id: string;
  userId: string;
  nickname: string;
  avatar_url?: string;
  color: string;
  text: string;
  timestamp: number;
}

export interface ChatMessagesResponse {
  messages: ChatMessage[];
  total: number;
}

/**
 * Send a chat message
 */
export async function sendChatMessage(text: string, room: string = 'Iron'): Promise<ChatMessage> {
  const token = getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  return post<ChatMessage>('/chatroom/messages', { text, room }, token);
}

/**
 * Get recent chat messages
 */
export async function getChatMessages(room: string = 'Iron', limit: number = 100): Promise<ChatMessagesResponse> {
  const token = getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  return get<ChatMessagesResponse>(`/chatroom/messages?room=${room}&limit=${limit}`, token);
}

/**
 * Create WebSocket connection for chatroom
 */
export function createChatroomWebSocket(
  room: string = 'Iron',
  onMessage: (message: ChatMessage) => void,
  onError?: (error: Event) => void
): WebSocket | null {
  try {
    const token = getToken();
    if (!token) {
      console.error('Cannot create chatroom WebSocket: no token');
      return null;
    }

    const wsBaseUrl = getWebSocketBaseUrl();
    const wsUrl = `${wsBaseUrl}/chatroom/ws?room=${room}&token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('Chatroom WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'new_message') {
          onMessage(data.message);
        } else if (data.type === 'messages') {
          // Initial messages batch
          data.messages.forEach((msg: ChatMessage) => onMessage(msg));
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('Chatroom WebSocket error:', error);
      if (onError) {
        onError(error);
      }
    };

    ws.onclose = () => {
      console.log('Chatroom WebSocket disconnected');
    };

    // Send ping every 30 seconds to keep connection alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send('ping');
      } else {
        clearInterval(pingInterval);
      }
    }, 30000);

    return ws;
  } catch (error) {
    console.error('Error creating chatroom WebSocket:', error);
    return null;
  }
}

