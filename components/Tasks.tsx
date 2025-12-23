"use client";

import { useState, useEffect, useRef } from "react";
import type { Task, TaskStatus } from "@/domain";
import { getTasks, saveTask, deleteTask } from "@/storage";
import TaskTimer from "./TaskTimer";

interface TasksProps {
  date: string;
  userId: string;
}

export default function Tasks({ date, userId }: TasksProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cache for tasks to avoid unnecessary reloads
  const taskCache = useRef<Map<string, { data: Task[], timestamp: number }>>(new Map());
  const CACHE_DURATION = 30 * 1000; // 30 seconds for task data

  useEffect(() => {
    async function loadTasks() {
      const cacheKey = `${date}-${userId}`;
      const now = Date.now();
      const cached = taskCache.current.get(cacheKey);

      // Use cache if available and not expired
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        setTasks(cached.data);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await getTasks(date, userId);
        setTasks(data);

        // Update cache
        taskCache.current.set(cacheKey, { data, timestamp: now });
      } catch (error) {
        console.error("Failed to load tasks:", error);
        setError("Failed to load tasks");
      } finally {
        setLoading(false);
      }
    }

    loadTasks();
  }, [date, userId]); // CACHE_DURATION is a constant, no need to include

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
        // Initialize timer fields
        spentTime: 0,
        timeLogs: [],
        timerRunning: false,
        timerStart: null,
        // Initialize estimation and usefulness fields
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

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const updatedTask = { ...task, status: newStatus };
      await saveTask(updatedTask);
      setTasks(tasks.map((t) => (t.id === taskId ? updatedTask : t)));
    } catch (error) {
      console.error("Failed to update task status:", error);
    }
  };

  const handleStartEdit = (task: Task) => {
    setEditingId(task.id);
    setEditingTitle(task.title);
  };

  const handleSaveEdit = async (taskId: string) => {
    if (!editingTitle.trim()) return;

    try {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const updatedTask = { ...task, title: editingTitle.trim() };
      await saveTask(updatedTask);
      setTasks(tasks.map((t) => (t.id === taskId ? updatedTask : t)));
      setEditingId(null);
      setEditingTitle("");
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingTitle("");
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      setTasks(tasks.filter((t) => t.id !== taskId));
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  /**
   /**
    * Handle timer updates from TaskTimer component
    * Saves updated task to storage and updates local state
    */
   const handleTaskTimerUpdate = async (updatedTask: Task) => {
     try {
       await saveTask(updatedTask);
       setTasks(tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
     } catch (error) {
       console.error("Failed to update task timer:", error);
     }
   };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case "todo":
        return "bg-muted text-muted-foreground";
      case "in-progress":
        return "bg-blue-200 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300";
      case "done":
        return "bg-green-200 text-green-800 dark:bg-green-900/20 dark:text-green-300";
    }
  };

  const todoCount = tasks.filter((t) => t.status === "todo").length;
  const inProgressCount = tasks.filter((t) => t.status === "in-progress")
    .length;
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const totalCount = tasks.length;
  const progressPercent =
    totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  /**
   * Calculate total time spent on all tasks today
   * Includes both spent time and currently running timers
   */
  const totalTimeMinutes = tasks.reduce((total, task) => {
    let taskTime = task.spentTime;
    // Add running time if timer is active
    if (task.timerRunning && task.timerStart) {
      const startTime = new Date(task.timerStart).getTime();
      const elapsedMinutes = (Date.now() - startTime) / 1000 / 60;
      taskTime += elapsedMinutes;
    }
    return total + taskTime;
  }, 0);

  /**
   * Count how many timers are currently running
   */
  const runningTimersCount = tasks.filter((t) => t.timerRunning).length;

  /**
   * Calculate total estimated time for all tasks
   */
  const totalEstimatedMinutes = tasks.reduce((total, task) => {
    return total + (task.estimatedTime || 0);
  }, 0);

  /**
   * Calculate time spent on useful vs not useful tasks
   */
  const usefulTimeMinutes = tasks.reduce((total, task) => {
    if (task.isUseful !== true) return total;
    let taskTime = task.spentTime;
    if (task.timerRunning && task.timerStart) {
      const startTime = new Date(task.timerStart).getTime();
      const elapsedMinutes = (Date.now() - startTime) / 1000 / 60;
      taskTime += elapsedMinutes;
    }
    return total + taskTime;
  }, 0);

  const notUsefulTimeMinutes = tasks.reduce((total, task) => {
    if (task.isUseful !== false) return total;
    let taskTime = task.spentTime;
    if (task.timerRunning && task.timerStart) {
      const startTime = new Date(task.timerStart).getTime();
      const elapsedMinutes = (Date.now() - startTime) / 1000 / 60;
      taskTime += elapsedMinutes;
    }
    return total + taskTime;
  }, 0);

  const uncategorizedTimeMinutes = tasks.reduce((total, task) => {
    if (task.isUseful !== null) return total;
    let taskTime = task.spentTime;
    if (task.timerRunning && task.timerStart) {
      const startTime = new Date(task.timerStart).getTime();
      const elapsedMinutes = (Date.now() - startTime) / 1000 / 60;
      taskTime += elapsedMinutes;
    }
    return total + taskTime;
  }, 0);

  /**
   * Format minutes to human-readable string
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

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700 text-sm">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-card rounded-lg p-4 shadow animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 bg-muted rounded w-24"></div>
          <div className="h-4 bg-muted rounded w-32"></div>
        </div>
        <div className="h-2 bg-muted rounded w-full mb-4"></div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg p-2 sm:p-4 shadow">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <h2 className="text-lg font-semibold text-card-foreground">Tasks & Time Tracking</h2>
        <div className="flex flex-wrap gap-2 sm:gap-3 items-center text-xs sm:text-sm">
          <div className="text-muted-foreground">
            {doneCount}/{totalCount} completed ({progressPercent}%)
          </div>
          <div className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-800 rounded font-semibold">
            Total: {formatTime(totalTimeMinutes)}
          </div>
          {runningTimersCount > 0 && (
            <div className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs animate-pulse">
              {runningTimersCount} running
            </div>
          )}
        </div>
      </div>

      <div className="mb-4">
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="flex gap-2 mb-4 text-sm">
        <span className="px-2 py-1 bg-muted text-muted-foreground rounded">
          To Do: {todoCount}
        </span>
        <span className="px-2 py-1 bg-blue-200 text-blue-800 rounded">
          In Progress: {inProgressCount}
        </span>
        <span className="px-2 py-1 bg-green-200 text-green-800 rounded">
          Done: {doneCount}
        </span>
      </div>

      {/* Time Tracking Aggregations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 p-2 sm:p-3 bg-muted rounded-lg">
        {/* Estimated vs Actual */}
        <div className="border-r border-border pr-3">
          <div className="text-xs font-semibold text-muted-foreground mb-2">
            Estimated vs Actual
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Estimated:</span>
              <span className="text-sm font-bold text-primary">
                {totalEstimatedMinutes > 0
                  ? formatTime(totalEstimatedMinutes)
                  : "Not set"}
              </span>
            </div>
            <div className="text-muted-foreground">→</div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Actual:</span>
              <span className="text-sm font-bold text-card-foreground">
                {formatTime(totalTimeMinutes)}
              </span>
            </div>
            {totalEstimatedMinutes > 0 && totalTimeMinutes > 0 && (
              <div className="flex flex-col ml-2">
                <span className="text-xs text-muted-foreground">Diff:</span>
                <span
                  className={`text-sm font-bold ${
                    totalTimeMinutes > totalEstimatedMinutes
                      ? "text-destructive"
                      : "text-green-600"
                  }`}
                >
                  {totalTimeMinutes > totalEstimatedMinutes ? "+" : ""}
                  {formatTime(totalTimeMinutes - totalEstimatedMinutes)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Useful vs Not Useful Time */}
        <div className="pl-3">
          <div className="text-xs font-semibold text-muted-foreground mb-2">
            Time by Usefulness
          </div>
          <div className="flex flex-wrap gap-2">
            {usefulTimeMinutes > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">👍 Useful:</span>
                <span className="text-sm font-bold text-green-700">
                  {formatTime(usefulTimeMinutes)}
                </span>
              </div>
            )}
            {notUsefulTimeMinutes > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">👎 Not Useful:</span>
                <span className="text-sm font-bold text-orange-700">
                  {formatTime(notUsefulTimeMinutes)}
                </span>
              </div>
            )}
            {uncategorizedTimeMinutes > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Uncategorized:</span>
                <span className="text-sm font-bold text-muted-foreground">
                  {formatTime(uncategorizedTimeMinutes)}
                </span>
              </div>
            )}
            {usefulTimeMinutes === 0 &&
              notUsefulTimeMinutes === 0 &&
              uncategorizedTimeMinutes === 0 && (
                <span className="text-xs text-muted-foreground">
                  No time tracked yet
                </span>
              )}
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`p-2 sm:p-3 border-2 rounded-lg transition-all ${
              task.timerRunning
                ? "border-accent bg-accent/10 shadow-md"
                : "border-border bg-card hover:bg-muted"
            }`}
          >
            {editingId === task.id ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  className="flex-1 px-2 py-1 border border-input rounded focus:outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveEdit(task.id)}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex-1 sm:flex-none"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-3 py-1 bg-gray-400 text-white rounded text-sm flex-1 sm:flex-none"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Task info row */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                  <select
                    value={task.status}
                    onChange={(e) =>
                      handleStatusChange(task.id, e.target.value as TaskStatus)
                    }
                    className={`px-2 py-1 rounded text-xs sm:text-sm font-medium ${getStatusColor(task.status)} w-full sm:w-auto`}
                  >
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                  <span
                    className={`flex-1 font-medium text-sm sm:text-base ${
                      task.status === "done"
                        ? "line-through text-muted-foreground"
                        : task.timerRunning
                          ? "text-green-400"
                          : "text-foreground"
                    }`}
                  >
                    {task.title}
                  </span>
                  <div className="flex gap-1 sm:gap-2">
                    <button
                      onClick={() => handleStartEdit(task)}
                      className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-xs sm:text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-xs sm:text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Timer controls row */}
                <div className="flex items-center justify-end">
                  <TaskTimer task={task} onUpdate={handleTaskTimerUpdate} />
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleAddTask()}
          placeholder="Add a new task..."
          className="flex-1 px-3 py-2 border border-input rounded focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={handleAddTask}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 w-full sm:w-auto"
        >
          Add Task
        </button>
      </div>
    </div>
  );
}
