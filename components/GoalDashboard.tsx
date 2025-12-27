"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
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
    <div className="bg-card rounded-lg shadow border border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">
              All Goals
            </h2>
            <p className="text-sm text-muted-foreground">
              {Object.values(goalsByPeriod).flat().length} goal{Object.values(goalsByPeriod).flat().length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                showArchived
                  ? "bg-purple-500 text-white hover:bg-purple-600"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
              title="Toggle archived goals"
            >
              📦 Archive {(() => {
                const totalArchived = Object.values(archivedGoals).reduce((sum, period) =>
                  sum + period.completed.length + period.failed.length, 0
                );
                return totalArchived > 0 ? `(${totalArchived})` : '';
              })()}
            </button>
            <button
              onClick={() => setShowCalendar(true)}
              className="px-3 py-2 text-sm bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
            >
              📅 Select Period
            </button>
            {!isShowingCurrentPeriods() && (
              <button
                onClick={handleResetToCurrentPeriods}
                className="px-3 py-2 text-sm bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors"
                title="Reset to current periods"
              >
                🔄 Current
              </button>
            )}
            <button
              onClick={() => {
                console.log("➕ Add Goal button clicked (header)");
                handleAddGoal();
              }}
              className="px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              ➕ Add Goal
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-destructive mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-destructive mb-2">{error}</p>
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
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-sm text-muted-foreground">Loading Goals...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Period indicators */}
            {!isShowingCurrentPeriods() && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 bg-accent/20 rounded-lg border border-accent/30">
                <div className="text-xs">
                  <div className="text-muted-foreground">Year</div>
                  <div className="font-semibold text-card-foreground">{selectedPeriods.yearly.year}</div>
                </div>
                <div className="text-xs">
                  <div className="text-muted-foreground">Quarter</div>
                  <div className="font-semibold text-card-foreground">Q{selectedPeriods.quarterly.quarter} {selectedPeriods.quarterly.year}</div>
                </div>
                <div className="text-xs">
                  <div className="text-muted-foreground">Month</div>
                  <div className="font-semibold text-card-foreground">
                    {formatPeriodLabel("monthly", selectedPeriods.monthly.year, undefined, selectedPeriods.monthly.month)}
                  </div>
                </div>
                <div className="text-xs">
                  <div className="text-muted-foreground">Week</div>
                  <div className="font-semibold text-card-foreground">W{selectedPeriods.weekly.week} {selectedPeriods.weekly.year}</div>
                </div>
              </div>
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
                      <h3 className="text-md font-semibold text-card-foreground mb-3 capitalize">
                        {periodType} Goals
                        <span className="ml-2 text-xs text-muted-foreground">
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
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">📦</div>
                    <h3 className="text-lg font-medium text-card-foreground mb-2">No archived goals</h3>
                    <p className="text-muted-foreground">
                      Completed or failed goals for the selected periods will appear here
                    </p>
                  </div>
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
                  <h3 className="text-md font-semibold text-card-foreground mb-3 capitalize">
                    {periodType} Goals
                    <span className="ml-2 text-xs text-muted-foreground">
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
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🎯</div>
                <h3 className="text-lg font-medium text-card-foreground mb-2">No goals yet</h3>
                <p className="text-muted-foreground mb-6">
                  Set your first goal to start tracking progress
                </p>
                <button
                  onClick={() => {
                    console.log("Add Your First Goal button clicked (empty state)");
                    handleAddGoal();
                  }}
                  className="px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Add Your First Goal
                </button>
              </div>
            )}
            </>
            )}
          </div>
        )}
      </div>

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