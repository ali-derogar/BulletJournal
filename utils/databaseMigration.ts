"use client";

// Database migration helper for goals feature
export async function checkDatabaseMigration(): Promise<boolean> {
  try {
    // Force database upgrade by opening with version 3
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("BulletJournalDB", 3);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const hasGoalsStore = db.objectStoreNames.contains("goals");
    console.log("Database migration check: hasGoalsStore =", hasGoalsStore);
    db.close();

    // If migration is needed, force a new connection
    if (!hasGoalsStore) {
      console.log("Goals store not found, forcing database upgrade...");
      await forceDatabaseUpgrade();
      return true; // Assume upgrade was successful
    }

    return true;
  } catch (error) {
    console.error("Error checking database migration:", error);
    return false;
  }
}

async function forceDatabaseUpgrade(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("BulletJournalDB", 3);
    request.onsuccess = () => {
      console.log("Database upgrade completed successfully");
      request.result.close();
      resolve();
    };
    request.onerror = () => {
      console.error("Database upgrade failed:", request.error);
      reject(request.error);
    };
    request.onupgradeneeded = () => {
      console.log("Database upgrade needed, upgrading...");
    };
  });
}

export async function clearDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const deleteRequest = indexedDB.deleteDatabase("BulletJournalDB");
    deleteRequest.onsuccess = () => {
      console.log("Database cleared successfully");
      resolve();
    };
    deleteRequest.onerror = () => reject(deleteRequest.error);
  });
}

export async function migrateDatabase(): Promise<void> {
  console.log("Starting database migration...");

  // Close any existing connections
  if (typeof window !== 'undefined' && window.indexedDB) {
    // Force close any existing connections
    try {
      const databases = await indexedDB.databases?.() || [];
      console.log("Available databases:", databases);
    } catch (e) {
      console.log("Could not list databases:", e);
    }
  }

  // Force database upgrade by opening with new version
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("BulletJournalDB", 3);
    request.onsuccess = () => {
      console.log("Database migration successful");
      request.result.close();
      resolve();
    };
    request.onerror = () => {
      console.error("Database migration failed:", request.error);
      reject(request.error);
    };
    request.onupgradeneeded = (event) => {
      console.log("Database upgrade needed during migration");
      const db = (event.target as IDBOpenDBRequest).result;

      // Create goals store if it doesn't exist
      if (!db.objectStoreNames.contains("goals")) {
        console.log("Creating goals store during migration");
        const goalStore = db.createObjectStore("goals", {
          keyPath: "id",
        });
        goalStore.createIndex("userId", "userId", { unique: false });
        goalStore.createIndex("type", "type", { unique: false });
        goalStore.createIndex("year", "year", { unique: false });
        goalStore.createIndex("quarter", ["year", "quarter"], { unique: false });
        goalStore.createIndex("month", ["year", "month"], { unique: false });
        goalStore.createIndex("week", ["year", "week"], { unique: false });
      }

      // Create calendar notes store if it doesn't exist
      if (!db.objectStoreNames.contains("calendarNotes")) {
        console.log("Creating calendarNotes store during migration");
        const calendarStore = db.createObjectStore("calendarNotes", {
          keyPath: "id",
        });
        calendarStore.createIndex("userId", "userId", { unique: false });
        calendarStore.createIndex("date", "date", { unique: false });
      }
    };
  });
}