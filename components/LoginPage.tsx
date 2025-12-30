'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/app/context/AuthContext';
import InstallButton from '@/components/InstallButton';

export default function LoginPage() {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);

    const { login, register, isLoading, error, clearError, isOnline } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError(null);
        clearError();

        if (!isOnline) {
            setLocalError('You must be online to authenticate');
            return;
        }

        if (mode === 'register') {
            if (!name.trim()) {
                setLocalError('Name is required');
                return;
            }

            if (password !== confirmPassword) {
                setLocalError('Passwords do not match');
                return;
            }

            try {
                await register(name, username, email, password);
                // Stay on page after successful registration
            } catch {
                // Error is already set in AuthContext
            }
        } else {
            try {
                await login(email, password);
                // Stay on page after successful login
            } catch {
                // Error is already set in AuthContext
            }
        }
    };

    const displayError = localError || error;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="min-h-screen flex items-center justify-center p-4 pb-32"
        >
            <div className="bg-gradient-to-br from-white via-white to-gray-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200/50 dark:border-gray-700/50">
                {/* Header */}
                <div className="p-6 pb-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                {mode === 'login' ? 'Welcome Back' : 'Join Us'}
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {mode === 'login' ? 'Sign in to your account' : 'Create your new account'}
                            </p>
                        </div>
                        <InstallButton />
                    </div>
                </div>

                {/* Online/Offline Warning */}
                {!isOnline && (
                    <div className="mx-6 mb-4 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl flex items-start gap-3 shadow-sm">
                        <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">You&apos;re offline</p>
                            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                                Connect to the internet to login or register
                            </p>
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {displayError && (
                    <div className="mx-6 mb-4 p-4 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border border-red-200 dark:border-red-800/50 rounded-xl flex items-start gap-3 shadow-sm">
                        <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm text-red-800 dark:text-red-200 font-medium">{displayError}</p>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5">
                    {/* Name field (register only) */}
                    {mode === 'register' && (
                        <div>
                            <label htmlFor="name" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Full Name
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 dark:placeholder-gray-500"
                                placeholder="Enter your full name"
                                required
                                disabled={isLoading || !isOnline}
                            />
                        </div>
                    )}

                    {/* Username field (register only) */}
                    {mode === 'register' && (
                        <div>
                            <label htmlFor="username" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Username
                            </label>
                            <input
                                type="text"
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 dark:placeholder-gray-500"
                                placeholder="Choose a unique username"
                                required
                                disabled={isLoading || !isOnline}
                            />
                        </div>
                    )}

                    {/* Email field */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Email Address
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 dark:placeholder-gray-500"
                            placeholder="Enter your email address"
                            required
                            disabled={isLoading || !isOnline}
                        />
                    </div>

                    {/* Password field */}
                    <div>
                        <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 dark:placeholder-gray-500"
                            placeholder="Enter your password"
                            required
                            disabled={isLoading || !isOnline}
                            minLength={8}
                        />
                        {mode === 'register' && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Minimum 8 characters required</p>
                        )}
                    </div>

                    {/* Confirm Password field (register only) */}
                    {mode === 'register' && (
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 dark:placeholder-gray-500"
                                placeholder="Confirm your password"
                                required
                                disabled={isLoading || !isOnline}
                                minLength={8}
                            />
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading || !isOnline}
                        className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all duration-200 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>{mode === 'login' ? 'Signing in...' : 'Creating account...'}</span>
                            </>
                        ) : (
                            <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                        )}
                    </button>
                </form>

                {/* Mode Toggle */}
                <div className="px-6 pb-6 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {mode === 'login' ? "Don&apos;t have an account?" : 'Already have an account?'}
                        {' '}
                        <button
                            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                            className="text-blue-600 hover:text-purple-600 dark:text-blue-400 dark:hover:text-purple-400 font-semibold transition-colors duration-200"
                            disabled={isLoading}
                        >
                            {mode === 'login' ? 'Create one' : 'Sign in'}
                        </button>
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
