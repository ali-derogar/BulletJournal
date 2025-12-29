"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Task } from "@/domain";

interface TaskTimerProps {
  task: Task;
  onUpdate: (updatedTask: Task) => void;
}

/**
 * TaskTimer Component
 *
 * Handles time tracking for individual tasks with:
 * - Start/Pause/Resume/Stop controls
 * - Real-time timer display
 * - Automatic accumulation of time when paused/stopped
 * - Persistence of timer state
 * - Estimated time input
 * - Useful/Not Useful categorization
 *
 * Timer Logic:
 * - timerRunning: true when actively counting
 * - timerStart: ISO timestamp when timer was last started
 * - spentTime: total minutes tracked (single source of truth)
 *
 * When paused/stopped:
 * 1. Calculate elapsed time since timerStart
 * 2. Add elapsed time to spentTime
 * 3. Create time log entry
 * 4. Set timerRunning = false, timerStart = null
 */
export default function TaskTimer({ task, onUpdate }: TaskTimerProps) {
  // Current running time in seconds (for display only, not persisted)
  const [currentRunningSeconds, setCurrentRunningSeconds] = useState(0);

  // Local state for editing estimated time
  const [isEditingEstimate, setIsEditingEstimate] = useState(false);
  const [estimateInput, setEstimateInput] = useState("");

  // Manual time entry
  const [isAddingTime, setIsAddingTime] = useState(false);
  const [manualTimeInput, setManualTimeInput] = useState("");

  // Update running timer display every second
  useEffect(() => {
    if (!task.timerRunning || !task.timerStart) {
      setCurrentRunningSeconds(0);
      return;
    }

    // Calculate initial elapsed time
    const startTime = new Date(task.timerStart).getTime();
    const updateTimer = () => {
      const now = Date.now();
      const elapsedMs = now - startTime;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      setCurrentRunningSeconds(elapsedSeconds);
    };

    // Update immediately
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [task.timerRunning, task.timerStart]);

  /**
   * Start the timer
   * Sets timerRunning = true and records current timestamp
   */
  const handleStart = () => {
    const updatedTask: Task = {
      ...task,
      timerRunning: true,
      timerStart: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onUpdate(updatedTask);
  };

  /**
   * Pause the timer
   * Calculates elapsed time and adds to spentTime with time log
   */
  const handlePause = () => {
    if (!task.timerStart) return;

    const startTime = new Date(task.timerStart).getTime();
    const now = Date.now();
    const elapsedMinutes = (now - startTime) / 1000 / 60;

    // Create time log entry even for partial minutes
    const timeLogEntry = {
      id: `timer_${Date.now()}`,
      type: 'timer' as const,
      minutes: elapsedMinutes,
      createdAt: new Date().toISOString()
    };

    const updatedTask: Task = {
      ...task,
      timerRunning: false,
      timerStart: null,
      spentTime: task.spentTime + elapsedMinutes,
      timeLogs: [...(task.timeLogs || []), timeLogEntry],
      updatedAt: new Date().toISOString(),
    };
    onUpdate(updatedTask);
  };

  /**
   * Resume the timer (same as start, just different UX context)
   */
  const handleResume = () => {
    handleStart();
  };

  /**
   * Stop the timer and reset spent time
   * Useful for clearing the timer completely
   */
  const handleStop = () => {
    const updatedTask: Task = {
      ...task,
      timerRunning: false,
      timerStart: null,
      spentTime: 0,
      timeLogs: [], // Clear time logs when stopping completely
      updatedAt: new Date().toISOString(),
    };
    onUpdate(updatedTask);
  };

  /**
   * Save estimated time
   */
  const handleSaveEstimate = () => {
    const minutes = parseFloat(estimateInput);
    if (isNaN(minutes) || minutes < 0) {
      setIsEditingEstimate(false);
      setEstimateInput("");
      return;
    }

    const updatedTask: Task = {
      ...task,
      estimatedTime: minutes,
      updatedAt: new Date().toISOString(),
    };
    onUpdate(updatedTask);
    setIsEditingEstimate(false);
    setEstimateInput("");
  };

  /**
   * Add manual time entry
   */
  const handleAddManualTime = () => {
    const minutes = parseFloat(manualTimeInput);
    if (isNaN(minutes) || minutes <= 0) {
      setIsAddingTime(false);
      setManualTimeInput("");
      return;
    }

    // Create time log entry
    const timeLogEntry = {
      id: `manual_${Date.now()}`,
      type: 'manual' as const,
      minutes: minutes,
      createdAt: new Date().toISOString()
    };

    const updatedTask: Task = {
      ...task,
      spentTime: task.spentTime + minutes,
      timeLogs: [...(task.timeLogs || []), timeLogEntry],
      updatedAt: new Date().toISOString(),
    };
    onUpdate(updatedTask);
    setIsAddingTime(false);
    setManualTimeInput("");
  };

  /**
   * Clear estimated time
   */
  const handleClearEstimate = () => {
    const updatedTask: Task = {
      ...task,
      estimatedTime: null,
      updatedAt: new Date().toISOString(),
    };
    onUpdate(updatedTask);
  };

  /**
   * Set task as useful or not useful
   */
  const handleSetUsefulness = (isUseful: boolean) => {
    const updatedTask: Task = {
      ...task,
      isUseful,
      updatedAt: new Date().toISOString(),
    };
    onUpdate(updatedTask);
  };

  /**
   * Clear usefulness categorization
   */
  const handleClearUsefulness = () => {
    const updatedTask: Task = {
      ...task,
      isUseful: null,
      updatedAt: new Date().toISOString(),
    };
    onUpdate(updatedTask);
  };

  /**
   * Format time in minutes to human-readable string
   * Example: 125.5 minutes -> "2h 5m"
   */
  const formatTime = (minutes: number): string => {
    if (minutes < 1) {
      return "0m";
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  /**
   * Format seconds to MM:SS
   */
  const formatSeconds = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculate total time (accumulated + current running)
  const totalMinutes = task.spentTime + currentRunningSeconds / 60;

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Estimated Time Section */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        {isEditingEstimate ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2"
          >
            <input
              type="number"
              value={estimateInput}
              onChange={(e) => setEstimateInput(e.target.value)}
              placeholder="Minutes"
              className="w-20 px-3 py-2 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
              onKeyPress={(e) => {
                if (e.key === "Enter") handleSaveEstimate();
                if (e.key === "Escape") {
                  setIsEditingEstimate(false);
                  setEstimateInput("");
                }
              }}
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSaveEstimate}
              className="px-3 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
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
              className="px-3 py-2 bg-gray-400 text-white text-sm font-medium rounded-lg hover:bg-gray-500 transition-colors"
            >
              ✕
            </motion.button>
          </motion.div>
        ) : (
          <div className="flex items-center gap-2">
            {task.estimatedTime !== null ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2"
              >
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Est:
                </span>
                <span className="text-lg font-bold text-blue-700">
                  {formatTime(task.estimatedTime)}
                </span>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setEstimateInput(task.estimatedTime?.toString() || "");
                    setIsEditingEstimate(true);
                  }}
                  className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                  title="Edit estimate"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleClearEstimate}
                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                  title="Clear estimate"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              </motion.div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsEditingEstimate(true)}
                className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium hover:from-blue-100 hover:to-indigo-100 hover:border-blue-300 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Estimate
              </motion.button>
            )}
          </div>
        )}

      </div>

      {/* Timer and Controls Section */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full">
        {/* Timer Display */}
        <motion.div
          layout
          className={`
            relative flex flex-col items-center px-3 sm:px-4 py-3 rounded-xl border-2 overflow-hidden w-full sm:w-auto
            ${task.timerRunning
              ? "bg-gradient-to-br from-green-50 to-green-100 border-green-300 shadow-lg"
              : "bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200"
            }
          `}
        >
          {/* Running Animation Background */}
          <AnimatePresence>
            {task.timerRunning && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-gradient-to-r from-green-400/10 to-green-500/10"
              >
                <motion.div
                  animate={{
                    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-green-200/20 to-transparent"
                  style={{ backgroundSize: "200% 100%" }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            key={task.timerRunning ? "running" : "stopped"}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`text-xs font-semibold uppercase tracking-wide ${
              task.timerRunning ? "text-green-700" : "text-gray-600"
            }`}
          >
            {task.timerRunning ? "Running" : "Tracked"}
          </motion.div>

          <motion.div
            key={task.timerRunning ? "running-time" : "spent-time"}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className={`text-xl font-bold ${
              task.timerRunning ? "text-green-800" : "text-gray-800"
            }`}
          >
            {task.timerRunning ? (
              <motion.span
                animate={{ opacity: [1, 0.7, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                {formatSeconds(currentRunningSeconds)}
              </motion.span>
            ) : (
              <span>{formatTime(task.spentTime)}</span>
            )}
          </motion.div>

          {task.timerRunning && task.spentTime > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-green-600 font-medium mt-1"
            >
              +{formatTime(task.spentTime)} total
            </motion.div>
          )}

          {!task.timerRunning && totalMinutes > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-gray-500 mt-1"
            >
              Total: {formatTime(totalMinutes)}
            </motion.div>
          )}

          {/* Show estimated vs actual comparison */}
          {task.estimatedTime !== null && totalMinutes > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`text-xs font-semibold mt-1 px-2 py-1 rounded-full ${
                totalMinutes > task.estimatedTime
                  ? "bg-red-100 text-red-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {totalMinutes > task.estimatedTime ? "+" : ""}
              {formatTime(totalMinutes - task.estimatedTime)} vs est
            </motion.div>
          )}
        </motion.div>

        {/* Timer Controls */}
        <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-center sm:justify-start">
          <AnimatePresence mode="wait">
            {!task.timerRunning && task.spentTime === 0 && (
              <motion.button
                key="start"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStart}
                className="px-3 sm:px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-medium rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-sm w-full sm:w-auto"
                title="Start timer"
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l.707.707A1 1 0 0012.414 11H13m-4 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Start
                </span>
              </motion.button>
            )}

            {!task.timerRunning && task.spentTime > 0 && (
              <motion.div
                key="resume-reset"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleResume}
                  className="px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm w-full sm:w-auto"
                  title="Resume timer"
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l.707.707A1 1 0 0012.414 11H13m-4 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Resume
                  </span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleStop}
                  className="px-3 sm:px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white text-sm font-medium rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all shadow-sm w-full sm:w-auto"
                  title="Reset timer"
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reset
                  </span>
                </motion.button>
              </motion.div>
            )}

            {task.timerRunning && (
              <motion.button
                key="pause"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handlePause}
                className="px-3 sm:px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white text-sm font-medium rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all shadow-sm w-full sm:w-auto"
                title="Pause timer"
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Pause
                </span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Manual Time Entry */}
        <AnimatePresence>
          {!task.timerRunning && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-3 overflow-hidden w-full"
            >
              {!isAddingTime ? (
                <motion.button
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsAddingTime(true)}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium hover:from-blue-100 hover:to-indigo-100 hover:border-blue-300 transition-all w-full sm:w-auto"
                  title="Add time manually"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Time
                </motion.button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg w-full"
                >
                  <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
                    <input
                      type="number"
                      min="1"
                      max="480"
                      placeholder="30"
                      value={manualTimeInput}
                      onChange={(e) => setManualTimeInput(e.target.value)}
                      className="w-full sm:w-20 px-3 py-2 text-sm border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoFocus
                      onKeyPress={(e) => {
                        if (e.key === "Enter") handleAddManualTime();
                        if (e.key === "Escape") {
                          setIsAddingTime(false);
                          setManualTimeInput("");
                        }
                      }}
                    />
                    <span className="text-sm text-gray-600 hidden sm:inline">minutes</span>
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-start">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleAddManualTime}
                      className="px-3 py-2 bg-green-500 text-white text-sm font-medium rounded-md hover:bg-green-600 transition-colors flex-1 sm:flex-none"
                      title="Add time"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setIsAddingTime(false);
                        setManualTimeInput("");
                      }}
                      className="px-3 py-2 bg-gray-500 text-white text-sm font-medium rounded-md hover:bg-gray-600 transition-colors flex-1 sm:flex-none"
                      title="Cancel"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
