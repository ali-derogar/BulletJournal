"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Task, TaskStatus, Expense, MoodInfo, SleepInfo } from "@/domain";
import { getTasks, saveTask, deleteTask, getExpenses, getMood, getSleep } from "@/storage";
import TaskCard from "./TaskCard";
import { calculateEmotionalScore, getSleepQualityColor, getUsefulTaskRatioColor } from "@/utils/emotionalScoring";

interface TaskDashboardProps {
  date: string;
  userId: string;
  goalProgress?: number; // 0-1
}

/**
 * TaskDashboard Component
 *
 * Comprehensive task management dashboard with:
 * - Task list with all fields (title, estimated time, actual time, status, usefulness)
 * - Timer controls (Start/Pause/Resume/Stop) per task
 * - Real-time timer updates
 * - Visual indicators for running timers and task usefulness
 * - Daily aggregations (Estimated vs Actual, Useful vs Not Useful time)
 * - Full offline functionality with auto-save to IndexedDB
 *
 * This is the main interface for STAGE 6 Pro task time tracking.
 */
export default function TaskDashboard({ date, userId, goalProgress = 0.5 }: TaskDashboardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [moodData, setMoodData] = useState<MoodInfo | null>(null);
  const [sleepData, setSleepData] = useState<SleepInfo | null>(null);
  const [reflectionNotes, setReflectionNotes] = useState("");
  const [waterIntake, setWaterIntake] = useState(0);
  const [studyMinutes, setStudyMinutes] = useState(0);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [loading, setLoading] = useState(true);

  // Force re-render every second to update running timers
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  /**
   * Load tasks, expenses, mood, and sleep data from storage when date changes
   */
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
        console.log(`[DEBUG] TaskDashboard: Loaded ${tasksData.length} tasks for date ${date}, userId ${userId}`);

        // Load reflection data from mood
        if (moodDataResult) {
          setReflectionNotes(moodDataResult.notes || "");
          setWaterIntake(moodDataResult.waterIntake || 0);
          setStudyMinutes(moodDataResult.studyMinutes || 0);
        } else {
          setReflectionNotes("");
          setWaterIntake(0);
          setStudyMinutes(0);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [date, userId]);

  /**
   * Add a new task
   */
  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      const newTask: Task = {
        id: `task-${date}-${Date.now()}`,
        userId,
        date,
        title: newTaskTitle.trim(),
        status: "todo",
        createdAt: new Date().toISOString(),
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

  /**
   * Update task and save to storage
   */
  const handleUpdateTask = async (updatedTask: Task) => {
    try {
      // Ensure updatedAt is updated so sync detects the change
      const taskToSave = {
        ...updatedTask,
        updatedAt: new Date().toISOString()
      };
      await saveTask(taskToSave);
      setTasks(tasks.map((t) => (t.id === taskToSave.id ? taskToSave : t)));
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  /**
   * Delete a task
   */
  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      setTasks(tasks.filter((t) => t.id !== taskId));
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  /**
   * Start timer for a task
   */
  const handleStartTimer = (task: Task) => {
    const updatedTask: Task = {
      ...task,
      timerRunning: true,
      timerStart: new Date().toISOString(),
    };
    handleUpdateTask(updatedTask);
  };

  /**
   * Pause timer and accumulate time
   */
  const handlePauseTimer = (task: Task) => {
    if (!task.timerStart) return;

    const startTime = new Date(task.timerStart).getTime();
    const now = Date.now();
    const elapsedMinutes = (now - startTime) / 1000 / 60;

    const updatedTask: Task = {
      ...task,
      timerRunning: false,
      timerStart: null,
      spentTime: task.spentTime + elapsedMinutes,
      timeLogs: [...(task.timeLogs || []), {
        id: `timer_${Date.now()}`,
        type: 'timer' as const,
        minutes: elapsedMinutes,
        createdAt: new Date().toISOString()
      }],
    };
    handleUpdateTask(updatedTask);
  };

  /**
   * Stop timer and reset accumulated time
   */
  const handleStopTimer = (task: Task) => {
    const updatedTask: Task = {
      ...task,
      timerRunning: false,
      timerStart: null,
      spentTime: 0,
      timeLogs: [], // Clear time logs when stopping completely
    };
    handleUpdateTask(updatedTask);
  };

  /**
   * Update task status
   */
  const handleStatusChange = (task: Task, newStatus: TaskStatus) => {
    const updatedTask: Task = {
      ...task,
      status: newStatus,
    };
    handleUpdateTask(updatedTask);
  };

  /**
   * Update estimated time
   */
  const handleEstimateChange = (task: Task, minutes: number | null) => {
    const updatedTask: Task = {
      ...task,
      estimatedTime: minutes,
    };
    handleUpdateTask(updatedTask);
  };

  /**
   * Update usefulness categorization
   */
  const handleUsefulnessChange = (task: Task, isUseful: boolean | null) => {
    const updatedTask: Task = {
      ...task,
      isUseful,
    };
    handleUpdateTask(updatedTask);
  };

  /**
   * Calculate current running time for a task
   */
  const getCurrentRunningTime = (task: Task): number => {
    if (!task.timerRunning || !task.timerStart) return 0;
    const startTime = new Date(task.timerStart).getTime();
    const elapsedMinutes = (Date.now() - startTime) / 1000 / 60;
    return elapsedMinutes;
  };

  /**
   * Get total time for a task (spent + running)
   */
  const getTotalTime = (task: Task): number => {
    return task.spentTime + getCurrentRunningTime(task);
  };

  /**
   * Format time in minutes to human-readable string
   */
  const formatTime = (minutes: number): string => {
    if (minutes < 1) return "0m";
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  /**
   * Format seconds to MM:SS for running timers
   */

  // ===== AGGREGATIONS =====

  /**
   * Total estimated time across all tasks
   */
  const totalEstimatedMinutes = tasks.reduce(
    (total, task) => total + (task.estimatedTime || 0),
    0
  );

  /**
   * Total actual time across all tasks
   */
  const totalActualMinutes = tasks.reduce(
    (total, task) => total + getTotalTime(task),
    0
  );

  /**
   * Time spent on useful tasks
   */
  const usefulTimeMinutes = tasks
    .filter((task) => task.isUseful === true)
    .reduce((total, task) => total + getTotalTime(task), 0);

  /**
   * Time spent on not useful tasks
   */
  const notUsefulTimeMinutes = tasks
    .filter((task) => task.isUseful === false)
    .reduce((total, task) => total + getTotalTime(task), 0);

  /**
   * Time spent on uncategorized tasks
   */
  const uncategorizedTimeMinutes = tasks
    .filter((task) => task.isUseful === null)
    .reduce((total, task) => total + getTotalTime(task), 0);

  /**
   * Count running timers
   */
  const runningTimersCount = tasks.filter((t) => t.timerRunning).length;

  /**
   * Total expenses for the day
   */
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  /**
   * Calculate emotional score for the day
   */
  const emotionalScore = calculateEmotionalScore(
    tasks,
    moodData,
    sleepData,
    reflectionNotes,
    waterIntake,
    studyMinutes,
    goalProgress
  );

  if (loading) {
    return (
      <div className="bg-card rounded-lg p-6 shadow">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-transparent">
      {/* Section Header with Emotional Score */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-10 bg-card/95 backdrop-blur-md border border-primary/20 rounded-2xl shadow-lg mb-6"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-card-foreground">
                Task Dashboard
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Professional time tracking with emotional insights
              </p>
            </div>

            {/* Emotional Score Display */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-4"
            >
              <div className="text-right hidden sm:block">
                <div className="text-2xl font-bold text-card-foreground">
                  {emotionalScore.totalScore}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  Day Score
                </div>
              </div>

              <motion.div
                key={emotionalScore.emoji}
                initial={{ scale: 0.5, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 10 }}
                className="text-6xl sm:text-7xl"
                title={emotionalScore.label}
              >
                {emotionalScore.emoji}
              </motion.div>

              <div className="text-left sm:hidden">
                <div className="text-xl font-bold text-card-foreground">
                  {emotionalScore.totalScore}
                </div>
                <div className="text-xs text-muted-foreground">
                  {emotionalScore.label}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Emotional Indicators */}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-4 mt-4 overflow-x-auto pb-2"
          >
            {/* Sleep Indicator */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap ${getSleepQualityColor(emotionalScore.indicators.sleepQuality)
              }`}>
              <span className="text-lg">
                {emotionalScore.indicators.sleepQuality === 'excellent' ? '😴' :
                  emotionalScore.indicators.sleepQuality === 'good' ? '🙂' :
                    emotionalScore.indicators.sleepQuality === 'fair' ? '😐' :
                      emotionalScore.indicators.sleepQuality === 'poor' ? '😞' : '❓'}
              </span>
              <span>Sleep: {emotionalScore.indicators.sleepQuality}</span>
            </div>

            {/* Reflection Indicator */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap ${emotionalScore.indicators.reflectionPresent
              ? 'text-green-700 bg-green-100'
              : 'text-muted-foreground bg-muted'
              }`}>
              <span className="text-lg">
                {emotionalScore.indicators.reflectionPresent ? '📝' : '❓'}
              </span>
              <span>Reflection: {emotionalScore.indicators.reflectionPresent ? 'Done' : 'Missing'}</span>
            </div>

            {/* Useful Task Ratio Indicator */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap ${getUsefulTaskRatioColor(emotionalScore.indicators.usefulTaskRatio)
              }`}>
              <span className="text-lg">
                {emotionalScore.indicators.usefulTaskRatio >= 0.8 ? '🎯' :
                  emotionalScore.indicators.usefulTaskRatio >= 0.6 ? '👍' :
                    emotionalScore.indicators.usefulTaskRatio >= 0.4 ? '⚖️' :
                      emotionalScore.indicators.usefulTaskRatio >= 0.2 ? '👎' : '⚠️'}
              </span>
              <span>Useful Tasks: {Math.round(emotionalScore.indicators.usefulTaskRatio * 100)}%</span>
            </div>

            {/* Mood Indicator */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap ${emotionalScore.indicators.hasMoodData
              ? 'text-blue-700 bg-blue-100'
              : 'text-muted-foreground bg-muted'
              }`}>
              <span className="text-lg">
                {emotionalScore.indicators.hasMoodData ? '😊' : '❓'}
              </span>
              <span>Mood: {emotionalScore.indicators.hasMoodData ? 'Logged' : 'Missing'}</span>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Cards - Responsive Grid */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {/* Estimated vs Actual */}
          <div className="bg-card p-4 rounded-xl shadow-sm border border-border">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📊</span>
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Time Tracking
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Estimated:</span>
                <span className="font-semibold text-primary">
                  {totalEstimatedMinutes > 0 ? formatTime(totalEstimatedMinutes) : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Actual:</span>
                <span className="font-semibold text-card-foreground">
                  {formatTime(totalActualMinutes)}
                </span>
              </div>
              {totalEstimatedMinutes > 0 && totalActualMinutes > 0 && (
                <div className="pt-2 border-t border-border">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Difference:</span>
                    <span className={`text-sm font-semibold ${totalActualMinutes > totalEstimatedMinutes ? "text-destructive" : "text-green-600"
                      }`}>
                      {totalActualMinutes > totalEstimatedMinutes ? "+" : ""}
                      {formatTime(totalActualMinutes - totalEstimatedMinutes)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Productivity Breakdown */}
          <div className="bg-card p-4 rounded-xl shadow-sm border border-border">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">💡</span>
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Productivity
              </span>
            </div>
            <div className="space-y-2">
              {usefulTimeMinutes > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">👍 Useful:</span>
                  <span className="font-semibold text-green-600">
                    {formatTime(usefulTimeMinutes)}
                  </span>
                </div>
              )}
              {notUsefulTimeMinutes > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">👎 Not Useful:</span>
                  <span className="font-semibold text-orange-600">
                    {formatTime(notUsefulTimeMinutes)}
                  </span>
                </div>
              )}
              {uncategorizedTimeMinutes > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">⚪ Uncategorized:</span>
                  <span className="font-semibold text-gray-600">
                    {formatTime(uncategorizedTimeMinutes)}
                  </span>
                </div>
              )}
              {totalActualMinutes === 0 && (
                <p className="text-sm text-gray-500 italic">No time tracked yet</p>
              )}
            </div>
          </div>

          {/* Daily Expenses */}
          <div className="bg-card p-4 rounded-xl shadow-sm border border-border">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">💰</span>
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Expenses
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total:</span>
                <span className="text-xl font-bold text-red-600">
                  ${totalExpenses.toFixed(2)}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                {expenses.length} {expenses.length === 1 ? "expense" : "expenses"}
              </div>
            </div>
          </div>

          {/* Running Timers */}
          <div className="bg-card p-4 rounded-xl shadow-sm border border-border">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">⏱️</span>
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Active Timers
              </span>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-1">
                {runningTimersCount}
              </div>
              <div className="text-sm text-gray-600">
                {runningTimersCount === 1 ? "timer running" : "timers running"}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tasks Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-card rounded-xl shadow-sm border border-border p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground">Tasks</h2>
            <div className="text-sm text-muted-foreground">
              {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
            </div>
          </div>

          {/* Tasks List */}
          {tasks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-lg font-medium text-foreground mb-2">No tasks yet</h3>
              <p className="text-muted-foreground">Add your first task to get started tracking your time!</p>
            </motion.div>
          ) : (
            <motion.div
              layout
              className="space-y-4"
            >
              <AnimatePresence>
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onUpdate={handleUpdateTask}
                    onDelete={handleDeleteTask}
                    onStartTimer={handleStartTimer}
                    onPauseTimer={handlePauseTimer}
                    onStopTimer={handleStopTimer}
                    onStatusChange={handleStatusChange}
                    onUsefulnessChange={handleUsefulnessChange}
                    onEstimateChange={handleEstimateChange}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Add Task Form */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-8 pt-6 border-t border-border"
          >
            <h3 className="text-lg font-semibold mb-4 text-foreground">Add New Task</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddTask()}
                placeholder="Enter task title..."
                className="flex-1 px-4 py-3 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAddTask}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                Add Task
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {runningTimersCount > 0 && (
        <div className="mb-4 p-3 bg-green-100 border-l-4 border-green-500 rounded">
          <p className="text-sm font-semibold text-green-800">
            ⏱️ {runningTimersCount} timer{runningTimersCount > 1 ? "s" : ""}{" "}
            running
          </p>
        </div>
      )}
    </div>
  );
}
