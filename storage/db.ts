export const DB_NAME = "BulletJournalDB";
export const DB_VERSION = 4;

export const STORES = {
  DAILY_JOURNALS: "dailyJournals",
  TASKS: "tasks",
  EXPENSES: "expenses",
  SLEEP: "sleep",
  MOOD: "mood",
  USERS: "users",
  GOALS: "goals",
  CALENDAR_NOTES: "calendarNotes",
  AI_SESSIONS: "ai_sessions",
  AI_MESSAGES: "ai_messages",
} as const;

let dbInstance: IDBDatabase | null = null;

export async function initDB(): Promise<IDBDatabase> {
  // Reset instance if we need to force a reconnect
  if (dbInstance && (!dbInstance.objectStoreNames.contains(STORES.GOALS) || !dbInstance.objectStoreNames.contains(STORES.CALENDAR_NOTES) || !dbInstance.objectStoreNames.contains(STORES.AI_SESSIONS))) {
    console.log("Database instance exists but missing stores or outdated, resetting...");
    dbInstance.close();
    dbInstance = null;
  }

  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error(`Failed to open database: ${request.error?.message}`));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      console.log("Database opened successfully, stores:", Array.from(request.result.objectStoreNames));
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORES.DAILY_JOURNALS)) {
        const journalStore = db.createObjectStore(STORES.DAILY_JOURNALS, {
          keyPath: "id",
        });
        journalStore.createIndex("date", "date", { unique: true });
        journalStore.createIndex("userId", "userId", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.TASKS)) {
        const taskStore = db.createObjectStore(STORES.TASKS, {
          keyPath: "id",
        });
        taskStore.createIndex("date", "date", { unique: false });
        taskStore.createIndex("userId", "userId", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.EXPENSES)) {
        const expenseStore = db.createObjectStore(STORES.EXPENSES, {
          keyPath: "id",
        });
        expenseStore.createIndex("date", "date", { unique: false });
        expenseStore.createIndex("userId", "userId", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.SLEEP)) {
        const sleepStore = db.createObjectStore(STORES.SLEEP, {
          keyPath: "id",
        });
        sleepStore.createIndex("date", "date", { unique: true });
        sleepStore.createIndex("userId", "userId", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.MOOD)) {
        const moodStore = db.createObjectStore(STORES.MOOD, {
          keyPath: "id",
        });
        moodStore.createIndex("date", "date", { unique: true });
        moodStore.createIndex("userId", "userId", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.GOALS)) {
        const goalStore = db.createObjectStore(STORES.GOALS, {
          keyPath: "id",
        });
        goalStore.createIndex("userId", "userId", { unique: false });
        goalStore.createIndex("type", "type", { unique: false });
        goalStore.createIndex("year", "year", { unique: false });
        goalStore.createIndex("quarter", ["year", "quarter"], { unique: false });
        goalStore.createIndex("month", ["year", "month"], { unique: false });
        goalStore.createIndex("week", ["year", "week"], { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.USERS)) {
        db.createObjectStore(STORES.USERS, {
          keyPath: "id",
        });
      }

      if (!db.objectStoreNames.contains(STORES.CALENDAR_NOTES)) {
        const calendarStore = db.createObjectStore(STORES.CALENDAR_NOTES, {
          keyPath: "id",
        });
        calendarStore.createIndex("userId", "userId", { unique: false });
        calendarStore.createIndex("date", "date", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.AI_SESSIONS)) {
        const aiSessionStore = db.createObjectStore(STORES.AI_SESSIONS, {
          keyPath: "id",
        });
        aiSessionStore.createIndex("userId", "userId", { unique: false });
        aiSessionStore.createIndex("updatedAt", "updatedAt", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.AI_MESSAGES)) {
        const aiMessageStore = db.createObjectStore(STORES.AI_MESSAGES, {
          keyPath: "id",
        });
        aiMessageStore.createIndex("sessionId", "sessionId", { unique: false });
        aiMessageStore.createIndex("timestamp", "timestamp", { unique: false });
      }
    };
  });
}

export function getDB(): IDBDatabase {
  if (!dbInstance) {
    throw new Error("Database not initialized. Call initDB() first.");
  }
  return dbInstance;
}
