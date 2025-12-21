"use client";

import type { Task } from "@/domain";
import type { MoodInfo } from "@/domain";
import type { SleepInfo } from "@/domain";

export interface EmotionalScore {
  totalScore: number;
  emoji: string;
  label: string;
  breakdown: {
    mood: number;
    sleep: number;
    reflection: number;
    tasks: number;
    goals: number;
  };
  indicators: {
    sleepQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'none';
    reflectionPresent: boolean;
    usefulTaskRatio: number; // 0-1
    hasMoodData: boolean;
    goalProgress: number; // 0-1, average progress across goals
  };
}

/**
 * Calculate daily emotional score based on multiple factors
 * Returns a score from 0-100 with emoji representation
 */
export function calculateEmotionalScore(
  tasks: Task[],
  moodData: MoodInfo | null,
  sleepData: SleepInfo | null,
  reflectionNotes: string = "",
  waterIntake: number = 0,
  studyMinutes: number = 0,
  goalProgress: number = 0.5 // 0-1, defaults to neutral
): EmotionalScore {
  let totalScore = 50; // Start with neutral score
  const breakdown = { mood: 0, sleep: 0, reflection: 0, tasks: 0, goals: 0 };

  // 1. Mood Score (25% weight) - rating is 1-5, dayScore is 1-10
  if (moodData) {
    const moodRating = moodData.rating || 3; // 1-5 scale
    const dayScore = moodData.dayScore || 5; // 1-10 scale
    const moodScore = ((moodRating - 1) / 4) * 50 + ((dayScore - 1) / 9) * 50; // 0-100
    breakdown.mood = moodScore * 0.25;
    totalScore += breakdown.mood - 12.5; // Center around neutral
  }

  // 2. Sleep Quality (20% weight) - quality is probably 1-5
  if (sleepData?.quality) {
    const sleepScore = ((sleepData.quality - 1) / 4) * 100; // 0-100
    breakdown.sleep = sleepScore * 0.2;
    totalScore += breakdown.sleep - 10; // Center around neutral
  }

  // 3. Reflection Presence/Sentiment (20% weight)
  let reflectionScore = 0;
  if (reflectionNotes.trim()) reflectionScore += 40; // Has notes
  if (waterIntake > 0) reflectionScore += 30; // Drank water
  if (studyMinutes > 0) reflectionScore += 30; // Did study work

  // Sentiment analysis of notes (simple keyword matching)
  const positiveWords = ['good', 'great', 'excellent', 'happy', 'productive', 'accomplished', 'energized', 'focused'];
  const negativeWords = ['bad', 'terrible', 'tired', 'stressed', 'overwhelmed', 'frustrated', 'sad', 'anxious'];

  const notes = reflectionNotes.toLowerCase();
  const positiveCount = positiveWords.filter(word => notes.includes(word)).length;
  const negativeCount = negativeWords.filter(word => notes.includes(word)).length;

  if (positiveCount > negativeCount) reflectionScore += 20;
  else if (negativeCount > positiveCount) reflectionScore -= 20;

  reflectionScore = Math.max(0, Math.min(100, reflectionScore));
  breakdown.reflection = reflectionScore * 0.15;
  totalScore += breakdown.reflection - 7.5; // Center around neutral

  // 4. Useful vs Non-Useful Tasks Ratio (20% weight)
  const usefulTasks = tasks.filter(t => t.isUseful === true).length;
  const notUsefulTasks = tasks.filter(t => t.isUseful === false).length;
  const totalCategorizedTasks = usefulTasks + notUsefulTasks;

  let taskScore = 50; // Neutral
  if (totalCategorizedTasks > 0) {
    const usefulRatio = usefulTasks / totalCategorizedTasks;
    taskScore = usefulRatio * 100; // 0-100 based on useful ratio

    // Bonus for completing useful tasks
    const completedUsefulTasks = tasks.filter(t => t.isUseful === true && t.status === 'done').length;
    if (completedUsefulTasks > 0) {
      taskScore += Math.min(20, completedUsefulTasks * 5);
    }

    // Penalty for non-useful tasks
    if (notUsefulTasks > usefulTasks) {
      taskScore -= Math.min(20, (notUsefulTasks - usefulTasks) * 5);
    }
  }

  taskScore = Math.max(0, Math.min(100, taskScore));
  breakdown.tasks = taskScore * 0.2;
  totalScore += breakdown.tasks - 10; // Center around neutral

  // 5. Goal Progress (20% weight) - goalProgress is 0-1
  const goalScore = goalProgress * 100; // Convert to 0-100
  breakdown.goals = goalScore * 0.2;
  totalScore += breakdown.goals - 10; // Center around neutral

  // Ensure final score is between 0-100
  totalScore = Math.max(0, Math.min(100, totalScore));

  // Determine emoji and label based on score
  let emoji: string;
  let label: string;

  if (totalScore >= 90) {
    emoji = "🤩";
    label = "Amazing Day!";
  } else if (totalScore >= 80) {
    emoji = "😊";
    label = "Great Day";
  } else if (totalScore >= 70) {
    emoji = "🙂";
    label = "Good Day";
  } else if (totalScore >= 60) {
    emoji = "😐";
    label = "Okay Day";
  } else if (totalScore >= 40) {
    emoji = "😕";
    label = "Tough Day";
  } else if (totalScore >= 20) {
    emoji = "😞";
    label = "Hard Day";
  } else {
    emoji = "😢";
    label = "Really Tough Day";
  }

  // Determine indicators
  const sleepQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'none' =
    !sleepData ? 'none' :
    sleepData.quality >= 4 ? 'excellent' :
    sleepData.quality >= 3 ? 'good' :
    sleepData.quality >= 2 ? 'fair' : 'poor';

  const reflectionPresent = reflectionNotes.trim().length > 0 || waterIntake > 0 || studyMinutes > 0;
  const usefulTaskRatio = totalCategorizedTasks > 0 ? usefulTasks / totalCategorizedTasks : 0.5;

  return {
    totalScore: Math.round(totalScore),
    emoji,
    label,
    breakdown,
    indicators: {
      sleepQuality,
      reflectionPresent,
      usefulTaskRatio,
      hasMoodData: !!moodData,
      goalProgress
    }
  };
}

/**
 * Get color for sleep quality indicator
 */
export function getSleepQualityColor(quality: 'excellent' | 'good' | 'fair' | 'poor' | 'none'): string {
  switch (quality) {
    case 'excellent': return 'text-cyan-300 bg-cyan-500/20 dark:text-cyan-200 dark:bg-cyan-500/25';
    case 'good': return 'text-purple-300 bg-purple-500/20 dark:text-purple-200 dark:bg-purple-500/25';
    case 'fair': return 'text-yellow-300 bg-yellow-500/20 dark:text-yellow-200 dark:bg-yellow-500/25';
    case 'poor': return 'text-red-300 bg-red-500/20 dark:text-red-200 dark:bg-red-500/25';
    case 'none': return 'text-gray-300 bg-gray-500/20 dark:text-gray-400 dark:bg-gray-500/25';
  }
}

/**
 * Get color for useful task ratio indicator
 */
export function getUsefulTaskRatioColor(ratio: number): string {
  if (ratio >= 0.8) return 'text-cyan-300 bg-cyan-500/20 dark:text-cyan-200 dark:bg-cyan-500/25';
  if (ratio >= 0.6) return 'text-purple-300 bg-purple-500/20 dark:text-purple-200 dark:bg-purple-500/25';
  if (ratio >= 0.4) return 'text-yellow-300 bg-yellow-500/20 dark:text-yellow-200 dark:bg-yellow-500/25';
  if (ratio >= 0.2) return 'text-orange-300 bg-orange-500/20 dark:text-orange-200 dark:bg-orange-500/25';
  return 'text-red-300 bg-red-500/20 dark:text-red-200 dark:bg-red-500/25';
}