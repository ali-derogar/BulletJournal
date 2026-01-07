'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { hasAdminAccess } from '@/services/admin';
import AuthModal from './AuthModal';
import Icon from './Icon';

const LEVEL_CONFIG: Record<string, { color: string; icon: string; threshold: number }> = {
  Iron: { color: "#94a3b8", icon: "⚙️", threshold: 100 },
  Bronze: { color: "#cd7f32", icon: "🥉", threshold: 300 },
  Silver: { color: "#c0c0c0", icon: "🥈", threshold: 700 },
  Gold: { color: "#ffd700", icon: "🥇", threshold: 1500 },
  Platinum: { color: "#e5e4e2", icon: "💍", threshold: 3000 },
  Diamond: { color: "#b9f2ff", icon: "💎", threshold: 999999 }
};

export default function AuthButton() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const userLevel = user?.level || 'Iron';
  const config = LEVEL_CONFIG[userLevel] || LEVEL_CONFIG.Iron;
  const xp = user?.xp || 0;

  // Calculate progress
  const levels = Object.keys(LEVEL_CONFIG);
  const currentIdx = levels.indexOf(userLevel);
  const prevThreshold = currentIdx > 0 ? LEVEL_CONFIG[levels[currentIdx - 1]].threshold : 0;
  const currentThreshold = config.threshold;

  const xpInCurrentLevel = xp - prevThreshold;
  const xpNeededForNext = currentThreshold - prevThreshold;
  const progressPercent = Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForNext) * 100));

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
        className="px-3 py-1.5 bg-card border border-border rounded-xl hover:bg-accent transition-all flex items-center gap-3 shadow-sm hover:shadow-md"
      >
        {/* User Avatar with Level Ring */}
        <div className="relative">
          <div
            className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 border-2"
            style={{ borderColor: config.color }}
          >
            {user?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <span className="font-bold text-lg">{user?.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 bg-background rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-sm border border-border">
            {config.icon}
          </div>
        </div>

        {/* User Info */}
        <div className="text-left hidden md:block">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-card-foreground line-clamp-1">{user?.name}</p>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-accent text-accent-foreground font-mono" style={{ color: config.color }}>
              {userLevel}
            </span>
          </div>
          <div className="mt-1 w-24 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-1000"
              style={{ width: `${progressPercent}%`, backgroundColor: config.color }}
            ></div>
          </div>
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
        <div className="absolute right-0 mt-2 w-72 bg-card border border-border rounded-2xl shadow-xl z-[100] overflow-hidden">
          {/* Header with Level Background */}
          <div className="px-4 py-5 border-b border-border bg-gradient-to-br from-accent/50 to-transparent">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg"
                style={{ backgroundColor: `${config.color}20`, color: config.color, border: `1px solid ${config.color}40` }}
              >
                {config.icon}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-lg" style={{ color: config.color }}>{userLevel}</h4>
                <p className="text-xs text-muted-foreground uppercase tracking-widest">سطح فعلی</p>
              </div>
            </div>

            {/* Progress Section */}
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-muted-foreground">{xp} XP</span>
                {userLevel !== 'Diamond' ? (
                  <span className="text-card-foreground">تا سطح بعد: {xpNeededForNext - xpInCurrentLevel} XP</span>
                ) : (
                  <span className="text-emerald-500 font-bold">سطح نهایی ✨</span>
                )}
              </div>
              <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden border border-border/50">
                <div
                  className="h-full transition-all duration-1000 shadow-[0_0_10px_rgba(0,0,0,0.1)]"
                  style={{ width: `${progressPercent}%`, backgroundColor: config.color }}
                ></div>
              </div>
            </div>
          </div>

          {/* User Email (mobile) */}
          <div className="sm:hidden px-4 py-3 border-b border-border">
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>

          {/* Action Buttons */}
          <div className="p-2 space-y-1">
            <button
              onClick={() => {
                router.push('/profile');
                setShowUserMenu(false);
              }}
              className="w-full px-4 py-3 text-left text-sm text-card-foreground hover:bg-accent rounded-xl transition-colors flex items-center gap-3"
            >
              <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                <Icon className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </Icon>
              </div>
              <span className="font-medium">Profile</span>
            </button>
          </div>

          {/* Admin Panel Button - Only visible to ADMIN/SUPERUSER */}
          {hasAdminAccess(user?.role) && (
            <div className="border-b border-border">
              <button
                onClick={() => {
                  router.push('/admin');
                  setShowUserMenu(false);
                }}
                className="w-full px-4 py-3 text-left text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors flex items-center gap-2 font-medium"
              >
                <Icon className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </Icon>
                <span>Admin Panel</span>
                <span className="ml-auto text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
                  {user?.role === 'SUPERUSER' ? 'Superuser' : 'Admin'}
                </span>
              </button>
            </div>
          )}

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
