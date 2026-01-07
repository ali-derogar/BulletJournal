export type TaskStatus = "todo" | "in-progress" | "done";

export interface TimeLogEntry {
  id: string;
  type: 'timer' | 'manual';
  minutes: number;
  createdAt: string;
}

export interface Task {
  id: string;
  userId: string;
  date: string;
  title: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt?: string; // Optional for backward compatibility, auto-populated on save
  // Time tracking - spentTime is the single source of truth
  spentTime: number; // Total time spent in minutes
  timeLogs: TimeLogEntry[]; // Array of time log entries
  // Legacy field for migration (optional)
  accumulatedTime?: number;
  // Timer fields for time tracking
  timerRunning: boolean; // Whether timer is currently active
  timerStart: string | null; // ISO timestamp when timer was started, null if not running
  // Estimation and usefulness tracking
  estimatedTime: number | null; // Estimated time in minutes, null if not set
  isUseful: boolean | null; // true = useful, false = not useful, null = not categorized
  isCopiedToNextDay: boolean; // Star status for copying to next day
}
