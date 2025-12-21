'use client';

import React, { useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { performSync, canSync, formatSyncStats } from '@/services/sync';
import { logout } from '@/services/auth';
import type { SyncResult } from '@/services/sync';
import SyncStatus from './SyncStatus';

export default function SyncButtonEnhanced() {
  const { user, isOnline, isAuthenticated } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);

  // Check if sync is allowed
  const syncCheck = canSync(isOnline, isAuthenticated);

  const handleSync = async () => {
    if (!syncCheck.allowed || !user) {
      return;
    }

    setIsSyncing(true);
    setSyncResult(null);
    setShowNotification(false);
    setLastSyncError(null);

    try {
      const result = await performSync(user.id);
      setSyncResult(result);
      setShowNotification(true);

      if (result.success) {
        // Clear any previous errors
        setLastSyncError(null);
        // Auto-hide success message after 5 seconds
        setTimeout(() => {
          setShowNotification(false);
        }, 5000);
      } else {
        // Handle token expiration by logging out
        if (result.tokenExpired) {
          console.warn('Token expired during sync, logging out...');
          logout();
          // Auth context will automatically update and trigger re-render
          return; // Exit early, don't show error notification
        }

        // Keep error visible for other errors
        setLastSyncError(result.error || result.message);
      }
    } catch (error) {
      console.error('Sync error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastSyncError(errorMessage);
      setSyncResult({
        success: false,
        message: 'Sync failed',
        error: errorMessage,
        retryable: true, // Unknown errors should be retryable
      });
      setShowNotification(true);
    } finally {
      setIsSyncing(false);
    }
  };

  // Don't show if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {/* Sync Status Indicator */}
      <SyncStatus isSyncing={isSyncing} lastSyncError={lastSyncError} compact />

      {/* Sync Button */}
      <div className="relative">
        <button
          onClick={handleSync}
          disabled={!syncCheck.allowed || isSyncing}
          className={`
            px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2
            ${
              isSyncing
                ? 'bg-blue-600 text-white cursor-wait'
                : syncCheck.allowed
                ? 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 shadow-sm hover:shadow-md'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
          title={syncCheck.reason || 'Sync your data with the server'}
        >
          {/* Sync Icon */}
          <svg
            className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>

          <span className="hidden sm:inline">
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </span>
        </button>

        {/* Sync Result Notification */}
        {showNotification && syncResult && (
          <div
            className={`
              absolute top-full right-0 mt-2 w-80 max-w-sm rounded-lg shadow-lg p-4 z-50 animate-in slide-in-from-top-2 duration-200
              ${syncResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}
            `}
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="flex-shrink-0">
                {syncResult.success ? (
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className={`font-semibold text-sm ${syncResult.success ? 'text-green-800' : 'text-red-800'}`}>
                  {syncResult.message}
                </h4>

                {syncResult.success && syncResult.stats && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-green-700">
                      {formatSyncStats(syncResult.stats)}
                    </p>
                    {syncResult.stats.conflictsResolved > 0 && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        {syncResult.stats.conflictsResolved} conflict{syncResult.stats.conflictsResolved > 1 ? 's' : ''} resolved
                      </p>
                    )}
                  </div>
                )}

                {!syncResult.success && syncResult.error && (
                  <p className="text-xs text-red-700 mt-1 break-words">{syncResult.error}</p>
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={() => setShowNotification(false)}
                className={`flex-shrink-0 ${
                  syncResult.success ? 'text-green-400 hover:text-green-600' : 'text-red-400 hover:text-red-600'
                } transition-colors`}
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
