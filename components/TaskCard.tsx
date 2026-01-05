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
  onManualTimeEntry: (task: Task, minutes: number) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export default function TaskCard({
  task,
  onDelete,
  onStartTimer,
  onPauseTimer,
  onStopTimer,
  onStatusChange,
  onUsefulnessChange,
  onEstimateChange,
  onManualTimeEntry,
  isExpanded = false,
  onToggleExpand,
}: TaskCardProps) {
  const [isEditingEstimate, setIsEditingEstimate] = useState(false);
  const [isEditingActual, setIsEditingActual] = useState(false);
  const [estimateInput, setEstimateInput] = useState("");
  const [actualInput, setActualInput] = useState("");
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update current time for timer calculations
  useEffect(() => {
    if (!task.timerRunning) {
      setCurrentTime(Date.now()); // Ensure consistent time when stopped
      return;
    }

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000); // Update every second when timer is running

    return () => clearInterval(interval);
  }, [task.timerRunning]);

  // Calculate total minutes including running timer
  const totalMinutes = task.spentTime + (task.timerRunning && task.timerStart
    ? (currentTime - new Date(task.timerStart).getTime()) / 60000
    : 0);

  const totalTime = Math.max(0, totalMinutes);

  const progressPercentage = task.estimatedTime && task.estimatedTime > 0
    ? Math.min((totalTime / task.estimatedTime) * 100, 100)
    : 0;

  const isOverEstimate = task.estimatedTime && totalTime > task.estimatedTime;

  // Format time helper (HH:MM:SS format when running)
  const formatTime = (minutes: number, showSeconds = false): string => {
    if (minutes <= 0) return showSeconds ? "00:00" : "0m";
    const totalSeconds = Math.floor(minutes * 60);
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (showSeconds) {
      if (hours > 0) return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

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

  // Handle actual time save
  const handleActualSave = () => {
    const minutes = parseFloat(actualInput);
    if (isNaN(minutes) || minutes < 0) {
      setIsEditingActual(false);
      setActualInput("");
      return;
    }
    onManualTimeEntry(task, minutes);
    setIsEditingActual(false);
    setActualInput("");
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`
        relative bg-card rounded-xl border-2 p-4 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer
        ${task.timerRunning
          ? "border-green-200 bg-gradient-to-br from-green-50/50 to-card dark:from-green-900/20 dark:to-card"
          : task.isUseful === true
            ? "border-green-100 hover:border-green-200 dark:border-green-800 dark:hover:border-green-700"
            : task.isUseful === false
              ? "border-orange-100 hover:border-orange-200 dark:border-orange-800 dark:hover:border-orange-700"
              : "border-border hover:border-primary/50"
        }
      `}
      onClick={onToggleExpand}
    >
      {/* Running Timer Pulse Animation */}
      <AnimatePresence>
        {task.timerRunning && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full z-10"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-full h-full bg-green-400 rounded-full"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header - Always visible */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <div className="flex-shrink-0">
            <motion.div
              animate={isExpanded ? { rotate: 180 } : { rotate: 0 }}
              className="p-1 rounded-full bg-muted text-muted-foreground"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
              </svg>
            </motion.div>
          </div>
          <div className="flex-1 min-w-0">
            <motion.h3
              layout="position"
              className="text-base sm:text-lg font-bold text-card-foreground truncate leading-tight"
            >
              {task.title}
            </motion.h3>

            <div className="flex items-center gap-2 flex-wrap mt-1">
              {/* Status Badge */}
              <motion.div layout="position" onClick={(e) => e.stopPropagation()}>
                <select
                  value={task.status}
                  onChange={(e) => onStatusChange(task, e.target.value as TaskStatus)}
                  className="px-2 py-0.5 text-[10px] font-black uppercase bg-muted border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-muted-foreground tracking-widest"
                >
                  <option value="todo">To Do</option>
                  <option value="in-progress">Doing</option>
                  <option value="done">Done</option>
                </select>
              </motion.div>

              {!isExpanded && (
                <div className="flex items-center gap-2">
                  {task.estimatedTime && (
                    <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded uppercase">
                      {formatTime(task.estimatedTime)}
                    </span>
                  )}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${task.timerRunning ? 'bg-green-100 text-green-700 animate-pulse' : 'bg-muted text-muted-foreground'}`}>
                    {formatTime(totalTime)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Delete / Quick Info */}
        <div className="flex items-center gap-2">
          {task.isUseful !== null && !isExpanded && (
            <span className="text-sm">{task.isUseful ? "👍" : "👎"}</span>
          )}
          <motion.button
            layout="position"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            className="p-2 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </motion.button>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pt-6 border-t border-border/50 mt-4 space-y-6">
              {/* Progress Bar (Visible if estimated) */}
              {task.estimatedTime && task.estimatedTime > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    <span>Focus Progress</span>
                    <span>{Math.round(progressPercentage)}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercentage}%` }}
                      className={`h-full rounded-full ${isOverEstimate ? "bg-red-500" : "bg-primary"}`}
                    />
                  </div>
                </div>
              )}

              {/* Time Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/50 rounded-2xl border border-border/50">
                  <label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block">Estimation</label>
                  {isEditingEstimate ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={estimateInput}
                        onChange={(e) => setEstimateInput(e.target.value)}
                        className="w-full px-2 py-1 bg-card border border-primary/20 rounded-lg text-sm font-bold focus:ring-1 focus:ring-primary outline-none"
                        autoFocus
                        onKeyPress={(e) => e.key === "Enter" && handleEstimateSave()}
                      />
                      <button onClick={handleEstimateSave} className="text-primary font-black">✓</button>
                    </div>
                  ) : (
                    <div
                      className="text-lg font-black text-foreground cursor-pointer hover:text-primary transition-colors flex items-center justify-between"
                      onClick={() => {
                        setEstimateInput(task.estimatedTime?.toString() || "");
                        setIsEditingEstimate(true);
                      }}
                    >
                      {task.estimatedTime ? formatTime(task.estimatedTime) : "—"}
                      <span className="text-[10px] text-primary">Edit</span>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-muted/50 rounded-2xl border border-border/50">
                  <label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block">Tracked Time</label>
                  {isEditingActual ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={actualInput}
                        onChange={(e) => setActualInput(e.target.value)}
                        className="w-full px-2 py-1 bg-card border border-primary/20 rounded-lg text-sm font-bold focus:ring-1 focus:ring-primary outline-none"
                        autoFocus
                        onKeyPress={(e) => e.key === "Enter" && handleActualSave()}
                      />
                      <button onClick={handleActualSave} className="text-primary font-black">✓</button>
                    </div>
                  ) : (
                    <div
                      className="text-lg font-black text-foreground cursor-pointer hover:text-primary transition-colors flex items-center justify-between"
                      onClick={() => {
                        setActualInput(totalTime.toFixed(1));
                        setIsEditingActual(true);
                      }}
                    >
                      <div className={task.timerRunning ? "text-green-500" : "text-foreground"}>
                        {formatTime(totalTime, task.timerRunning)}
                      </div>
                      <span className="text-[10px] text-primary">Add</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex gap-2">
                  <AnimatePresence mode="wait">
                    {!task.timerRunning ? (
                      <motion.button
                        key="start"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onStartTimer(task)}
                        className="px-6 py-2.5 bg-primary text-white text-sm font-black rounded-xl shadow-lg shadow-primary/20"
                      >
                        ▶ {task.spentTime > 0 ? "Resume" : "Start Focus"}
                      </motion.button>
                    ) : (
                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onPauseTimer(task)}
                          className="px-6 py-2.5 bg-yellow-500 text-white text-sm font-black rounded-xl shadow-lg shadow-yellow-500/20"
                        >
                          ⏸ Pause
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onStopTimer(task)}
                          className="px-6 py-2.5 bg-destructive text-white text-sm font-black rounded-xl shadow-lg shadow-destructive/20"
                        >
                          ⏹ Stop
                        </motion.button>
                      </div>
                    )}
                  </AnimatePresence>

                  {task.spentTime > 0 && !task.timerRunning && (
                    <button
                      onClick={() => onStopTimer(task)}
                      className="px-4 py-2.5 bg-muted text-muted-foreground text-sm font-bold rounded-xl"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* Feedback Icons */}
                <div className="flex items-center gap-1 p-1 bg-muted rounded-2xl border border-border/50">
                  <FeedbackBtn isActive={task.isUseful === true} onClick={() => onUsefulnessChange(task, task.isUseful === true ? null : true)}>👍</FeedbackBtn>
                  <FeedbackBtn isActive={task.isUseful === false} onClick={() => onUsefulnessChange(task, task.isUseful === false ? null : false)}>👎</FeedbackBtn>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function FeedbackBtn({ children, isActive, onClick }: { children: React.ReactNode; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-xl transition-all ${isActive ? "bg-card shadow-sm scale-110" : "opacity-40 hover:opacity-100 hover:bg-card/50 text-sm"}`}
    >
      {children}
    </button>
  );
}