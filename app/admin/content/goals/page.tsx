'use client';

import { useEffect, useState, useCallback } from 'react';
import AdminGuard from '@/components/AdminGuard';
import AdminLayout from '@/components/AdminLayout';
import { getGoals, deleteGoal, type GoalItem, type ContentListParams } from '@/services/content';
import { formatDate, getStatusBadgeColor } from '@/services/content';

export default function GoalsManagementPage() {
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
    if (!confirm('Are you sure you want to permanently delete this goal? This action cannot be undone.')) return;

    const reason = prompt('Please provide a reason for deletion:');
    if (!reason) return;

    try {
      setDeleteLoading(goalId);
      await deleteGoal(goalId, reason);
      setSelectedGoal(null);
      await loadGoals(); // Reload the list
    } catch (error) {
      console.error('Failed to delete goal:', error);
      alert('Failed to delete goal');
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
            <h1 className="text-3xl font-bold text-gray-900">Goals Management</h1>
            <p className="mt-2 text-gray-600">View and manage all user goals</p>
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="paused">Paused</option>
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="yearly">Yearly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>

              {/* User ID Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User ID
                </label>
                <input
                  type="text"
                  value={userIdFilter}
                  onChange={(e) => {
                    setUserIdFilter(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Filter by user ID..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                Total: <span className="font-semibold">{total}</span> goals
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading goals...</div>
            ) : goals.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No goals found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Period
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Progress
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
                            View Details
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{goal.user_name || 'N/A'}</div>
                          <div className="text-xs text-gray-500">{goal.user_email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeColor(goal.type)}`}>
                            {goal.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(goal.status)}`}>
                            {goal.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>Year: {goal.year}</div>
                          {goal.quarter && <div className="text-xs">Q{goal.quarter}</div>}
                          {goal.month && <div className="text-xs">Month: {goal.month}</div>}
                          {goal.week && <div className="text-xs">Week: {goal.week}</div>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {goal.currentValue}/{goal.targetValue} {goal.unit}
                          <div className="text-xs text-gray-400">
                            {Math.round((goal.currentValue / goal.targetValue) * 100)}%
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
                            {deleteLoading === goal.id ? 'Deleting...' : 'Delete'}
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

        {/* Goal Detail Modal */}
        {selectedGoal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Goal Details</h2>
                <button
                  onClick={() => setSelectedGoal(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">Title:</span>
                  <p className="text-gray-900 font-semibold">{selectedGoal.title}</p>
                </div>

                {selectedGoal.description && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Description:</span>
                    <p className="text-gray-900 whitespace-pre-wrap">{selectedGoal.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">User:</span>
                    <p className="text-gray-900">{selectedGoal.user_name || 'N/A'}</p>
                    <p className="text-sm text-gray-500">{selectedGoal.user_email}</p>
                  </div>

                  <div>
                    <span className="text-sm font-medium text-gray-500">Type:</span>
                    <p>
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeColor(selectedGoal.type)}`}>
                        {selectedGoal.type}
                      </span>
                    </p>
                  </div>

                  <div>
                    <span className="text-sm font-medium text-gray-500">Status:</span>
                    <p>
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(selectedGoal.status)}`}>
                        {selectedGoal.status}
                      </span>
                    </p>
                  </div>

                  <div>
                    <span className="text-sm font-medium text-gray-500">Progress:</span>
                    <p className="text-gray-900">
                      {selectedGoal.currentValue} / {selectedGoal.targetValue} {selectedGoal.unit}
                      <span className="text-sm text-gray-500 ml-2">
                        ({Math.round((selectedGoal.currentValue / selectedGoal.targetValue) * 100)}%)
                      </span>
                    </p>
                  </div>

                  <div>
                    <span className="text-sm font-medium text-gray-500">Period:</span>
                    <p className="text-gray-900">
                      Year {selectedGoal.year}
                      {selectedGoal.quarter && `, Quarter ${selectedGoal.quarter}`}
                      {selectedGoal.month && `, Month ${selectedGoal.month}`}
                      {selectedGoal.week && `, Week ${selectedGoal.week}`}
                    </p>
                  </div>
                </div>

                {selectedGoal.milestones && selectedGoal.milestones.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Milestones:</span>
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
                  <span className="text-sm font-medium text-gray-500">Created:</span>
                  <p className="text-gray-900">{formatDate(selectedGoal.created_at)}</p>
                </div>

                <div className="pt-4 border-t flex gap-2">
                  <button
                    onClick={() => handleDelete(selectedGoal.id)}
                    disabled={deleteLoading === selectedGoal.id}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleteLoading === selectedGoal.id ? 'Deleting...' : 'Delete Goal (Permanent)'}
                  </button>
                  <button
                    onClick={() => setSelectedGoal(null)}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
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
