"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { Goal } from "@/domain";
import { calculateGoalProgress, getGoalProgressEmoji } from "@/utils/goalUtils";
import { useLocale, useTranslations } from "next-intl";

interface GoalCardProps {
  goal: Goal;
  onUpdate: (goal: Goal) => void;
  onDelete: (goalId: string) => void;
  onEdit: (goal: Goal) => void;
}

export default function GoalCard({ goal, onUpdate, onDelete, onEdit }: GoalCardProps) {
  const t = useTranslations();
  const locale = useLocale();
  const localeTag = locale === "fa" ? "fa-IR" : "en-US";
  const [isUpdating, setIsUpdating] = useState(false);

  const progress = calculateGoalProgress(goal);
  const progressEmoji = getGoalProgressEmoji(progress);

  const handleProgressUpdate = async (newValue: number) => {
    if (goal.progressType === "manual") {
      setIsUpdating(true);
      try {
        const updatedGoal = {
          ...goal,
          currentValue: Math.max(0, newValue),
          updatedAt: new Date().toISOString(),
          status: newValue >= goal.targetValue ? "completed" : goal.status,
          completedAt: newValue >= goal.targetValue ? new Date().toISOString() : undefined,
        };
        await onUpdate(updatedGoal);
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const handleIncrement = () => {
    handleProgressUpdate(goal.currentValue + 1);
  };

  const handleDecrement = () => {
    handleProgressUpdate(goal.currentValue - 1);
  };

  const handleStatusToggle = () => {
    const newStatus = goal.status === "active" ? "paused" : "active";
    onUpdate({ ...goal, status: newStatus, updatedAt: new Date().toISOString() });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-card rounded-xl shadow-sm border border-border p-4 hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-card-foreground text-lg leading-tight">
            {goal.title}
          </h3>
          {goal.description && (
            <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 ml-3">
          <span className="text-2xl">{progressEmoji}</span>
          <div className="flex gap-1">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onEdit(goal)}
              className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
              title={t("goals.editGoal")}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onDelete(goal.id)}
              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
              title={t("goals.deleteGoal")}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            {goal.currentValue} / {goal.targetValue} {goal.unit}
          </span>
          <span className="text-sm font-semibold text-card-foreground">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2.5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={`h-2.5 rounded-full ${
              progress >= 100 ? "bg-green-500" :
              progress >= 80 ? "bg-blue-500" :
              progress >= 60 ? "bg-purple-500" :
              progress >= 40 ? "bg-yellow-500" : "bg-gray-500"
            }`}
          />
        </div>
      </div>

      {/* Progress Controls */}
      {goal.progressType === "manual" && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleDecrement}
              disabled={goal.currentValue <= 0 || isUpdating}
              className="px-3 py-1 bg-secondary text-secondary-foreground rounded font-medium hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              −
            </motion.button>
            <span className="text-sm font-medium min-w-[3rem] text-center">
              {goal.currentValue}
            </span>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleIncrement}
              disabled={isUpdating}
              className="px-3 py-1 bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              +
            </motion.button>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleStatusToggle}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              goal.status === "active"
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
            }`}
          >
            {goal.status === "active" ? t("goals.status.active") : t("goals.status.paused")}
          </motion.button>
        </div>
      )}

      {/* Task-linked indicator */}
      {goal.progressType === "task-linked" && (
        <div className="mt-3 p-2 bg-primary/10 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-primary font-medium">
              {t("goals.linkedTasks", { count: goal.linkedTaskIds.length })}
            </span>
          </div>
        </div>
      )}

      {/* Completion indicator */}
      {goal.status === "completed" && (
        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎉</span>
            <span className="text-sm text-green-700 font-medium">
              {t("goals.completedOn", { date: new Date(goal.completedAt!).toLocaleDateString(localeTag) })}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
