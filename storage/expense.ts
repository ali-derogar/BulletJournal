import type { Expense } from "@/domain";
import { initDB, getDB, STORES } from "./db";

/**
 * Get all expenses for a specific date and user
 * Automatically migrates old expenses without userId field
 */
export async function getExpenses(date: string, userId: string = "default"): Promise<Expense[]> {
  try {
    await initDB();
    const db = getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.EXPENSES], "readonly");
      const store = transaction.objectStore(STORES.EXPENSES);
      const index = store.index("date");
      const request = index.getAll(date);

      request.onsuccess = () => {
        const expenses = request.result || [];
        // Filter by userId and migrate old expenses without userId
        const migratedExpenses = expenses
          .map((expense: Expense) => ({
            ...expense,
            userId: expense.userId ?? "default", // Migrate old expenses without userId
            type: expense.type || "expense", // Default to expense for backward compatibility
          }))
          .filter((expense) => expense.userId === userId); // Filter by userId
        resolve(migratedExpenses);
      };

      request.onerror = () => {
        reject(
          new Error(
            `Failed to get expenses for ${date}: ${request.error?.message}`
          )
        );
      };
    });
  } catch (error) {
    throw new Error(
      `Error in getExpenses: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function saveExpense(expense: Expense): Promise<void> {
  try {
    await initDB();
    const db = getDB();

    // Auto-populate updatedAt if not present
    const expenseToSave: Expense = {
      ...expense,
      type: expense.type || "expense", // Ensure type is set
      updatedAt: expense.updatedAt || new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.EXPENSES], "readwrite");
      const store = transaction.objectStore(STORES.EXPENSES);
      const request = store.put(expenseToSave);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(
          new Error(
            `Failed to save expense ${expense.id}: ${request.error?.message}`
          )
        );
      };
    });
  } catch (error) {
    throw new Error(
      `Error in saveExpense: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function deleteExpense(expenseId: string): Promise<void> {
  try {
    await initDB();
    const db = getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.EXPENSES], "readwrite");
      const store = transaction.objectStore(STORES.EXPENSES);
      const request = store.delete(expenseId);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(
          new Error(
            `Failed to delete expense ${expenseId}: ${request.error?.message}`
          )
        );
      };
    });
  } catch (error) {
    throw new Error(
      `Error in deleteExpense: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function getAllExpenses(userId: string = "default"): Promise<Expense[]> {
  try {
    await initDB();
    const db = getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.EXPENSES], "readonly");
      const store = transaction.objectStore(STORES.EXPENSES);
      const request = store.getAll();

      request.onsuccess = () => {
        const expenses = request.result || [];
        const filteredExpenses = expenses
          .map((expense: Expense) => ({
            ...expense,
            userId: expense.userId ?? "default",
            type: expense.type || "expense",
          }))
          .filter((expense) => expense.userId === userId);
        resolve(filteredExpenses);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get all expenses: ${request.error?.message}`));
      };
    });
  } catch (error) {
    throw new Error(`Error in getAllExpenses: ${error instanceof Error ? error.message : String(error)}`);
  }
}
