'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import AdminGuard from '@/components/AdminGuard';
import AdminLayout from '@/components/AdminLayout';
import { getJournals, deleteJournal, type JournalItem, type ContentListParams } from '@/services/content';
import { formatDate } from '@/services/content';
import { useTranslations } from 'next-intl';

export default function JournalsManagementPage() {
  const t = useTranslations('admin.journals');
  const tCommon = useTranslations('admin.common');
  const [journals, setJournals] = useState<JournalItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [userIdFilter, setUserIdFilter] = useState('');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [selectedJournal, setSelectedJournal] = useState<JournalItem | null>(null);

  const loadJournals = useCallback(async () => {
    try {
      setLoading(true);
      const params: ContentListParams = {
        page,
        size: pageSize,
      };

      if (userIdFilter) params.user_id = userIdFilter;

      const response = await getJournals(params);
      setJournals(response.journals || []);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to load journals:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, userIdFilter]);

  useEffect(() => {
    loadJournals();
  }, [loadJournals]);

  const handleDelete = async (journalId: string) => {
    if (!confirm(t('confirmDelete'))) return;

    const reason = prompt(t('deleteReasonPrompt'));
    if (!reason) return;

    try {
      setDeleteLoading(journalId);
      await deleteJournal(journalId, reason);
      setSelectedJournal(null);
      await loadJournals(); // Reload the list
    } catch (error) {
      console.error('Failed to delete journal:', error);
      alert(t('deleteFailed'));
    } finally {
      setDeleteLoading(null);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              <div className="flex items-end">
                <div className="text-sm text-gray-600">
                  {t('total', { count: total })}
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">{t('loading')}</div>
            ) : journals.length === 0 ? (
              <div className="p-8 text-center text-gray-500">{t('empty')}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('table.user')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('table.date')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('table.preview')}
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
                    {journals.map((journal) => (
                      <tr key={journal.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{journal.user_name || tCommon('notAvailable')}</div>
                          <div className="text-xs text-gray-500">{journal.user_email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {journal.date}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-md space-y-1">
                            <div className="text-xs">
                              <span className="font-semibold">{t('preview.tasksLabel')}</span>{' '}
                              {t('preview.tasksCount', { count: journal.tasks ? JSON.parse(journal.tasks).length : 0 })}
                            </div>
                            <div className="text-xs">
                              <span className="font-semibold">{t('preview.expensesLabel')}</span>{' '}
                              {t('preview.expensesCount', { count: journal.expenses ? JSON.parse(journal.expenses).length : 0 })}
                            </div>
                            {journal.mood_id && (
                              <div className="text-xs">
                                <span className="font-semibold">{t('preview.moodId')}</span> {journal.mood_id}
                              </div>
                            )}
                            {journal.sleep_id && (
                              <div className="text-xs">
                                <span className="font-semibold">{t('preview.sleepId')}</span> {journal.sleep_id}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => setSelectedJournal(journal)}
                            className="text-blue-600 hover:text-blue-800 text-xs mt-1"
                          >
                            {t('viewDetails')}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(journal.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleDelete(journal.id)}
                            disabled={deleteLoading === journal.id}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deleteLoading === journal.id ? tCommon('deleting') : tCommon('delete')}
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

        {/* Journal Detail Modal */}
        {selectedJournal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{t('details.title')}</h2>
                <button
                  onClick={() => setSelectedJournal(null)}
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
                  <span className="text-sm font-medium text-gray-500">{t('details.fields.user')}</span>
                  <p className="text-gray-900">{selectedJournal.user_name || tCommon('notAvailable')}</p>
                  <p className="text-sm text-gray-500">{selectedJournal.user_email}</p>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-500">{t('details.fields.date')}</span>
                  <p className="text-gray-900">{selectedJournal.date}</p>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-500">{t('details.fields.tasks')}</span>
                  <p className="text-gray-900">
                    {t('details.tasksCount', { count: selectedJournal.tasks ? JSON.parse(selectedJournal.tasks).length : 0 })}
                  </p>
                  {selectedJournal.tasks && JSON.parse(selectedJournal.tasks).length > 0 && (
                    <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto">
                      {JSON.stringify(JSON.parse(selectedJournal.tasks), null, 2)}
                    </pre>
                  )}
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-500">{t('details.fields.expenses')}</span>
                  <p className="text-gray-900">
                    {t('details.expensesCount', { count: selectedJournal.expenses ? JSON.parse(selectedJournal.expenses).length : 0 })}
                  </p>
                  {selectedJournal.expenses && JSON.parse(selectedJournal.expenses).length > 0 && (
                    <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto">
                      {JSON.stringify(JSON.parse(selectedJournal.expenses), null, 2)}
                    </pre>
                  )}
                </div>

                {selectedJournal.mood_id && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">{t('details.fields.moodId')}</span>
                    <p className="text-gray-900">{selectedJournal.mood_id}</p>
                  </div>
                )}

                {selectedJournal.sleep_id && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">{t('details.fields.sleepId')}</span>
                    <p className="text-gray-900">{selectedJournal.sleep_id}</p>
                  </div>
                )}

                <div className="pt-4 border-t flex gap-2">
                  <button
                    onClick={() => handleDelete(selectedJournal.id)}
                    disabled={deleteLoading === selectedJournal.id}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleteLoading === selectedJournal.id ? tCommon('deleting') : t('details.delete')}
                  </button>
                  <button
                    onClick={() => setSelectedJournal(null)}
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
