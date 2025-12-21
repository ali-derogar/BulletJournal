'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as authService from '@/services/auth';

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
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
  const [isOnline, setIsOnline] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Set initial state
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check for stored token on mount
  useEffect(() => {
    const checkStoredAuth = async () => {
      try {
        const storedToken = authService.getStoredToken();
        if (storedToken) {
          // Validate token by fetching user info
          const userInfo = await authService.getCurrentUser();
          setUser({
            id: userInfo.id,
            name: userInfo.name,
            email: userInfo.email,
          });
        }
      } catch (error) {
        // Token is invalid, clear it
        console.log('Stored token is invalid, clearing...');
        authService.clearStoredToken();
      } finally {
        setIsLoading(false);
      }
    };

    checkStoredAuth();
  }, []);

  // Register new user
  const register = useCallback(async (name: string, email: string, password: string) => {
    setError(null);
    setIsLoading(true);

    try {
      // Check if online
      if (!isOnline) {
        throw new Error('You must be online to register');
      }

      // Validate inputs
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

      // Register user
      await authService.register({ name, email, password });

      // Auto-login after registration
      const { user: userInfo } = await authService.login({ email, password });

      setUser({
        id: userInfo.id,
        name: userInfo.name,
        email: userInfo.email,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isOnline]);

  // Login existing user
  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);

    try {
      // Check if online
      if (!isOnline) {
        throw new Error('You must be online to login');
      }

      // Validate inputs
      if (!authService.validateEmail(email)) {
        throw new Error('Invalid email address');
      }

      if (!password) {
        throw new Error('Password is required');
      }

      // Login
      const { user: userInfo } = await authService.login({ email, password });

      setUser({
        id: userInfo.id,
        name: userInfo.name,
        email: userInfo.email,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isOnline]);

  // Logout
  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setError(null);
  }, []);

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
