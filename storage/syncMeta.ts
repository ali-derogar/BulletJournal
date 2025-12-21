/**
 * Sync Metadata Storage
 * Tracks last sync timestamp and sync state
 */

const SYNC_META_KEY = 'syncMetadata';

export interface SyncMetadata {
  lastSyncAt: string | null; // ISO timestamp of last successful sync
  userId: string | null;       // User ID associated with this sync state
}

/**
 * Get sync metadata from localStorage
 */
export function getSyncMetadata(): SyncMetadata {
  try {
    const stored = localStorage.getItem(SYNC_META_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to get sync metadata:', error);
  }

  return {
    lastSyncAt: null,
    userId: null,
  };
}

/**
 * Update sync metadata
 */
export function setSyncMetadata(metadata: SyncMetadata): void {
  try {
    localStorage.setItem(SYNC_META_KEY, JSON.stringify(metadata));
  } catch (error) {
    console.error('Failed to set sync metadata:', error);
  }
}

/**
 * Update last sync timestamp
 */
export function updateLastSyncAt(userId: string): void {
  const metadata: SyncMetadata = {
    lastSyncAt: new Date().toISOString(),
    userId,
  };
  setSyncMetadata(metadata);
}

/**
 * Clear sync metadata (on logout)
 */
export function clearSyncMetadata(): void {
  try {
    localStorage.removeItem(SYNC_META_KEY);
  } catch (error) {
    console.error('Failed to clear sync metadata:', error);
  }
}

/**
 * Get last sync timestamp for current user
 */
export function getLastSyncAt(userId: string): string | null {
  const metadata = getSyncMetadata();
  if (metadata.userId === userId) {
    return metadata.lastSyncAt;
  }
  return null;
}
