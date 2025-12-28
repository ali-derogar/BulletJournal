/**
 * Sync Service
 * Handles manual sync between local IndexedDB and backend server
 */

import { post } from './api';
import { getToken } from './auth';
import { getLastSyncAt, updateLastSyncAt } from '@/storage/syncMeta';
import {
  getAllTasks, getAllExpenses, getAllJournals, getAllGoals, getAllCalendarNotes,
  migrateDefaultDataToUser, upsertTask, upsertExpense, upsertJournal, upsertGoal, upsertCalendarNote
} from '@/storage/helpers';
import type { Task } from '@/domain/task';
import type { Expense } from '@/domain/expense';
import type { DailyJournal } from '@/domain/journal';
import type { Goal } from '@/domain/goal';
import type { CalendarNote } from '@/domain/calendar';

export interface SyncRequest {
  tasks: Task[];
  expenses: Expense[];
  journals: DailyJournal[];
  goals: Goal[];
  calendarNotes: CalendarNote[];
  reflections: never[]; // Backend expects this but frontend doesn't have reflections yet
}

export interface SyncResponse {
  synced_tasks: number;
  synced_expenses: number;
  synced_journals: number;
  synced_goals: number;
  synced_calendar_notes: number;
  synced_reflections: number;
  conflicts_resolved: number;
}

export interface DownloadResponse {
  tasks: Task[];
  expenses: Expense[];
  journals: DailyJournal[];
  goals: Goal[];
  calendarNotes: CalendarNote[];
  reflections: never[];
}

export type SyncPhase = 'loading' | 'saving' | 'idle';

export interface SyncResult {
  success: boolean;
  message: string;
  stats?: {
    uploadedTasks: number;
    uploadedExpenses: number;
    uploadedJournals: number;
    uploadedGoals: number;
    uploadedCalendarNotes: number;
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

  data.goals.forEach((goal, idx) => {
    if (!goal.id) errors.push(`Goal at index ${idx} missing ID`);
  });

  data.calendarNotes.forEach((note, idx) => {
    if (!note.id) errors.push(`Calendar note at index ${idx} missing ID`);
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
 * Transform Goal for backend compatibility
 * Backend expects linkedTaskIds as a JSON string, not an array
 */
function transformGoalForBackend(goal: Goal): any {
  return {
    ...goal,
    linkedTaskIds: JSON.stringify(goal.linkedTaskIds || []),
  };
}

/**
 * Transform Goal from backend format to frontend format
 * Backend sends linkedTaskIds as a JSON string, we need it as an array
 */
function transformGoalFromBackend(backendGoal: any): Goal {
  let linkedTaskIds: string[] = [];

  // Handle linkedTaskIds - it might be a string, array, or missing
  if (typeof backendGoal.linkedTaskIds === 'string') {
    try {
      linkedTaskIds = JSON.parse(backendGoal.linkedTaskIds);
    } catch {
      // If parsing fails, treat as empty array
      linkedTaskIds = [];
    }
  } else if (Array.isArray(backendGoal.linkedTaskIds)) {
    linkedTaskIds = backendGoal.linkedTaskIds;
  }

  return {
    ...backendGoal,
    linkedTaskIds,
  };
}

/**
 * Get all local changes since last sync
 */
async function getLocalChanges(userId: string, lastSyncAt: string | null): Promise<SyncRequest> {
  try {
    console.log('📦 Getting local changes for userId:', userId, 'lastSyncAt:', lastSyncAt);

    // Get all data for the user
    const allTasks = await getAllTasks(userId);
    console.log('📋 Found tasks:', allTasks.length);

    const allExpenses = await getAllExpenses(userId);
    console.log('💰 Found expenses:', allExpenses.length);

    const allJournals = await getAllJournals(userId);
    console.log('📖 Found journals:', allJournals.length);

    const allGoals = await getAllGoals(userId);
    console.log('🎯 Found goals:', allGoals.length);

    const allCalendarNotes = await getAllCalendarNotes(userId);
    console.log('📅 Found calendar notes:', allCalendarNotes.length);

    // Deduplicate to prevent duplicate record issues
    const uniqueTasks = deduplicateById(allTasks);
    const uniqueExpenses = deduplicateById(allExpenses);
    const uniqueJournals = deduplicateById(allJournals);
    const uniqueGoals = deduplicateById(allGoals);
    const uniqueCalendarNotes = deduplicateById(allCalendarNotes);

    console.log('✅ After deduplication - Tasks:', uniqueTasks.length, 'Expenses:', uniqueExpenses.length, 'Journals:', uniqueJournals.length, 'Goals:', uniqueGoals.length, 'Calendar Notes:', uniqueCalendarNotes.length);

    // Transform goals for backend compatibility
    const transformedGoals = uniqueGoals.map(transformGoalForBackend);

    // If no lastSyncAt, sync everything
    if (!lastSyncAt) {
      return {
        tasks: uniqueTasks,
        expenses: uniqueExpenses,
        journals: uniqueJournals,
        goals: transformedGoals,
        calendarNotes: uniqueCalendarNotes,
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

    const changedGoals = uniqueGoals.filter((goal) => {
      // Same for goals
      return true;
    });

    const changedCalendarNotes = uniqueCalendarNotes.filter((note) => {
      // Same for calendar notes
      return true;
    });

    // Transform goals for backend compatibility
    const transformedChangedGoals = changedGoals.map(transformGoalForBackend);

    return {
      tasks: changedTasks,
      expenses: changedExpenses,
      journals: changedJournals,
      goals: transformedChangedGoals,
      calendarNotes: changedCalendarNotes,
      reflections: [],
    };
  } catch (error) {
    console.error('Error collecting local changes:', error);
    // Return empty data rather than crashing - ensures no data loss
    return {
      tasks: [],
      expenses: [],
      journals: [],
      goals: [],
      calendarNotes: [],
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

    console.log('📥 Starting download for user:', userId);

    // Fetch data from server
    const serverData = await post<DownloadResponse>('/api/sync/download', {}, token);

    console.log('📦 Downloaded data:', {
      tasks: serverData.tasks.length,
      expenses: serverData.expenses.length,
      journals: serverData.journals.length,
      goals: serverData.goals?.length || 0,
      calendarNotes: serverData.calendarNotes?.length || 0,
    });

    // Phase 2: Saving - Save to local IndexedDB
    onProgress?.({ phase: 'saving', message: 'Saving to local storage...' });

    // Save all tasks to IndexedDB
    let savedTasks = 0;
    for (const task of serverData.tasks) {
      try {
        await upsertTask(task);
        savedTasks++;
      } catch (error) {
        console.error('Failed to save task:', task.id, error);
      }
    }

    // Save all expenses to IndexedDB
    let savedExpenses = 0;
    for (const expense of serverData.expenses) {
      try {
        await upsertExpense(expense);
        savedExpenses++;
      } catch (error) {
        console.error('Failed to save expense:', expense.id, error);
      }
    }

    // Save all journals to IndexedDB
    let savedJournals = 0;
    for (const journal of serverData.journals) {
      try {
        await upsertJournal(journal);
        savedJournals++;
      } catch (error) {
        console.error('Failed to save journal:', journal.id, error);
      }
    }

    // Save all goals to IndexedDB (transform from backend format first)
    let savedGoals = 0;
    for (const backendGoal of serverData.goals || []) {
      try {
        const goal = transformGoalFromBackend(backendGoal);
        await upsertGoal(goal);
        savedGoals++;
      } catch (error) {
        console.error('Failed to save goal:', backendGoal.id, error);
      }
    }

    // Save all calendar notes to IndexedDB
    let savedCalendarNotes = 0;
    for (const note of serverData.calendarNotes || []) {
      try {
        await upsertCalendarNote(note);
        savedCalendarNotes++;
      } catch (error) {
        console.error('Failed to save calendar note:', note.id, error);
      }
    }

    console.log('💾 Saved to IndexedDB:', {
      tasks: savedTasks,
      expenses: savedExpenses,
      journals: savedJournals,
      goals: savedGoals,
      calendarNotes: savedCalendarNotes,
    });

    // Update last sync timestamp
    updateLastSyncAt(userId);

    // Trigger a custom event to notify components to refresh their data
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('data-downloaded', {
        detail: { userId, tasks: savedTasks, expenses: savedExpenses, journals: savedJournals, goals: savedGoals, calendarNotes: savedCalendarNotes }
      }));
    }

    return {
      success: true,
      message: 'Downloaded successfully',
      stats: {
        uploadedTasks: savedTasks,
        uploadedExpenses: savedExpenses,
        uploadedJournals: savedJournals,
        uploadedGoals: savedGoals,
        uploadedCalendarNotes: savedCalendarNotes,
        conflictsResolved: 0,
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
  console.log('performSync called with userId:', userId);
  try {
    // Get auth token
    const token = getToken();
    console.log('Auth token present:', !!token);
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

    // Migrate data from "default" userId to actual userId if needed
    console.log('🔍 Checking for data migration needs...');
    try {
      const migrationResult = await migrateDefaultDataToUser(userId);
      if (migrationResult.migratedTasks > 0 || migrationResult.migratedExpenses > 0 || migrationResult.migratedJournals > 0 || migrationResult.migratedGoals > 0 || migrationResult.migratedCalendarNotes > 0) {
        console.log('✅ Migrated data from "default" to user:', migrationResult);
      }
    } catch (migrationError) {
      console.error('⚠️ Migration failed, continuing anyway:', migrationError);
    }

    // Add delay to make loading state visible (for testing)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get last sync timestamp
    const lastSyncAt = getLastSyncAt(userId);

    // Collect local changes (already handles errors internally)
    const localChanges = await getLocalChanges(userId, lastSyncAt);
    console.log('Local changes collected:', {
      tasks: localChanges.tasks.length,
      expenses: localChanges.expenses.length,
      journals: localChanges.journals.length,
      goals: localChanges.goals.length,
      calendarNotes: localChanges.calendarNotes.length,
    });

    const totalChanges =
      localChanges.tasks.length +
      localChanges.expenses.length +
      localChanges.journals.length +
      localChanges.goals.length +
      localChanges.calendarNotes.length;

    console.log('Total changes to sync:', totalChanges);

    // If no changes, return early
    if (totalChanges === 0) {
      console.log('No changes to sync, returning early');
      return {
        success: true,
        message: 'Already up to date',
        stats: {
          uploadedTasks: 0,
          uploadedExpenses: 0,
          uploadedJournals: 0,
          uploadedGoals: 0,
          uploadedCalendarNotes: 0,
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

    console.log('Sending sync request to /api/sync');
    const response = await post<SyncResponse>('/api/sync', localChanges, token);
    console.log('Sync response received:', response);

    // Update last sync timestamp only after successful sync
    updateLastSyncAt(userId);

    return {
      success: true,
      message: `Synced ${totalChanges} item(s) successfully`,
      stats: {
        uploadedTasks: response.synced_tasks,
        uploadedExpenses: response.synced_expenses,
        uploadedJournals: response.synced_journals,
        uploadedGoals: response.synced_goals,
        uploadedCalendarNotes: response.synced_calendar_notes,
        conflictsResolved: response.conflicts_resolved,
      },
      retryable: false,
    };
  } catch (error) {
    console.error('Sync failed:', error);

    // Convert detail to string if it's an array or object
    let detailStr = 'Unknown';
    try {
      const detail = (error as any)?.detail;
      if (Array.isArray(detail)) {
        detailStr = JSON.stringify(detail);
      } else if (typeof detail === 'object' && detail !== null) {
        detailStr = JSON.stringify(detail);
      } else if (detail) {
        detailStr = String(detail);
      }
    } catch (e) {
      detailStr = 'Unable to parse error detail';
    }

    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      status: (error as any)?.status,
      detail: detailStr,
    });

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
 * Manually migrate data from "default" userId to actual userId
 * Exported for debugging/manual use via browser console
 */
export async function manualMigrateData(actualUserId: string) {
  console.log('🔄 Manually triggering migration to userId:', actualUserId);
  const result = await migrateDefaultDataToUser(actualUserId);
  console.log('✅ Migration result:', result);
  return result;
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

  if (stats.uploadedGoals > 0) {
    parts.push(`${stats.uploadedGoals} goal${stats.uploadedGoals > 1 ? 's' : ''}`);
  }

  if (stats.uploadedCalendarNotes > 0) {
    parts.push(`${stats.uploadedCalendarNotes} note${stats.uploadedCalendarNotes > 1 ? 's' : ''}`);
  }

  if (parts.length === 0) return 'No changes';

  return parts.join(', ');
}
