'use client';

export const dynamic = 'force-dynamic';

/**
 * Content Management Overview Page
 *
 * Displays content statistics and provides quick access to:
 * - Task management
 * - Journal management
 * - Goal management
 * - Reported content
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AdminGuard from '@/components/AdminGuard';
import AdminLayout from '@/components/AdminLayout';
import { getContentStats, ContentStats } from '@/services/content';
import { useLocale, useTranslations } from 'next-intl';

export default function ContentManagementPage() {
  const t = useTranslations('admin.contentOverview');
  const tCommon = useTranslations('admin.common');
  const locale = useLocale();
  const [stats, setStats] = useState<ContentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getContentStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
            <p className="text-gray-600 mt-2">{t('subtitle')}</p>
          </div>

          {/* Error State */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
              <button
                onClick={loadStats}
                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
              >
                {tCommon('tryAgain')}
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          )}

          {/* Stats Overview */}
          {!loading && stats && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Total Tasks */}
                <StatCard
                  title={t('stats.totalTasks')}
                  value={stats.total_tasks.toLocaleString(locale)}
                  subtitle={t('stats.tasksCreatedToday', { count: stats.tasks_today.toLocaleString(locale) })}
                  color="blue"
                  icon={
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  }
                />

                {/* Total Journals */}
                <StatCard
                  title={t('stats.totalJournals')}
                  value={stats.total_journals.toLocaleString(locale)}
                  color="green"
                  icon={
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  }
                />

                {/* Total Goals */}
                <StatCard
                  title={t('stats.totalGoals')}
                  value={stats.total_goals.toLocaleString(locale)}
                  subtitle={t('stats.goalsSummary', {
                    active: stats.active_goals.toLocaleString(locale),
                    completed: stats.completed_goals.toLocaleString(locale),
                  })}
                  color="purple"
                  icon={
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  }
                />

                {/* Reports */}
                <StatCard
                  title={t('stats.reports')}
                  value={stats.total_reports.toLocaleString(locale)}
                  subtitle={t('stats.pendingReview', { count: stats.pending_reports.toLocaleString(locale) })}
                  color="red"
                  highlight={stats.pending_reports > 0}
                  icon={
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  }
                />
              </div>

              {/* Content Management Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Tasks Management */}
                <ManagementCard
                  title={t('management.tasks.title')}
                  description={t('management.tasks.description')}
                  count={stats.total_tasks}
                  href="/admin/content/tasks"
                  color="blue"
                  icon={
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  }
                />

                {/* Journals Management */}
                <ManagementCard
                  title={t('management.journals.title')}
                  description={t('management.journals.description')}
                  count={stats.total_journals}
                  href="/admin/content/journals"
                  color="green"
                  icon={
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  }
                />

                {/* Goals Management */}
                <ManagementCard
                  title={t('management.goals.title')}
                  description={t('management.goals.description')}
                  count={stats.total_goals}
                  href="/admin/content/goals"
                  color="purple"
                  icon={
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  }
                />

                {/* Reported Content */}
                <ManagementCard
                  title={t('management.reports.title')}
                  description={t('management.reports.description')}
                  count={stats.total_reports}
                  badge={stats.pending_reports > 0 ? t('management.reports.badge', { count: stats.pending_reports.toLocaleString(locale) }) : undefined}
                  href="/admin/content/reports"
                  color="red"
                  icon={
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  }
                />

                {/* Quick Stats */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg shadow p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('quickStats.title')}</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{t('quickStats.tasksToday')}</span>
                      <span className="text-sm font-semibold text-gray-900">{stats.tasks_today.toLocaleString(locale)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{t('quickStats.activeGoals')}</span>
                      <span className="text-sm font-semibold text-gray-900">{stats.active_goals.toLocaleString(locale)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{t('quickStats.completedGoals')}</span>
                      <span className="text-sm font-semibold text-gray-900">{stats.completed_goals.toLocaleString(locale)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{t('quickStats.pendingReports')}</span>
                      <span className={`text-sm font-semibold ${stats.pending_reports > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                        {stats.pending_reports.toLocaleString(locale)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content Overview */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow p-6 border border-blue-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('overview.title')}</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{t('overview.totalItems')}</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {(stats.total_tasks + stats.total_journals + stats.total_goals).toLocaleString(locale)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-blue-200">
                      <div className="text-xs text-gray-500 mb-2">{t('overview.distribution')}</div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          <span className="text-xs text-gray-600">{t('overview.tasks', { count: stats.total_tasks.toLocaleString(locale) })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <span className="text-xs text-gray-600">{t('overview.journals', { count: stats.total_journals.toLocaleString(locale) })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                          <span className="text-xs text-gray-600">{t('overview.goals', { count: stats.total_goals.toLocaleString(locale) })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'red';
  highlight?: boolean;
}

function StatCard({ title, value, subtitle, icon, color, highlight }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    red: highlight ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-red-100 text-red-600',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>{icon}</div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

// Management Card Component
interface ManagementCardProps {
  title: string;
  description: string;
  count: number;
  badge?: string;
  href: string;
  color: 'blue' | 'green' | 'purple' | 'red';
  icon: React.ReactNode;
}

function ManagementCard({ title, description, count, badge, href, color, icon }: ManagementCardProps) {
  const colorClasses = {
    blue: 'border-blue-200 hover:border-blue-400 hover:shadow-blue-100',
    green: 'border-green-200 hover:border-green-400 hover:shadow-green-100',
    purple: 'border-purple-200 hover:border-purple-400 hover:shadow-purple-100',
    red: 'border-red-200 hover:border-red-400 hover:shadow-red-100',
  };

  const badgeColors = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    purple: 'bg-purple-100 text-purple-700',
    red: 'bg-red-100 text-red-700',
  };

  return (
    <Link href={href}>
      <div className={`bg-white rounded-lg shadow border-2 ${colorClasses[color]} p-6 transition-all hover:shadow-lg cursor-pointer h-full`}>
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2 rounded-lg bg-gray-100 text-gray-600`}>
            {icon}
          </div>
          {badge && (
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${badgeColors[color]}`}>
              {badge}
            </span>
          )}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-4">{description}</p>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-gray-900">{count.toLocaleString()}</span>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
