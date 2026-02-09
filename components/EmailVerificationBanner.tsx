'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/app/context/AuthContext';

export default function EmailVerificationBanner() {
    const { user, isAuthenticated, resendVerification, isOnline } = useAuth();
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState<string | null>(null);

    // Only show if authenticated and email is not verified
    if (!isAuthenticated || !user || user.is_email_verified) {
        return null;
    }

    const handleResend = async () => {
        if (!isOnline) {
            setStatus('error');
            setMessage('You must be online to resend verification');
            return;
        }

        setStatus('loading');
        setMessage(null);

        try {
            await resendVerification();
            setStatus('success');
            setMessage('Verification email sent!');
            // Reset after 5 seconds
            setTimeout(() => {
                setStatus('idle');
                setMessage(null);
            }, 5000);
        } catch (err) {
            setStatus('error');
            setMessage(err instanceof Error ? err.message : 'Failed to resend');
        }
    };

    return (
        <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-gradient-to-r from-amber-500/90 to-orange-600/90 text-white backdrop-blur-md shadow-lg sticky top-0 z-[100]"
        >
            <div className="max-w-4xl mx-auto px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm font-medium">
                <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>Your email address is not verified. Please check your inbox.</span>
                </div>

                <div className="flex items-center gap-3">
                    <AnimatePresence mode="wait">
                        {message && (
                            <motion.span
                                key="message"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className={`text-xs ${status === 'error' ? 'text-red-200' : 'text-emerald-100'}`}
                            >
                                {message}
                            </motion.span>
                        )}
                    </AnimatePresence>

                    <button
                        onClick={handleResend}
                        disabled={status === 'loading' || !isOnline}
                        className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg transition-colors border border-white/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {status === 'loading' && (
                            <svg className="animate-spin h-3 w-3 text-white" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        )}
                        Resend Link
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
