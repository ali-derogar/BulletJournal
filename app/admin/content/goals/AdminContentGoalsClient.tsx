'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import AdminGuard from '@/components/AdminGuard';
import AdminLayout from '@/components/AdminLayout';
import { getGoals, deleteGoal, type GoalItem, type ContentListParams } from '@/services/content';
import { formatDate, getStatusBadgeColor } from '@/services/content';
import { useTranslations } from 'next-intl';

export default function GoalsManagementPage() {
  const t = useTranslations('admin.goals');
  const tCommon = useTranslations('admin.common');
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<GoalItem | null>(null);

  const loadGoals = useCallback(async () => {
    try {
      setLoading(true);
      const params: ContentListParams = {
        page,
        size: pageSize,
      };

      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;
      if (userIdFilter) params.user_id = userIdFilter;

      const response = await getGoals(params);
      setGoals(response.goals || []);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to load goals:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, typeFilter, userIdFilter]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const handleDelete = async (goalId: string) => {
    if (!confirm(t('confirmDelete'))) return;

    const reason = prompt(t('deleteReasonPrompt'));
    if (!reason) return;

    try {
      setDeleteLoading(goalId);
      await deleteGoal(goalId, reason);
      setSelectedGoal(null);
      await loadGoals(); // Reload the list
    } catch (error) {
      console.error('Failed to delete goal:', error);
      alert(t('deleteFailed'));
    } finally {
      setDeleteLoading(null);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      yearly: 'bg-purple-100 text-purple-800',
      quarterly: 'bg-blue-100 text-blue-800',
      monthly: 'bg-green-100 text-green-800',
      weekly: 'bg-yellow-100 text-yellow-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
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

          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('filters.statusLabel')}
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{t('filters.statusAll')}</option>
                  <option value="active">{t('status.active')}</option>
                  <option value="completed">{t('status.completed')}</option>
                  <option value="failed">{t('status.failed')}</option>
                  <option value="paused">{t('status.paused')}</option>
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('filters.typeLabel')}
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{t('filters.typeAll')}</option>
                  <option value="yearly">{t('type.yearly')}</option>
                  <option value="quarterly">{t('type.quarterly')}</option>
                  <option value="monthly">{t('type.monthly')}</option>
                  <option value="weekly">{t('type.weekly')}</option>
                </select>
              </div>

              {/* User ID Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('filters.userIdLabel')}
                </label>
                <input
                  type="text"
                  value={userIdFilter}
                  onChange={(e) => {
                    setUserIdFilter(e.target.value);
                    setPage(1);
                  }}
                  placeholder={t('filters.userIdPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Page Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('filters.perPageLabel')}
                </label>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {t('total', { count: total })}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">{t('loading')}</div>
            ) : goals.length === 0 ? (
              <div className="p-8 text-center text-gray-500">{t('empty')}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('table.title')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('table.user')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('table.type')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('table.status')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('table.period')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('table.progress')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('table.created')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('table.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {goals.map((goal) => (
                      <tr key={goal.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900 max-w-md">
                            {goal.title}
                          </div>
                          {goal.description && (
                            <div className="text-xs text-gray-500 max-w-md truncate">
                              {goal.description}
                            </div>
                          )}
                          <button
                            onClick={() => setSelectedGoal(goal)}
                            className="text-blue-600 hover:text-blue-800 text-xs mt-1"
                          >
                            {t('viewDetails')}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{goal.user_name || tCommon('notAvailable')}</div>
                          <div className="text-xs text-gray-500">{goal.user_email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeColor(goal.type)}`}>
                            {t(`type.${goal.type}`)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(goal.status)}`}>
                            {t(`status.${goal.status}`)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>{t('period.year', { year: goal.year })}</div>
                          {goal.quarter && <div className="text-xs">{t('period.quarter', { quarter: goal.quarter })}</div>}
                          {goal.month && <div className="text-xs">{t('period.month', { month: goal.month })}</div>}
                          {goal.week && <div className="text-xs">{t('period.week', { week: goal.week })}</div>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {t('progress.value', { current: goal.currentValue, target: goal.targetValue, unit: goal.unit })}
                          <div className="text-xs text-gray-400">
                            {t('progress.percent', { percent: Math.round((goal.currentValue / goal.targetValue) * 100) })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(goal.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleDelete(goal.id)}
                            disabled={deleteLoading === goal.id}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deleteLoading === goal.id ? tCommon('deleting') : tCommon('delete')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 rounded-lg shadow flex items-center justify-between">
              <div className="text-sm text-gray-700">
                {tCommon('pagination', { page, total: totalPages })}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {tCommon('previous')}
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {tCommon('next')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Goal Detail Modal */}
        {selectedGoal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{t('details.title')}</h2>
                <button
                  onClick={() => setSelectedGoal(null)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label={tCommon('close')}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">{t('details.fields.title')}</span>
                  <p className="text-gray-900 font-semibold">{selectedGoal.title}</p>
                </div>

                {selectedGoal.description && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">{t('details.fields.description')}</span>
                    <p className="text-gray-900 whitespace-pre-wrap">{selectedGoal.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">{t('details.fields.user')}</span>
                    <p className="text-gray-900">{selectedGoal.user_name || tCommon('notAvailable')}</p>
                    <p className="text-sm text-gray-500">{selectedGoal.user_email}</p>
                  </div>

                  <div>
                    <span className="text-sm font-medium text-gray-500">{t('details.fields.type')}</span>
                    <p>
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeColor(selectedGoal.type)}`}>
                        {t(`type.${selectedGoal.type}`)}
                      </span>
                    </p>
                  </div>

                  <div>
                    <span className="text-sm font-medium text-gray-500">{t('details.fields.status')}</span>
                    <p>
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(selectedGoal.status)}`}>
                        {t(`status.${selectedGoal.status}`)}
                      </span>
                    </p>
                  </div>

                  <div>
                    <span className="text-sm font-medium text-gray-500">{t('details.fields.progress')}</span>
                    <p className="text-gray-900">
                      {t('progress.value', { current: selectedGoal.currentValue, target: selectedGoal.targetValue, unit: selectedGoal.unit })}
                      <span className="text-sm text-gray-500 ml-2">
                        ({t('progress.percent', { percent: Math.round((selectedGoal.currentValue / selectedGoal.targetValue) * 100) })})
                      </span>
                    </p>
                  </div>

                  <div>
                    <span className="text-sm font-medium text-gray-500">{t('details.fields.period')}</span>
                    <p className="text-gray-900">
                      {t('period.yearInline', { year: selectedGoal.year })}
                      {selectedGoal.quarter && t('period.quarterInline', { quarter: selectedGoal.quarter })}
                      {selectedGoal.month && t('period.monthInline', { month: selectedGoal.month })}
                      {selectedGoal.week && t('period.weekInline', { week: selectedGoal.week })}
                    </p>
                  </div>
                </div>

                {selectedGoal.milestones && selectedGoal.milestones.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">{t('details.fields.milestones')}</span>
                    <ul className="mt-2 space-y-2">
                      {selectedGoal.milestones.map((milestone, index) => (
                        <li key={index} className="text-sm text-gray-900 flex items-start">
                          <span className="mr-2">•</span>
                          <span>{milestone}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <span className="text-sm font-medium text-gray-500">{t('details.fields.created')}</span>
                  <p className="text-gray-900">{formatDate(selectedGoal.created_at)}</p>
                </div>

                <div className="pt-4 border-t flex gap-2">
                  <button
                    onClick={() => handleDelete(selectedGoal.id)}
                    disabled={deleteLoading === selectedGoal.id}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleteLoading === selectedGoal.id ? tCommon('deleting') : t('details.deletePermanent')}
                  </button>
                  <button
                    onClick={() => setSelectedGoal(null)}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    {tCommon('close')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </AdminGuard>
  );
}
