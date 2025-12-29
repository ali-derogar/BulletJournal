/**
 * Data Cleanup Service
 * Provides functions to clean up user data from IndexedDB
 */

import { clearSyncMetadata } from '@/storage/syncMeta';

/**
 * Clear all data for a specific user from IndexedDB
 * This is useful when logging out and wanting to remove sensitive data
 */
export async function clearUserData(userId: string): Promise<{
  success: boolean;
  deletedCount: number;
  error?: string;
}> {
  try {
    console.log('🗑️ Starting data cleanup for userId:', userId);

    if (typeof window === 'undefined' || !window.indexedDB) {
      return {
        success: false,
        deletedCount: 0,
        error: 'IndexedDB not available',
      };
    }

    const dbName = 'BulletJournalDB';
    const request = indexedDB.open(dbName);

    const result = await new Promise<{ deletedCount: number }>((resolve, reject) => {
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
                  if (item.userId === userId) {
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

          resolve({ deletedCount: totalDeleted });
        } catch (error) {
          reject(error);
        }
      };
    });

    // Clear sync metadata
    clearSyncMetadata();

    console.log(`✅ Data cleanup complete: Deleted ${result.deletedCount} items`);

    return {
      success: true,
      deletedCount: result.deletedCount,
    };
  } catch (error) {
    console.error('Failed to cleanup user data:', error);
    return {
      success: false,
      deletedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
