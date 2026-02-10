'use client';

/**
 * AdminGuard Component
 *
 * Protects admin routes from unauthorized access.
 *
 * SECURITY:
 * - Redirects non-admin users to home
 * - Shows loading state during auth check
 * - Frontend protection only - backend MUST enforce access control
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { hasAdminAccess } from '@/services/admin';
import { useTranslations } from 'next-intl';

interface AdminGuardProps {
  children: React.ReactNode;
  requireSuperuser?: boolean;
}

export default function AdminGuard({ children, requireSuperuser = false }: AdminGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const t = useTranslations('admin');

  useEffect(() => {
    // Wait for auth check to complete
    if (isLoading) return;

    // Redirect if not authenticated
    if (!isAuthenticated || !user) {
      router.push('/login?redirect=/admin');
      return;
    }

    // Check if user has admin access
    const isAdmin = hasAdminAccess(user.role);
    const isSuperuser = user.role === 'SUPERUSER';

    // Redirect if insufficient permissions
    if (!isAdmin || (requireSuperuser && !isSuperuser)) {
      router.push('/');
      return;
    }
  }, [isAuthenticated, user, isLoading, router, requireSuperuser]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('verifyingPermissions')}</p>
        </div>
      </div>
    );
  }

  // Show nothing while redirecting
  if (!isAuthenticated || !user || !hasAdminAccess(user.role)) {
    return null;
  }

  // If requireSuperuser, check superuser access
  if (requireSuperuser && user.role !== 'SUPERUSER') {
    return null;
  }

  // Render protected content
  return <>{children}</>;
}
