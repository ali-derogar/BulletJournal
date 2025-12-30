"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserProfile } from "@/domain/user";
import { motion } from "framer-motion";

interface ProfileFormProps {
    user: UserProfile;
    token: string;
}

export default function ProfileForm({ user, token }: ProfileFormProps) {
    const router = useRouter();
    const [formData, setFormData] = useState<Partial<UserProfile>>({
        education_level: user.education_level || "",
        job_title: user.job_title || "",
        general_goal: user.general_goal || "",
        income_level: user.income_level || "",
        mbti_type: user.mbti_type || "",
        bio: user.bio || "",
        skills: user.skills || "",
        location: user.location || "",
        name: user.name,
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/auth/me`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                throw new Error("Failed to update profile");
            }

            const updatedUser = await response.json();
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            router.refresh(); // Refresh server components
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to save changes. Please try again.' });
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Personal Details */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white/90 border-b border-white/10 pb-2">Personal Details</h3>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all outline-none"
                            placeholder="John Doe"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Location</label>
                        <input
                            type="text"
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all outline-none"
                            placeholder="New York, USA"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Bio</label>
                        <textarea
                            name="bio"
                            rows={4}
                            value={formData.bio}
                            onChange={handleChange}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all outline-none resize-none"
                            placeholder="Tell us about yourself..."
                        />
                    </div>
                </div>

                {/* Professional Info */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white/90 border-b border-white/10 pb-2">Professional Info</h3>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Job Title</label>
                        <input
                            type="text"
                            name="job_title"
                            value={formData.job_title}
                            onChange={handleChange}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all outline-none"
                            placeholder="Senior Software Engineer"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Education Level</label>
                        <input
                            type="text"
                            name="education_level"
                            value={formData.education_level}
                            onChange={handleChange}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all outline-none"
                            placeholder="Master's in Computer Science"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Skills (Comma separated)</label>
                        <input
                            type="text"
                            name="skills"
                            value={formData.skills}
                            onChange={handleChange}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all outline-none"
                            placeholder="React, Python, Design..."
                        />
                    </div>
                </div>

                {/* Goals & Private Info */}
                <div className="space-y-4 md:col-span-2">
                    <h3 className="text-lg font-semibold text-white/90 border-b border-white/10 pb-2">Goals & Private Info</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Annual Income</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                                <input
                                    type="text"
                                    name="income_level"
                                    value={formData.income_level}
                                    onChange={handleChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all outline-none"
                                    placeholder="150,000"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">MBTI Type</label>
                            <select
                                name="mbti_type"
                                value={formData.mbti_type}
                                onChange={handleChange}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all outline-none appearance-none"
                            >
                                <option value="" className="bg-gray-900">Select MBTI</option>
                                {['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP'].map(type => (
                                    <option key={type} value={type} className="bg-gray-900">{type}</option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-gray-400 mb-1">General Goal</label>
                            <input
                                type="text"
                                name="general_goal"
                                value={formData.general_goal}
                                onChange={handleChange}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all outline-none"
                                placeholder="Build a startup..."
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-4 flex items-center justify-between">
                {message && (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`text-sm font-medium px-4 py-2 rounded-lg ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}
                    >
                        {message.text}
                    </motion.div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
                >
                    {loading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </form>
    );
}
