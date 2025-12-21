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
