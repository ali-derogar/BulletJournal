import type { DailyJournal } from "@/domain";
import { initDB, getDB, STORES } from "./db";

/**
 * Get daily journal for a specific date and user
 * Automatically migrates old journals without userId field
 */
export async function getDay(date: string, userId: string = "default"): Promise<DailyJournal | null> {
  try {
    await initDB();
    const db = getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.DAILY_JOURNALS], "readonly");
      const store = transaction.objectStore(STORES.DAILY_JOURNALS);
      const index = store.index("date");
      const request = index.getAll(date);

      request.onsuccess = () => {
        const journals = request.result || [];
        // Filter by userId and migrate old journals without userId
        const migratedJournals = journals
          .map((journal: DailyJournal) => ({
            ...journal,
            userId: journal.userId ?? "default", // Migrate old journals without userId
          }))
          .filter((journal) => journal.userId === userId); // Filter by userId

        // Return the first matching journal (should only be one per date/user)
        resolve(migratedJournals.length > 0 ? migratedJournals[0] : null);
      };

      request.onerror = () => {
        reject(
          new Error(`Failed to get day for ${date}: ${request.error?.message}`)
        );
      };
    });
  } catch (error) {
    throw new Error(
      `Error in getDay: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function saveDay(journal: DailyJournal): Promise<void> {
  try {
    await initDB();
    const db = getDB();

    // Auto-populate updatedAt if not present
    const journalToSave: DailyJournal = {
      ...journal,
      updatedAt: journal.updatedAt || new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.DAILY_JOURNALS], "readwrite");
      const store = transaction.objectStore(STORES.DAILY_JOURNALS);
      const request = store.put(journalToSave);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(
          new Error(
            `Failed to save day for ${journal.date}: ${request.error?.message}`
          )
        );
      };
    });
  } catch (error) {
    throw new Error(
      `Error in saveDay: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function deleteDay(date: string): Promise<void> {
  try {
    await initDB();
    const db = getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.DAILY_JOURNALS], "readwrite");
      const store = transaction.objectStore(STORES.DAILY_JOURNALS);
      const index = store.index("date");
      const getRequest = index.getKey(date);

      getRequest.onsuccess = () => {
        const key = getRequest.result;
        if (!key) {
          resolve();
          return;
        }

        const deleteRequest = store.delete(key);

        deleteRequest.onsuccess = () => {
          resolve();
        };

        deleteRequest.onerror = () => {
          reject(
            new Error(
              `Failed to delete day for ${date}: ${deleteRequest.error?.message}`
            )
          );
        };
      };

      getRequest.onerror = () => {
        reject(
          new Error(
            `Failed to find day for ${date}: ${getRequest.error?.message}`
          )
        );
      };
    });
  } catch (error) {
    throw new Error(
      `Error in deleteDay: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
