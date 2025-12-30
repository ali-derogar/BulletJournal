/**
 * Admin API Service
 * Handles all admin-related API calls with strict RBAC enforcement
 *
 * SECURITY: All endpoints require authentication and admin/superuser role.
 * Frontend role checks are NOT security - backend always validates.
 */

import { get, patch, ApiError } from './api';
import { getToken } from './auth';

// ===== TYPES =====

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  SUPERUSER = 'SUPERUSER',
}

export interface AdminStats {
  totalUsers: number;
  activeToday: number;
  bannedUsers: number;
  newUsers7d: number;
  distribution: {
    superusers: number;
    admins: number;
    users: number;
  };
}

export interface AdminUser {
  id: string;
  userId: string;
  name: string;
  username?: string;
  avatar_url?: string;
  email: string;
  role: UserRole;
  is_banned: boolean;
  level: string;
  xp: number;
  created_at: string;
  updatedAt: string;
}

export interface UserListResponse {
  users: AdminUser[];
  total: number;
  page: number;
  size: number;
}

export interface UserListParams {
  page?: number;
  size?: number;
  search?: string;
  role?: UserRole;
  is_banned?: boolean;
}

export interface RoleUpdateData {
  role: UserRole;
}

export interface StatusUpdateData {
  is_banned: boolean;
}

export interface GamificationUpdateData {
  xp?: number;
  level?: string;
}

// ===== HELPERS =====

/**
 * Check if current user has admin privileges (frontend-only check)
 * NOTE: This is NOT security - backend always validates
 */
export function hasAdminAccess(userRole?: string): boolean {
  if (!userRole) return false;
  return userRole === UserRole.ADMIN || userRole === UserRole.SUPERUSER;
}

/**
 * Check if current user has superuser privileges (frontend-only check)
 * NOTE: This is NOT security - backend always validates
 */
export function hasSuperuserAccess(userRole?: string): boolean {
  if (!userRole) return false;
  return userRole === UserRole.SUPERUSER;
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    [UserRole.USER]: 'User',
    [UserRole.ADMIN]: 'Admin',
    [UserRole.SUPERUSER]: 'Superuser',
  };
  return names[role] || role;
}

/**
 * Get role badge color
 */
export function getRoleBadgeColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    [UserRole.USER]: 'gray',
    [UserRole.ADMIN]: 'blue',
    [UserRole.SUPERUSER]: 'purple',
  };
  return colors[role] || 'gray';
}

// ===== API CALLS =====

/**
 * Get admin dashboard statistics
 * Requires: ADMIN or SUPERUSER role
 */
export async function getAdminStats(): Promise<AdminStats> {
  const token = getToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  try {
    const stats = await get<AdminStats>('/admin/stats', token);
    return stats;
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.status === 403) {
      throw new Error('Admin access required');
    }
    throw new Error(apiError.message || 'Failed to fetch admin stats');
  }
}

/**
 * Get paginated user list with filters
 * Requires: ADMIN or SUPERUSER role
 */
export async function getUsers(params: UserListParams = {}): Promise<UserListResponse> {
  const token = getToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.size) queryParams.append('size', params.size.toString());
  if (params.search) queryParams.append('search', params.search);
  if (params.role) queryParams.append('role', params.role);
  if (params.is_banned !== undefined) {
    queryParams.append('is_banned', params.is_banned.toString());
  }

  try {
    const url = `/admin/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await get<UserListResponse>(url, token);
    return response;
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.status === 403) {
      throw new Error('Admin access required');
    }
    throw new Error(apiError.message || 'Failed to fetch users');
  }
}

/**
 * Update user role
 * Requires: SUPERUSER role only
 *
 * SECURITY RULES:
 * - Cannot change own role
 * - Only superusers can change roles
 */
export async function updateUserRole(
  userId: string,
  role: UserRole
): Promise<AdminUser> {
  const token = getToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  try {
    const user = await patch<AdminUser>(
      `/admin/users/${userId}/role`,
      { role },
      token
    );
    return user;
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.status === 403) {
      throw new Error('Superuser access required');
    }
    if (apiError.status === 400) {
      throw new Error(apiError.message || 'Cannot update role');
    }
    throw new Error(apiError.message || 'Failed to update user role');
  }
}

/**
 * Update user banned status
 * Requires: ADMIN or SUPERUSER role
 *
 * SECURITY RULES:
 * - Cannot ban yourself
 * - Admins cannot ban superusers
 */
export async function updateUserStatus(
  userId: string,
  isBanned: boolean
): Promise<AdminUser> {
  const token = getToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  try {
    const user = await patch<AdminUser>(
      `/admin/users/${userId}/status`,
      { is_banned: isBanned },
      token
    );
    return user;
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.status === 403) {
      throw new Error('Admin access required or insufficient permissions');
    }
    if (apiError.status === 400) {
      throw new Error(apiError.message || 'Cannot update status');
    }
    throw new Error(apiError.message || 'Failed to update user status');
  }
}

/**
 * Update user gamification (XP and level)
 * Requires: ADMIN or SUPERUSER role
 */
export async function updateUserGamification(
  userId: string,
  data: GamificationUpdateData
): Promise<AdminUser> {
  const token = getToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  try {
    const user = await patch<AdminUser>(
      `/admin/users/${userId}/gamification`,
      data,
      token
    );
    return user;
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.status === 403) {
      throw new Error('Admin access required');
    }
    throw new Error(apiError.message || 'Failed to update user gamification');
  }
}
