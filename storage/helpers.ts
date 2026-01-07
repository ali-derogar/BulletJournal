/**
 * Storage Helper Functions
 * Functions to get all data across all dates for sync purposes
 */

import { initDB, getDB, STORES } from './db';
import type { Task } from '@/domain/task';
import type { Expense } from '@/domain/expense';
import type { DailyJournal } from '@/domain/journal';
import type { Goal } from '@/domain/goal';
import type { CalendarNote } from '@/domain/calendar';
import type { SleepInfo, MoodInfo } from '@/domain';

/**
 * Get all tasks for a user across all dates
 */
export async function getAllTasks(userId: string): Promise<Task[]> {
  await initDB();
  const db = getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.TASKS], 'readonly');
    const store = transaction.objectStore(STORES.TASKS);
    const index = store.index('userId');
    const request = index.getAll(userId);

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(new Error(`Failed to get tasks: ${request.error?.message}`));
    };
  });
}

/**
 * Get all sleep entries for a user
 */
export async function getAllSleep(userId: string): Promise<SleepInfo[]> {
  await initDB();
  const db = getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.SLEEP], 'readonly');
    const store = transaction.objectStore(STORES.SLEEP);
    const index = store.index('userId');
    const request = index.getAll(userId);

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(new Error(`Failed to get sleep: ${request.error?.message}`));
    };
  });
}

/**
 * Get all mood entries for a user
 */
export async function getAllMood(userId: string): Promise<MoodInfo[]> {
  await initDB();
  const db = getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.MOOD], 'readonly');
    const store = transaction.objectStore(STORES.MOOD);
    const index = store.index('userId');
    const request = index.getAll(userId);

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(new Error(`Failed to get mood: ${request.error?.message}`));
    };
  });
}

/**
 * Upsert sleep (used for applying server updates)
 */
export async function upsertSleep(sleep: SleepInfo): Promise<void> {
  await initDB();
  const db = getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.SLEEP], 'readwrite');
    const store = transaction.objectStore(STORES.SLEEP);
    const request = store.put(sleep);

    request.onsuccess = () => resolve();
    request.onerror = () => {
      reject(new Error(`Failed to upsert sleep: ${request.error?.message}`));
    };
  });
}

/**
 * Upsert mood (used for applying server updates)
 */
export async function upsertMood(mood: MoodInfo): Promise<void> {
  await initDB();
  const db = getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.MOOD], 'readwrite');
    const store = transaction.objectStore(STORES.MOOD);
    const request = store.put(mood);

    request.onsuccess = () => resolve();
    request.onerror = () => {
      reject(new Error(`Failed to upsert mood: ${request.error?.message}`));
    };
  });
}

/**
 * Get all expenses for a user across all dates
 */
export async function getAllExpenses(userId: string): Promise<Expense[]> {
  await initDB();
  const db = getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.EXPENSES], 'readonly');
    const store = transaction.objectStore(STORES.EXPENSES);
    const index = store.index('userId');
    const request = index.getAll(userId);

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(new Error(`Failed to get expenses: ${request.error?.message}`));
    };
  });
}

/**
 * Get all journals for a user across all dates
 */
export async function getAllJournals(userId: string): Promise<DailyJournal[]> {
  await initDB();
  const db = getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.DAILY_JOURNALS], 'readonly');
    const store = transaction.objectStore(STORES.DAILY_JOURNALS);
    const index = store.index('userId');
    const request = index.getAll(userId);

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(new Error(`Failed to get journals: ${request.error?.message}`));
    };
  });
}

/**
 * Upsert task (used for applying server updates)
 */
export async function upsertTask(task: Task): Promise<void> {
  await initDB();
  const db = getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.TASKS], 'readwrite');
    const store = transaction.objectStore(STORES.TASKS);
    const request = store.put(task);

    request.onsuccess = () => resolve();
    request.onerror = () => {
      reject(new Error(`Failed to upsert task: ${request.error?.message}`));
    };
  });
}

/**
 * Upsert expense (used for applying server updates)
 */
export async function upsertExpense(expense: Expense): Promise<void> {
  await initDB();
  const db = getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.EXPENSES], 'readwrite');
    const store = transaction.objectStore(STORES.EXPENSES);
    const request = store.put(expense);

    request.onsuccess = () => resolve();
    request.onerror = () => {
      reject(new Error(`Failed to upsert expense: ${request.error?.message}`));
    };
  });
}

/**
 * Upsert journal (used for applying server updates)
 */
export async function upsertJournal(journal: DailyJournal): Promise<void> {
  await initDB();
  const db = getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.DAILY_JOURNALS], 'readwrite');
    const store = transaction.objectStore(STORES.DAILY_JOURNALS);
    const request = store.put(journal);

    request.onsuccess = () => resolve();
    request.onerror = () => {
      reject(new Error(`Failed to upsert journal: ${request.error?.message}`));
    };
  });
}

/**
 * Get all goals for a user
 */
export async function getAllGoals(userId: string): Promise<Goal[]> {
  await initDB();
  const db = getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.GOALS], 'readonly');
    const store = transaction.objectStore(STORES.GOALS);
    const index = store.index('userId');
    const request = index.getAll(userId);

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(new Error(`Failed to get goals: ${request.error?.message}`));
    };
  });
}

/**
 * Get all calendar notes for a user
 */
export async function getAllCalendarNotes(userId: string): Promise<CalendarNote[]> {
  await initDB();
  const db = getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.CALENDAR_NOTES], 'readonly');
    const store = transaction.objectStore(STORES.CALENDAR_NOTES);
    const index = store.index('userId');
    const request = index.getAll(userId);

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(new Error(`Failed to get calendar notes: ${request.error?.message}`));
    };
  });
}

/**
 * Upsert goal (used for applying server updates)
 */
export async function upsertGoal(goal: Goal): Promise<void> {
  await initDB();
  const db = getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.GOALS], 'readwrite');
    const store = transaction.objectStore(STORES.GOALS);
    const request = store.put(goal);

    request.onsuccess = () => resolve();
    request.onerror = () => {
      reject(new Error(`Failed to upsert goal: ${request.error?.message}`));
    };
  });
}

/**
 * Upsert calendar note (used for applying server updates)
 */
export async function upsertCalendarNote(note: CalendarNote): Promise<void> {
  await initDB();
  const db = getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.CALENDAR_NOTES], 'readwrite');
    const store = transaction.objectStore(STORES.CALENDAR_NOTES);
    const request = store.put(note);

    request.onsuccess = () => resolve();
    request.onerror = () => {
      reject(new Error(`Failed to upsert calendar note: ${request.error?.message}`));
    };
  });
}

/**
 * Migrate data from "default" userId to actual userId
 * This is needed when user logs in and we need to associate their offline data with their account
 * Now includes conflict resolution - keeps newer data based on timestamps
 */
export async function migrateDefaultDataToUser(actualUserId: string): Promise<{
  migratedTasks: number;
  migratedExpenses: number;
  migratedJournals: number;
  migratedGoals: number;
  migratedCalendarNotes: number;
  skippedTasks: number;
  skippedExpenses: number;
  skippedJournals: number;
  skippedGoals: number;
  skippedCalendarNotes: number;
}> {
  console.log('🔄 Starting migration from "default" to userId:', actualUserId);

  let migratedTasks = 0;
  let migratedExpenses = 0;
  let migratedJournals = 0;
  let migratedGoals = 0;
  let migratedCalendarNotes = 0;
  let skippedTasks = 0;
  let skippedExpenses = 0;
  let skippedJournals = 0;
  let skippedGoals = 0;
  let skippedCalendarNotes = 0;

  // Migrate tasks with conflict resolution
  const defaultTasks = await getAllTasks('default');
  const existingTasks = await getAllTasks(actualUserId);
  const existingTasksById = new Map(existingTasks.map(t => [t.id, t]));

  console.log('📋 Found', defaultTasks.length, 'tasks with userId="default"');
  for (const task of defaultTasks) {
    const existing = existingTasksById.get(task.id);

    if (!existing) {
      // No conflict - safe to migrate
      const updatedTask = { ...task, userId: actualUserId };
      await upsertTask(updatedTask);
      migratedTasks++;
    } else {
      // Compare timestamps - keep newer
      const defaultTime = new Date(task.updatedAt || task.createdAt);
      const existingTime = new Date(existing.updatedAt || existing.createdAt);

      if (defaultTime > existingTime) {
        console.log(`  → Migrating newer default task: ${task.id}`);
        const updatedTask = { ...task, userId: actualUserId };
        await upsertTask(updatedTask);
        migratedTasks++;
      } else {
        console.log(`  → Skipping older default task: ${task.id}`);
        skippedTasks++;
      }
    }
  }

  // Migrate expenses with conflict resolution
  const defaultExpenses = await getAllExpenses('default');
  const existingExpenses = await getAllExpenses(actualUserId);
  const existingExpensesById = new Map(existingExpenses.map(e => [e.id, e]));

  console.log('💰 Found', defaultExpenses.length, 'expenses with userId="default"');
  for (const expense of defaultExpenses) {
    const existing = existingExpensesById.get(expense.id);

    if (!existing) {
      const updatedExpense = { ...expense, userId: actualUserId };
      await upsertExpense(updatedExpense);
      migratedExpenses++;
    } else {
      const defaultTime = new Date(expense.updatedAt || expense.createdAt);
      const existingTime = new Date(existing.updatedAt || existing.createdAt);

      if (defaultTime > existingTime) {
        const updatedExpense = { ...expense, userId: actualUserId };
        await upsertExpense(updatedExpense);
        migratedExpenses++;
      } else {
        skippedExpenses++;
      }
    }
  }

  // Migrate journals with conflict resolution
  const defaultJournals = await getAllJournals('default');
  const existingJournals = await getAllJournals(actualUserId);
  const existingJournalsById = new Map(existingJournals.map(j => [j.id, j]));

  console.log('📖 Found', defaultJournals.length, 'journals with userId="default"');
  for (const journal of defaultJournals) {
    const existing = existingJournalsById.get(journal.id);

    if (!existing) {
      const updatedJournal = { ...journal, userId: actualUserId };
      await upsertJournal(updatedJournal);
      migratedJournals++;
    } else {
      const defaultTime = new Date(journal.updatedAt || journal.createdAt);
      const existingTime = new Date(existing.updatedAt || existing.createdAt);

      if (defaultTime > existingTime) {
        const updatedJournal = { ...journal, userId: actualUserId };
        await upsertJournal(updatedJournal);
        migratedJournals++;
      } else {
        skippedJournals++;
      }
    }
  }

  // Migrate goals with conflict resolution
  const defaultGoals = await getAllGoals('default');
  const existingGoals = await getAllGoals(actualUserId);
  const existingGoalsById = new Map(existingGoals.map(g => [g.id, g]));

  console.log('🎯 Found', defaultGoals.length, 'goals with userId="default"');
  for (const goal of defaultGoals) {
    const existing = existingGoalsById.get(goal.id);

    if (!existing) {
      const updatedGoal = { ...goal, userId: actualUserId };
      await upsertGoal(updatedGoal);
      migratedGoals++;
    } else {
      const defaultTime = new Date(goal.updatedAt || goal.createdAt);
      const existingTime = new Date(existing.updatedAt || existing.createdAt);

      if (defaultTime > existingTime) {
        const updatedGoal = { ...goal, userId: actualUserId };
        await upsertGoal(updatedGoal);
        migratedGoals++;
      } else {
        skippedGoals++;
      }
    }
  }

  // Migrate calendar notes with conflict resolution
  const defaultCalendarNotes = await getAllCalendarNotes('default');
  const existingCalendarNotes = await getAllCalendarNotes(actualUserId);
  const existingNotesById = new Map(existingCalendarNotes.map(n => [n.id, n]));

  console.log('📅 Found', defaultCalendarNotes.length, 'calendar notes with userId="default"');
  for (const note of defaultCalendarNotes) {
    const existing = existingNotesById.get(note.id);

    if (!existing) {
      const updatedNote = { ...note, userId: actualUserId };
      await upsertCalendarNote(updatedNote);
      migratedCalendarNotes++;
    } else {
      const defaultTime = new Date(note.updatedAt || note.createdAt);
      const existingTime = new Date(existing.updatedAt || existing.createdAt);

      if (defaultTime > existingTime) {
        const updatedNote = { ...note, userId: actualUserId };
        await upsertCalendarNote(updatedNote);
        migratedCalendarNotes++;
      } else {
        skippedCalendarNotes++;
      }
    }
  }

  console.log('✅ Migration complete:', {
    migrated: { migratedTasks, migratedExpenses, migratedJournals, migratedGoals, migratedCalendarNotes },
    skipped: { skippedTasks, skippedExpenses, skippedJournals, skippedGoals, skippedCalendarNotes },
  });

  return {
    migratedTasks,
    migratedExpenses,
    migratedJournals,
    migratedGoals,
    migratedCalendarNotes,
    skippedTasks,
    skippedExpenses,
    skippedJournals,
    skippedGoals,
    skippedCalendarNotes,
  };
}
