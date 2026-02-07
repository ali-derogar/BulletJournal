/**
 * Notification Service
 * Handles in-app and push notifications
 */

import { get, post, patch, del, API_BASE_URL, getWebSocketBaseUrl } from './api';
import { getToken } from './auth';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  link?: string;
  is_read: boolean;
  is_muted: boolean;
  sent_by?: string;
  created_at: string;
  read_at?: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  muted: number;
}

export interface BulkNotificationRequest {
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  link?: string;
  user_ids?: string[];
  role?: 'USER' | 'ADMIN' | 'SUPERUSER';
}

// ===== USER FUNCTIONS =====

/**
 * Get current user's notifications
 */
export async function getNotifications(
  limit: number = 50,
  offset: number = 0,
  unreadOnly: boolean = false
): Promise<Notification[]> {
  const token = getToken();
  if (!token) throw new Error('Authentication required');

  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
    unread_only: unreadOnly.toString(),
  });

  return get<Notification[]>(`/notifications?${params}`, token);
}

/**
 * Get notification statistics
 */
export async function getNotificationStats(): Promise<NotificationStats> {
  const token = getToken();
  if (!token) throw new Error('Authentication required');

  return get<NotificationStats>('/notifications/stats', token);
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string): Promise<void> {
  const token = getToken();
  if (!token) throw new Error('Authentication required');

  await patch(`/notifications/${notificationId}/read`, {}, token);
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(): Promise<void> {
  const token = getToken();
  if (!token) throw new Error('Authentication required');

  await patch('/notifications/read-all', {}, token);
}

/**
 * Mute a notification
 */
export async function muteNotification(notificationId: string): Promise<void> {
  const token = getToken();
  if (!token) throw new Error('Authentication required');

  await patch(`/notifications/${notificationId}/mute`, {}, token);
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  const token = getToken();
  if (!token) throw new Error('Authentication required');

  try {
    await del(`/notifications/${notificationId}`, undefined, token);
    console.log(`Notification ${notificationId} deleted successfully`);
  } catch (error) {
    console.error('Failed to delete notification:', error);
    throw error;
  }
}

// ===== PUSH NOTIFICATION FUNCTIONS =====

/**
 * Request push notification permission
 */
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Push notifications not supported');
    return 'denied';
  }

  return Notification.requestPermission();
}

/**
 * Get VAPID public key from backend
 */
export async function getVapidPublicKey(): Promise<string> {
  try {
    const response = await get<{ publicKey: string }>('/notifications/vapid-public-key');
    return response.publicKey;
  } catch (error) {
    console.error('Failed to get VAPID public key:', error);
    throw error;
  }
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(): Promise<boolean> {
  try {
    const token = getToken();
    if (!token) throw new Error('Authentication required');

    // Request permission first
    const permission = await requestPushPermission();
    if (permission !== 'granted') {
      return false;
    }

    // Register service worker
    if (!('serviceWorker' in navigator)) {
      console.warn('Service workers not supported');
      return false;
    }

    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    // Get VAPID public key from backend
    const vapidPublicKey = await getVapidPublicKey();

    // Get push subscription
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    });

    // Send subscription to backend
    const subscriptionJSON = subscription.toJSON();
    await post(
      '/notifications/subscribe',
      {
        endpoint: subscriptionJSON.endpoint,
        p256dh: subscriptionJSON.keys?.p256dh,
        auth: subscriptionJSON.keys?.auth,
      },
      token
    );

    return true;
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    return false;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const token = getToken();
    if (!token) throw new Error('Authentication required');

    if (!('serviceWorker' in navigator)) return false;

    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return false;

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return false;

    // Unsubscribe from backend
    await del(
      `/notifications/unsubscribe?endpoint=${encodeURIComponent(subscription.endpoint)}`,
      undefined,
      token
    );

    // Unsubscribe from browser
    await subscription.unsubscribe();

    return true;
  } catch (error) {
    console.error('Failed to unsubscribe from push notifications:', error);
    return false;
  }
}

/**
 * Check if push notifications are enabled
 */
export async function isPushEnabled(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
      return false;
    }

    if (Notification.permission !== 'granted') {
      return false;
    }

    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return false;

    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch {
    return false;
  }
}

// ===== ADMIN FUNCTIONS =====

/**
 * Send bulk notification (Admin/Superuser only)
 */
export async function sendBulkNotification(
  notification: BulkNotificationRequest
): Promise<{ message: string; count: number }> {
  const token = getToken();
  if (!token) throw new Error('Authentication required');

  return post('/notifications/send', notification, token);
}

/**
 * Get all notifications (Admin/Superuser only)
 */
export async function getAllNotifications(
  limit: number = 100,
  offset: number = 0,
  userId?: string
): Promise<{ notifications: Notification[]; total: number }> {
  const token = getToken();
  if (!token) throw new Error('Authentication required');

  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });

  if (userId) params.append('user_id', userId);

  return get(`/notifications/admin/all?${params}`, token);
}

/**
 * Get admin notification stats
 */
export async function getAdminNotificationStats(): Promise<{
  total_notifications: number;
  total_unread: number;
  total_muted: number;
  total_push_subscriptions: number;
}> {
  const token = getToken();
  if (!token) throw new Error('Authentication required');

  return get('/notifications/admin/stats', token);
}

/**
 * Get system-wide notification configuration
 */
export async function getNotificationConfig(): Promise<{ key: string; value: string; updated_at: string }> {
  return get<{ key: string; value: string; updated_at: string }>('/notifications/config');
}

/**
 * Update system-wide notification configuration (Admin only)
 */
export async function updateNotificationConfig(message: string): Promise<{ key: string; value: string; updated_at: string }> {
  const token = getToken();
  if (!token) throw new Error('Authentication required');

  return patch<{ key: string; value: string; updated_at: string }>(
    '/admin/notifications/config',
    { value: message },
    token
  );
}

// ===== HELPER FUNCTIONS =====

/**
 * Convert VAPID key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Get notification type color
 */
export function getNotificationTypeColor(type: string): string {
  const colors: Record<string, string> = {
    info: 'bg-blue-100 text-blue-800 border-blue-200',
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    error: 'bg-red-100 text-red-800 border-red-200',
  };
  return colors[type] || colors.info;
}

/**
 * Get notification type icon
 */
export function getNotificationTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    info: '🔔',
    success: '✅',
    warning: '⚠️',
    error: '❌',
  };
  return icons[type] || icons.info;
}

/**
 * Format notification time
 */
export function formatNotificationTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString();
}

// ===== WEBSOCKET FOR REAL-TIME NOTIFICATIONS =====

type NotificationCallback = (notification: Notification) => void;
type StatsCallback = (stats: NotificationStats) => void;
type ConnectionCallback = (connected: boolean) => void;

class NotificationWebSocket {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private notificationCallbacks: Set<NotificationCallback> = new Set();
  private statsCallbacks: Set<StatsCallback> = new Set();
  private connectionCallbacks: Set<ConnectionCallback> = new Set();
  private shouldReconnect: boolean = true;

  /**
   * Connect to WebSocket for real-time notifications
   */
  connect(userId: string): void {
    const token = getToken();
    if (!token || !userId) {
      console.error('Cannot connect to WebSocket: missing token or userId');
      return;
    }

    // Close existing connection
    if (this.ws) {
      this.disconnect();
    }

    try {
      // Get WebSocket URL - includes /api prefix
      const wsBaseUrl = getWebSocketBaseUrl();
      const wsUrl = `${wsBaseUrl}/notifications/ws/${userId}?token=${token}`;
      console.log('Connecting to WebSocket:', wsUrl.replace(token, 'TOKEN_HIDDEN'));
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.notifyConnectionCallbacks(true);
        this.startPing();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'connected') {
            console.log('WebSocket connection confirmed:', data.message);
          } else if (data.type === 'notification') {
            // New notification received
            this.notifyNotificationCallbacks(data.data);
          } else if (data.type === 'stats_update') {
            // Stats update received
            this.notifyStatsCallbacks(data.data);
          } else if (data.type === 'pong') {
            // Pong received
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.notifyConnectionCallbacks(false);
        this.stopPing();

        // Auto-reconnect after 5 seconds
        if (this.shouldReconnect) {
          this.reconnectTimer = setTimeout(() => {
            console.log('Attempting to reconnect WebSocket...');
            this.connect(userId);
          }, 5000);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    this.shouldReconnect = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopPing();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Start sending ping messages to keep connection alive
   */
  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('ping');
      }
    }, 30000); // Send ping every 30 seconds
  }

  /**
   * Stop sending ping messages
   */
  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  /**
   * Subscribe to new notifications
   */
  onNotification(callback: NotificationCallback): () => void {
    this.notificationCallbacks.add(callback);
    return () => this.notificationCallbacks.delete(callback);
  }

  /**
   * Subscribe to stats updates
   */
  onStatsUpdate(callback: StatsCallback): () => void {
    this.statsCallbacks.add(callback);
    return () => this.statsCallbacks.delete(callback);
  }

  /**
   * Subscribe to connection status changes
   */
  onConnectionChange(callback: ConnectionCallback): () => void {
    this.connectionCallbacks.add(callback);
    return () => this.connectionCallbacks.delete(callback);
  }

  /**
   * Notify all notification callbacks
   */
  private notifyNotificationCallbacks(notification: Notification): void {
    this.notificationCallbacks.forEach((callback) => {
      try {
        callback(notification);
      } catch (error) {
        console.error('Error in notification callback:', error);
      }
    });
  }

  /**
   * Notify all stats callbacks
   */
  private notifyStatsCallbacks(stats: NotificationStats): void {
    this.statsCallbacks.forEach((callback) => {
      try {
        callback(stats);
      } catch (error) {
        console.error('Error in stats callback:', error);
      }
    });
  }

  /**
   * Notify all connection callbacks
   */
  private notifyConnectionCallbacks(connected: boolean): void {
    this.connectionCallbacks.forEach((callback) => {
      try {
        callback(connected);
      } catch (error) {
        console.error('Error in connection callback:', error);
      }
    });
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Global WebSocket instance
export const notificationWebSocket = new NotificationWebSocket();
