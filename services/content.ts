/**
 * Content Management API Service
 *
 * Admin endpoints for managing user-generated content
 * - Tasks, Journals, Goals
 * - Content statistics
 * - Reported content moderation
 */

import { get, patch, del, ApiError } from './api';
import { getToken } from './auth';

// ===== TYPES =====

export interface ContentStats {
  total_tasks: number;
  total_journals: number;
  total_goals: number;
  total_reports: number;
  pending_reports: number;
  tasks_today: number;
  active_goals: number;
  completed_goals: number;
}

export interface TaskItem {
  id: string;
  userId: string;
  user_email?: string;
  user_name?: string;
  date: string;
  title: string;
  status: string;
  created_at: string;
  spentTime?: number;
}

export interface JournalItem {
  id: string;
  userId: string;
  user_email?: string;
  user_name?: string;
  date: string;
  created_at: string;
}

export interface GoalItem {
  id: string;
  userId: string;
  user_email?: string;
  user_name?: string;
  title: string;
  description?: string;
  type: string;
  year: number;
  quarter?: number;
  month?: number;
  status: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  createdAt: string;
}

export interface ReportItem {
  id: string;
  reporter_id: string;
  reporter_email?: string;
  reported_user_id: string;
  reported_user_email?: string;
  content_type: string;
  content_id: string;
  reason: string;
  description?: string;
  status: string;
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface ContentListParams {
  page?: number;
  size?: number;
  user_id?: string;
  status?: string;
  search?: string;
  type?: string;
  content_type?: string;
}

export interface ContentListResponse<T> {
  tasks?: T[];
  journals?: T[];
  goals?: T[];
  reports?: T[];
  total: number;
  page: number;
  size: number;
}

// ===== API CALLS =====

/**
 * Get content statistics
 * Requires: ADMIN or SUPERUSER
 */
export async function getContentStats(): Promise<ContentStats> {
  const token = getToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  try {
    const stats = await get<ContentStats>('/admin/content/stats', token);
    return stats;
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.status === 403) {
      throw new Error('Admin access required');
    }
    throw new Error(apiError.message || 'Failed to fetch content stats');
  }
}

/**
 * Get tasks list
 * Requires: ADMIN or SUPERUSER
 */
export async function getTasks(params: ContentListParams = {}): Promise<ContentListResponse<TaskItem>> {
  const token = getToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.size) queryParams.append('size', params.size.toString());
  if (params.user_id) queryParams.append('user_id', params.user_id);
  if (params.status) queryParams.append('status', params.status);
  if (params.search) queryParams.append('search', params.search);

  try {
    const url = `/admin/content/tasks${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await get<ContentListResponse<TaskItem>>(url, token);
    return response;
  } catch (error) {
    const apiError = error as ApiError;
    throw new Error(apiError.message || 'Failed to fetch tasks');
  }
}

/**
 * Get journals list
 * Requires: ADMIN or SUPERUSER
 */
export async function getJournals(params: ContentListParams = {}): Promise<ContentListResponse<JournalItem>> {
  const token = getToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.size) queryParams.append('size', params.size.toString());
  if (params.user_id) queryParams.append('user_id', params.user_id);

  try {
    const url = `/admin/content/journals${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await get<ContentListResponse<JournalItem>>(url, token);
    return response;
  } catch (error) {
    const apiError = error as ApiError;
    throw new Error(apiError.message || 'Failed to fetch journals');
  }
}

/**
 * Get goals list
 * Requires: ADMIN or SUPERUSER
 */
export async function getGoals(params: ContentListParams = {}): Promise<ContentListResponse<GoalItem>> {
  const token = getToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.size) queryParams.append('size', params.size.toString());
  if (params.user_id) queryParams.append('user_id', params.user_id);
  if (params.status) queryParams.append('status', params.status);
  if (params.type) queryParams.append('type', params.type);

  try {
    const url = `/admin/content/goals${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await get<ContentListResponse<GoalItem>>(url, token);
    return response;
  } catch (error) {
    const apiError = error as ApiError;
    throw new Error(apiError.message || 'Failed to fetch goals');
  }
}

/**
 * Delete a task
 * Requires: ADMIN or SUPERUSER
 */
export async function deleteTask(taskId: string, reason: string): Promise<void> {
  const token = getToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  try {
    await del(`/admin/content/tasks/${taskId}`, { reason }, token);
  } catch (error) {
    const apiError = error as ApiError;
    throw new Error(apiError.message || 'Failed to delete task');
  }
}

/**
 * Delete a journal
 * Requires: ADMIN or SUPERUSER
 */
export async function deleteJournal(journalId: string, reason: string): Promise<void> {
  const token = getToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  try {
    await del(`/admin/content/journals/${journalId}`, { reason }, token);
  } catch (error) {
    const apiError = error as ApiError;
    throw new Error(apiError.message || 'Failed to delete journal');
  }
}

/**
 * Delete a goal
 * Requires: ADMIN or SUPERUSER
 */
export async function deleteGoal(goalId: string, reason: string): Promise<void> {
  const token = getToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  try {
    await del(`/admin/content/goals/${goalId}`, { reason }, token);
  } catch (error) {
    const apiError = error as ApiError;
    throw new Error(apiError.message || 'Failed to delete goal');
  }
}

/**
 * Get reports list
 * Requires: ADMIN or SUPERUSER
 */
export async function getReports(params: ContentListParams = {}): Promise<ContentListResponse<ReportItem>> {
  const token = getToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.size) queryParams.append('size', params.size.toString());
  if (params.status) queryParams.append('status', params.status);
  if (params.content_type) queryParams.append('content_type', params.content_type);

  try {
    const url = `/admin/content/reports${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await get<ContentListResponse<ReportItem>>(url, token);
    return response;
  } catch (error) {
    const apiError = error as ApiError;
    throw new Error(apiError.message || 'Failed to fetch reports');
  }
}

/**
 * Review a report
 * Requires: ADMIN or SUPERUSER
 */
export async function reviewReport(
  reportId: string,
  status: string,
  adminNotes?: string
): Promise<void> {
  const token = getToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  try {
    await patch(
      `/admin/content/reports/${reportId}`,
      { status, admin_notes: adminNotes },
      token
    );
  } catch (error) {
    const apiError = error as ApiError;
    throw new Error(apiError.message || 'Failed to review report');
  }
}

/**
 * Helper: Format date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Helper: Get status badge color
 */
export function getStatusBadgeColor(status: string): string {
  const colors: Record<string, string> = {
    'todo': 'gray',
    'in-progress': 'blue',
    'done': 'green',
    'active': 'blue',
    'completed': 'green',
    'failed': 'red',
    'paused': 'yellow',
    'pending': 'yellow',
    'reviewed': 'green',
    'dismissed': 'gray',
    'actioned': 'purple',
  };
  return colors[status] || 'gray';
}
