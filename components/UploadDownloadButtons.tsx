'use client';

import React, { useState, useCallback } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { performSync, canSync } from '@/services/sync';
import type { SyncResult, SyncPhase } from '@/services/sync';
import SyncStatus from './SyncStatus';

export default function UploadDownloadButtons() {
  const { user, isOnline, isAuthenticated } = useAuth();

  // Debug: Log IMMEDIATELY when component is called
  console.log('🟡 UploadDownloadButtons CALLED, isAuthenticated:', isAuthenticated, 'user:', user);

  const [uploadPhase, setUploadPhase] = useState<SyncPhase>('idle');
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);

  // Check if sync is allowed
  const syncCheck = canSync(isOnline, isAuthenticated);

  // Debug: Log component state on render
  console.log('🟢 UploadDownloadButtons will render:', {
    isAuthenticated,
    isOnline,
    hasUser: !!user,
    userId: user?.id,
    syncCheckAllowed: syncCheck.allowed,
    syncCheckReason: syncCheck.reason,
  });

  const handleUpload = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      console.log('🔵 Upload action initiated manually', {
        syncCheckAllowed: syncCheck.allowed,
        user: user,
      });
    }

    if (!syncCheck.allowed || !user) {
      if (!isSilent) {
        console.log('❌ Upload blocked:', syncCheck.reason);
      }
      return;
    }

    setUploadPhase('loading');
    setSyncResult(null);
    setShowNotification(false);
    setLastSyncError(null);

    try {
      const result = await performSync(user.id);
      setSyncResult(result);

      if (!result.success) {
        setLastSyncError(result.error || 'Upload failed');
        if (!isSilent) {
          setShowNotification(true);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Upload error:', error);
      setSyncResult({
        success: false,
        message: 'Upload failed',
        error: errorMessage,
        retryable: true,
      });
      setLastSyncError(errorMessage);
      if (!isSilent) {
        setShowNotification(true);
      }
    } finally {
      setUploadPhase('idle');
    }
  }, [syncCheck, user]);

  // Auto-sync effect: trigger handleUpload every 10 seconds
  React.useEffect(() => {
    if (!isAuthenticated || !user || !isOnline) return;

    console.log('⏱️ Auto-sync timer started (10s)');
    const interval = setInterval(() => {
      console.log('🔄 Auto-sync pulse triggered');
      handleUpload(true); // Call silently
    }, 10000);

    return () => {
      console.log('🛑 Auto-sync timer cleared');
      clearInterval(interval);
    };
  }, [isAuthenticated, user, isOnline, handleUpload]);

  // Don't show anything if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  const isUploading = uploadPhase !== 'idle';
  const currentPhase = isUploading ? uploadPhase : 'idle';

  return (
    <div className="flex items-center gap-2">
      {/* Sync Status Indicator - Always visible to show background activity */}
      <SyncStatus syncPhase={currentPhase} lastSyncError={lastSyncError} compact />

      {/* Sync Result Notification - Only shown if an error occurs during auto-sync */}
      {showNotification && syncResult && !syncResult.success && (
        <div className="relative">
          <div
            className={`
              absolute top-full right-0 mt-2 w-80 max-w-sm rounded-lg shadow-lg p-4 z-50 animate-in slide-in-from-top-2 duration-200
              bg-red-50 border border-red-200
            `}
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-red-800">
                  {syncResult.message}
                </h4>

                {syncResult.error && (
                  <p className="mt-1 text-xs text-red-600">{syncResult.error}</p>
                )}

                {syncResult.retryable && (
                  <button
                    onClick={() => handleUpload(false)}
                    className="mt-2 text-xs font-medium text-red-700 hover:text-red-800 underline"
                  >
                    Try Again
                  </button>
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={() => setShowNotification(false)}
                className="flex-shrink-0 p-1 text-red-400 hover:text-red-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
