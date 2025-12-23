'use client';

import React, { useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { performSync, canSync, formatSyncStats } from '@/services/sync';
import type { SyncResult, SyncPhase } from '@/services/sync';

export default function SyncButton() {
  const { user, isOnline, isAuthenticated } = useAuth();
  const [syncPhase, setSyncPhase] = useState<SyncPhase>('idle');
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  // Check if sync is allowed
  const syncCheck = canSync(isOnline, isAuthenticated);

  const handleSync = async () => {
    if (!syncCheck.allowed || !user) {
      return;
    }

    setSyncPhase('loading');
    setSyncResult(null);
    setShowResult(false);

    try {
      const result = await performSync(user.id, (progress) => {
        setSyncPhase(progress.phase);
      });
      setSyncResult(result);
      setShowResult(true);

      // Auto-hide success message after 5 seconds
      if (result.success) {
        setTimeout(() => {
          setShowResult(false);
        }, 5000);
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSyncResult({
        success: false,
        message: 'Sync failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      setShowResult(true);
    } finally {
      setSyncPhase('idle');
    }
  };

  const isSyncing = syncPhase !== 'idle';

  // Don't show if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="relative">
      {/* Sync Button */}
      <button
        onClick={handleSync}
        disabled={!syncCheck.allowed || isSyncing}
        className={`
          px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2
          ${
            syncPhase === 'loading'
              ? 'bg-blue-600 text-white cursor-wait'
              : syncPhase === 'saving'
              ? 'bg-purple-600 text-white cursor-wait'
              : syncCheck.allowed
              ? 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }
        `}
        title={syncCheck.reason || 'Sync your data with the server'}
      >
        {/* Sync Icon */}
        {syncPhase === 'loading' ? (
          <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
        ) : syncPhase === 'saving' ? (
          <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        )}

        <span className="hidden sm:inline">
          {syncPhase === 'loading' ? 'Loading...' : syncPhase === 'saving' ? 'Saving...' : 'Sync Now'}
        </span>
      </button>

      {/* Sync Result Notification */}
      {showResult && syncResult && (
        <div
          className={`
            absolute top-full right-0 mt-2 w-80 max-w-sm rounded-lg shadow-lg p-4 z-50
            ${syncResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}
          `}
        >
          <div className="flex items-start gap-3">
            {/* Icon */}
            {syncResult.success ? (
              <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}

            {/* Content */}
            <div className="flex-1">
              <h4 className={`font-semibold text-sm ${syncResult.success ? 'text-green-800' : 'text-red-800'}`}>
                {syncResult.message}
              </h4>

              {syncResult.success && syncResult.stats && (
                <p className="text-xs text-green-700 mt-1">
                  {formatSyncStats(syncResult.stats)}
                  {syncResult.stats.conflictsResolved > 0 && (
                    <span className="block mt-1">
                      {syncResult.stats.conflictsResolved} conflict{syncResult.stats.conflictsResolved > 1 ? 's' : ''} resolved
                    </span>
                  )}
                </p>
              )}

              {!syncResult.success && syncResult.error && (
                <p className="text-xs text-red-700 mt-1">{syncResult.error}</p>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowResult(false)}
              className={`flex-shrink-0 ${syncResult.success ? 'text-green-400 hover:text-green-600' : 'text-red-400 hover:text-red-600'}`}
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Offline/Not Logged In Warning (on hover) */}
      {!syncCheck.allowed && syncCheck.reason && (
        <div className="hidden group-hover:block absolute bottom-full right-0 mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg">
          {syncCheck.reason}
        </div>
      )}
    </div>
  );
}
