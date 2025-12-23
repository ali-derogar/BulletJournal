/**
 * Authentication Service
 * Handles user registration, login, token management, and user info
 */

import { get, post, postForm, patch, ApiError } from './api';

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface UserInfo {
  id: string;
  userId: string;
  name: string;
  email: string;
  created_at: string;
  updatedAt: string;
}

/**
 * Persistent token storage using localStorage
 * More secure than plain localStorage as we can add expiration
 */
const TOKEN_KEY = 'auth_token';
const TOKEN_EXPIRY_KEY = 'auth_token_expiry';

/**
 * Get stored auth token from localStorage
 */
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);

  if (!token || !expiry) return null;

  // Check if token is expired
  if (Date.now() > parseInt(expiry)) {
    clearStoredToken();
    return null;
  }

  return token;
}

/**
 * Store auth token in localStorage with expiry
 * Tokens expire in 7 days
 */
export function setStoredToken(token: string): void {
  if (typeof window === 'undefined') return;

  const expiry = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
}

/**
 * Clear stored auth token
 */
export function clearStoredToken(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

/**
 * In-memory token storage for current session
 */
let authToken: string | null = null;

/**
 * Register a new user account
 */
export async function register(data: RegisterData): Promise<UserInfo> {
  try {
    const user = await post<UserInfo>('/auth/register', data);
    return user;
  } catch (error) {
    const apiError = error as ApiError;
    throw new Error(apiError.message || 'Registration failed');
  }
}

/**
 * Login with email and password
 * Returns JWT token and user info
 */
export async function login(data: LoginData): Promise<{
  token: string;
  user: UserInfo;
}> {
  try {
    // Backend uses OAuth2 password flow
    const tokenResponse = await postForm<TokenResponse>('/auth/login', {
      username: data.email,
      password: data.password,
    });

    // Store token persistently
    setStoredToken(tokenResponse.access_token);

    // Also store in memory for current session
    authToken = tokenResponse.access_token;

    // Fetch user info using the token
    const user = await getCurrentUser();

    return {
      token: tokenResponse.access_token,
      user,
    };
  } catch (error) {
    const apiError = error as ApiError;
    throw new Error(apiError.message || 'Login failed');
  }
}

/**
 * Logout - clear token from memory and storage
 */
export function logout(): void {
  authToken = null;
  clearStoredToken();
}

/**
 * Get current authenticated user info
 */
export async function getCurrentUser(): Promise<UserInfo> {
  const token = getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  try {
    const user = await get<UserInfo>('/auth/me', token);
    return user;
  } catch (error) {
    // If token is invalid, clear it
    authToken = null;
    clearStoredToken();
    const apiError = error as ApiError;
    throw new Error(apiError.message || 'Failed to fetch user info');
  }
}

/**
 * Get stored auth token (from memory or localStorage)
 */
export function getToken(): string | null {
  // First check in-memory token
  if (authToken) return authToken;

  // Then check stored token
  const storedToken = getStoredToken();
  if (storedToken) {
    authToken = storedToken; // Load into memory
    return storedToken;
  }

  return null;
}

/**
 * Set auth token (for manual token management)
 */
export function setToken(token: string | null): void {
  authToken = token;
  if (token) {
    setStoredToken(token);
  } else {
    clearStoredToken();
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getToken() !== null;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * Minimum 8 characters
 */
export function validatePassword(password: string): {
  valid: boolean;
  message?: string;
} {
  if (password.length < 8) {
    return {
      valid: false,
      message: 'Password must be at least 8 characters',
    };
  }

  return { valid: true };
}

/**
 * Update user profile (name, etc.)
 */
export async function updateUserProfile(data: { name?: string }): Promise<UserInfo> {
  const token = getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  try {
    const user = await patch<UserInfo>('/auth/me', data, token);
    return user;
  } catch (error) {
    const apiError = error as ApiError;
    throw new Error(apiError.message || 'Failed to update profile');
  }
}
