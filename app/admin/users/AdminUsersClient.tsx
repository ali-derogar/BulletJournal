'use client';

export const dynamic = 'force-dynamic';

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
import { useLocale, useTranslations } from 'next-intl';
import {
  getUsers,
  updateUserRole,
  updateUserStatus,
  updateUserGamification,
  AdminUser,
  UserRole,
  UserListParams,
  getRoleBadgeColor,
  hasSuperuserAccess,
} from '@/services/admin';

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const isSuperuser = hasSuperuserAccess(currentUser?.role);
  const t = useTranslations('admin.users');
  const tCommon = useTranslations('admin.common');
  const locale = useLocale();

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
      setError(err instanceof Error ? err.message : t('errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, roleFilter, bannedFilter, t]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleBanToggle = async (user: AdminUser) => {
    if (!confirm(user.is_banned ? t('confirm.unban', { name: user.name }) : t('confirm.ban', { name: user.name }))) {
      return;
    }

    try {
      await updateUserStatus(user.id, !user.is_banned);
      await loadUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : t('errors.updateStatusFailed'));
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
      alert(err instanceof Error ? err.message : t('errors.updateRoleFailed'));
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
      alert(err instanceof Error ? err.message : t('errors.updateGamificationFailed'));
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
            <p className="text-gray-600 mt-2">{t('subtitle')}</p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('filters.searchLabel')}
                </label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder={t('filters.searchPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Role Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('filters.roleLabel')}
                </label>
                <select
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value as UserRole | '');
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">{t('roleOptions.allRoles')}</option>
                  <option value={UserRole.USER}>{t('roleOptions.user')}</option>
                  <option value={UserRole.ADMIN}>{t('roleOptions.admin')}</option>
                  <option value={UserRole.SUPERUSER}>{t('roleOptions.superuser')}</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('filters.statusLabel')}
                </label>
                <select
                  value={bannedFilter}
                  onChange={(e) => {
                    setBannedFilter(e.target.value as 'all' | 'banned' | 'active');
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">{t('statusOptions.allUsers')}</option>
                  <option value="active">{t('statusOptions.activeOnly')}</option>
                  <option value="banned">{t('statusOptions.bannedOnly')}</option>
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
                <p className="text-gray-600 mt-4">{tCommon('loading')}</p>
              </div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center text-gray-500">{t('empty')}</div>
            ) : (
              <>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('table.user')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('table.role')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('table.xpLevel')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('table.status')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('table.actions')}
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
                        locale={locale}
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
                    {t('pagination.showing', {
                      start: ((page - 1) * pageSize + 1).toLocaleString(locale),
                      end: Math.min(page * pageSize, total).toLocaleString(locale),
                      total: total.toLocaleString(locale),
                    })}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t('pagination.previous')}
                    </button>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page >= totalPages}
                      className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t('pagination.next')}
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
  locale: string;
  onBanToggle: () => void;
  onEditRole: () => void;
  onEditGamification: () => void;
}

function UserRow({
  user,
  currentUserId,
  isSuperuser,
  locale,
  onBanToggle,
  onEditRole,
  onEditGamification,
}: UserRowProps) {
  const t = useTranslations('admin.users');
  const tLevels = useTranslations('profilePage.levels');
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
          {t(`roleOptions.${user.role.toLowerCase()}`)}
        </span>
      </td>

      {/* XP / Level */}
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        <div>{t('xpLabel', { value: user.xp.toLocaleString(locale) })}</div>
        <div className="text-gray-500">{tLevels(user.level)}</div>
      </td>

      {/* Status */}
      <td className="px-6 py-4 whitespace-nowrap">
        {user.is_banned ? (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
            {t('status.banned')}
          </span>
        ) : (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
            {t('status.active')}
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
          {user.is_banned ? t('actions.unban') : t('actions.ban')}
        </button>
        <button
          onClick={onEditGamification}
          className="text-blue-600 hover:text-blue-900"
        >
          {t('actions.editXp')}
        </button>
        {isSuperuser && (
          <button
            onClick={onEditRole}
            disabled={isCurrentUser}
            className="text-purple-600 hover:text-purple-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('actions.changeRole')}
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
  const t = useTranslations('admin.users');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
        <h2 className="text-xl font-bold text-gray-900 mb-4">{t('roleModal.title')}</h2>
        <p className="text-gray-600 mb-4">
          {t('roleModal.description', { name: user.name })}
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
                <div className="font-medium">{t(`roleOptions.${role.toLowerCase()}`)}</div>
                <div className="text-sm text-gray-500">
                  {role === UserRole.USER && t('roleModal.descriptions.user')}
                  {role === UserRole.ADMIN && t('roleModal.descriptions.admin')}
                  {role === UserRole.SUPERUSER && t('roleModal.descriptions.superuser')}
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
            {t('roleModal.cancel')}
          </button>
          <button
            onClick={() => onSave(selectedRole)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {t('roleModal.save')}
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
  const t = useTranslations('admin.users');
  const tLevels = useTranslations('profilePage.levels');

  const levels = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
        <h2 className="text-xl font-bold text-gray-900 mb-4">{t('gamificationModal.title')}</h2>
        <p className="text-gray-600 mb-4">
          {t('gamificationModal.description', { name: user.name })}
        </p>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('gamificationModal.xpLabel')}
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
              {t('gamificationModal.levelLabel')}
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {levels.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {tLevels(lvl)}
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
            {t('gamificationModal.cancel')}
          </button>
          <button
            onClick={() => onSave(xp, level)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {t('gamificationModal.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
