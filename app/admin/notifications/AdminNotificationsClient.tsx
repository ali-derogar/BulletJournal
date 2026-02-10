'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import AdminGuard from '@/components/AdminGuard';
import AdminLayout from '@/components/AdminLayout';
import UserSelector from '@/components/UserSelector';
import { useLocale, useTranslations } from 'next-intl';
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
  const t = useTranslations('admin.notifications');
  const tCommon = useTranslations('admin.common');
  const locale = useLocale();
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
      alert(t('alerts.fillTitleMessage'));
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
          alert(t('alerts.selectAtLeastOne'));
          return;
        }
        request.user_ids = userIds;
      }

      const result = await sendBulkNotification(request);
      alert(t('alerts.sentSuccess', { count: result.count }));

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
      const errorMessage = error instanceof Error ? error.message : tCommon('unknownError');
      alert(t('alerts.sendFailed', { error: errorMessage }));
    } finally {
      setSending(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!promptMessage.trim()) {
      alert(t('alerts.promptEmpty'));
      return;
    }

    try {
      setSavingConfig(true);
      await updateNotificationConfig(promptMessage.trim());
      alert(t('alerts.configSaved'));
    } catch (error) {
      console.error('Failed to update config:', error);
      alert(t('alerts.configFailed'));
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
            <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
            <p className="mt-2 text-gray-600">{t('subtitle')}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <div className="text-sm font-medium text-gray-500">{t('stats.totalNotifications')}</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {loadingStats ? tCommon('ellipsis') : stats.total_notifications.toLocaleString(locale)}
              </div>
            </div>

            <div className="bg-yellow-50 p-6 rounded-lg shadow border border-yellow-200">
              <div className="text-sm font-medium text-yellow-600">{t('stats.unread')}</div>
              <div className="mt-2 text-3xl font-bold text-yellow-900">
                {loadingStats ? tCommon('ellipsis') : stats.total_unread.toLocaleString(locale)}
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg shadow border border-gray-200">
              <div className="text-sm font-medium text-gray-500">{t('stats.muted')}</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {loadingStats ? tCommon('ellipsis') : stats.total_muted.toLocaleString(locale)}
              </div>
            </div>

            <div className="bg-green-50 p-6 rounded-lg shadow border border-green-200">
              <div className="text-sm font-medium text-green-600">{t('stats.pushSubscriptions')}</div>
              <div className="mt-2 text-3xl font-bold text-green-900">
                {loadingStats ? tCommon('ellipsis') : stats.total_push_subscriptions.toLocaleString(locale)}
              </div>
            </div>
          </div>

          {/* Permission Prompt Configuration */}
          <div className="bg-white rounded-lg shadow p-6 border-2 border-primary/10">
            <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <span className="text-2xl">⚙️</span> {t('config.title')}
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {t('config.subtitle')}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('config.promptLabel')}
                </label>
                <textarea
                  value={promptMessage}
                  onChange={(e) => setPromptMessage(e.target.value)}
                  placeholder={t('config.promptPlaceholder')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={loadingConfig || savingConfig}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {t('config.promptHelp')}
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveConfig}
                  disabled={loadingConfig || savingConfig}
                  className="px-6 py-2 bg-primary text-white font-bold rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {savingConfig ? tCommon('saving') : t('config.save')}
                </button>
              </div>
            </div>
          </div>

          {/* Send Notification Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{t('form.title')}</h2>

            <form onSubmit={handleSend} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('form.titleLabel')}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('form.titlePlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('form.messageLabel')}
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('form.messagePlaceholder')}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Type and Link */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('form.typeLabel')}
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as 'info' | 'success' | 'warning' | 'error')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="info">{t('form.types.info')}</option>
                    <option value="success">{t('form.types.success')}</option>
                    <option value="warning">{t('form.types.warning')}</option>
                    <option value="error">{t('form.types.error')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('form.linkLabel')}
                  </label>
                  <input
                    type="text"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder={t('form.linkPlaceholder')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Target Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('form.targetLabel')}
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
                    <span>{t('form.targets.allUsers')}</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="role"
                      checked={targetType === 'role'}
                      onChange={(e) => setTargetType(e.target.value as 'all' | 'role' | 'specific')}
                      className="mr-2"
                    />
                    <span>{t('form.targets.specificRole')}</span>
                    {targetType === 'role' && (
                      <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value as 'USER' | 'ADMIN' | 'SUPERUSER')}
                        className="ml-2 px-2 py-1 border border-gray-300 rounded-md"
                      >
                        <option value="USER">{t('form.roles.user')}</option>
                        <option value="ADMIN">{t('form.roles.admin')}</option>
                        <option value="SUPERUSER">{t('form.roles.superuser')}</option>
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
                      <span>{t('form.targets.specificUsers')}</span>
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
                  {targetType === 'all' && t('form.preview.all')}
                  {targetType === 'role' && t('form.preview.role', { role: t(`form.roles.${selectedRole.toLowerCase()}`) })}
                  {targetType === 'specific' && userIds.length > 0 && t('form.preview.specific', { count: userIds.length })}
                </div>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {sending ? t('form.sending') : t('form.send')}
                </button>
              </div>
            </form>
          </div>

          {/* Recent Notifications */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{t('recent.title')}</h2>
              <p className="text-sm text-gray-500 mt-1">{t('recent.subtitle')}</p>
            </div>

            {loadingStats ? (
              <div className="p-8 text-center text-gray-500">{tCommon('loading')}</div>
            ) : recentNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">{t('recent.empty')}</div>
            ) : (
              <div className="divide-y divide-gray-200">
                {recentNotifications.map((notification) => (
                  <div key={notification.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getNotificationTypeColor(notification.type)}`}>
                            {t(`form.types.${notification.type}`)}
                          </span>
                          {notification.is_read && (
                            <span className="text-xs text-gray-500">{t('recent.read')}</span>
                          )}
                          {notification.is_muted && (
                            <span className="text-xs text-gray-500">{t('recent.muted')}</span>
                          )}
                        </div>
                        <p className="font-medium text-gray-900">{notification.title}</p>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                        {notification.link && (
                          <p className="text-xs text-blue-600 mt-1">{t('recent.link', { link: notification.link })}</p>
                        )}
                      </div>
                      <div className="text-right text-xs text-gray-500 ml-4">
                        <div>{formatNotificationTime(notification.created_at, locale)}</div>
                        {notification.sent_by && (
                          <div className="mt-1">{t('recent.by', { id: notification.sent_by.substring(0, 8) })}</div>
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
