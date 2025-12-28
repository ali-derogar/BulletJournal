'use client';

import React, { useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { performSync, performDownload, canSync, formatSyncStats } from '@/services/sync';
import { logout } from '@/services/auth';
import type { SyncResult, SyncPhase } from '@/services/sync';
import SyncStatus from './SyncStatus';

export default function UploadDownloadButtons() {
  const { user, isOnline, isAuthenticated } = useAuth();

  // Debug: Log IMMEDIATELY when component is called
  console.log('🟡 UploadDownloadButtons CALLED, isAuthenticated:', isAuthenticated, 'user:', user);

  const [uploadPhase, setUploadPhase] = useState<SyncPhase>('idle');
  const [downloadPhase, setDownloadPhase] = useState<SyncPhase>('idle');
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

  const handleUpload = async () => {
    console.log('🔵 Upload button clicked!', {
      syncCheckAllowed: syncCheck.allowed,
      syncCheckReason: syncCheck.reason,
      user: user,
      isOnline,
      isAuthenticated,
    });

    if (!syncCheck.allowed || !user) {
      console.log('❌ Upload blocked:', {
        syncCheckAllowed: syncCheck.allowed,
        hasUser: !!user,
        reason: syncCheck.reason,
      });
      return;
    }

    console.log('✅ Starting upload for user:', user.id);
    setUploadPhase('loading');
    setSyncResult(null);
    setShowNotification(false);
    setLastSyncError(null);

    try {
      const result = await performSync(user.id, (progress) => {
        console.log('Upload Progress:', progress);
        setUploadPhase(progress.phase);
      });

      setSyncResult(result);
      setShowNotification(true);

      if (result.success) {
        setLastSyncError(null);
        setTimeout(() => {
          setShowNotification(false);
        }, 5000);
      } else {
        if (result.tokenExpired) {
          console.warn('Token expired during upload, logging out...');
          logout();
          return;
        }
        setLastSyncError(result.error || result.message);
      }
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastSyncError(errorMessage);
      setSyncResult({
        success: false,
        message: 'Upload failed',
        error: errorMessage,
        retryable: true,
      });
      setShowNotification(true);
    } finally {
      setUploadPhase('idle');
    }
  };

  const handleDownload = async () => {
    if (!syncCheck.allowed || !user) {
      return;
    }

    setDownloadPhase('loading');
    setSyncResult(null);
    setShowNotification(false);
    setLastSyncError(null);

    try {
      const result = await performDownload(user.id, (progress) => {
        console.log('Download Progress:', progress);
        setDownloadPhase(progress.phase);
      });

      setSyncResult(result);
      setShowNotification(true);

      if (result.success) {
        setLastSyncError(null);
        setTimeout(() => {
          setShowNotification(false);
        }, 5000);
      } else {
        if (result.tokenExpired) {
          console.warn('Token expired during download, logging out...');
          logout();
          return;
        }
        setLastSyncError(result.error || result.message);
      }
    } catch (error) {
      console.error('Download error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastSyncError(errorMessage);
      setSyncResult({
        success: false,
        message: 'Download failed',
        error: errorMessage,
        retryable: true,
      });
      setShowNotification(true);
    } finally {
      setDownloadPhase('idle');
    }
  };

  // Don't show if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  const isUploading = uploadPhase !== 'idle';
  const isDownloading = downloadPhase !== 'idle';
  const currentPhase = isUploading ? uploadPhase : isDownloading ? downloadPhase : 'idle';
  const uploadDisabled = !syncCheck.allowed || isUploading || isDownloading;

  console.log('🔴 Upload button state:', {
    uploadDisabled,
    syncCheckAllowed: syncCheck.allowed,
    isUploading,
    isDownloading,
  });

  return (
    <div className="flex items-center gap-2">
      {/* Sync Status Indicator */}
      <SyncStatus syncPhase={currentPhase} lastSyncError={lastSyncError} compact />

      {/* Upload Button */}
      <div className="relative">
        <button
          onClick={handleUpload}
          disabled={uploadDisabled}
          className={`
            px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-2
            ${
              uploadPhase === 'loading'
                ? 'bg-blue-600 text-white cursor-wait'
                : uploadPhase === 'saving'
                ? 'bg-purple-600 text-white cursor-wait'
                : syncCheck.allowed && !isDownloading
                ? 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 shadow-sm hover:shadow-md'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
          title={syncCheck.reason || 'Upload data to server'}
        >
          {/* Upload Icon */}
          {uploadPhase === 'loading' ? (
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          ) : uploadPhase === 'saving' ? (
            <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          )}
          <span className="text-sm hidden sm:inline">
            {uploadPhase === 'loading' ? 'Loading...' : uploadPhase === 'saving' ? 'Uploading...' : 'Upload'}
          </span>
        </button>
      </div>

      {/* Download Button */}
      <div className="relative">
        <button
          onClick={handleDownload}
          disabled={!syncCheck.allowed || isUploading || isDownloading}
          className={`
            px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-2
            ${
              downloadPhase === 'loading'
                ? 'bg-blue-600 text-white cursor-wait'
                : downloadPhase === 'saving'
                ? 'bg-purple-600 text-white cursor-wait'
                : syncCheck.allowed && !isUploading
                ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm hover:shadow-md'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
          title={syncCheck.reason || 'Download data from server'}
        >
          {/* Download Icon */}
          {downloadPhase === 'loading' ? (
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          ) : downloadPhase === 'saving' ? (
            <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          )}
          <span className="text-sm hidden sm:inline">
            {downloadPhase === 'loading' ? 'Downloading...' : downloadPhase === 'saving' ? 'Saving...' : 'Download'}
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
                  <p className="text-xs text-red-700 mt-1 break-words">
                    {typeof syncResult.error === 'string' ? syncResult.error : JSON.stringify(syncResult.error)}
                  </p>
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
