import type { Task } from "@/domain";
import { initDB, getDB, STORES } from "./db";

/**
 * Get all tasks for a specific date and user
 * Automatically migrates old tasks without timer, estimation, usefulness, and userId fields
 */
export async function getTasks(date: string, userId: string = "default"): Promise<Task[]> {
  try {
    await initDB();
    const db = getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.TASKS], "readonly");
      const store = transaction.objectStore(STORES.TASKS);
      const index = store.index("date");
      const request = index.getAll(date);

      request.onsuccess = () => {
        const tasks = request.result || [];
        // Filter by userId and migrate old tasks to include all new fields if they don't have them
        const migratedTasks = tasks
          .map((task: Task) => ({
            ...task,
            userId: task.userId ?? "default", // Migrate old tasks without userId
            spentTime: task.spentTime ?? (task as any).accumulatedTime ?? 0, // Migrate accumulatedTime to spentTime
            timeLogs: task.timeLogs ?? [], // Initialize empty timeLogs array
            timerRunning: task.timerRunning ?? false,
            timerStart: task.timerStart ?? null,
            estimatedTime: task.estimatedTime ?? null,
            isUseful: task.isUseful ?? null,
          }))
          .filter((task) => task.userId === userId); // Filter by userId
        resolve(migratedTasks);
      };

      request.onerror = () => {
        reject(
          new Error(
            `Failed to get tasks for ${date}: ${request.error?.message}`
          )
        );
      };
    });
  } catch (error) {
    throw new Error(
      `Error in getTasks: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function saveTask(task: Task): Promise<void> {
  try {
    await initDB();
    const db = getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.TASKS], "readwrite");
      const store = transaction.objectStore(STORES.TASKS);
      const request = store.put(task);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(
          new Error(
            `Failed to save task ${task.id}: ${request.error?.message}`
          )
        );
      };
    });
  } catch (error) {
    throw new Error(
      `Error in saveTask: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function deleteTask(taskId: string): Promise<void> {
  try {
    await initDB();
    const db = getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.TASKS], "readwrite");
      const store = transaction.objectStore(STORES.TASKS);
      const request = store.delete(taskId);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(
          new Error(
            `Failed to delete task ${taskId}: ${request.error?.message}`
          )
        );
      };
    });
  } catch (error) {
    throw new Error(
      `Error in deleteTask: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
