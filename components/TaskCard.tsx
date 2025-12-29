"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import type { Task, TaskStatus } from "@/domain";

interface TaskCardProps {
  task: Task;
  onUpdate: (updatedTask: Task) => void;
  onDelete: (taskId: string) => void;
  onStartTimer: (task: Task) => void;
  onPauseTimer: (task: Task) => void;
  onStopTimer: (task: Task) => void;
  onStatusChange: (task: Task, status: TaskStatus) => void;
  onUsefulnessChange: (task: Task, isUseful: boolean | null) => void;
  onEstimateChange: (task: Task, estimate: number | null) => void;
}

/**
 * Modern Task Card Component
 *
 * Features:
 * - Clean, minimal design inspired by Linear/Notion
 * - Visual progress bars for time tracking
 * - Subtle animations for timer states
 * - Smooth transitions for all interactions
 * - Apple Fitness-style progress indicators
 */
export default function TaskCard({
  task,
  onDelete,
  onStartTimer,
  onPauseTimer,
  onStopTimer,
  onStatusChange,
  onUsefulnessChange,
  onEstimateChange,
}: TaskCardProps) {
  const [isEditingEstimate, setIsEditingEstimate] = useState(false);
  const [estimateInput, setEstimateInput] = useState("");
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update current time for timer calculations
  useEffect(() => {
    if (!task.timerRunning) return;

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000); // Update every second when timer is running

    return () => clearInterval(interval);
  }, [task.timerRunning]);

  // Calculate progress metrics
  const totalTime = task.spentTime + (task.timerRunning && task.timerStart
    ? (currentTime - new Date(task.timerStart).getTime()) / 1000 / 60
    : 0);

  const progressPercentage = task.estimatedTime && task.estimatedTime > 0
    ? Math.min((totalTime / task.estimatedTime) * 100, 100)
    : 0;

  const isOverEstimate = task.estimatedTime && totalTime > task.estimatedTime;

  // Format time helper
  const formatTime = (minutes: number): string => {
    if (minutes < 1) return "0m";
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  // Handle estimate save
  const handleEstimateSave = () => {
    const minutes = parseInt(estimateInput);
    if (isNaN(minutes) || minutes < 0) {
      setIsEditingEstimate(false);
      setEstimateInput("");
      return;
    }
    onEstimateChange(task, minutes);
    setIsEditingEstimate(false);
    setEstimateInput("");
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`
        relative bg-card rounded-xl border-2 p-6 shadow-sm hover:shadow-md transition-all duration-200
        ${task.timerRunning
          ? "border-green-200 bg-gradient-to-br from-green-50/50 to-card dark:from-green-900/20 dark:to-card"
          : task.isUseful === true
            ? "border-green-100 hover:border-green-200 dark:border-green-800 dark:hover:border-green-700"
            : task.isUseful === false
              ? "border-orange-100 hover:border-orange-200 dark:border-orange-800 dark:hover:border-orange-700"
              : "border-border hover:border-primary/50"
        }
      `}
    >
      {/* Running Timer Pulse Animation */}
      <AnimatePresence>
        {task.timerRunning && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-full h-full bg-green-400 rounded-full"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <motion.h3
            layout="position"
            className="text-lg font-semibold text-card-foreground mb-2 truncate"
          >
            {task.title}
          </motion.h3>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Badge */}
            <motion.select
              layout="position"
              value={task.status}
              onChange={(e) => onStatusChange(task, e.target.value as TaskStatus)}
              className="px-2 py-1 text-xs font-medium bg-muted border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-muted-foreground"
            >
              <option value="todo">To Do</option>
              <option value="in-progress">In Progress</option>
              <option value="done">Done</option>
            </motion.select>

            {/* Usefulness Badge */}
            <AnimatePresence>
              {task.isUseful !== null && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={`
                    px-2 py-1 rounded-md text-xs font-medium
                    ${task.isUseful
                      ? "bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800"
                      : "bg-orange-100 text-orange-800 border border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800"
                    }
                  `}
                >
                  {task.isUseful ? "👍 Useful" : "👎 Not Useful"}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Delete Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onDelete(task.id)}
          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </motion.button>
      </div>

      {/* Progress Section */}
      <div className="mb-4">
        {/* Progress Bar */}
        {task.estimatedTime && task.estimatedTime > 0 && (
          <div className="mb-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-card-foreground">Progress</span>
              <span className="text-sm text-muted-foreground">
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={`
                  h-full rounded-full
                  ${isOverEstimate
                    ? "bg-gradient-to-r from-red-400 to-red-500 dark:from-red-300 dark:to-red-400"
                    : "bg-gradient-to-r from-primary to-primary/80"
                  }
                `}
              />
            </div>
          </div>
        )}

        {/* Time Display */}
        <div className="grid grid-cols-2 gap-4">
          {/* Estimated Time */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Estimated
            </label>
            {isEditingEstimate ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={estimateInput}
                  onChange={(e) => setEstimateInput(e.target.value)}
                  placeholder="min"
                  className="w-16 px-2 py-1 text-sm border border-input rounded focus:outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                  onKeyPress={(e) => e.key === "Enter" && handleEstimateSave()}
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleEstimateSave}
                  className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded hover:bg-primary/90"
                >
                  ✓
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setIsEditingEstimate(false);
                    setEstimateInput("");
                  }}
                  className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded hover:bg-muted/80"
                >
                  ✕
                </motion.button>
              </div>
            ) : (
              <div
                className="text-lg font-semibold text-foreground cursor-pointer hover:text-primary"
                onClick={() => {
                  setEstimateInput(task.estimatedTime?.toString() || "");
                  setIsEditingEstimate(true);
                }}
              >
                {task.estimatedTime ? formatTime(task.estimatedTime) : "—"}
              </div>
            )}
          </div>

          {/* Actual Time */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              {task.timerRunning ? "Current" : "Actual"}
            </label>
            <motion.div
              key={task.timerRunning ? "running" : "stopped"}
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className={`
                text-lg font-semibold
                ${task.timerRunning
                  ? "text-green-400"
                  : isOverEstimate
                    ? "text-destructive"
                    : "text-foreground"
                }
              `}
            >
              {task.timerRunning
                ? formatTime((currentTime - new Date(task.timerStart!).getTime()) / 1000 / 60)
                : formatTime(task.spentTime)
              }
            </motion.div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        {/* Timer Controls */}
        <div className="flex gap-2">
          <AnimatePresence mode="wait">
            {!task.timerRunning && task.spentTime === 0 && (
              <motion.button
                key="start"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onStartTimer(task)}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                ▶ Start
              </motion.button>
            )}

            {!task.timerRunning && task.spentTime > 0 && (
              <motion.div
                key="resume-reset"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex gap-2"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onStartTimer(task)}
                  className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                >
                  ▶ Resume
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onStopTimer(task)}
                  className="px-4 py-2 bg-muted text-muted-foreground text-sm font-medium rounded-lg hover:bg-muted/80 transition-colors"
                >
                  ⏹ Reset
                </motion.button>
              </motion.div>
            )}

            {task.timerRunning && (
              <motion.div
                key="pause-stop"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex gap-2"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onPauseTimer(task)}
                  className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  ⏸ Pause
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onStopTimer(task)}
                  className="px-4 py-2 bg-destructive text-destructive-foreground text-sm font-medium rounded-lg hover:bg-destructive/90 transition-colors"
                >
                  ⏹ Stop
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Usefulness Controls */}
        <div className="flex gap-2">
          <AnimatePresence mode="wait">
            {task.isUseful === null && (
              <motion.div
                key="usefulness-buttons"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex gap-2"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onUsefulnessChange(task, true)}
                  className="px-3 py-2 bg-green-100 text-green-700 text-sm font-medium rounded-lg hover:bg-green-200 transition-colors dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/30"
                >
                  👍
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onUsefulnessChange(task, false)}
                  className="px-3 py-2 bg-orange-100 text-orange-700 text-sm font-medium rounded-lg hover:bg-orange-200 transition-colors dark:bg-orange-900/20 dark:text-orange-300 dark:hover:bg-orange-900/30"
                >
                  👎
                </motion.button>
              </motion.div>
            )}

            {task.isUseful !== null && (
              <motion.button
                key="clear-usefulness"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onUsefulnessChange(task, null)}
                className="px-3 py-2 bg-muted text-muted-foreground text-sm font-medium rounded-lg hover:bg-muted/80 transition-colors"
              >
                Clear
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}