'use client';

import React, { useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import AuthModal from './AuthModal';
import Icon from './Icon';

export default function AuthButton() {
  const { user, isAuthenticated, logout, isOnline } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => setShowUserMenu(false);
    if (showUserMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showUserMenu]);

  if (!isAuthenticated) {
    return (
      <>
        <button
          onClick={() => setShowAuthModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Icon className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </Icon>
          <span>Login</span>
        </button>

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode="login"
        />
      </>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowUserMenu(!showUserMenu);
        }}
        className="px-4 py-2 bg-card border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2"
      >
        {/* User Avatar */}
        <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold">
          {user?.name.charAt(0).toUpperCase()}
        </div>

        {/* User Info */}
        <div className="text-left hidden sm:block">
          <p className="text-sm font-medium text-card-foreground">{user?.name}</p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>

        {/* Dropdown Arrow */}
        <Icon
          className={`w-4 h-4 text-muted-foreground transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </Icon>
      </button>

      {/* Dropdown Menu */}
      {showUserMenu && (
        <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-lg shadow-lg z-50">
          {/* User Info (mobile) */}
          <div className="sm:hidden px-4 py-3 border-b border-border">
            <p className="text-sm font-medium text-card-foreground">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>

          {/* Connection Status */}
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-card-foreground">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>

          {/* Logout Buttons */}
          <div className="border-t border-border">
            <button
              onClick={() => {
                logout(false); // Keep data
                setShowUserMenu(false);
              }}
              className="w-full px-4 py-3 text-left text-sm text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2"
            >
              <Icon className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </Icon>
              <span>Logout (Keep Data)</span>
            </button>

            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete all your local data? You can download it from the server on next login.')) {
                  logout(true); // Clear data
                  setShowUserMenu(false);
                }
              }}
              className="w-full px-4 py-3 text-left text-sm text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2 border-t border-border"
            >
              <Icon className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </Icon>
              <span>Logout & Clear Data</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
