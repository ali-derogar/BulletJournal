'use client';

/**
 * Admin Users Management Page
 *
 * Advanced user table with:
 * - Pagination
 * - Search
 * - Role/status filters
 * - Ban/Unban actions
 * - XP/Level editing
 * - Role management (SUPERUSER only)
 */

import { useEffect, useState, useCallback } from 'react';
import AdminGuard from '@/components/AdminGuard';
import AdminLayout from '@/components/AdminLayout';
import { useAuth } from '@/app/context/AuthContext';
import {
  getUsers,
  updateUserRole,
  updateUserStatus,
  updateUserGamification,
  AdminUser,
  UserRole,
  UserListParams,
  getRoleDisplayName,
  getRoleBadgeColor,
  hasSuperuserAccess,
} from '@/services/admin';

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const isSuperuser = hasSuperuserAccess(currentUser?.role);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [bannedFilter, setBannedFilter] = useState<'all' | 'banned' | 'active'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected user for modals
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showGamificationModal, setShowGamificationModal] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: UserListParams = { page, size: pageSize };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (bannedFilter !== 'all') {
        params.is_banned = bannedFilter === 'banned';
      }

      const response = await getUsers(params);
      setUsers(response.users);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, roleFilter, bannedFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleBanToggle = async (user: AdminUser) => {
    if (!confirm(`Are you sure you want to ${user.is_banned ? 'unban' : 'ban'} ${user.name}?`)) {
      return;
    }

    try {
      await updateUserStatus(user.id, !user.is_banned);
      await loadUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update user status');
    }
  };

  const handleRoleUpdate = async (newRole: UserRole) => {
    if (!selectedUser) return;

    try {
      await updateUserRole(selectedUser.id, newRole);
      setShowRoleModal(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const handleGamificationUpdate = async (xp: number, level: string) => {
    if (!selectedUser) return;

    try {
      await updateUserGamification(selectedUser.id, { xp, level });
      setShowGamificationModal(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update gamification');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-2">Manage users, roles, and permissions</p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Email, name, or username..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Role Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value as UserRole | '');
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Roles</option>
                  <option value={UserRole.USER}>User</option>
                  <option value={UserRole.ADMIN}>Admin</option>
                  <option value={UserRole.SUPERUSER}>Superuser</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={bannedFilter}
                  onChange={(e) => {
                    setBannedFilter(e.target.value as 'all' | 'banned' | 'active');
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Users</option>
                  <option value="active">Active Only</option>
                  <option value="banned">Banned Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Users Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">Loading users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No users found</div>
            ) : (
              <>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        XP / Level
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <UserRow
                        key={user.id}
                        user={user}
                        currentUserId={currentUser?.id || ''}
                        isSuperuser={isSuperuser}
                        onBanToggle={() => handleBanToggle(user)}
                        onEditRole={() => {
                          setSelectedUser(user);
                          setShowRoleModal(true);
                        }}
                        onEditGamification={() => {
                          setSelectedUser(user);
                          setShowGamificationModal(true);
                        }}
                      />
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <p className="text-sm text-gray-700">
                    Showing {(page - 1) * pageSize + 1} to{' '}
                    {Math.min(page * pageSize, total)} of {total} users
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page >= totalPages}
                      className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Role Modal */}
        {showRoleModal && selectedUser && (
          <RoleModal
            user={selectedUser}
            onClose={() => {
              setShowRoleModal(false);
              setSelectedUser(null);
            }}
            onSave={handleRoleUpdate}
          />
        )}

        {/* Gamification Modal */}
        {showGamificationModal && selectedUser && (
          <GamificationModal
            user={selectedUser}
            onClose={() => {
              setShowGamificationModal(false);
              setSelectedUser(null);
            }}
            onSave={handleGamificationUpdate}
          />
        )}
      </AdminLayout>
    </AdminGuard>
  );
}

// User Row Component
interface UserRowProps {
  user: AdminUser;
  currentUserId: string;
  isSuperuser: boolean;
  onBanToggle: () => void;
  onEditRole: () => void;
  onEditGamification: () => void;
}

function UserRow({
  user,
  currentUserId,
  isSuperuser,
  onBanToggle,
  onEditRole,
  onEditGamification,
}: UserRowProps) {
  const isCurrentUser = user.id === currentUserId;
  const roleBadgeColor = getRoleBadgeColor(user.role);

  const badgeColors: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-800',
    blue: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800',
  };

  return (
    <tr>
      {/* User Info */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            {user.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatar_url}
                alt={user.name}
                className="h-10 w-10 rounded-full"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{user.name}</div>
            <div className="text-sm text-gray-500">{user.email}</div>
            {user.username && (
              <div className="text-xs text-gray-400">@{user.username}</div>
            )}
          </div>
        </div>
      </td>

      {/* Role */}
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${badgeColors[roleBadgeColor]}`}>
          {getRoleDisplayName(user.role)}
        </span>
      </td>

      {/* XP / Level */}
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        <div>{user.xp.toLocaleString()} XP</div>
        <div className="text-gray-500">{user.level}</div>
      </td>

      {/* Status */}
      <td className="px-6 py-4 whitespace-nowrap">
        {user.is_banned ? (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
            Banned
          </span>
        ) : (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
            Active
          </span>
        )}
      </td>

      {/* Actions */}
      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
        <button
          onClick={onBanToggle}
          disabled={isCurrentUser}
          className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {user.is_banned ? 'Unban' : 'Ban'}
        </button>
        <button
          onClick={onEditGamification}
          className="text-blue-600 hover:text-blue-900"
        >
          Edit XP
        </button>
        {isSuperuser && (
          <button
            onClick={onEditRole}
            disabled={isCurrentUser}
            className="text-purple-600 hover:text-purple-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Change Role
          </button>
        )}
      </td>
    </tr>
  );
}

// Role Modal
interface RoleModalProps {
  user: AdminUser;
  onClose: () => void;
  onSave: (role: UserRole) => void;
}

function RoleModal({ user, onClose, onSave }: RoleModalProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(user.role);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Change User Role</h2>
        <p className="text-gray-600 mb-4">
          Change role for <strong>{user.name}</strong>
        </p>

        <div className="space-y-2 mb-6">
          {[UserRole.USER, UserRole.ADMIN, UserRole.SUPERUSER].map((role) => (
            <label key={role} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                value={role}
                checked={selectedRole === role}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className="mr-3"
              />
              <div>
                <div className="font-medium">{getRoleDisplayName(role)}</div>
                <div className="text-sm text-gray-500">
                  {role === UserRole.USER && 'Standard user access'}
                  {role === UserRole.ADMIN && 'Can manage users and view stats'}
                  {role === UserRole.SUPERUSER && 'Full system access'}
                </div>
              </div>
            </label>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(selectedRole)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// Gamification Modal
interface GamificationModalProps {
  user: AdminUser;
  onClose: () => void;
  onSave: (xp: number, level: string) => void;
}

function GamificationModal({ user, onClose, onSave }: GamificationModalProps) {
  const [xp, setXp] = useState(user.xp);
  const [level, setLevel] = useState(user.level);

  const levels = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Gamification</h2>
        <p className="text-gray-600 mb-4">
          Edit XP and level for <strong>{user.name}</strong>
        </p>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              XP
            </label>
            <input
              type="number"
              value={xp}
              onChange={(e) => setXp(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Level
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {levels.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(xp, level)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
