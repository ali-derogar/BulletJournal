import { initDB, getDB, STORES } from "@/storage/db";

export async function exportAllData(): Promise<string> {
  await initDB();
  const db = getDB();

  const allData: Record<string, unknown[]> = {};

  const storeNames = [
    STORES.DAILY_JOURNALS,
    STORES.TASKS,
    STORES.EXPENSES,
    STORES.SLEEP,
    STORES.MOOD,
    STORES.USERS,
  ];

  for (const storeName of storeNames) {
    const data = await new Promise<unknown[]>((resolve, reject) => {
      const transaction = db.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(new Error(`Failed to export ${storeName}`));
    });

    allData[storeName] = data;
  }

  return JSON.stringify(
    {
      version: "1.1.0",
      exportDate: new Date().toISOString(),
      data: allData,
    },
    null,
    2
  );
}

export async function exportUserData(userId: string): Promise<string> {
  await initDB();
  const db = getDB();

  const userData: Record<string, unknown[]> = {};

  const storeNames = [
    STORES.DAILY_JOURNALS,
    STORES.TASKS,
    STORES.EXPENSES,
    STORES.SLEEP,
    STORES.MOOD,
  ];

  for (const storeName of storeNames) {
    const data = await new Promise<unknown[]>((resolve, reject) => {
      const transaction = db.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        // Filter data by userId
        const filteredData = request.result.filter((item: any) =>
          item.userId === userId
        );
        resolve(filteredData);
      };
      request.onerror = () =>
        reject(new Error(`Failed to export ${storeName}`));
    });

    userData[storeName] = data;
  }

  // Also include the user profile
  const userProfile = await new Promise<unknown[]>((resolve, reject) => {
    const transaction = db.transaction([STORES.USERS], "readonly");
    const store = transaction.objectStore(STORES.USERS);
    const request = store.get(userId);

    request.onsuccess = () => resolve(request.result ? [request.result] : []);
    request.onerror = () =>
      reject(new Error(`Failed to export user profile`));
  });

  userData[STORES.USERS] = userProfile;

  return JSON.stringify(
    {
      version: "1.1.0",
      exportDate: new Date().toISOString(),
      userId: userId,
      data: userData,
    },
    null,
    2
  );
}

export async function importAllData(jsonData: string): Promise<void> {
  await initDB();
  const db = getDB();

  const backup = JSON.parse(jsonData);

  if (!backup.version || !backup.data) {
    throw new Error("Invalid backup file format");
  }

  const storeNames = Object.keys(backup.data);

  for (const storeName of storeNames) {
    const items = backup.data[storeName];

    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);

      let completed = 0;
      items.forEach((item: unknown) => {
        const request = store.put(item);
        request.onsuccess = () => {
          completed++;
          if (completed === items.length) {
            resolve();
          }
        };
        request.onerror = () =>
          reject(new Error(`Failed to import to ${storeName}`));
      });

      if (items.length === 0) {
        resolve();
      }
    });
  }
}

export async function importUserData(jsonData: string, targetUserId?: string): Promise<string> {
  await initDB();
  const db = getDB();

  const backup = JSON.parse(jsonData);

  if (!backup.version || !backup.data) {
    throw new Error("Invalid backup file format");
  }

  // If backup has a userId, use it; otherwise use targetUserId or generate one
  const sourceUserId = backup.userId;
  const finalUserId = targetUserId || sourceUserId || `imported-${Date.now()}`;

  const storeNames = Object.keys(backup.data);

  for (const storeName of storeNames) {
    const items = backup.data[storeName];

    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);

      let completed = 0;
      items.forEach((item: unknown) => {
        // Update userId in the data to match the target user
        const updatedItem = { ...item as any };
        if (updatedItem.userId && sourceUserId) {
          updatedItem.userId = finalUserId;
        }

        const request = store.put(updatedItem);
        request.onsuccess = () => {
          completed++;
          if (completed === items.length) {
            resolve();
          }
        };
        request.onerror = () =>
          reject(new Error(`Failed to import to ${storeName}`));
      });

      if (items.length === 0) {
        resolve();
      }
    });
  }

  return finalUserId;
}

export function downloadBackup(data: string, userId?: string) {
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const filename = userId
    ? `bullet-journal-backup-${userId}-${new Date().toISOString().split("T")[0]}.json`
    : `bullet-journal-backup-${new Date().toISOString().split("T")[0]}.json`;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
