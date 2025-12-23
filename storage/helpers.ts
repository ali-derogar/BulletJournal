/**
 * Storage Helper Functions
 * Functions to get all data across all dates for sync purposes
 */

import { initDB, getDB, STORES } from './db';
import type { Task } from '@/domain/task';
import type { Expense } from '@/domain/expense';
import type { DailyJournal } from '@/domain/journal';

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
 * Migrate data from "default" userId to actual userId
 * This is needed when user logs in and we need to associate their offline data with their account
 */
export async function migrateDefaultDataToUser(actualUserId: string): Promise<{
  migratedTasks: number;
  migratedExpenses: number;
  migratedJournals: number;
}> {
  console.log('🔄 Starting migration from "default" to userId:', actualUserId);

  let migratedTasks = 0;
  let migratedExpenses = 0;
  let migratedJournals = 0;

  // Migrate tasks
  const defaultTasks = await getAllTasks('default');
  console.log('📋 Found', defaultTasks.length, 'tasks with userId="default"');
  for (const task of defaultTasks) {
    const updatedTask = { ...task, userId: actualUserId };
    await upsertTask(updatedTask);
    migratedTasks++;
  }

  // Migrate expenses
  const defaultExpenses = await getAllExpenses('default');
  console.log('💰 Found', defaultExpenses.length, 'expenses with userId="default"');
  for (const expense of defaultExpenses) {
    const updatedExpense = { ...expense, userId: actualUserId };
    await upsertExpense(updatedExpense);
    migratedExpenses++;
  }

  // Migrate journals
  const defaultJournals = await getAllJournals('default');
  console.log('📖 Found', defaultJournals.length, 'journals with userId="default"');
  for (const journal of defaultJournals) {
    const updatedJournal = { ...journal, userId: actualUserId };
    await upsertJournal(updatedJournal);
    migratedJournals++;
  }

  console.log('✅ Migration complete:', {
    migratedTasks,
    migratedExpenses,
    migratedJournals,
  });

  return { migratedTasks, migratedExpenses, migratedJournals };
}
