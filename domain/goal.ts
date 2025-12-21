export type GoalType = "yearly" | "quarterly" | "monthly" | "weekly";

export type GoalStatus = "active" | "completed" | "paused";

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  type: GoalType;
  // Period identification
  year: number; // Always required
  quarter?: number; // For quarterly goals (1-4)
  month?: number; // For monthly goals (1-12)
  week?: number; // For weekly goals (ISO week number)
  // Progress tracking
  targetValue: number; // Target value (e.g., 10 books, 10000 steps)
  currentValue: number; // Current progress
  unit: string; // Unit of measurement (e.g., "books", "hours", "steps")
  // Task linking (optional)
  linkedTaskIds: string[]; // IDs of tasks that contribute to this goal
  // Status and metadata
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  // Progress calculation method
  progressType: "manual" | "task-linked"; // How progress is calculated
}