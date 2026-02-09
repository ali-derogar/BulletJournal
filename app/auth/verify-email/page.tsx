'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { verifyEmail } from '@/services/auth';

function VerifyEmailContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Verifying your email...');

    useEffect(() => {
        if (!searchParams) return;
        const token = searchParams.get('token');
        const email = searchParams.get('email');

        if (!token || !email) {
            setStatus('error');
            setMessage('Invalid verification link. Missing token or email.');
            return;
        }

        const verify = async () => {
            try {
                const result = await verifyEmail(token, email);
                setStatus('success');
                setMessage(result.message || 'Email verified successfully!');
                // Redirect to home after 3 seconds
                setTimeout(() => {
                    router.push('/');
                }, 3000);
            } catch (err) {
                setStatus('error');
                setMessage(err instanceof Error ? err.message : 'Failed to verify email');
            }
        };

        verify();
    }, [searchParams, router]);

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
                    {status === 'loading' ? 'Verifying...' : status === 'success' ? 'Verified!' : 'Verification Failed'}
                </h1>

                <p className="text-gray-600 dark:text-gray-400 mb-8">
                    {message}
                </p>

                {status !== 'loading' && (
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => router.push('/')}
                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                    >
                        Go to Home
                    </motion.button>
                )}

                {status === 'success' && (
                    <p className="mt-4 text-xs text-gray-500 dark:text-gray-500">
                        Redirecting you in a few seconds...
                    </p>
                )}
            </motion.div>
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        }>
            <VerifyEmailContent />
        </Suspense>
    );
}
