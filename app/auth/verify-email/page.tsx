'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useLocale, useTranslations } from 'next-intl';
import { verifyEmail } from '@/services/auth';
import { i18n } from '@/i18n/config';

export const dynamic = 'force-dynamic';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('authVerify');
  const rootPath = locale === i18n.defaultLocale ? '/' : `/${locale}`;

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setMessage(t('verifying'));
  }, [t]);

  useEffect(() => {
    if (!searchParams) return;

    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (!token || !email) {
      setStatus('error');
      setMessage(t('errors.invalidLink'));
      return;
    }

    const verify = async () => {
      try {
        const result = await verifyEmail(token, email);
        setStatus('success');
        setMessage(result.message || t('success'));
        setTimeout(() => {
          router.push(rootPath);
        }, 3000);
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : t('errors.verifyFailed'));
      }
    };

    verify();
  }, [searchParams, router, rootPath, t]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center border border-gray-100 dark:border-gray-700"
      >
        <div className="mb-6 flex justify-center">
          {status === 'loading' && (
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          )}
          {status === 'success' && (
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          {status === 'error' && (
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {status === 'loading' ? t('states.loading') : status === 'success' ? t('states.success') : t('states.error')}
        </h1>

        <p className="text-gray-600 dark:text-gray-400 mb-8">{message}</p>

        {status !== 'loading' && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push(rootPath)}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            {t('goHome')}
          </motion.button>
        )}

        {status === 'success' && (
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-500">{t('redirecting')}</p>
        )}
      </motion.div>
    </div>
  );
}

function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return <>{children}</>;
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <ClientOnly>
        <VerifyEmailContent />
      </ClientOnly>
    </Suspense>
  );
}
