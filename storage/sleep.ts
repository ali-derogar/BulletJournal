import type { SleepInfo } from "@/domain";
import { initDB, getDB, STORES } from "./db";

/**
 * Get sleep info for a specific date and user
 * Automatically migrates old sleep records without userId field
 */
export async function getSleep(date: string, userId: string = "default"): Promise<SleepInfo | null> {
  try {
    await initDB();
    const db = getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.SLEEP], "readonly");
      const store = transaction.objectStore(STORES.SLEEP);
      const index = store.index("date");
      const request = index.getAll(date);

      request.onsuccess = () => {
        const sleeps = request.result || [];
        // Filter by userId and migrate old sleep records without userId
        const migratedSleeps = sleeps
          .map((sleep: SleepInfo) => ({
            ...sleep,
            userId: sleep.userId ?? "default", // Migrate old sleep records without userId
          }))
          .filter((sleep) => sleep.userId === userId); // Filter by userId

        // Return the first matching sleep record (should only be one per date/user)
        resolve(migratedSleeps.length > 0 ? migratedSleeps[0] : null);
      };

      request.onerror = () => {
        reject(
          new Error(
            `Failed to get sleep for ${date}: ${request.error?.message}`
          )
        );
      };
    });
  } catch (error) {
    throw new Error(
      `Error in getSleep: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function saveSleep(sleep: SleepInfo): Promise<void> {
  try {
    await initDB();
    const db = getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.SLEEP], "readwrite");
      const store = transaction.objectStore(STORES.SLEEP);
      const request = store.put(sleep);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(
          new Error(
            `Failed to save sleep for ${sleep.date}: ${request.error?.message}`
          )
        );
      };
    });
  } catch (error) {
    throw new Error(
      `Error in saveSleep: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function deleteSleep(date: string): Promise<void> {
  try {
    await initDB();
    const db = getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.SLEEP], "readwrite");
      const store = transaction.objectStore(STORES.SLEEP);
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
              `Failed to delete sleep for ${date}: ${deleteRequest.error?.message}`
            )
          );
        };
      };

      getRequest.onerror = () => {
        reject(
          new Error(
            `Failed to find sleep for ${date}: ${getRequest.error?.message}`
          )
        );
      };
    });
  } catch (error) {
    throw new Error(
      `Error in deleteSleep: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
