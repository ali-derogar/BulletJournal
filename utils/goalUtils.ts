"use client";

import type { Goal } from "@/domain";

// Progress calculation utilities
export function calculateGoalProgress(goal: Goal): number {
  if (goal.targetValue === 0) return 0;
  return Math.min((goal.currentValue / goal.targetValue) * 100, 100);
}

export function getGoalProgressEmoji(progress: number): string {
  if (progress >= 100) return "🎉";
  if (progress >= 80) return "🚀";
  if (progress >= 60) return "💪";
  if (progress >= 40) return "📈";
  if (progress >= 20) return "🌱";
  return "🌰";
}

export function getGoalProgressColor(progress: number): string {
  if (progress >= 100) return "text-cyan-300 bg-cyan-500/20 dark:text-cyan-200 dark:bg-cyan-500/25";
  if (progress >= 80) return "text-purple-300 bg-purple-500/20 dark:text-purple-200 dark:bg-purple-500/25";
  if (progress >= 60) return "text-purple-300 bg-purple-500/20 dark:text-purple-200 dark:bg-purple-500/25";
  if (progress >= 40) return "text-yellow-300 bg-yellow-500/20 dark:text-yellow-200 dark:bg-yellow-500/25";
  return "text-gray-300 bg-gray-500/20 dark:text-gray-400 dark:bg-gray-500/25";
}

// Calendar navigation utilities
export function getQuarterFromMonth(month: number): number {
  return Math.ceil(month / 3);
}

export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function getCurrentPeriod(type: "yearly" | "quarterly" | "monthly" | "weekly"): {
  year: number;
  quarter?: number;
  month?: number;
  week?: number;
} {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // JS months are 0-based

  switch (type) {
    case "yearly":
      return { year };
    case "quarterly":
      return { year, quarter: getQuarterFromMonth(month) };
    case "monthly":
      return { year, month };
    case "weekly":
      return { year, week: getWeekNumber(now) };
    default:
      return { year };
  }
}

export function formatPeriodLabel(
  type: "yearly" | "quarterly" | "monthly" | "weekly",
  year: number,
  quarter?: number,
  month?: number,
  week?: number
): string {
  switch (type) {
    case "yearly":
      return `${year}`;
    case "quarterly":
      return `Q${quarter} ${year}`;
    case "monthly":
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      return `${monthNames[month! - 1]} ${year}`;
    case "weekly":
      return `Week ${week} ${year}`;
    default:
      return `${year}`;
  }
}

// Goal validation
export function validateGoal(goal: Partial<Goal>): string[] {
  const errors: string[] = [];

  if (!goal.title?.trim()) {
    errors.push("Title is required");
  }

  if (!goal.type) {
    errors.push("Goal type is required");
  }

  if (goal.targetValue === undefined || goal.targetValue <= 0) {
    errors.push("Target value must be greater than 0");
  }

  if (!goal.unit?.trim()) {
    errors.push("Unit is required");
  }

  if (goal.year === undefined) {
    errors.push("Year is required");
  }

  // Type-specific validation
  if (goal.type === "quarterly" && !goal.quarter) {
    errors.push("Quarter is required for quarterly goals");
  }

  if (goal.type === "monthly" && !goal.month) {
    errors.push("Month is required for monthly goals");
  }

  if (goal.type === "weekly" && !goal.week) {
    errors.push("Week is required for weekly goals");
  }

  return errors;
}