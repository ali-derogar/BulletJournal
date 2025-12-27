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

// Get archived goals (completed and failed) for a specific period
export async function getArchivedGoalsByPeriod(
  userId: string,
  type: "yearly" | "quarterly" | "monthly" | "weekly",
  year: number,
  quarter?: number,
  month?: number,
  week?: number,
  status?: "completed" | "failed"
): Promise<Goal[]> {
  console.log("getArchivedGoalsByPeriod called with:", { userId, type, year, quarter, month, week, status });

  await initDB();
  const db = getDB();

  if (!db.objectStoreNames.contains(STORES.GOALS)) {
    console.log("Goals store does not exist, returning empty array");
    return [];
  }

  const transaction = db.transaction([STORES.GOALS], "readonly");
  const store = transaction.objectStore(STORES.GOALS);
  const index = store.index("userId");

  return new Promise((resolve, reject) => {
    const request = index.openCursor(IDBKeyRange.only(userId));
    const results: Goal[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
      if (cursor) {
        const goal = cursor.value as Goal;

        // Filter by archived status (completed or failed)
        const isArchived = goal.status === "completed" || goal.status === "failed";

        // Filter by specific status if provided
        const matchesStatus = status ? goal.status === status : isArchived;

        if (matchesStatus && goal.type === type && goal.year === year) {
          // Additional period filtering
          const matchesPeriod =
            (type === "yearly") ||
            (type === "quarterly" && goal.quarter === quarter) ||
            (type === "monthly" && goal.month === month) ||
            (type === "weekly" && goal.week === week);

          if (matchesPeriod) {
            results.push(goal);
          }
        }

        cursor.continue();
      } else {
        console.log("getArchivedGoalsByPeriod: Query completed, found goals:", results.length);
        resolve(results);
      }
    };

    request.onerror = () => {
      console.error("getArchivedGoalsByPeriod: Database query failed:", request.error);
      reject(request.error);
    };
  });
}

// Get all archived goals (for backward compatibility)
export async function getArchivedGoals(userId: string, status?: "completed" | "failed"): Promise<Goal[]> {
  console.log("getArchivedGoals called with:", { userId, status });

  await initDB();
  const db = getDB();

  if (!db.objectStoreNames.contains(STORES.GOALS)) {
    console.log("Goals store does not exist, returning empty array");
    return [];
  }

  const transaction = db.transaction([STORES.GOALS], "readonly");
  const store = transaction.objectStore(STORES.GOALS);
  const index = store.index("userId");

  return new Promise((resolve, reject) => {
    const request = index.openCursor(IDBKeyRange.only(userId));
    const results: Goal[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
      if (cursor) {
        const goal = cursor.value as Goal;

        // Filter by status if specified
        if (status) {
          if (goal.status === status) {
            results.push(goal);
          }
        } else {
          // Return all archived (completed or failed)
          if (goal.status === "completed" || goal.status === "failed") {
            results.push(goal);
          }
        }

        cursor.continue();
      } else {
        console.log("getArchivedGoals: Query completed, found goals:", results.length);
        resolve(results);
      }
    };

    request.onerror = () => {
      console.error("getArchivedGoals: Database query failed:", request.error);
      reject(request.error);
    };
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

// Auto-archive expired goals
export async function autoArchiveExpiredGoals(userId: string): Promise<{ archived: number; completed: number; failed: number }> {
  console.log("autoArchiveExpiredGoals: Starting auto-archive for user:", userId);

  await initDB();
  const db = getDB();

  if (!db.objectStoreNames.contains(STORES.GOALS)) {
    console.log("autoArchiveExpiredGoals: Goals store does not exist");
    return { archived: 0, completed: 0, failed: 0 };
  }

  const transaction = db.transaction([STORES.GOALS], "readwrite");
  const store = transaction.objectStore(STORES.GOALS);
  const index = store.index("userId");

  return new Promise((resolve, reject) => {
    const request = index.openCursor(IDBKeyRange.only(userId));
    let archivedCount = 0;
    let completedCount = 0;
    let failedCount = 0;

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;

      if (cursor) {
        const goal = cursor.value as Goal;

        // Only process active goals
        if (goal.status === "active") {
          // Import isGoalExpired and isGoalCompleted dynamically
          const isExpired = checkGoalExpired(goal);
          const isCompleted = goal.currentValue >= goal.targetValue;

          if (isExpired) {
            // Update goal status based on completion
            const updatedGoal = {
              ...goal,
              status: isCompleted ? "completed" : "failed",
              updatedAt: new Date().toISOString(),
              completedAt: isCompleted ? new Date().toISOString() : undefined,
            } as Goal;

            cursor.update(updatedGoal);
            archivedCount++;

            if (isCompleted) {
              completedCount++;
            } else {
              failedCount++;
            }

            console.log(`autoArchiveExpiredGoals: Archived goal ${goal.id} as ${updatedGoal.status}`);
          }
        }

        cursor.continue();
      } else {
        console.log(`autoArchiveExpiredGoals: Completed. Archived: ${archivedCount}, Completed: ${completedCount}, Failed: ${failedCount}`);
        resolve({ archived: archivedCount, completed: completedCount, failed: failedCount });
      }
    };

    request.onerror = () => {
      console.error("autoArchiveExpiredGoals: Failed:", request.error);
      reject(request.error);
    };
  });
}

// Helper function to check if goal is expired (inline version to avoid circular import)
function checkGoalExpired(goal: Goal): boolean {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentQuarter = Math.ceil(currentMonth / 3);

  // Calculate current week number
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const currentWeek = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

  switch (goal.type) {
    case "yearly":
      return goal.year < currentYear;
    case "quarterly":
      if (goal.year < currentYear) return true;
      if (goal.year > currentYear) return false;
      return (goal.quarter || 0) < currentQuarter;
    case "monthly":
      if (goal.year < currentYear) return true;
      if (goal.year > currentYear) return false;
      return (goal.month || 0) < currentMonth;
    case "weekly":
      if (goal.year < currentYear) return true;
      if (goal.year > currentYear) return false;
      return (goal.week || 0) < currentWeek;
    default:
      return false;
  }
}