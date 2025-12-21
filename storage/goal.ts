"use client";

import { initDB, getDB, STORES } from "./db";
import type { Goal, GoalType } from "@/domain";

export async function getGoals(
  userId: string,
  type?: GoalType,
  year?: number,
  quarter?: number,
  month?: number,
  week?: number
): Promise<Goal[]> {
  console.log("getGoals called with:", { userId, type, year, quarter, month, week });

  await initDB();
  const db = getDB();

  // Check if goals store exists
  if (!db.objectStoreNames.contains(STORES.GOALS)) {
    console.log("Goals store does not exist, returning empty array");
    return []; // Return empty array if store doesn't exist yet
  }

  console.log("Goals store exists, proceeding with query");
  const transaction = db.transaction([STORES.GOALS], "readonly");
  const store = transaction.objectStore(STORES.GOALS);

  return new Promise((resolve, reject) => {
    let request: IDBRequest;

    if (type && year) {
      console.log("Querying with filters:", { type, year, quarter, month, week });
      // Filter by type and period
      const index = store.index("userId");
      request = index.openCursor(IDBKeyRange.only(userId));

      const results: Goal[] = [];
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
        if (cursor) {
          const goal = cursor.value as Goal;
          if (goal.type === type && goal.year === year) {
            // Additional period filtering
            if (
              (type === "yearly") ||
              (type === "quarterly" && goal.quarter === quarter) ||
              (type === "monthly" && goal.month === month) ||
              (type === "weekly" && goal.week === week)
            ) {
              results.push(goal);
            }
          }
          cursor.continue();
        } else {
          console.log("Query completed, found goals:", results.length);
          resolve(results);
        }
      };
    } else {
      console.log("Querying all goals for user");
      // Get all goals for user
      const index = store.index("userId");
      request = index.getAll(userId);
      request.onsuccess = () => {
        console.log("All goals query completed, found goals:", request.result?.length || 0);
        resolve(request.result || []);
      };
    }

    request.onerror = () => {
      console.error("Database query failed:", request.error);
      reject(request.error);
    };
  });
}

export async function saveGoal(goal: Goal): Promise<void> {
  console.log("saveGoal: Starting to save goal:", goal);
  await initDB();
  const db = getDB();

  // Check if goals store exists
  if (!db.objectStoreNames.contains(STORES.GOALS)) {
    console.error("saveGoal: Goals store does not exist!");
    throw new Error("Goals feature requires database update. Please refresh the page or clear browser data.");
  }

  console.log("saveGoal: Creating transaction...");
  const transaction = db.transaction([STORES.GOALS], "readwrite");
  const store = transaction.objectStore(STORES.GOALS);

  return new Promise((resolve, reject) => {
    const goalToSave = {
      ...goal,
      updatedAt: new Date().toISOString(),
    };
    console.log("saveGoal: Putting goal into store:", goalToSave);
    const request = store.put(goalToSave);

    request.onsuccess = () => {
      console.log("saveGoal: Goal put request successful");
    };
    request.onerror = () => {
      console.error("saveGoal: Failed to save goal:", request.error);
      reject(request.error);
    };

    transaction.oncomplete = () => {
      console.log("saveGoal: Transaction completed successfully, resolving promise");
      resolve();
    };
    transaction.onerror = () => {
      console.error("saveGoal: Transaction failed:", transaction.error);
      reject(transaction.error);
    };
  });
}

export async function deleteGoal(goalId: string): Promise<void> {
  await initDB();
  const db = getDB();

  // Check if goals store exists
  if (!db.objectStoreNames.contains(STORES.GOALS)) {
    throw new Error("Goals feature requires database update. Please refresh the page or clear browser data.");
  }

  const transaction = db.transaction([STORES.GOALS], "readwrite");
  const store = transaction.objectStore(STORES.GOALS);

  return new Promise((resolve, reject) => {
    const request = store.delete(goalId);
    request.onsuccess = () => {
      console.log("deleteGoal: Delete request successful");
    };
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => {
      console.log("deleteGoal: Transaction completed successfully");
      resolve();
    };
    transaction.onerror = () => {
      console.error("deleteGoal: Transaction failed:", transaction.error);
      reject(transaction.error);
    };
  });
}

export async function getGoalById(goalId: string): Promise<Goal | null> {
  await initDB();
  const db = getDB();

  // Check if goals store exists
  if (!db.objectStoreNames.contains(STORES.GOALS)) {
    return null;
  }

  const transaction = db.transaction([STORES.GOALS], "readonly");
  const store = transaction.objectStore(STORES.GOALS);

  return new Promise((resolve, reject) => {
    const request = store.get(goalId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

// Helper function to calculate progress for task-linked goals
export async function updateTaskLinkedGoalProgress(goalId: string): Promise<void> {
  const goal = await getGoalById(goalId);
  if (!goal || goal.progressType !== "task-linked") return;

  // This would need to be implemented to calculate progress from linked tasks
  // For now, we'll keep it simple and just update the goal's updatedAt
  await saveGoal(goal);
}