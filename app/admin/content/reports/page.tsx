'use client';

import { useEffect, useState, useCallback } from 'react';
import AdminGuard from '@/components/AdminGuard';
import AdminLayout from '@/components/AdminLayout';
import { getReports, reviewReport, type ReportItem, type ContentListParams } from '@/services/content';
import { formatDate } from '@/services/content';

export default function ReportsManagementPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('');
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      const params: ContentListParams = {
        page,
        size: pageSize,
      };

      if (statusFilter) params.status = statusFilter;
      if (contentTypeFilter) params.content_type = contentTypeFilter;

      const response = await getReports(params);
      setReports(response.reports || []);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, contentTypeFilter]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleReview = async (reportId: string, status: string, adminNotes: string) => {
    try {
      setReviewLoading(true);
      await reviewReport(reportId, status, adminNotes);
      setSelectedReport(null);
      await loadReports(); // Reload the list
    } catch (error) {
      console.error('Failed to review report:', error);
      alert('Failed to review report');
    } finally {
      setReviewLoading(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      reviewed: 'bg-green-100 text-green-800 border-green-200',
      dismissed: 'bg-gray-100 text-gray-800 border-gray-200',
      actioned: 'bg-blue-100 text-blue-800 border-blue-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getReasonColor = (reason: string) => {
    const colors: Record<string, string> = {
      spam: 'bg-red-50 text-red-700',
      inappropriate: 'bg-orange-50 text-orange-700',
      harassment: 'bg-purple-50 text-purple-700',
      other: 'bg-gray-50 text-gray-700',
    };
    return colors[reason] || 'bg-gray-50 text-gray-700';
  };

  const getContentTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactElement> = {
      task: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      journal: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      goal: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      profile: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    };
    return icons[type] || icons.task;
  };

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Content Reports</h1>
            <p className="mt-2 text-gray-600">Review and moderate reported content</p>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="text-sm font-medium text-yellow-600">Pending</div>
              <div className="text-2xl font-bold text-yellow-900">
                {reports.filter((r) => r.status === 'pending').length}
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-sm font-medium text-green-600">Reviewed</div>
              <div className="text-2xl font-bold text-green-900">
                {reports.filter((r) => r.status === 'reviewed').length}
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm font-medium text-blue-600">Actioned</div>
              <div className="text-2xl font-bold text-blue-900">
                {reports.filter((r) => r.status === 'actioned').length}
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-600">Dismissed</div>
              <div className="text-2xl font-bold text-gray-900">
                {reports.filter((r) => r.status === 'dismissed').length}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="dismissed">Dismissed</option>
                  <option value="actioned">Actioned</option>
                </select>
              </div>

              {/* Content Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content Type
                </label>
                <select
                  value={contentTypeFilter}
                  onChange={(e) => {
                    setContentTypeFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="task">Task</option>
                  <option value="journal">Journal</option>
                  <option value="goal">Goal</option>
                  <option value="profile">Profile</option>
                </select>
              </div>

              {/* Page Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Per Page
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
                Total: <span className="font-semibold">{total}</span> reports
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading reports...</div>
            ) : reports.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No reports found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reporter
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reported User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Content
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reason
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reports.map((report) => (
                      <tr
                        key={report.id}
                        className={`hover:bg-gray-50 ${report.status === 'pending' ? 'bg-yellow-50' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{report.reporter_email}</div>
                          <div className="text-xs text-gray-500">ID: {report.reporter_id.substring(0, 8)}...</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{report.reported_user_email}</div>
                          <div className="text-xs text-gray-500">ID: {report.reported_user_id.substring(0, 8)}...</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {getContentTypeIcon(report.content_type)}
                            <span className="text-sm font-medium text-gray-900 capitalize">
                              {report.content_type}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">ID: {report.content_id.substring(0, 8)}...</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getReasonColor(report.reason)}`}>
                            {report.reason}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor(report.status)}`}>
                            {report.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(report.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => setSelectedReport(report)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Review
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
                Page <span className="font-medium">{page}</span> of{' '}
                <span className="font-medium">{totalPages}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Review Modal */}
        {selectedReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Review Report</h2>
                  <p className="text-sm text-gray-500 mt-1">Report ID: {selectedReport.id}</p>
                </div>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Report Details */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Reporter:</span>
                    <p className="text-gray-900">{selectedReport.reporter_email}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Reported User:</span>
                    <p className="text-gray-900">{selectedReport.reported_user_email}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Content Type:</span>
                    <p className="text-gray-900 capitalize">{selectedReport.content_type}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Reason:</span>
                    <p>
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getReasonColor(selectedReport.reason)}`}>
                        {selectedReport.reason}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <span className="text-sm font-medium text-gray-500">Reporter&apos;s Description:</span>
                  <p className="mt-1 text-gray-900 bg-gray-50 p-3 rounded-md whitespace-pre-wrap">
                    {selectedReport.description || 'No description provided'}
                  </p>
                </div>

                {/* Current Status */}
                <div>
                  <span className="text-sm font-medium text-gray-500">Current Status:</span>
                  <p className="mt-1">
                    <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full border ${getStatusColor(selectedReport.status)}`}>
                      {selectedReport.status}
                    </span>
                  </p>
                </div>

                {selectedReport.admin_notes && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Previous Admin Notes:</span>
                    <p className="mt-1 text-gray-900 bg-gray-50 p-3 rounded-md whitespace-pre-wrap">
                      {selectedReport.admin_notes}
                    </p>
                  </div>
                )}

                {/* Review Actions */}
                <div className="pt-6 border-t">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Take Action</h3>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <button
                      onClick={() => {
                        const notes = prompt('Admin notes (optional):') || '';
                        handleReview(selectedReport.id, 'reviewed', notes);
                      }}
                      disabled={reviewLoading}
                      className="px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      <div className="text-sm font-semibold">Reviewed</div>
                      <div className="text-xs">No issue found</div>
                    </button>

                    <button
                      onClick={() => {
                        const notes = prompt('Admin notes (optional):') || '';
                        handleReview(selectedReport.id, 'dismissed', notes);
                      }}
                      disabled={reviewLoading}
                      className="px-4 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      <div className="text-sm font-semibold">Dismiss</div>
                      <div className="text-xs">Not valid</div>
                    </button>

                    <button
                      onClick={() => {
                        const notes = prompt('Please describe the action taken:');
                        if (notes) handleReview(selectedReport.id, 'actioned', notes);
                      }}
                      disabled={reviewLoading}
                      className="px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      <div className="text-sm font-semibold">Take Action</div>
                      <div className="text-xs">Content removed</div>
                    </button>
                  </div>

                  <div className="text-xs text-gray-500 text-center">
                    After taking action, you will be prompted to add admin notes
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <button
                    onClick={() => setSelectedReport(null)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Close
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
