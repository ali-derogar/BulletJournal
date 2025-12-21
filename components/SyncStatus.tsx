'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { getLastSyncAt } from '@/storage/syncMeta';

export type SyncStatusType = 'offline' | 'not-logged-in' | 'synced' | 'error' | 'syncing' | 'ready';

interface SyncStatusProps {
  isSyncing?: boolean;
  lastSyncError?: string | null;
  compact?: boolean;
}

export default function SyncStatus({ isSyncing = false, lastSyncError = null, compact = false }: SyncStatusProps) {
  const { user, isOnline, isAuthenticated } = useAuth();
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update current time every minute for time-ago calculations
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Determine sync status
  const getStatus = (): { type: SyncStatusType; message: string; color: string; icon: React.ReactElement } => {
    // Priority order: syncing > offline > not-logged-in > error > synced > ready

    if (isSyncing) {
      return {
        type: 'syncing',
        message: 'Syncing...',
        color: 'text-blue-600 bg-blue-50 border-blue-200',
        icon: (
          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        ),
      };
    }

    if (!isOnline) {
      return {
        type: 'offline',
        message: 'Offline',
        color: 'text-red-600 bg-red-50 border-red-200',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
            />
          </svg>
        ),
      };
    }

    if (!isAuthenticated) {
      return {
        type: 'not-logged-in',
        message: 'Not logged in',
        color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        ),
      };
    }

    if (lastSyncError) {
      return {
        type: 'error',
        message: 'Sync error',
        color: 'text-red-600 bg-red-50 border-red-200',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
      };
    }

    // Check if we have a last sync time
    const lastSync = user ? getLastSyncAt(user.id) : null;

    if (lastSync) {
      const syncDate = new Date(lastSync);
      const now = new Date(currentTime);
      const diffMinutes = Math.floor((now.getTime() - syncDate.getTime()) / 1000 / 60);

      let timeAgo = '';
      if (diffMinutes < 1) {
        timeAgo = 'Just now';
      } else if (diffMinutes < 60) {
        timeAgo = `${diffMinutes}m ago`;
      } else if (diffMinutes < 1440) {
        const hours = Math.floor(diffMinutes / 60);
        timeAgo = `${hours}h ago`;
      } else {
        const days = Math.floor(diffMinutes / 1440);
        timeAgo = `${days}d ago`;
      }

      return {
        type: 'synced',
        message: `Synced ${timeAgo}`,
        color: 'text-green-600 bg-green-50 border-green-200',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ),
      };
    }

    // Ready to sync (never synced before)
    return {
      type: 'ready',
      message: 'Ready to sync',
      color: 'text-gray-600 bg-gray-50 border-gray-200',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      ),
    };
  };

  const status = getStatus();

  if (compact) {
    // Compact mode: just icon with tooltip
    return (
      <div className="relative group">
        <div className={`w-8 h-8 rounded-full border flex items-center justify-center ${status.color}`}>
          {status.icon}
        </div>
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-50">
          <div className="bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
            {status.message}
            {lastSyncError && (
              <div className="text-red-300 text-xs mt-1 max-w-xs">{lastSyncError}</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Full mode: badge with icon and text
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${status.color}`}>
      {status.icon}
      <span className="text-sm font-medium">{status.message}</span>
      {lastSyncError && (
        <span className="text-xs opacity-75 ml-1" title={lastSyncError}>
          ⚠
        </span>
      )}
    </div>
  );
}
