"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import ProfileForm from "@/components/Profile/ProfileForm";
import Icon from "@/components/Icon";
import { UserProfile } from "@/domain/user";

export default function ProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check auth
        const storedToken = localStorage.getItem("token");
        if (!storedToken) {
            router.push("/login");
            return;
        }
        setToken(storedToken);

        // Fetch user data
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/auth/me`, {
            headers: {
                "Authorization": `Bearer ${storedToken}`
            }
        })
            .then(res => {
                if (!res.ok) throw new Error("Unauthorized");
                return res.json();
            })
            .then(data => {
                setUser(data);
            })
            .catch(() => {
                localStorage.removeItem("token");
                router.push("/login");
            })
            .finally(() => setLoading(false));
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (!user || !token) return null;

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white selection:bg-indigo-500/30">
            {/* Background Gradients */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px] mix-blend-screen" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px] mix-blend-screen" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push("/")}
                            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group"
                        >
                            <Icon className="w-5 h-5 text-gray-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </Icon>
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                                Professional Identity
                            </h1>
                            <p className="text-gray-400 mt-1">Manage your personal and professional profile</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-sm font-medium text-green-400">Profile Active</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column: Quick Profile Card */}
                    <div className="lg:col-span-4 space-y-6">
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 flex flex-col items-center text-center relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5" />

                            <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-br from-indigo-500 to-purple-500 mb-6 relative">
                                <div className="w-full h-full rounded-full bg-[#1a1a24] flex items-center justify-center overflow-hidden">
                                    <span className="text-4xl font-bold text-white/20">{user?.name?.charAt(0)}</span>
                                </div>
                                <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 border-4 border-[#1a1a24] rounded-full" />
                            </div>

                            <h2 className="text-2xl font-bold text-white mb-2">{user.name}</h2>
                            <p className="text-indigo-400 font-medium mb-1">{user.job_title || "No Job Title"}</p>
                            <p className="text-gray-500 text-sm flex items-center justify-center gap-1.5">
                                <Icon className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </Icon>
                                {user.location || "No Location"}
                            </p>

                            <div className="w-full h-px bg-white/10 my-6" />

                            <div className="w-full grid grid-cols-2 gap-4">
                                <div className="bg-white/5 rounded-2xl p-3 text-center">
                                    <span className="block text-xs text-gray-400 uppercase tracking-widest mb-1">XP Points</span>
                                    <span className="text-xl font-bold text-white">1,240</span>
                                </div>
                                <div className="bg-white/5 rounded-2xl p-3 text-center">
                                    <span className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Goals</span>
                                    <span className="text-xl font-bold text-white">3/5</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* MBTI Card */}
                        {user.mbti_type && (
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.1 }}
                                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 relative overflow-hidden group"
                            >
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl group-hover:bg-purple-500/30 transition-colors" />
                                <div className="relative">
                                    <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">Psychology</span>
                                    <h3 className="text-3xl font-bold text-white mt-1 mb-2">{user.mbti_type}</h3>
                                    <p className="text-sm text-gray-400 leading-relaxed">
                                        Strategic thinker with a plan for everything. Known as "The Architect".
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Right Column: Edit Form */}
                    <div className="lg:col-span-8">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8"
                        >
                            <ProfileForm user={user} token={token} />
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
}
