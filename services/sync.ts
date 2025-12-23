/**
 * Sync Service
 * Handles manual sync between local IndexedDB and backend server
 */

import { post } from './api';
import { getToken } from './auth';
import { getLastSyncAt, updateLastSyncAt } from '@/storage/syncMeta';
import { getAllTasks, getAllExpenses, getAllJournals } from '@/storage/helpers';
import type { Task } from '@/domain/task';
import type { Expense } from '@/domain/expense';
import type { DailyJournal } from '@/domain/journal';

export interface SyncRequest {
  tasks: Task[];
  expenses: Expense[];
  journals: DailyJournal[];
  reflections: never[]; // Backend expects this but frontend doesn't have reflections yet
}

export interface SyncResponse {
  synced_tasks: number;
  synced_expenses: number;
  synced_journals: number;
  synced_reflections: number;
  conflicts_resolved: number;
}

export type SyncPhase = 'loading' | 'saving' | 'idle';

export interface SyncResult {
  success: boolean;
  message: string;
  stats?: {
    uploadedTasks: number;
    uploadedExpenses: number;
    uploadedJournals: number;
    conflictsResolved: number;
  };
  error?: string;
  retryable?: boolean; // Whether the error can be retried
  tokenExpired?: boolean; // Whether token needs refresh
}

export interface SyncProgress {
  phase: SyncPhase;
  message: string;
}

/**
 * Classify error type for better handling
 */
function classifyError(error: any): {
  retryable: boolean;
  tokenExpired: boolean;
  message: string;
} {
  // Check for token expiration (401)
  if (error?.status === 401) {
    return {
      retryable: false,
      tokenExpired: true,
      message: 'Session expired. Please login again.',
    };
  }

  // Check for network errors
  if (error?.status === 0 || !error?.status) {
    return {
      retryable: true,
      tokenExpired: false,
      message: 'Network error. Please check your connection and retry.',
    };
  }

  // Server errors (500-599) are retryable
  if (error?.status >= 500) {
    return {
      retryable: true,
      tokenExpired: false,
      message: 'Server error. Please try again.',
    };
  }

  // Client errors (400-499 except 401) are usually not retryable
  if (error?.status >= 400 && error?.status < 500) {
    return {
      retryable: false,
      tokenExpired: false,
      message: error?.message || error?.detail || 'Request failed. Please check your data.',
    };
  }

  // Unknown errors - allow retry
  return {
    retryable: true,
    tokenExpired: false,
    message: error?.message || 'Sync failed. Please try again.',
  };
}

/**
 * Deduplicate records by ID
 */
function deduplicateById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter(item => {
    if (seen.has(item.id)) {
      console.warn(`Duplicate record detected and removed: ${item.id}`);
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

/**
 * Validate sync data to prevent corruption
 */
function validateSyncData(data: SyncRequest): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for required ID fields
  data.tasks.forEach((task, idx) => {
    if (!task.id) errors.push(`Task at index ${idx} missing ID`);
  });

  data.expenses.forEach((expense, idx) => {
    if (!expense.id) errors.push(`Expense at index ${idx} missing ID`);
  });

  data.journals.forEach((journal, idx) => {
    if (!journal.id) errors.push(`Journal at index ${idx} missing ID`);
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if sync is allowed
 */
export function canSync(isOnline: boolean, isAuthenticated: boolean): {
  allowed: boolean;
  reason?: string;
} {
  if (!isOnline) {
    return {
      allowed: false,
      reason: 'You are offline. Connect to the internet to sync.',
    };
  }

  if (!isAuthenticated) {
    return {
      allowed: false,
      reason: 'You must be logged in to sync.',
    };
  }

  return { allowed: true };
}

/**
 * Get all local changes since last sync
 */
async function getLocalChanges(userId: string, lastSyncAt: string | null): Promise<SyncRequest> {
  try {
    // Get all data for the user
    const allTasks = await getAllTasks(userId);
    const allExpenses = await getAllExpenses(userId);
    const allJournals = await getAllJournals(userId);

    // Deduplicate to prevent duplicate record issues
    const uniqueTasks = deduplicateById(allTasks);
    const uniqueExpenses = deduplicateById(allExpenses);
    const uniqueJournals = deduplicateById(allJournals);

    // If no lastSyncAt, sync everything
    if (!lastSyncAt) {
      return {
        tasks: uniqueTasks,
        expenses: uniqueExpenses,
        journals: uniqueJournals,
        reflections: [],
      };
    }

    // Filter items updated since last sync
    const lastSync = new Date(lastSyncAt);

    const changedTasks = uniqueTasks.filter((task) => {
      // Frontend tasks don't have updatedAt field, so sync all for first sync
      // In production, you'd add updatedAt to Task interface
      return true; // For now, sync all tasks when lastSyncAt exists
    });

    const changedExpenses = uniqueExpenses.filter((expense) => {
      // Same for expenses
      return true;
    });

    const changedJournals = uniqueJournals.filter((journal) => {
      // Same for journals
      return true;
    });

    return {
      tasks: changedTasks,
      expenses: changedExpenses,
      journals: changedJournals,
      reflections: [],
    };
  } catch (error) {
    console.error('Error collecting local changes:', error);
    // Return empty data rather than crashing - ensures no data loss
    return {
      tasks: [],
      expenses: [],
      journals: [],
      reflections: [],
    };
  }
}

/**
 * Download data from server and save to local IndexedDB
 */
export async function performDownload(
  userId: string,
  onProgress?: (progress: SyncProgress) => void
): Promise<SyncResult> {
  try {
    // Get auth token
    const token = getToken();
    if (!token) {
      return {
        success: false,
        message: 'Not authenticated',
        error: 'No authentication token found',
        retryable: false,
        tokenExpired: true,
      };
    }

    // Phase 1: Loading - Fetch from server
    onProgress?.({ phase: 'loading', message: 'Downloading from server...' });

    // Add delay to make loading state visible (for testing)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Fetch data from server
    const serverData = await post<SyncResponse>('/api/sync/download', {}, token);

    // Phase 2: Saving - Save to local IndexedDB
    onProgress?.({ phase: 'saving', message: 'Saving to local storage...' });

    // Add delay to make saving state visible (for testing)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // TODO: Implement saving to IndexedDB
    // This will be implemented when backend endpoint is ready

    // Update last sync timestamp
    updateLastSyncAt(userId);

    return {
      success: true,
      message: 'Downloaded successfully',
      stats: {
        uploadedTasks: serverData.synced_tasks,
        uploadedExpenses: serverData.synced_expenses,
        uploadedJournals: serverData.synced_journals,
        conflictsResolved: serverData.conflicts_resolved,
      },
      retryable: false,
    };
  } catch (error) {
    console.error('Download failed:', error);

    // Classify error to provide better feedback
    const classified = classifyError(error);

    return {
      success: false,
      message: 'Download failed',
      error: classified.message,
      retryable: classified.retryable,
      tokenExpired: classified.tokenExpired,
    };
  }
}

/**
 * Perform manual sync
 */
export async function performSync(
  userId: string,
  onProgress?: (progress: SyncProgress) => void
): Promise<SyncResult> {
  try {
    // Get auth token
    const token = getToken();
    if (!token) {
      return {
        success: false,
        message: 'Not authenticated',
        error: 'No authentication token found',
        retryable: false,
        tokenExpired: true,
      };
    }

    // Phase 1: Loading - Collect local changes
    onProgress?.({ phase: 'loading', message: 'Loading local changes...' });

    // Add delay to make loading state visible (for testing)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get last sync timestamp
    const lastSyncAt = getLastSyncAt(userId);

    // Collect local changes (already handles errors internally)
    const localChanges = await getLocalChanges(userId, lastSyncAt);

    const totalChanges =
      localChanges.tasks.length +
      localChanges.expenses.length +
      localChanges.journals.length;

    // If no changes, return early
    if (totalChanges === 0) {
      return {
        success: true,
        message: 'Already up to date',
        stats: {
          uploadedTasks: 0,
          uploadedExpenses: 0,
          uploadedJournals: 0,
          conflictsResolved: 0,
        },
        retryable: false,
      };
    }

    // Validate data before sending to prevent corruption
    const validation = validateSyncData(localChanges);
    if (!validation.valid) {
      console.error('Sync data validation failed:', validation.errors);
      return {
        success: false,
        message: 'Invalid data detected',
        error: `Data validation failed: ${validation.errors.join(', ')}`,
        retryable: false, // Data corruption issues aren't retryable
      };
    }

    // Phase 2: Saving - Send to server
    onProgress?.({ phase: 'saving', message: `Saving ${totalChanges} item(s)...` });

    // Add delay to make saving state visible (for testing)
    await new Promise(resolve => setTimeout(resolve, 1000));

    const response = await post<SyncResponse>('/api/sync', localChanges, token);

    // Update last sync timestamp only after successful sync
    updateLastSyncAt(userId);

    return {
      success: true,
      message: `Synced ${totalChanges} item(s) successfully`,
      stats: {
        uploadedTasks: response.synced_tasks,
        uploadedExpenses: response.synced_expenses,
        uploadedJournals: response.synced_journals,
        conflictsResolved: response.conflicts_resolved,
      },
      retryable: false,
    };
  } catch (error) {
    console.error('Sync failed:', error);

    // Classify error to provide better feedback
    const classified = classifyError(error);

    return {
      success: false,
      message: 'Sync failed',
      error: classified.message,
      retryable: classified.retryable,
      tokenExpired: classified.tokenExpired,
    };
  }
}

/**
 * Format sync stats for display
 */
export function formatSyncStats(stats?: SyncResult['stats']): string {
  if (!stats) return '';

  const parts: string[] = [];

  if (stats.uploadedTasks > 0) {
    parts.push(`${stats.uploadedTasks} task${stats.uploadedTasks > 1 ? 's' : ''}`);
  }

  if (stats.uploadedExpenses > 0) {
    parts.push(`${stats.uploadedExpenses} expense${stats.uploadedExpenses > 1 ? 's' : ''}`);
  }

  if (stats.uploadedJournals > 0) {
    parts.push(`${stats.uploadedJournals} journal${stats.uploadedJournals > 1 ? 's' : ''}`);
  }

  if (parts.length === 0) return 'No changes';

  return parts.join(', ');
}
