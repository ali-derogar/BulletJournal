import type { UserProfile } from "@/domain";
import { initDB, getDB, STORES } from "./db";

/**
 * Get all user profiles
 */
export async function getAllUsers(): Promise<UserProfile[]> {
  try {
    await initDB();
    const db = getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.USERS], "readonly");
      const store = transaction.objectStore(STORES.USERS);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(
          new Error(`Failed to get users: ${request.error?.message}`)
        );
      };
    });
  } catch (error) {
    throw new Error(
      `Error in getAllUsers: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get a specific user profile by ID
 */
export async function getUserById(userId: string): Promise<UserProfile | null> {
  try {
    await initDB();
    const db = getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.USERS], "readonly");
      const store = transaction.objectStore(STORES.USERS);
      const request = store.get(userId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(
          new Error(`Failed to get user ${userId}: ${request.error?.message}`)
        );
      };
    });
  } catch (error) {
    throw new Error(
      `Error in getUserById: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Save or update a user profile
 */
export async function saveUser(user: UserProfile): Promise<void> {
  try {
    await initDB();
    const db = getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.USERS], "readwrite");
      const store = transaction.objectStore(STORES.USERS);
      const request = store.put(user);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(
          new Error(`Failed to save user ${user.id}: ${request.error?.message}`)
        );
      };
    });
  } catch (error) {
    throw new Error(
      `Error in saveUser: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Delete a user profile
 * Note: This does NOT delete the user's data (tasks, expenses, etc.)
 * Only deletes the profile entry
 */
export async function deleteUser(userId: string): Promise<void> {
  try {
    await initDB();
    const db = getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.USERS], "readwrite");
      const store = transaction.objectStore(STORES.USERS);
      const request = store.delete(userId);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(
          new Error(`Failed to delete user ${userId}: ${request.error?.message}`)
        );
      };
    });
  } catch (error) {
    throw new Error(
      `Error in deleteUser: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Initialize default user if no users exist
 */
export async function initializeDefaultUser(): Promise<UserProfile> {
  try {
    await initDB();
    const users = await getAllUsers();

    // Check if default user already exists
    const defaultUser = users.find((u) => u.id === "default");
    if (defaultUser) {
      return defaultUser;
    }

    // Create default user
    const newDefaultUser: UserProfile = {
      id: "default",
      name: "Default User",
      email: "", // Placeholder for default user
      createdAt: new Date().toISOString(),
    };

    await saveUser(newDefaultUser);
    return newDefaultUser;
  } catch (error) {
    throw new Error(
      `Error in initializeDefaultUser: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Check if a user exists
 */
export async function userExists(userId: string): Promise<boolean> {
  try {
    const user = await getUserById(userId);
    return user !== null;
  } catch (error) {
    console.error("Error checking if user exists:", error);
    return false;
  }
}
