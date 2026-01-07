'use client';

import React, { useState, useCallback } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { performSync, canSync } from '@/services/sync';
import { logout } from '@/services/auth';
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

      {/* Upload Button - Always visible */}
      <button
        onClick={() => handleUpload(false)}
        disabled={isUploading}
        className={`
          relative px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200
          ${isUploading 
            ? 'bg-blue-100 text-blue-700 cursor-not-allowed' 
            : 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm hover:shadow-md'
          }
        `}
        title={isUploading ? 'Syncing...' : 'Sync to cloud'}
      >
        {isUploading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Syncing...
          </>
        ) : (
          <>
            <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Sync
          </>
        )}
      </button>

      {/* Logout Button */}
      <button
        onClick={logout}
        className="px-3 py-2 rounded-lg text-xs font-medium text-red-600 hover:text-red-800 hover:bg-red-50 transition-colors duration-200"
        title="Logout"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </button>
    </div>
  );
}
