import type { MoodInfo } from "@/domain";
import { initDB, getDB, STORES } from "./db";

/**
 * Get mood/reflection for a specific date and user
 * Automatically migrates old mood records without userId field
 */
export async function getMood(date: string, userId: string = "default"): Promise<MoodInfo | null> {
  try {
    await initDB();
    const db = getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.MOOD], "readonly");
      const store = transaction.objectStore(STORES.MOOD);
      const index = store.index("date");
      const request = index.getAll(date);

      request.onsuccess = () => {
        const moods = request.result || [];
        // Filter by userId and migrate old mood records without userId
        const migratedMoods = moods
          .map((mood: MoodInfo) => ({
            ...mood,
            userId: mood.userId ?? "default", // Migrate old mood records without userId
          }))
          .filter((mood) => mood.userId === userId); // Filter by userId

        // Return the first matching mood (should only be one per date/user)
        resolve(migratedMoods.length > 0 ? migratedMoods[0] : null);
      };

      request.onerror = () => {
        reject(
          new Error(
            `Failed to get mood for ${date}: ${request.error?.message}`
          )
        );
      };
    });
  } catch (error) {
    throw new Error(
      `Error in getMood: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function saveMood(mood: MoodInfo): Promise<void> {
  try {
    await initDB();
    const db = getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.MOOD], "readwrite");
      const store = transaction.objectStore(STORES.MOOD);
      const request = store.put(mood);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(
          new Error(
            `Failed to save mood for ${mood.date}: ${request.error?.message}`
          )
        );
      };
    });
  } catch (error) {
    throw new Error(
      `Error in saveMood: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function deleteMood(date: string): Promise<void> {
  try {
    await initDB();
    const db = getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.MOOD], "readwrite");
      const store = transaction.objectStore(STORES.MOOD);
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
              `Failed to delete mood for ${date}: ${deleteRequest.error?.message}`
            )
          );
        };
      };

      getRequest.onerror = () => {
        reject(
          new Error(
            `Failed to find mood for ${date}: ${getRequest.error?.message}`
          )
        );
      };
    });
  } catch (error) {
    throw new Error(
      `Error in deleteMood: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
