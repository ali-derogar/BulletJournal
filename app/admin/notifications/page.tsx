'use client';

import { useState, useEffect } from 'react';
import AdminGuard from '@/components/AdminGuard';
import AdminLayout from '@/components/AdminLayout';
import UserSelector from '@/components/UserSelector';
import {
  sendBulkNotification,
  getAdminNotificationStats,
  getAllNotifications,
  type BulkNotificationRequest,
  type Notification,
  getNotificationTypeColor,
  formatNotificationTime,
  getNotificationConfig,
  updateNotificationConfig,
} from '@/services/notifications';

export default function AdminNotificationsPage() {
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState({
    total_notifications: 0,
    total_unread: 0,
    total_muted: 0,
    total_push_subscriptions: 0,
  });
  const [recentNotifications, setRecentNotifications] = useState<Notification[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [promptMessage, setPromptMessage] = useState('');
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'info' | 'success' | 'warning' | 'error'>('info');
  const [link, setLink] = useState('');
  const [targetType, setTargetType] = useState<'all' | 'role' | 'specific'>('all');
  const [selectedRole, setSelectedRole] = useState<'USER' | 'ADMIN' | 'SUPERUSER'>('USER');
  const [userIds, setUserIds] = useState<string[]>([]);

  // Load stats and recent notifications
  const loadData = async () => {
    try {
      const [statsData, notifs, config] = await Promise.all([
        getAdminNotificationStats(),
        getAllNotifications(10, 0),
        getNotificationConfig(),
      ]);
      setStats(statsData);
      setRecentNotifications(notifs.notifications);
      setPromptMessage(config.value);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoadingStats(false);
      setLoadingConfig(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !message.trim()) {
      alert('Please fill in title and message');
      return;
    }

    try {
      setSending(true);

      const request: BulkNotificationRequest = {
        title: title.trim(),
        message: message.trim(),
        type,
        link: link.trim() || undefined,
      };

      if (targetType === 'role') {
        request.role = selectedRole;
      } else if (targetType === 'specific') {
        if (userIds.length === 0) {
          alert('Please select at least one user');
          return;
        }
        request.user_ids = userIds;
      }

      const result = await sendBulkNotification(request);
      alert(`Notification sent successfully to ${result.count} users!`);

      // Reset form
      setTitle('');
      setMessage('');
      setType('info');
      setLink('');
      setTargetType('all');
      setUserIds([]);

      // Reload stats
      await loadData();
    } catch (error) {
      console.error('Failed to send notification:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to send notification: ${errorMessage}`);
    } finally {
      setSending(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!promptMessage.trim()) {
      alert('Prompt message cannot be empty');
      return;
    }

    try {
      setSavingConfig(true);
      await updateNotificationConfig(promptMessage.trim());
      alert('Notification prompt message updated successfully!');
    } catch (error) {
      console.error('Failed to update config:', error);
      alert('Failed to update config');
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notification System</h1>
            <p className="mt-2 text-gray-600">Send notifications to users and monitor stats</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <div className="text-sm font-medium text-gray-500">Total Notifications</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {loadingStats ? '...' : stats.total_notifications.toLocaleString()}
              </div>
            </div>

            <div className="bg-yellow-50 p-6 rounded-lg shadow border border-yellow-200">
              <div className="text-sm font-medium text-yellow-600">Unread</div>
              <div className="mt-2 text-3xl font-bold text-yellow-900">
                {loadingStats ? '...' : stats.total_unread.toLocaleString()}
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg shadow border border-gray-200">
              <div className="text-sm font-medium text-gray-500">Muted</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {loadingStats ? '...' : stats.total_muted.toLocaleString()}
              </div>
            </div>

            <div className="bg-green-50 p-6 rounded-lg shadow border border-green-200">
              <div className="text-sm font-medium text-green-600">Push Subscriptions</div>
              <div className="mt-2 text-3xl font-bold text-green-900">
                {loadingStats ? '...' : stats.total_push_subscriptions.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Permission Prompt Configuration */}
          <div className="bg-white rounded-lg shadow p-6 border-2 border-primary/10">
            <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <span className="text-2xl">⚙️</span> Permission Prompt Configuration
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Customize the message users see when asked for notification permission.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prompt Message
                </label>
                <textarea
                  value={promptMessage}
                  onChange={(e) => setPromptMessage(e.target.value)}
                  placeholder="Enter the message for the notification permission prompt..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={loadingConfig || savingConfig}
                />
                <p className="mt-1 text-xs text-gray-500">
                  This message appears in the custom UI before the browser&apos;s native prompt.
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveConfig}
                  disabled={loadingConfig || savingConfig}
                  className="px-6 py-2 bg-primary text-white font-bold rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {savingConfig ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </div>
          </div>

          {/* Send Notification Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Send Notification</h2>

            <form onSubmit={handleSend} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Notification title..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message *
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Notification message..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Type and Link */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as 'info' | 'success' | 'warning' | 'error')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="info">Info (ℹ️)</option>
                    <option value="success">Success (✅)</option>
                    <option value="warning">Warning (⚠️)</option>
                    <option value="error">Error (❌)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Link (optional)
                  </label>
                  <input
                    type="text"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="/path/to/page"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Target Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Send To
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="all"
                      checked={targetType === 'all'}
                      onChange={(e) => setTargetType(e.target.value as 'all' | 'role' | 'specific')}
                      className="mr-2"
                    />
                    <span>All Users</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="role"
                      checked={targetType === 'role'}
                      onChange={(e) => setTargetType(e.target.value as 'all' | 'role' | 'specific')}
                      className="mr-2"
                    />
                    <span>Specific Role:</span>
                    {targetType === 'role' && (
                      <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value as 'USER' | 'ADMIN' | 'SUPERUSER')}
                        className="ml-2 px-2 py-1 border border-gray-300 rounded-md"
                      >
                        <option value="USER">USER</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="SUPERUSER">SUPERUSER</option>
                      </select>
                    )}
                  </label>

                  <label className="flex items-start">
                    <input
                      type="radio"
                      value="specific"
                      checked={targetType === 'specific'}
                      onChange={(e) => setTargetType(e.target.value as 'all' | 'role' | 'specific')}
                      className="mr-2 mt-1"
                    />
                    <div className="flex-1">
                      <span>Specific Users:</span>
                      {targetType === 'specific' && (
                        <div className="mt-2">
                          <UserSelector
                            selectedUserIds={userIds}
                            onSelectionChange={setUserIds}
                          />
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* Submit */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-gray-600">
                  {targetType === 'all' && 'Will send to all users'}
                  {targetType === 'role' && `Will send to all ${selectedRole}s`}
                  {targetType === 'specific' && userIds.length > 0 && `Will send to ${userIds.length} user(s)`}
                </div>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {sending ? 'Sending...' : 'Send Notification'}
                </button>
              </div>
            </form>
          </div>

          {/* Recent Notifications */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Recent Notifications</h2>
              <p className="text-sm text-gray-500 mt-1">Last 10 notifications sent</p>
            </div>

            {loadingStats ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : recentNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No notifications sent yet</div>
            ) : (
              <div className="divide-y divide-gray-200">
                {recentNotifications.map((notification) => (
                  <div key={notification.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getNotificationTypeColor(notification.type)}`}>
                            {notification.type}
                          </span>
                          {notification.is_read && (
                            <span className="text-xs text-gray-500">Read</span>
                          )}
                          {notification.is_muted && (
                            <span className="text-xs text-gray-500">Muted</span>
                          )}
                        </div>
                        <p className="font-medium text-gray-900">{notification.title}</p>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                        {notification.link && (
                          <p className="text-xs text-blue-600 mt-1">Link: {notification.link}</p>
                        )}
                      </div>
                      <div className="text-right text-xs text-gray-500 ml-4">
                        <div>{formatNotificationTime(notification.created_at)}</div>
                        {notification.sent_by && (
                          <div className="mt-1">By: {notification.sent_by.substring(0, 8)}...</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
