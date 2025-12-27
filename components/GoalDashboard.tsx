"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Goal, GoalType } from "@/domain";
import { getGoals, saveGoal, deleteGoal, autoArchiveExpiredGoals, getArchivedGoalsByPeriod } from "@/storage";
import { useUser } from "@/app/context/UserContext";
import GoalCalendar from "./GoalCalendar";
import GoalCard from "./GoalCard";
import GoalForm from "./GoalForm";
import { formatPeriodLabel, getCurrentPeriod } from "@/utils/goalUtils";
import { checkDatabaseMigration, migrateDatabase } from "@/utils/databaseMigration";

interface GoalDashboardProps {
  onGoalProgressUpdate?: (goalProgress: number) => void;
}

export default function GoalDashboard({ onGoalProgressUpdate }: GoalDashboardProps) {
  const { currentUser } = useUser();
  const userId = currentUser?.id || "default";

  console.log("GoalDashboard mounted/rendered, userId:", userId);

  const [goalsByPeriod, setGoalsByPeriod] = useState<{
    yearly: Goal[];
    quarterly: Goal[];
    monthly: Goal[];
    weekly: Goal[];
  }>({
    yearly: [],
    quarterly: [],
    monthly: [],
    weekly: [],
  });
  const [archivedGoals, setArchivedGoals] = useState<{
    yearly: { completed: Goal[]; failed: Goal[] };
    quarterly: { completed: Goal[]; failed: Goal[] };
    monthly: { completed: Goal[]; failed: Goal[] };
    weekly: { completed: Goal[]; failed: Goal[] };
  }>({
    yearly: { completed: [], failed: [] },
    quarterly: { completed: [], failed: [] },
    monthly: { completed: [], failed: [] },
    weekly: { completed: [], failed: [] },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>();
  const [selectedPeriod, setSelectedPeriod] = useState<{
    type: GoalType;
    year: number;
    quarter?: number;
    month?: number;
    week?: number;
  } | null>(null);

  // Track selected periods for filtering
  const [selectedPeriods, setSelectedPeriods] = useState<{
    yearly: { year: number };
    quarterly: { year: number; quarter: number };
    monthly: { year: number; month: number };
    weekly: { year: number; week: number };
  }>(() => ({
    yearly: getCurrentPeriod("yearly"),
    quarterly: getCurrentPeriod("quarterly") as { year: number; quarter: number },
    monthly: getCurrentPeriod("monthly") as { year: number; month: number },
    weekly: getCurrentPeriod("weekly") as { year: number; week: number },
  }));

  // Check database migration on component mount
  useEffect(() => {
    const checkMigration = async () => {
      try {
        const isMigrated = await checkDatabaseMigration();
        if (!isMigrated) {
          console.log("Database migration needed, migrating...");
          await migrateDatabase();
          console.log("Database migration completed");
        }
      } catch (error) {
        console.error("Database migration failed:", error);
        setError("Failed to initialize goals database. Please refresh the page.");
      }
    };
    checkMigration();
  }, []);

  const loadAllGoals = useCallback(async () => {
    console.log("loadAllGoals: Starting to load goals for selected periods:", JSON.stringify(selectedPeriods, null, 2));
    setLoading(true);
    setError(null);
    try {
      // First, auto-archive expired goals
      const archiveResult = await autoArchiveExpiredGoals(userId);
      console.log("Auto-archive completed:", archiveResult);

      const [
        yearlyGoals,
        quarterlyGoals,
        monthlyGoals,
        weeklyGoals,
        yearlyCompleted,
        yearlyFailed,
        quarterlyCompleted,
        quarterlyFailed,
        monthlyCompleted,
        monthlyFailed,
        weeklyCompleted,
        weeklyFailed,
      ] = await Promise.all([
        // Active goals
        getGoals(userId, "yearly", selectedPeriods.yearly.year),
        getGoals(userId, "quarterly", selectedPeriods.quarterly.year, selectedPeriods.quarterly.quarter),
        getGoals(userId, "monthly", selectedPeriods.monthly.year, undefined, selectedPeriods.monthly.month),
        getGoals(userId, "weekly", selectedPeriods.weekly.year, undefined, undefined, selectedPeriods.weekly.week),
        // Archived yearly
        getArchivedGoalsByPeriod(userId, "yearly", selectedPeriods.yearly.year, undefined, undefined, undefined, "completed"),
        getArchivedGoalsByPeriod(userId, "yearly", selectedPeriods.yearly.year, undefined, undefined, undefined, "failed"),
        // Archived quarterly
        getArchivedGoalsByPeriod(userId, "quarterly", selectedPeriods.quarterly.year, selectedPeriods.quarterly.quarter, undefined, undefined, "completed"),
        getArchivedGoalsByPeriod(userId, "quarterly", selectedPeriods.quarterly.year, selectedPeriods.quarterly.quarter, undefined, undefined, "failed"),
        // Archived monthly
        getArchivedGoalsByPeriod(userId, "monthly", selectedPeriods.monthly.year, undefined, selectedPeriods.monthly.month, undefined, "completed"),
        getArchivedGoalsByPeriod(userId, "monthly", selectedPeriods.monthly.year, undefined, selectedPeriods.monthly.month, undefined, "failed"),
        // Archived weekly
        getArchivedGoalsByPeriod(userId, "weekly", selectedPeriods.weekly.year, undefined, undefined, selectedPeriods.weekly.week, "completed"),
        getArchivedGoalsByPeriod(userId, "weekly", selectedPeriods.weekly.year, undefined, undefined, selectedPeriods.weekly.week, "failed"),
      ]);

      setGoalsByPeriod({
        yearly: yearlyGoals,
        quarterly: quarterlyGoals,
        monthly: monthlyGoals,
        weekly: weeklyGoals,
      });

      setArchivedGoals({
        yearly: { completed: yearlyCompleted, failed: yearlyFailed },
        quarterly: { completed: quarterlyCompleted, failed: quarterlyFailed },
        monthly: { completed: monthlyCompleted, failed: monthlyFailed },
        weekly: { completed: weeklyCompleted, failed: weeklyFailed },
      });

      // Calculate overall progress for mood integration
      const allGoals = [...yearlyGoals, ...quarterlyGoals, ...monthlyGoals, ...weeklyGoals];
      if (onGoalProgressUpdate && allGoals.length > 0) {
        const totalProgress = allGoals.reduce((sum, goal) => {
          const progress = goal.targetValue > 0 ? (goal.currentValue / goal.targetValue) * 100 : 0;
          return sum + progress;
        }, 0) / allGoals.length;
        onGoalProgressUpdate(totalProgress);
      }
    } catch (error) {
      console.error("Error loading goals:", error);
      setError(error instanceof Error ? error.message : "Failed to load goals");
    } finally {
      setLoading(false);
    }
  }, [userId, onGoalProgressUpdate, selectedPeriods]);

  // Load all goals on mount and when selectedPeriods change
  useEffect(() => {
    console.log("useEffect triggered: selectedPeriods changed, loading goals...");
    loadAllGoals();
  }, [loadAllGoals]);

  const handlePeriodSelect = (type: GoalType, year: number, quarter?: number, month?: number, week?: number) => {
    console.log("handlePeriodSelect called with:", { type, year, quarter, month, week });

    // Update the appropriate period based on type
    setSelectedPeriods(prev => {
      const updated = { ...prev };

      switch (type) {
        case "yearly":
          updated.yearly = { year };
          break;
        case "quarterly":
          if (quarter) {
            updated.quarterly = { year, quarter };
          }
          break;
        case "monthly":
          if (month) {
            updated.monthly = { year, month };
          }
          break;
        case "weekly":
          if (week) {
            updated.weekly = { year, week };
          }
          break;
      }

      console.log("Updated selectedPeriods:", updated);
      return updated;
    });

    setSelectedPeriod({ type, year, quarter, month, week });
    setShowCalendar(false);
  };

  const handleSaveGoal = async (goal: Goal) => {
    console.log("GoalDashboard: handleSaveGoal called with goal:", goal);
    try {
      console.log("GoalDashboard: Calling saveGoal...");
      await saveGoal(goal);
      console.log("GoalDashboard: saveGoal completed successfully");

      console.log("GoalDashboard: Reloading goals...");
      await loadAllGoals();
      console.log("GoalDashboard: Goals reloaded");

      setShowForm(false);
      setEditingGoal(undefined);
      console.log("GoalDashboard: Form closed");
    } catch (error) {
      console.error("GoalDashboard: Error saving goal:", error);
      setError(error instanceof Error ? error.message : "Failed to save goal");
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (confirm("Are you sure you want to delete this goal?")) {
      try {
        await deleteGoal(goalId);
        await loadAllGoals();
      } catch (error) {
        console.error("Error deleting goal:", error);
        setError(error instanceof Error ? error.message : "Failed to delete goal");
      }
    }
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setShowForm(true);
  };

  const handleAddGoal = () => {
    console.log("handleAddGoal called, selectedPeriod:", selectedPeriod);
    setEditingGoal(undefined);
    setShowForm(true);
    console.log("showForm set to true");
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingGoal(undefined);
  };

  const handleResetToCurrentPeriods = () => {
    const currentPeriods = {
      yearly: getCurrentPeriod("yearly"),
      quarterly: getCurrentPeriod("quarterly") as { year: number; quarter: number },
      monthly: getCurrentPeriod("monthly") as { year: number; month: number },
      weekly: getCurrentPeriod("weekly") as { year: number; week: number },
    };
    setSelectedPeriods(currentPeriods);
  };

  const isShowingCurrentPeriods = () => {
    const current = {
      yearly: getCurrentPeriod("yearly"),
      quarterly: getCurrentPeriod("quarterly"),
      monthly: getCurrentPeriod("monthly"),
      weekly: getCurrentPeriod("weekly"),
    };

    return (
      selectedPeriods.yearly.year === current.yearly.year &&
      selectedPeriods.quarterly.year === current.quarterly.year &&
      selectedPeriods.quarterly.quarter === current.quarterly.quarter &&
      selectedPeriods.monthly.year === current.monthly.year &&
      selectedPeriods.monthly.month === current.monthly.month &&
      selectedPeriods.weekly.year === current.weekly.year &&
      selectedPeriods.weekly.week === current.weekly.week
    );
  };

  // Always show the dashboard

  return (
    <div className="max-w-6xl mx-auto p-2 sm:p-4 md:p-6">
      {/* Header with Gradient */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-700 dark:via-teal-700 dark:to-cyan-700 rounded-2xl p-4 md:p-6 mb-4 md:mb-6 shadow-2xl"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-white">
            <h2 className="text-2xl md:text-3xl font-black mb-1 flex items-center gap-3">
              <span className="text-2xl md:text-3xl">🎯</span>
              All Goals
            </h2>
            <p className="text-sm md:text-base opacity-90">
              {Object.values(goalsByPeriod).flat().length} goal{Object.values(goalsByPeriod).flat().length !== 1 ? "s" : ""} · Track your progress
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <motion.button
              onClick={() => setShowArchived(!showArchived)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm rounded-xl font-bold shadow-lg transition-all duration-300 ${
                showArchived
                  ? "bg-white dark:bg-gray-200 text-purple-600 dark:text-purple-700 hover:shadow-xl"
                  : "bg-white/20 dark:bg-white/10 text-white hover:bg-white/30 dark:hover:bg-white/20"
              }`}
              title="Toggle archived goals"
            >
              📦 Archive {(() => {
                const totalArchived = Object.values(archivedGoals).reduce((sum, period) =>
                  sum + period.completed.length + period.failed.length, 0
                );
                return totalArchived > 0 ? `(${totalArchived})` : '';
              })()}
            </motion.button>
            <motion.button
              onClick={() => setShowCalendar(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm bg-white/20 dark:bg-white/10 text-white rounded-xl hover:bg-white/30 dark:hover:bg-white/20 transition-all duration-300 font-bold shadow-lg"
            >
              📅 Select Period
            </motion.button>
            {!isShowingCurrentPeriods() && (
              <motion.button
                onClick={handleResetToCurrentPeriods}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm bg-white/20 dark:bg-white/10 text-white rounded-xl hover:bg-white/30 dark:hover:bg-white/20 transition-all duration-300 font-bold shadow-lg"
                title="Reset to current periods"
              >
                🔄 Current
              </motion.button>
            )}
            <motion.button
              onClick={() => {
                console.log("➕ Add Goal button clicked (header)");
                handleAddGoal();
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm bg-white dark:bg-gray-100 text-emerald-600 dark:text-emerald-700 rounded-xl hover:shadow-2xl transition-all duration-300 font-black shadow-lg"
            >
              ➕ Add Goal
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="bg-card dark:bg-card rounded-2xl shadow-xl border border-border dark:border-border p-4 md:p-6"
      >
        {error && (
          <div className="mb-4 p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/40 dark:to-orange-950/40 border-2 border-red-300 dark:border-red-700 rounded-xl shadow-lg">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm md:text-base text-red-800 dark:text-red-300 font-semibold mb-2">{error}</p>
                {error.includes("database") && (
                  <button
                    onClick={() => window.location.reload()}
                    className="px-3 py-1 bg-destructive text-destructive-foreground text-sm rounded hover:bg-destructive/90 transition-colors"
                  >
                    Refresh Page
                  </button>
                )}
                {error.includes("Failed to initialize") && (
                  <button
                    onClick={async () => {
                      try {
                        await migrateDatabase();
                        setError(null);
                        window.location.reload();
                      } catch {
                        setError("Migration failed. Please clear browser data and refresh.");
                      }
                    }}
                    className="px-3 py-1 bg-primary text-primary-foreground text-sm rounded hover:bg-primary/90 transition-colors ml-2"
                  >
                    Retry Migration
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-200 dark:border-emerald-800 border-t-emerald-600 dark:border-t-emerald-400 mb-6"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl">🎯</span>
              </div>
            </div>
            <p className="text-base md:text-lg text-muted-foreground font-semibold">Loading Goals...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Period indicators */}
            {!isShowingCurrentPeriods() && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border-2 border-blue-200 dark:border-blue-800 shadow-lg"
              >
                <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                  <div className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">Year</div>
                  <div className="text-lg font-black text-foreground">{selectedPeriods.yearly.year}</div>
                </div>
                <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                  <div className="text-xs font-bold text-purple-600 dark:text-purple-400 mb-1">Quarter</div>
                  <div className="text-lg font-black text-foreground">Q{selectedPeriods.quarterly.quarter} {selectedPeriods.quarterly.year}</div>
                </div>
                <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                  <div className="text-xs font-bold text-pink-600 dark:text-pink-400 mb-1">Month</div>
                  <div className="text-sm font-black text-foreground">
                    {formatPeriodLabel("monthly", selectedPeriods.monthly.year, undefined, selectedPeriods.monthly.month)}
                  </div>
                </div>
                <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                  <div className="text-xs font-bold text-teal-600 dark:text-teal-400 mb-1">Week</div>
                  <div className="text-lg font-black text-foreground">W{selectedPeriods.weekly.week} {selectedPeriods.weekly.year}</div>
                </div>
              </motion.div>
            )}

            {/* Archived Goals Section */}
            {showArchived ? (
              <div className="space-y-6">
                {Object.entries(archivedGoals).map(([periodType, goals]) => {
                  const type = periodType as GoalType;
                  const period = selectedPeriods[type];
                  const quarter = 'quarter' in period ? period.quarter : undefined;
                  const month = 'month' in period ? period.month : undefined;
                  const week = 'week' in period ? period.week : undefined;

                  const hasCompleted = goals.completed.length > 0;
                  const hasFailed = goals.failed.length > 0;

                  // Skip if no archived goals for this period
                  if (!hasCompleted && !hasFailed) {
                    return null;
                  }

                  return (
                    <div key={periodType}>
                      <h3 className="text-lg md:text-xl font-black text-transparent bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400 bg-clip-text mb-4 capitalize flex items-center gap-2">
                        <span>📊</span>
                        {periodType} Goals
                        <span className="ml-2 text-xs md:text-sm font-bold text-muted-foreground">
                          ({formatPeriodLabel(type, period.year, quarter, month, week)})
                        </span>
                      </h3>

                      {/* Completed goals for this period */}
                      {hasCompleted && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-card-foreground mb-2 flex items-center gap-2">
                            <span className="text-lg">✅</span>
                            Completed ({goals.completed.length})
                          </h4>
                          <div className="space-y-2">
                            <AnimatePresence>
                              {goals.completed.map((goal) => (
                                <GoalCard
                                  key={goal.id}
                                  goal={goal}
                                  onUpdate={handleSaveGoal}
                                  onDelete={handleDeleteGoal}
                                  onEdit={handleEditGoal}
                                />
                              ))}
                            </AnimatePresence>
                          </div>
                        </div>
                      )}

                      {/* Failed goals for this period */}
                      {hasFailed && (
                        <div>
                          <h4 className="text-sm font-medium text-card-foreground mb-2 flex items-center gap-2">
                            <span className="text-lg">❌</span>
                            Failed ({goals.failed.length})
                          </h4>
                          <div className="space-y-2">
                            <AnimatePresence>
                              {goals.failed.map((goal) => (
                                <GoalCard
                                  key={goal.id}
                                  goal={goal}
                                  onUpdate={handleSaveGoal}
                                  onDelete={handleDeleteGoal}
                                  onEdit={handleEditGoal}
                                />
                              ))}
                            </AnimatePresence>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Show message if no archived goals at all */}
                {Object.values(archivedGoals).every(period => period.completed.length === 0 && period.failed.length === 0) && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-16"
                  >
                    <div className="text-6xl md:text-7xl mb-6 opacity-40">📦</div>
                    <h3 className="text-xl md:text-2xl font-black text-foreground mb-3">No archived goals</h3>
                    <p className="text-base md:text-lg text-muted-foreground max-w-md mx-auto">
                      Completed or failed goals for the selected periods will appear here
                    </p>
                  </motion.div>
                )}
              </div>
            ) : (
              <>
            {Object.entries(goalsByPeriod).map(([periodType, goals]) => {
              const type = periodType as GoalType;
              const period = selectedPeriods[type];
              const quarter = 'quarter' in period ? period.quarter : undefined;
              const month = 'month' in period ? period.month : undefined;
              const week = 'week' in period ? period.week : undefined;

              return (
                <div key={periodType}>
                  <h3 className="text-lg md:text-xl font-black text-transparent bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400 bg-clip-text mb-4 capitalize flex items-center gap-2">
                    <span>🎯</span>
                    {periodType} Goals
                    <span className="ml-2 text-xs md:text-sm font-bold text-muted-foreground">
                      ({formatPeriodLabel(type, period.year, quarter, month, week)})
                    </span>
                  </h3>
                  {goals.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No {periodType} goals set</p>
                  ) : (
                    <div className="space-y-3">
                      <AnimatePresence>
                        {goals.map((goal) => (
                          <GoalCard
                            key={goal.id}
                            goal={goal}
                            onUpdate={handleSaveGoal}
                            onDelete={handleDeleteGoal}
                            onEdit={handleEditGoal}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              );
            })}
            {Object.values(goalsByPeriod).every(goals => goals.length === 0) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16"
              >
                <div className="text-6xl md:text-7xl mb-6 opacity-50">🎯</div>
                <h3 className="text-2xl md:text-3xl font-black text-foreground mb-3">No goals yet</h3>
                <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-md mx-auto">
                  Set your first goal to start tracking progress
                </p>
                <motion.button
                  onClick={() => {
                    console.log("Add Your First Goal button clicked (empty state)");
                    handleAddGoal();
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-700 dark:to-teal-700 text-white font-black rounded-xl hover:shadow-2xl transition-all duration-300 shadow-lg"
                >
                  ✨ Add Your First Goal
                </motion.button>
              </motion.div>
            )}
            </>
            )}
          </div>
        )}
      </motion.div>

      {/* Modals */}
      {showCalendar && (
        <GoalCalendar
          onPeriodSelect={handlePeriodSelect}
          onClose={() => setShowCalendar(false)}
        />
      )}

      {showForm && (
        <GoalForm
          goal={editingGoal}
          onSave={handleSaveGoal}
          onCancel={handleCloseForm}
          userId={userId}
          currentPeriod={selectedPeriod || undefined}
        />
      )}
    </div>
  );
}