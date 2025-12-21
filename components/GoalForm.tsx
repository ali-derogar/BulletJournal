"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import type { Goal, GoalType } from "@/domain";
import { validateGoal, getCurrentPeriod, formatPeriodLabel } from "@/utils/goalUtils";

interface GoalFormProps {
  goal?: Goal;
  onSave: (goal: Goal) => void;
  onCancel: () => void;
  userId?: string;
  currentPeriod?: {
    type: GoalType;
    year: number;
    quarter?: number;
    month?: number;
    week?: number;
  };
}

export default function GoalForm({ goal, onSave, onCancel, userId = "default", currentPeriod }: GoalFormProps) {
  console.log("GoalForm rendered with:", { goal, userId, currentPeriod });

  const [formData, setFormData] = useState<Partial<Goal>>({
    title: "",
    description: "",
    type: currentPeriod?.type || "monthly",
    targetValue: 1,
    currentValue: 0,
    unit: "",
    status: "active",
    progressType: "manual",
    linkedTaskIds: [],
    ...(currentPeriod || getCurrentPeriod("monthly")),
    ...goal,
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!goal;

  useEffect(() => {
    if (formData.type) {
      const currentPeriod = getCurrentPeriod(formData.type);
      setFormData(prev => ({ ...prev, ...currentPeriod }));
    }
  }, [formData.type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("GoalForm: handleSubmit called with form data:", formData);

    const validationErrors = validateGoal(formData);
    console.log("GoalForm: validation errors:", validationErrors);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    console.log("GoalForm: Starting to save goal...");
    try {
      const goalData: Goal = {
        id: goal?.id || `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: goal?.userId || userId,
        title: formData.title!.trim(),
        description: formData.description?.trim() || undefined,
        type: formData.type!,
        year: formData.year!,
        quarter: formData.quarter,
        month: formData.month,
        week: formData.week,
        targetValue: formData.targetValue!,
        currentValue: formData.currentValue || 0,
        unit: formData.unit!.trim(),
        linkedTaskIds: formData.linkedTaskIds || [],
        status: formData.status!,
        progressType: formData.progressType!,
        createdAt: goal?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: formData.currentValue! >= formData.targetValue! ? new Date().toISOString() : undefined,
      };

      console.log("GoalForm: Calling onSave with goalData:", goalData);
      await onSave(goalData);
      console.log("GoalForm: onSave completed successfully");
    } catch (error) {
      console.error("GoalForm: Error saving goal:", error);
      setErrors(["Failed to save goal. Please try again."]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTypeChange = (type: GoalType) => {
    const currentPeriod = getCurrentPeriod(type);
    setFormData(prev => ({
      ...prev,
      type,
      ...currentPeriod,
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-card rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden border border-border"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-card-foreground">
            {isEditing ? "Edit Goal" : "Add New Goal"}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={(e) => { console.log("Form onSubmit triggered"); handleSubmit(e); }} className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Errors */}
          {errors.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <ul className="text-sm text-red-700 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-1">
              Title *
            </label>
            <input
              type="text"
              value={formData.title || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground placeholder:text-muted-foreground"
              placeholder="e.g., Read 10 books"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-1">
              Description
            </label>
            <textarea
              value={formData.description || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none bg-background text-foreground placeholder:text-muted-foreground"
              rows={2}
              placeholder="Optional description..."
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Goal Type *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "yearly", label: "Yearly", icon: "📅" },
                { value: "quarterly", label: "Quarterly", icon: "🗓️" },
                { value: "monthly", label: "Monthly", icon: "📆" },
                { value: "weekly", label: "Weekly", icon: "📋" },
              ].map(({ value, label, icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleTypeChange(value as GoalType)}
                  className={`p-3 rounded-lg font-medium transition-all duration-200 border ${
                    formData.type === value
                      ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                      : "bg-card text-muted-foreground hover:bg-secondary hover:text-secondary-foreground border-border hover:border-primary/30"
                  }`}
                >
                  <span className="mr-2">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Period Display */}
          <div className="p-3 bg-secondary/50 rounded-lg border border-border/50 backdrop-blur-sm">
            <div className="text-sm text-secondary-foreground">Period:</div>
            <div className="font-medium text-card-foreground">
              {formatPeriodLabel(
                formData.type!,
                formData.year!,
                formData.quarter,
                formData.month,
                formData.week
              )}
            </div>
          </div>

          {/* Target and Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">
                Target *
              </label>
              <input
                type="number"
                min="1"
                value={formData.targetValue || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, targetValue: parseInt(e.target.value) || 1 }))}
                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">
                Unit *
              </label>
              <input
                type="text"
                value={formData.unit || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground placeholder:text-muted-foreground"
                placeholder="e.g., books, hours"
                required
              />
            </div>
          </div>

          {/* Progress Type */}
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Progress Tracking *
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="progressType"
                  value="manual"
                  checked={formData.progressType === "manual"}
                  onChange={(e) => setFormData(prev => ({ ...prev, progressType: e.target.value as "manual" | "task-linked" }))}
                  className="mr-2"
                />
                <span className="text-sm">Manual progress tracking</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="progressType"
                  value="task-linked"
                  checked={formData.progressType === "task-linked"}
                  onChange={(e) => setFormData(prev => ({ ...prev, progressType: e.target.value as "manual" | "task-linked" }))}
                  className="mr-2"
                />
                <span className="text-sm">Link to tasks (coming soon)</span>
              </label>
            </div>
          </div>

          {/* Current Value (for editing) */}
          {isEditing && formData.progressType === "manual" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Progress
              </label>
              <input
                type="number"
                min="0"
                value={formData.currentValue || 0}
                onChange={(e) => setFormData(prev => ({ ...prev, currentValue: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 disabled:opacity-50 transition-all duration-200 border border-border/50 hover:border-border"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-all duration-200 shadow-lg shadow-primary/20 hover:shadow-primary/30"
            >
              {isSubmitting ? "Saving..." : (isEditing ? "Update Goal" : "Add Goal")}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}