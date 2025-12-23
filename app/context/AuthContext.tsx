'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as authService from '@/services/auth';
import { saveUser, getUserById } from '@/storage';
import type { UserProfile } from '@/domain';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOnline: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUserName: (name: string) => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync authenticated user to local user profile
  const syncAuthUserToLocal = useCallback(async (authUser: AuthUser) => {
    try {
      const existingUser = await getUserById(authUser.id);

      const userProfile: UserProfile = {
        id: authUser.id,
        name: authUser.name,
        createdAt: existingUser?.createdAt || new Date().toISOString(),
      };

      await saveUser(userProfile);
      localStorage.setItem('activeUserId', authUser.id);
      window.dispatchEvent(new CustomEvent('userProfileUpdated', { detail: authUser.id }));
    } catch (err) {
      console.error('Failed to sync auth user to local profile:', err);
    }
  }, []);

  // Check for stored token on mount
  useEffect(() => {
    const checkStoredAuth = async () => {
      try {
        const storedToken = authService.getStoredToken();
        if (storedToken) {
          const userInfo = await authService.getCurrentUser();
          const authUser = {
            id: userInfo.id,
            name: userInfo.name,
            email: userInfo.email,
          };
          setUser(authUser);
          await syncAuthUserToLocal(authUser);
        }
      } catch {
        console.log('Stored token is invalid, clearing...');
        authService.clearStoredToken();
      } finally {
        setIsLoading(false);
      }
    };

    checkStoredAuth();
  }, [syncAuthUserToLocal]);

  // Listen for local user name updates and sync to server if authenticated
  useEffect(() => {
    const handleLocalUserNameUpdate = async (event: Event) => {
      const customEvent = event as CustomEvent<{ userId: string; name: string }>;
      const { userId, name } = customEvent.detail;

      // Only sync if this is the currently authenticated user
      if (user && user.id === userId) {
        try {
          const updatedUser = await authService.updateUserProfile({ name });
          setUser({
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
          });
        } catch (err) {
          console.error('Failed to sync name update to server:', err);
        }
      }
    };

    window.addEventListener('localUserNameUpdated', handleLocalUserNameUpdate);

    return () => {
      window.removeEventListener('localUserNameUpdated', handleLocalUserNameUpdate);
    };
  }, [user]);

  // Register new user
  const register = useCallback(async (name: string, email: string, password: string) => {
    setError(null);
    setIsLoading(true);

    try {
      if (!isOnline) {
        throw new Error('You must be online to register');
      }

      if (!name.trim()) {
        throw new Error('Name is required');
      }

      if (!authService.validateEmail(email)) {
        throw new Error('Invalid email address');
      }

      const passwordValidation = authService.validatePassword(password);
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.message);
      }

      await authService.register({ name, email, password });
      const { user: userInfo } = await authService.login({ email, password });

      const authUser = {
        id: userInfo.id,
        name: userInfo.name,
        email: userInfo.email,
      };

      setUser(authUser);
      await syncAuthUserToLocal(authUser);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isOnline, syncAuthUserToLocal]);

  // Login existing user
  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);

    try {
      if (!isOnline) {
        throw new Error('You must be online to login');
      }

      if (!authService.validateEmail(email)) {
        throw new Error('Invalid email address');
      }

      if (!password) {
        throw new Error('Password is required');
      }

      const { user: userInfo } = await authService.login({ email, password });

      const authUser = {
        id: userInfo.id,
        name: userInfo.name,
        email: userInfo.email,
      };

      setUser(authUser);
      await syncAuthUserToLocal(authUser);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isOnline, syncAuthUserToLocal]);

  // Logout
  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setError(null);

    // Switch back to default user
    localStorage.setItem('activeUserId', 'default');
    window.dispatchEvent(new CustomEvent('userProfileUpdated', { detail: 'default' }));
  }, []);

  // Update user name
  const updateUserName = useCallback(async (name: string) => {
    setError(null);

    try {
      if (!user) {
        throw new Error('Not authenticated');
      }

      if (!name.trim()) {
        throw new Error('Name cannot be empty');
      }

      // Update on server
      const updatedUser = await authService.updateUserProfile({ name: name.trim() });

      const authUser = {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
      };

      setUser(authUser);

      // Sync to local user profile
      await syncAuthUserToLocal(authUser);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update name';
      setError(errorMessage);
      throw err;
    }
  }, [user, syncAuthUserToLocal]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    isOnline,
    login,
    register,
    logout,
    updateUserName,
    error,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
