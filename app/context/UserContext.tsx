"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";
import type { UserProfile } from "@/domain";
import {
  getAllUsers,
  getUserById,
  saveUser,
  deleteUser,
  initializeDefaultUser,
} from "@/storage";

interface UserContextType {
  currentUser: UserProfile | null;
  allUsers: UserProfile[];
  isLoading: boolean;
  switchUser: (userId: string) => Promise<void>;
  createUser: (name: string) => Promise<UserProfile>;
  updateUser: (userId: string, name: string) => Promise<void>;
  removeUser: (userId: string) => Promise<void>;
  refreshUsers: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Cache for user data to avoid unnecessary reloads
  const userCache = useRef<Map<string, UserProfile>>(new Map());
  const cacheExpiry = useRef<number>(0);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Load users and initialize default user
  const loadUsers = useCallback(async (force = false) => {
    const now = Date.now();

    // Use cache if available and not expired
    if (!force && isInitialized && now < cacheExpiry.current) {
      return;
    }

    try {
      setIsLoading(true);

      // Initialize default user if needed
      await initializeDefaultUser();

      // Load all users
      const users = await getAllUsers();
      setAllUsers(users);

      // Update cache
      userCache.current.clear();
      users.forEach(user => userCache.current.set(user.id, user));
      cacheExpiry.current = now + CACHE_DURATION;

      // Get active user from localStorage or default to "default"
      const savedUserId = localStorage.getItem("activeUserId") || "default";
      const activeUser = users.find((u) => u.id === savedUserId) || users[0];

      if (activeUser) {
        setCurrentUser(activeUser);
      }

      setIsInitialized(true);
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, CACHE_DURATION]);

  // Initialize on mount
  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Listen for user profile updates from AuthContext
  useEffect(() => {
    const handleUserProfileUpdate = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const userId = customEvent.detail;

      // Refresh users list
      await loadUsers(true);

      // Switch to the updated user
      if (userId) {
        const user = await getUserById(userId);
        if (user) {
          setCurrentUser(user);
        }
      }
    };

    window.addEventListener('userProfileUpdated', handleUserProfileUpdate);

    return () => {
      window.removeEventListener('userProfileUpdated', handleUserProfileUpdate);
    };
  }, [loadUsers]);

  // Save active user to localStorage when it changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("activeUserId", currentUser.id);
    }
  }, [currentUser]);

  const switchUser = async (userId: string) => {
    try {
      const user = await getUserById(userId);
      if (user) {
        setCurrentUser(user);
        localStorage.setItem("activeUserId", userId);
      } else {
        throw new Error(`User ${userId} not found`);
      }
    } catch (error) {
      console.error("Failed to switch user:", error);
      throw error;
    }
  };

  const createUser = async (name: string): Promise<UserProfile> => {
    try {
      const newUser: UserProfile = {
        id: `user-${Date.now()}`,
        name: name.trim(),
        email: "", // Placeholder as this is a local user
        createdAt: new Date().toISOString(),
      };

      await saveUser(newUser);
      await refreshUsers();

      return newUser;
    } catch (error) {
      console.error("Failed to create user:", error);
      throw error;
    }
  };

  const updateUser = async (userId: string, name: string) => {
    try {
      const user = await getUserById(userId);
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      const updatedUser: UserProfile = {
        ...user,
        name: name.trim(),
      };

      await saveUser(updatedUser);
      await refreshUsers();

      // Update current user if it was modified
      if (currentUser?.id === userId) {
        setCurrentUser(updatedUser);
      }

      // If this is an authenticated user, notify AuthContext to sync with server
      // The AuthContext will pick this up if user is logged in
      window.dispatchEvent(new CustomEvent('localUserNameUpdated', {
        detail: { userId, name: name.trim() }
      }));
    } catch (error) {
      console.error("Failed to update user:", error);
      throw error;
    }
  };

  const removeUser = async (userId: string) => {
    try {
      // Prevent deleting the default user
      if (userId === "default") {
        throw new Error("Cannot delete the default user");
      }

      // Prevent deleting the currently active user
      if (currentUser?.id === userId) {
        throw new Error("Cannot delete the currently active user. Switch to another user first.");
      }

      await deleteUser(userId);
      await refreshUsers();
    } catch (error) {
      console.error("Failed to delete user:", error);
      throw error;
    }
  };

  const refreshUsers = async () => {
    try {
      const users = await getAllUsers();
      setAllUsers(users);

      // Update cache
      userCache.current.clear();
      users.forEach(user => userCache.current.set(user.id, user));
      cacheExpiry.current = Date.now() + CACHE_DURATION;
    } catch (error) {
      console.error("Failed to refresh users:", error);
      throw error;
    }
  };

  const value: UserContextType = {
    currentUser,
    allUsers,
    isLoading,
    switchUser,
    createUser,
    updateUser,
    removeUser,
    refreshUsers,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextType {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
