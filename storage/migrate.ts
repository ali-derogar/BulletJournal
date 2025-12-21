/**
 * Data migration utilities for multi-user support
 *
 * This module provides functions to migrate existing data to include userId field.
 * All legacy records (without userId) will be assigned userId="default"
 */

import { initDB, getDB, STORES } from "./db";
import type { Task, Expense, DailyJournal, MoodInfo, SleepInfo } from "@/domain";

interface MigrationResult {
  store: string;
  totalRecords: number;
  migratedRecords: number;
  errors: string[];
}

interface MigrationReport {
  success: boolean;
  results: MigrationResult[];
  totalMigrated: number;
  timestamp: string;
}

/**
 * Migrate all records in a specific store to include userId="default"
 */
async function migrateStore<T extends { userId?: string }>(
  storeName: string
): Promise<MigrationResult> {
  const db = getDB();
  const result: MigrationResult = {
    store: storeName,
    totalRecords: 0,
    migratedRecords: 0,
    errors: [],
  };

  return new Promise((resolve) => {
    const transaction = db.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.openCursor();

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

      if (cursor) {
        result.totalRecords++;
        const record = cursor.value as T;

        // Only migrate if userId is missing
        if (!record.userId) {
          try {
            const updatedRecord = {
              ...record,
              userId: "default",
            };
            cursor.update(updatedRecord);
            result.migratedRecords++;
          } catch (error) {
            result.errors.push(
              `Failed to migrate record: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }

        cursor.continue();
      } else {
        // Cursor finished
        resolve(result);
      }
    };

    request.onerror = () => {
      result.errors.push(
        `Failed to open cursor: ${request.error?.message || "Unknown error"}`
      );
      resolve(result);
    };
  });
}

/**
 * Migrate all data stores to include userId="default" for legacy records
 *
 * @returns Migration report with details of migrated records
 *
 * @example
 * ```typescript
 * const report = await migrateAllData();
 * console.log(`Migrated ${report.totalMigrated} records`);
 * ```
 */
export async function migrateAllData(): Promise<MigrationReport> {
  try {
    await initDB();

    const storesToMigrate = [
      STORES.TASKS,
      STORES.EXPENSES,
      STORES.DAILY_JOURNALS,
      STORES.MOOD,
      STORES.SLEEP,
    ];

    const results: MigrationResult[] = [];

    for (const storeName of storesToMigrate) {
      const result = await migrateStore(storeName);
      results.push(result);
    }

    const totalMigrated = results.reduce(
      (sum, r) => sum + r.migratedRecords,
      0
    );

    return {
      success: true,
      results,
      totalMigrated,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      results: [],
      totalMigrated: 0,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Get migration status - checks if any records need migration
 *
 * @returns Object with count of records needing migration per store
 */
export async function getMigrationStatus(): Promise<{
  [storeName: string]: { total: number; needsMigration: number };
}> {
  try {
    await initDB();
    const db = getDB();

    const storesToCheck = [
      STORES.TASKS,
      STORES.EXPENSES,
      STORES.DAILY_JOURNALS,
      STORES.MOOD,
      STORES.SLEEP,
    ];

    const status: {
      [storeName: string]: { total: number; needsMigration: number };
    } = {};

    for (const storeName of storesToCheck) {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([storeName], "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.openCursor();

        let total = 0;
        let needsMigration = 0;

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>)
            .result;

          if (cursor) {
            total++;
            const record = cursor.value as { userId?: string };
            if (!record.userId) {
              needsMigration++;
            }
            cursor.continue();
          } else {
            status[storeName] = { total, needsMigration };
            resolve();
          }
        };

        request.onerror = () => {
          reject(
            new Error(
              `Failed to check migration status for ${storeName}: ${request.error?.message}`
            )
          );
        };
      });
    }

    return status;
  } catch (error) {
    console.error("Failed to get migration status:", error);
    return {};
  }
}

/**
 * Batch update records with userId for a specific store
 * Useful for assigning specific userIds to batches of records
 *
 * @param storeName - The store to update
 * @param recordIds - Array of record IDs to update
 * @param userId - The userId to assign
 */
export async function batchUpdateUserId(
  storeName: string,
  recordIds: string[],
  userId: string
): Promise<{ updated: number; failed: string[] }> {
  try {
    await initDB();
    const db = getDB();

    const failed: string[] = [];
    let updated = 0;

    for (const recordId of recordIds) {
      try {
        await new Promise<void>((resolve, reject) => {
          const transaction = db.transaction([storeName], "readwrite");
          const store = transaction.objectStore(storeName);
          const getRequest = store.get(recordId);

          getRequest.onsuccess = () => {
            const record = getRequest.result;
            if (record) {
              record.userId = userId;
              const updateRequest = store.put(record);

              updateRequest.onsuccess = () => {
                updated++;
                resolve();
              };

              updateRequest.onerror = () => {
                failed.push(recordId);
                reject(
                  new Error(
                    `Failed to update ${recordId}: ${updateRequest.error?.message}`
                  )
                );
              };
            } else {
              failed.push(recordId);
              reject(new Error(`Record ${recordId} not found`));
            }
          };

          getRequest.onerror = () => {
            failed.push(recordId);
            reject(
              new Error(
                `Failed to get ${recordId}: ${getRequest.error?.message}`
              )
            );
          };
        });
      } catch (error) {
        // Continue with next record
        continue;
      }
    }

    return { updated, failed };
  } catch (error) {
    throw new Error(
      `Error in batchUpdateUserId: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
