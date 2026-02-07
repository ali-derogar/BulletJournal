"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserProfile } from "@/domain/user";
import { motion } from "framer-motion";
import Icon from "../Icon";
import { getLevelColor } from "@/utils/gamification";
import { updateUserProfile } from "@/services/auth";

interface ProfileFormProps {
    user: UserProfile;
    token: string;
}

export default function ProfileForm({ user }: ProfileFormProps) {
    const router = useRouter();
    const [formData, setFormData] = useState<Partial<UserProfile>>({
        avatar_url: user.avatar_url || "",
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
            await updateUserProfile(formData);
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

                {/* Avatar Section */}
                <div className="md:col-span-2 space-y-4">
                    <h3 className="text-lg font-semibold text-white/90 border-b border-white/10 pb-2">Profile Avatar</h3>
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                        {/* Current/Preview */}
                        <div className="flex-shrink-0">
                            <div className={`w-24 h-24 md:w-32 md:h-32 rounded-full p-1 bg-gradient-to-br relative ${getLevelColor(user.level)}`}>
                                <div className="w-full h-full rounded-full bg-[#1a1a24] flex items-center justify-center overflow-hidden border-2 border-[#1a1a24]">
                                    {formData.avatar_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-500">
                                            {formData.name?.charAt(0) || "?"}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex-1 space-y-6 w-full">
                            {/* Presets */}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-3">Choose a preset</label>
                                <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                                    {Array.from({ length: 15 }).map((_, i) => {
                                        const seed = `avatar_${i}`;
                                        const url = `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
                                        return (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, avatar_url: url }))}
                                                className={`aspect-square rounded-full overflow-hidden border-2 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${formData.avatar_url === url ? 'border-indigo-500 scale-110 ring-2 ring-indigo-500/50' : 'border-transparent hover:border-gray-500'}`}
                                            >
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={url} alt={`Preset ${i}`} className="w-full h-full object-cover" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Upload */}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Or upload your own</label>
                                <div className="flex items-center gap-4">
                                    <label className="cursor-pointer bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg border border-white/10 transition-colors flex items-center gap-2">
                                        <Icon className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </Icon>
                                        <span>Select Image</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => {
                                                        setFormData(prev => ({ ...prev, avatar_url: reader.result as string }));
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                        />
                                    </label>
                                    <span className="text-xs text-gray-500">JPG, PNG or GIF. Max 5MB.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

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
