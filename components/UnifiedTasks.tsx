"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Task, TaskStatus, Expense, MoodInfo, SleepInfo } from "@/domain";
import { getTasks, saveTask, deleteTask, getExpenses, getMood, getSleep } from "@/storage";
import TaskCard from "./TaskCard";
import { calculateEmotionalScore, getSleepQualityColor, getUsefulTaskRatioColor } from "@/utils/emotionalScoring";

interface UnifiedTasksProps {
    date: string;
    userId: string;
    goalProgress?: number;
}

export default function UnifiedTasks({ date, userId, goalProgress = 0.5 }: UnifiedTasksProps) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [moodData, setMoodData] = useState<MoodInfo | null>(null);
    const [sleepData, setSleepData] = useState<SleepInfo | null>(null);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [loading, setLoading] = useState(true);

    // Force re-render for timers
    const [, setTick] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true);
                const [tasksData, expensesData, moodDataResult, sleepDataResult] = await Promise.all([
                    getTasks(date, userId),
                    getExpenses(date, userId),
                    getMood(date, userId),
                    getSleep(date, userId),
                ]);
                setTasks(tasksData);
                setExpenses(expensesData);
                setMoodData(moodDataResult);
                setSleepData(sleepDataResult);
            } catch (error) {
                console.error("Failed to load unified task data:", error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [date, userId]);

    const handleAddTask = async () => {
        if (!newTaskTitle.trim()) return;
        try {
            const now = new Date().toISOString();
            const newTask: Task = {
                id: `task-${date}-${Date.now()}`,
                userId,
                date,
                title: newTaskTitle.trim(),
                status: "todo",
                createdAt: now,
                updatedAt: now,
                spentTime: 0,
                timeLogs: [],
                timerRunning: false,
                timerStart: null,
                estimatedTime: null,
                isUseful: null,
            };
            await saveTask(newTask);
            setTasks([...tasks, newTask]);
            setNewTaskTitle("");
        } catch (error) {
            console.error("Failed to add task:", error);
        }
    };

    const handleUpdateTask = async (updatedTask: Task) => {
        try {
            const taskToSave = { ...updatedTask, updatedAt: new Date().toISOString() };
            await saveTask(taskToSave);
            setTasks(tasks.map((t) => (t.id === taskToSave.id ? taskToSave : t)));
        } catch (error) {
            console.error("Failed to update task:", error);
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        try {
            await deleteTask(taskId);
            setTasks(tasks.filter((t) => t.id !== taskId));
        } catch (error) {
            console.error("Failed to delete task:", error);
        }
    };

    const emotionalScore = calculateEmotionalScore(
        tasks, moodData, sleepData, moodData?.notes || "",
        moodData?.waterIntake || 0, moodData?.studyMinutes || 0, goalProgress
    );

    const formatTime = (minutes: number): string => {
        if (minutes < 1) return "0m";
        const hours = Math.floor(minutes / 60);
        const mins = Math.floor(minutes % 60);
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    const totalTime = tasks.reduce((acc, t) => {
        let time = t.spentTime;
        if (t.timerRunning && t.timerStart) {
            time += (Date.now() - new Date(t.timerStart).getTime()) / 60000;
        }
        return acc + time;
    }, 0);

    const totalEstimated = tasks.reduce((acc, t) => acc + (t.estimatedTime || 0), 0);

    if (loading) return <div className="space-y-4 animate-pulse"><div className="h-32 bg-muted rounded-2xl" /><div className="h-64 bg-muted rounded-2xl" /></div>;

    return (
        <div className="space-y-6">
            {/* Unified Header: Emotional Score & Key Stats */}
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-card/80 backdrop-blur-xl border border-primary/20 rounded-3xl p-6 shadow-xl relative overflow-hidden group"
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 transition-transform duration-1000 group-hover:scale-110"></div>

                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <motion.div
                            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                            transition={{ duration: 4, repeat: Infinity }}
                            className="text-7xl md:text-8xl drop-shadow-2xl"
                        >
                            {emotionalScore.emoji}
                        </motion.div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <span className="text-4xl font-black bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                                    {emotionalScore.totalScore}
                                </span>
                                <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-2 py-0.5 bg-muted rounded-lg">
                                    Day Score
                                </span>
                            </div>
                            <p className="text-lg font-bold text-foreground tracking-tight">{emotionalScore.label}</p>
                            <div className="flex gap-2 mt-2">
                                <Indicator icon="😴" label={emotionalScore.indicators.sleepQuality} color={getSleepQualityColor(emotionalScore.indicators.sleepQuality)} />
                                <Indicator icon="🎯" label={`${Math.round(emotionalScore.indicators.usefulTaskRatio * 100)}% Useful`} color={getUsefulTaskRatioColor(emotionalScore.indicators.usefulTaskRatio)} />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:w-64">
                        <StatBox title="Tracked" value={formatTime(totalTime)} icon="⏱️" color="text-blue-500" />
                        <StatBox title="Estimated" value={formatTime(totalEstimated)} icon="📊" color="text-purple-500" />
                    </div>
                </div>
            </motion.div>

            {/* Unified Task List */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-card/50 border border-border rounded-3xl p-2 sm:p-6"
            >
                <div className="flex items-center justify-between mb-6 px-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <span className="p-2 bg-primary/10 rounded-xl text-primary">📝</span>
                        Tasks
                    </h2>
                    <span className="text-xs font-bold text-muted-foreground bg-muted px-3 py-1 rounded-full uppercase tracking-widest">
                        {tasks.length} items
                    </span>
                </div>

                <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                        {tasks.map((task) => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                onUpdate={handleUpdateTask}
                                onDelete={handleDeleteTask}
                                onStartTimer={() => {
                                    const updated = { ...task, timerRunning: true, timerStart: new Date().toISOString() };
                                    handleUpdateTask(updated);
                                }}
                                onPauseTimer={() => {
                                    if (!task.timerStart) return;
                                    const elapsed = (Date.now() - new Date(task.timerStart).getTime()) / 60000;
                                    const updated = {
                                        ...task,
                                        timerRunning: false,
                                        timerStart: null,
                                        spentTime: task.spentTime + elapsed,
                                        timeLogs: [...(task.timeLogs || []), { id: `log-${Date.now()}`, type: 'timer' as const, minutes: elapsed, createdAt: new Date().toISOString() }]
                                    };
                                    handleUpdateTask(updated);
                                }}
                                onStopTimer={() => {
                                    handleUpdateTask({ ...task, timerRunning: false, timerStart: null, spentTime: 0, timeLogs: [] });
                                }}
                                onStatusChange={(t, status) => handleUpdateTask({ ...t, status })}
                                onUsefulnessChange={(t, isUseful) => handleUpdateTask({ ...t, isUseful })}
                                onEstimateChange={(t, estimate) => handleUpdateTask({ ...t, estimatedTime: estimate })}
                            />
                        ))}
                    </AnimatePresence>

                    {tasks.length === 0 && (
                        <div className="text-center py-12 border-2 border-dashed border-muted rounded-2xl">
                            <p className="text-muted-foreground font-medium">No tasks yet. Start your day!</p>
                        </div>
                    )}

                    {/* New Task Inline */}
                    <div className="mt-8 relative group">
                        <input
                            type="text"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && handleAddTask()}
                            placeholder="What needs to be done?"
                            className="w-full pl-14 pr-32 py-4 bg-muted/50 border-2 border-transparent focus:border-primary/30 rounded-2xl outline-none transition-all group-hover:bg-muted/80 focus:bg-card focus:shadow-xl font-medium"
                        />
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-primary/10 rounded-xl text-primary">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                        <button
                            onClick={handleAddTask}
                            className="absolute right-3 top-1/2 -translate-y-1/2 px-5 py-2 bg-primary text-white text-sm font-black rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
                        >
                            Add Action
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

function Indicator({ icon, label, color }: { icon: string; label: string; color: string }) {
    return (
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${color.replace('text-', 'bg-').replace('700', '100').replace('300', '900/40')} ${color}`}>
            <span>{icon}</span> {label}
        </div>
    );
}

function StatBox({ title, value, icon, color }: { title: string; value: string; icon: string; color: string }) {
    return (
        <div className="bg-muted/50 p-3 rounded-2xl border border-border/50">
            <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">{icon}</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">{title}</span>
            </div>
            <p className={`text-sm font-black truncate ${color}`}>{value}</p>
        </div>
    );
}
