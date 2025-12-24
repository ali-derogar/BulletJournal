import type { CalendarNote } from "@/domain";
import { initDB, getDB, STORES } from "./db";

/**
 * Get all calendar notes for a user
 */
export async function getCalendarNotes(userId: string = "default"): Promise<CalendarNote[]> {
  try {
    await initDB();
    const db = getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.CALENDAR_NOTES], "readonly");
      const store = transaction.objectStore(STORES.CALENDAR_NOTES);
      const index = store.index("userId");
      const request = index.getAll(userId);

      request.onsuccess = () => {
        const notes = request.result || [];
        resolve(notes);
      };

      request.onerror = () => {
        reject(
          new Error(
            `Failed to get calendar notes: ${request.error?.message}`
          )
        );
      };
    });
  } catch (error) {
    throw new Error(
      `Error in getCalendarNotes: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Save a calendar note
 */
export async function saveCalendarNote(note: CalendarNote): Promise<void> {
  try {
    await initDB();
    const db = getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.CALENDAR_NOTES], "readwrite");
      const store = transaction.objectStore(STORES.CALENDAR_NOTES);
      const request = store.put(note);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(
          new Error(
            `Failed to save calendar note ${note.id}: ${request.error?.message}`
          )
        );
      };
    });
  } catch (error) {
    throw new Error(
      `Error in saveCalendarNote: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Delete a calendar note
 */
export async function deleteCalendarNote(noteId: string): Promise<void> {
  try {
    await initDB();
    const db = getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.CALENDAR_NOTES], "readwrite");
      const store = transaction.objectStore(STORES.CALENDAR_NOTES);
      const request = store.delete(noteId);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(
          new Error(
            `Failed to delete calendar note ${noteId}: ${request.error?.message}`
          )
        );
      };
    });
  } catch (error) {
    throw new Error(
      `Error in deleteCalendarNote: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}