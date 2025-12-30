'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  getNotifications,
  getNotificationStats,
  markAsRead,
  markAllAsRead,
  muteNotification,
  deleteNotification,
  notificationWebSocket,
  type Notification,
  type NotificationStats,
  getNotificationTypeIcon,
  formatNotificationTime,
} from '@/services/notifications';
import { getUser } from '@/services/auth';

export default function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats>({ total: 0, unread: 0, muted: 0 });
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load notifications and stats
  const loadData = async () => {
    try {
      setLoading(true);
      const [notifs, statsData] = await Promise.all([
        getNotifications(20, 0, false),
        getNotificationStats(),
      ]);
      setNotifications(notifs);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load on mount and set up WebSocket for real-time updates
  useEffect(() => {
    loadData();

    // Connect to WebSocket for real-time notifications
    const initializeWebSocket = async () => {
      try {
        const user = await getUser();
        if (user?.id) {
          notificationWebSocket.connect(user.id);

          // Subscribe to new notifications
          const unsubscribeNotification = notificationWebSocket.onNotification((notification) => {
            console.log('New notification received via WebSocket:', notification);
            // Reload data to get updated notifications and stats
            loadData();
          });

          // Subscribe to stats updates
          const unsubscribeStats = notificationWebSocket.onStatsUpdate((newStats) => {
            console.log('Stats update received via WebSocket:', newStats);
            setStats(newStats);
          });

          // Cleanup on unmount
          return () => {
            unsubscribeNotification();
            unsubscribeStats();
            notificationWebSocket.disconnect();
          };
        }
      } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
        // Fallback to polling if WebSocket fails
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
      }
    };

    const cleanup = initializeWebSocket();
    return () => {
      cleanup.then((fn) => fn && fn());
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
      await loadData();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      await loadData();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleMute = async (id: string) => {
    try {
      await muteNotification(id);
      await loadData();
    } catch (error) {
      console.error('Failed to mute notification:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id);
      await loadData();
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }

    if (notification.link) {
      setIsOpen(false);
      router.push(notification.link);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition"
        aria-label="Notifications"
      >
        {/* Bell Icon */}
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread Badge */}
        {stats.unread > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full">
            {stats.unread > 9 ? '9+' : stats.unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              {stats.unread > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Mark all read
                </button>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {stats.unread} unread of {stats.total} total
            </p>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition ${
                      !notification.is_read ? 'bg-blue-50' : ''
                    } ${notification.is_muted ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 text-2xl">
                        {getNotificationTypeIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div
                          className={`cursor-pointer ${
                            notification.link ? 'hover:text-blue-600' : ''
                          }`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <p className="font-medium text-gray-900 mb-1">
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600 mb-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatNotificationTime(notification.created_at)}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-2">
                          {!notification.is_read && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              Mark read
                            </button>
                          )}
                          {!notification.is_muted && (
                            <button
                              onClick={() => handleMute(notification.id)}
                              className="text-xs text-gray-600 hover:text-gray-800"
                            >
                              Mute
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notification.id)}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {/* Unread Indicator */}
                      {!notification.is_read && (
                        <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 text-center">
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/notifications');
                }}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
