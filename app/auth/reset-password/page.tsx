'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { resetPassword } from '@/services/auth';
import enMessages from "@/messages/en.json";
import faMessages from "@/messages/fa.json";

export const dynamic = 'force-dynamic';

const getLocaleFromStorage = () => {
    if (typeof window === "undefined") return "en";
    const preferred = window.localStorage.getItem("preferredLanguage");
    return preferred === "fa" ? "fa" : "en";
};

const getMessage = (messages: Record<string, unknown>, key: string) => {
    let current: unknown = messages;
    for (const part of key.split(".")) {
        if (current && typeof current === "object") {
            current = (current as Record<string, unknown>)[part];
        } else {
            return undefined;
        }
    }
    return current;
};

const formatMessage = (template: unknown, values?: Record<string, string | number>) => {
    if (typeof template !== "string") return "";
    if (!values) return template;
    return template.replace(/\{(\w+)\}/g, (_, k) => (values[k] !== undefined ? String(values[k]) : `{${k}}`));
};

function ResetPasswordContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [locale, setLocale] = useState<"en" | "fa">("en");
    const messages = locale === "fa" ? faMessages : enMessages;
    const t = (key: string, values?: Record<string, string | number>) =>
        formatMessage(getMessage(messages as Record<string, unknown>, `authReset.${key}`), values);
    const token = searchParams ? searchParams.get('token') : null;
    const email = searchParams ? searchParams.get('email') : null;

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const preferred = getLocaleFromStorage();
        setLocale(preferred);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');

        if (!token) {
            setStatus('error');
            setMessage(t('errors.missingToken'));
            return;
        }

        if (password.length < 8) {
            setStatus('error');
            setMessage(t('errors.passwordTooShort'));
            return;
        }

        if (password !== confirmPassword) {
            setStatus('error');
            setMessage(t('errors.passwordMismatch'));
            return;
        }

        setIsLoading(true);
        try {
            if (!email) {
                setStatus('error');
                setMessage(t('errors.missingEmail'));
                setIsLoading(false);
                return;
            }
            const result = await resetPassword(token, email, password);
            setStatus('success');
            setMessage(result.message || t('success'));
            setTimeout(() => {
                router.push('/');
            }, 3000);
        } catch (err) {
            setStatus('error');
            setMessage(err instanceof Error ? err.message : t('errors.resetFailed'));
        } finally {
            setIsLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
                <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center border border-gray-100 dark:border-gray-700">
                    <div className="mb-6 flex justify-center">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('invalidLinkTitle')}</h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">{t('invalidLinkDescription')}</p>
                    <button onClick={() => router.push('/')} className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-semibold transition-all">
                        {t('backToHome')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700"
            >
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{t('subtitle')}</p>
                </div>

                {status === 'success' ? (
                    <div className="text-center">
                        <div className="mb-6 flex justify-center">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center">
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        </div>
                        <p className="text-green-600 dark:text-green-400 font-medium mb-4">{message}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-500">{t('redirecting')}</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {status === 'error' && (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl text-sm text-red-600 dark:text-red-400 font-medium">
                                {message}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('newPassword')}</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                placeholder={t('newPasswordPlaceholder')}
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('confirmPassword')}</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                placeholder={t('confirmPasswordPlaceholder')}
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    {t('updating')}
                                </>
                            ) : (
                                t('updatePassword')
                            )}
                        </button>
                    </form>
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <ClientOnly>
        <ResetPasswordContent />
      </ClientOnly>
    </Suspense>
  );
}
