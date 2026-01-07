/**
 * Sync Service
 * Handles manual sync between local IndexedDB and backend server
 */

import { post } from './api';
import { getToken } from './auth';
import { getLastSyncAt, updateLastSyncAt } from '@/storage/syncMeta';
import {
  getAllTasks, getAllExpenses, getAllJournals, getAllGoals, getAllCalendarNotes, getAllSleep, getAllMood,
  migrateDefaultDataToUser, upsertTask, upsertExpense, upsertJournal, upsertGoal, upsertCalendarNote, upsertSleep, upsertMood
} from '@/storage/helpers';
import type { Task } from '@/domain/task';
import type { Expense } from '@/domain/expense';
import type { DailyJournal } from '@/domain/journal';
import type { Goal } from '@/domain/goal';
import type { CalendarNote } from '@/domain/calendar';
import type { SleepInfo, MoodInfo } from '@/domain';

export interface SyncRequest {
  tasks: Task[];
  expenses: Expense[];
  journals: DailyJournal[];
  sleep: SleepInfo[];
  mood: MoodInfo[];
  goals: Goal[];
  calendarNotes: CalendarNote[];
  reflections: never[]; // Backend expects this but frontend doesn't have reflections yet
}

export interface SyncResponse {
  synced_tasks: number;
  synced_expenses: number;
  synced_journals: number;
  synced_sleep?: number;
  synced_mood?: number;
  synced_goals: number;
  synced_calendar_notes: number;
  synced_reflections: number;
  conflicts_resolved: number;
}

export interface DownloadResponse {
  tasks: Task[];
  expenses: Expense[];
  journals: DailyJournal[];
  sleep: SleepInfo[];
  mood: MoodInfo[];
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
    uploadedSleep: number;
    uploadedMood: number;
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

  data.sleep.forEach((s, idx) => {
    if (!s.id) errors.push(`Sleep at index ${idx} missing ID`);
  });

  data.mood.forEach((m, idx) => {
    if (!m.id) errors.push(`Mood at index ${idx} missing ID`);
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
 * Clean up any data in IndexedDB that has incorrect userId
 * This handles cases where bad data got into the database
 */
async function cleanupIncorrectUserData(userId: string): Promise<void> {
  try {
    console.log('🧹 Starting cleanup of incorrect userId data...');

    if (typeof window === 'undefined' || !window.indexedDB) {
      console.warn('IndexedDB not available for cleanup');
      return;
    }

    const dbName = 'BulletJournalDB';
    const request = indexedDB.open(dbName);

    await new Promise<void>((resolve, reject) => {
      request.onerror = () => reject(request.error);
      request.onsuccess = async () => {
        const db = request.result;
        let totalDeleted = 0;

        try {
          // All stores to clean up
          const storesToClean = ['tasks', 'expenses', 'dailyJournals', 'goals', 'calendarNotes'];

          for (const storeName of storesToClean) {
            let storeDeleted = 0;

            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const cursorRequest = store.openCursor();

            await new Promise<void>((resolveStore) => {
              cursorRequest.onsuccess = async (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor) {
                  const item = cursor.value;
                  if (item.userId !== userId) {
                    console.log(`🗑️ Deleting ${storeName} with wrong userId: ${item.id} (userId: ${item.userId})`);
                    await cursor.delete();
                    storeDeleted++;
                    totalDeleted++;
                  }
                  cursor.continue();
                } else {
                  if (storeDeleted > 0) {
                    console.log(`  → Deleted ${storeDeleted} items from ${storeName}`);
                  }
                  resolveStore();
                }
              };
              cursorRequest.onerror = () => {
                console.error(`Error cleaning ${storeName}:`, cursorRequest.error);
                resolveStore(); // Continue even if one store fails
              };
            });
          }

          console.log(`✅ Cleanup complete: Deleted ${totalDeleted} total items with incorrect userId`);
          resolve();
        } catch (error) {
          console.error('Cleanup error:', error);
          reject(error);
        }
      };
    });
  } catch (error) {
    console.error('Failed to cleanup incorrect user data:', error);
    // Don't throw - cleanup is best-effort
  }
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

    const allSleep = await getAllSleep(userId);
    console.log('😴 Found sleep:', allSleep.length);

    const allMood = await getAllMood(userId);
    console.log('🙂 Found mood:', allMood.length);

    const allGoals = await getAllGoals(userId);
    console.log('🎯 Found goals:', allGoals.length);

    const allCalendarNotes = await getAllCalendarNotes(userId);
    console.log('📅 Found calendar notes:', allCalendarNotes.length);

    // Deduplicate to prevent duplicate record issues
    const uniqueTasks = deduplicateById(allTasks);
    const uniqueExpenses = deduplicateById(allExpenses);
    const uniqueJournals = deduplicateById(allJournals);
    const uniqueSleep = deduplicateById(allSleep);
    const uniqueMood = deduplicateById(allMood);
    const uniqueGoals = deduplicateById(allGoals);
    const uniqueCalendarNotes = deduplicateById(allCalendarNotes);

    console.log('✅ After deduplication - Tasks:', uniqueTasks.length, 'Expenses:', uniqueExpenses.length, 'Journals:', uniqueJournals.length, 'Sleep:', uniqueSleep.length, 'Mood:', uniqueMood.length, 'Goals:', uniqueGoals.length, 'Calendar Notes:', uniqueCalendarNotes.length);

    // Validate userId - filter out items with wrong userId instead of forcing
    const validTasks = uniqueTasks.filter(task => {
      if (task.userId !== userId) {
        console.error(`❌ CRITICAL: Task ${task.id} has wrong userId: ${task.userId} (expected: ${userId})`);
        return false; // Don't sync wrong data
      }
      return true;
    });

    const validExpenses = uniqueExpenses.filter(expense => {
      if (expense.userId !== userId) {
        console.error(`❌ CRITICAL: Expense ${expense.id} has wrong userId: ${expense.userId} (expected: ${userId})`);
        return false;
      }
      return true;
    });

    const validJournals = uniqueJournals.filter(journal => {
      if (journal.userId !== userId) {
        console.error(`❌ CRITICAL: Journal ${journal.id} has wrong userId: ${journal.userId} (expected: ${userId})`);
        return false;
      }
      return true;
    });

    const validSleep = uniqueSleep.filter(s => {
      if (s.userId !== userId) {
        console.error(`❌ CRITICAL: Sleep ${s.id} has wrong userId: ${s.userId} (expected: ${userId})`);
        return false;
      }
      return true;
    });

    const validMood = uniqueMood.filter(m => {
      if (m.userId !== userId) {
        console.error(`❌ CRITICAL: Mood ${m.id} has wrong userId: ${m.userId} (expected: ${userId})`);
        return false;
      }
      return true;
    });

    const validGoals = uniqueGoals.filter(goal => {
      if (goal.userId !== userId) {
        console.error(`❌ CRITICAL: Goal ${goal.id} has wrong userId: ${goal.userId} (expected: ${userId})`);
        return false;
      }
      return true;
    });

    const validCalendarNotes = uniqueCalendarNotes.filter(note => {
      if (note.userId !== userId) {
        console.error(`❌ CRITICAL: CalendarNote ${note.id} has wrong userId: ${note.userId} (expected: ${userId})`);
        return false;
      }
      return true;
    });

    console.log('✅ After userId validation - Tasks:', validTasks.length, 'Expenses:', validExpenses.length, 'Journals:', validJournals.length, 'Sleep:', validSleep.length, 'Mood:', validMood.length, 'Goals:', validGoals.length, 'Calendar Notes:', validCalendarNotes.length);

    // If no lastSyncAt, sync everything (first sync)
    if (!lastSyncAt) {
      // Transform goals for backend compatibility
      const transformedGoals = validGoals.map(transformGoalForBackend);

      return {
        tasks: validTasks,
        expenses: validExpenses,
        journals: validJournals,
        sleep: validSleep,
        mood: validMood,
        goals: transformedGoals,
        calendarNotes: validCalendarNotes,
        reflections: [],
      };
    }

    // Filter items updated since last sync using updatedAt or createdAt
    const lastSync = new Date(lastSyncAt);

    const changedTasks = validTasks.filter((task) => {
      const timestamp = task.updatedAt || task.createdAt;
      if (!timestamp) {
        console.warn(`Task ${task.id} has no timestamp, including in sync`);
        return true; // Include items without timestamps to be safe
      }
      return new Date(timestamp) > lastSync;
    });

    const changedSleep = validSleep.filter((s) => {
      const timestamp = s.updatedAt || s.createdAt;
      if (!timestamp) {
        console.warn(`Sleep ${s.id} has no timestamp, including in sync`);
        return true;
      }
      return new Date(timestamp) > lastSync;
    });

    const changedMood = validMood.filter((m) => {
      const timestamp = m.updatedAt || m.createdAt;
      if (!timestamp) {
        console.warn(`Mood ${m.id} has no timestamp, including in sync`);
        return true;
      }
      return new Date(timestamp) > lastSync;
    });

    const changedExpenses = validExpenses.filter((expense) => {
      const timestamp = expense.updatedAt || expense.createdAt;
      if (!timestamp) {
        console.warn(`Expense ${expense.id} has no timestamp, including in sync`);
        return true;
      }
      return new Date(timestamp) > lastSync;
    });

    const changedJournals = validJournals.filter((journal) => {
      const timestamp = journal.updatedAt || journal.createdAt;
      if (!timestamp) {
        console.warn(`Journal ${journal.id} has no timestamp, including in sync`);
        return true;
      }
      return new Date(timestamp) > lastSync;
    });

    const changedGoals = validGoals.filter((goal) => {
      const timestamp = goal.updatedAt || goal.createdAt;
      if (!timestamp) {
        console.warn(`Goal ${goal.id} has no timestamp, including in sync`);
        return true;
      }
      return new Date(timestamp) > lastSync;
    });

    const changedCalendarNotes = validCalendarNotes.filter((note) => {
      const timestamp = note.updatedAt || note.createdAt;
      if (!timestamp) {
        console.warn(`CalendarNote ${note.id} has no timestamp, including in sync`);
        return true;
      }
      return new Date(timestamp) > lastSync;
    });

    console.log('✅ After incremental filtering - Tasks:', changedTasks.length, 'Expenses:', changedExpenses.length, 'Journals:', changedJournals.length, 'Sleep:', changedSleep.length, 'Mood:', changedMood.length, 'Goals:', changedGoals.length, 'Calendar Notes:', changedCalendarNotes.length);

    // Transform goals for backend compatibility
    const transformedChangedGoals = changedGoals.map(transformGoalForBackend);

    return {
      tasks: changedTasks,
      expenses: changedExpenses,
      journals: changedJournals,
      sleep: changedSleep,
      mood: changedMood,
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
      sleep: [],
      mood: [],
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
      sleep: serverData.sleep?.length || 0,
      mood: serverData.mood?.length || 0,
      goals: serverData.goals?.length || 0,
      calendarNotes: serverData.calendarNotes?.length || 0,
    });

    // DEBUG: Check if any tasks have missing or wrong userId
    serverData.tasks.forEach((task, idx) => {
      if (!task.userId || task.userId !== userId) {
        console.warn(`⚠️ Task ${idx} (${task.id}) has incorrect userId:`, {
          expected: userId,
          actual: task.userId,
          title: task.title,
        });
      }
    });

    // Phase 2: Saving - Save to local IndexedDB
    onProgress?.({ phase: 'saving', message: 'Saving to local storage...' });

    // Filter out any data with incorrect userId before saving
    console.log('🔍 Filtering downloaded data. Current userId:', userId);
    console.log('📦 Server returned:', {
      tasks: serverData.tasks.length,
      taskUserIds: serverData.tasks.map(t => ({ id: t.id, userId: t.userId })),
    });

    const validTasks = serverData.tasks.filter(task => task.userId === userId);
    const validExpenses = serverData.expenses.filter(expense => expense.userId === userId);
    const validJournals = serverData.journals.filter(journal => journal.userId === userId);
    const validSleep = (serverData.sleep || []).filter(s => s.userId === userId);
    const validMood = (serverData.mood || []).filter(m => m.userId === userId);
    const validGoals = (serverData.goals || []).filter(goal => goal.userId === userId);
    const validCalendarNotes = (serverData.calendarNotes || []).filter(note => note.userId === userId);

    // Log if any items were filtered out
    const filteredCount = {
      tasks: serverData.tasks.length - validTasks.length,
      expenses: serverData.expenses.length - validExpenses.length,
      journals: serverData.journals.length - validJournals.length,
      sleep: (serverData.sleep?.length || 0) - validSleep.length,
      mood: (serverData.mood?.length || 0) - validMood.length,
      goals: (serverData.goals?.length || 0) - validGoals.length,
      calendarNotes: (serverData.calendarNotes?.length || 0) - validCalendarNotes.length,
    };
    if (Object.values(filteredCount).some(count => count > 0)) {
      console.warn('🗑️ Filtered out items with incorrect userId:', filteredCount);
    } else {
      console.log('✅ All downloaded items have correct userId');
    }

    // Save all tasks to IndexedDB
    let savedTasks = 0;
    for (const task of validTasks) {
      try {
        await upsertTask(task);
        savedTasks++;
      } catch (error) {
        console.error('Failed to save task:', task.id, error);
      }
    }

    // Save all expenses to IndexedDB
    let savedExpenses = 0;
    for (const expense of validExpenses) {
      try {
        await upsertExpense(expense);
        savedExpenses++;
      } catch (error) {
        console.error('Failed to save expense:', expense.id, error);
      }
    }

    // Save all journals to IndexedDB
    let savedJournals = 0;
    for (const journal of validJournals) {
      try {
        await upsertJournal(journal);
        savedJournals++;
      } catch (error) {
        console.error('Failed to save journal:', journal.id, error);
      }
    }

    // Save all sleep to IndexedDB
    let savedSleep = 0;
    for (const sleep of validSleep) {
      try {
        await upsertSleep(sleep);
        savedSleep++;
      } catch (error) {
        console.error('Failed to save sleep:', sleep.id, error);
      }
    }

    // Save all mood to IndexedDB
    let savedMood = 0;
    for (const mood of validMood) {
      try {
        await upsertMood(mood);
        savedMood++;
      } catch (error) {
        console.error('Failed to save mood:', mood.id, error);
      }
    }

    // Save all goals to IndexedDB (transform from backend format first)
    let savedGoals = 0;
    for (const backendGoal of validGoals) {
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
    for (const note of validCalendarNotes) {
      try {
        await upsertCalendarNote(note);
        savedCalendarNotes++;
      } catch (error) {
        console.error('Failed to save calendar note:', note.id, error);
      }
    }

    console.log('✅ Download completed successfully', {
      tasks: savedTasks,
      expenses: savedExpenses,
      journals: savedJournals,
      sleep: savedSleep,
      mood: savedMood,
      goals: savedGoals,
      calendarNotes: savedCalendarNotes,
    });

    // Clean up any data with incorrect userId that might exist in IndexedDB
    await cleanupIncorrectUserData(userId);

    // Update last sync timestamp
    updateLastSyncAt(userId);

    // Trigger a custom event to notify components to refresh their data
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('data-downloaded', {
        detail: { userId, tasks: savedTasks, expenses: savedExpenses, journals: savedJournals, sleep: savedSleep, mood: savedMood, goals: savedGoals, calendarNotes: savedCalendarNotes }
      }));
    }

    return {
      success: true,
      message: 'Download completed successfully',
      stats: {
        uploadedTasks: savedTasks,
        uploadedExpenses: savedExpenses,
        uploadedJournals: savedJournals,
        uploadedSleep: savedSleep,
        uploadedMood: savedMood,
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
      sleep: localChanges.sleep.length,
      mood: localChanges.mood.length,
      goals: localChanges.goals.length,
      calendarNotes: localChanges.calendarNotes.length,
    });

    const totalChanges =
      localChanges.tasks.length +
      localChanges.expenses.length +
      localChanges.journals.length +
      localChanges.sleep.length +
      localChanges.mood.length +
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
          uploadedSleep: 0,
          uploadedMood: 0,
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
        uploadedSleep: response.synced_sleep || 0,
        uploadedMood: response.synced_mood || 0,
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
