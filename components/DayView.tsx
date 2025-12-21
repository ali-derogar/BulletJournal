"use client";

import { useState } from "react";
import DailyInputs from "./DailyInputs";
import Tasks from "./Tasks";
import TaskDashboard from "./TaskDashboard";
import ExpenseList from "./ExpenseList";
import Reflection from "./Reflection";
import GoalDashboard from "./GoalDashboard";
import { useUser } from "@/app/context/UserContext";

interface DayViewProps {
  date: string;
}

export default function DayView({ date }: DayViewProps) {
  const { currentUser } = useUser();
  const userId = currentUser?.id || "default";
  const [useDashboard, setUseDashboard] = useState(false);
  const [goalProgress, setGoalProgress] = useState(0.5); // 0-1, defaults to neutral

  return (
    <div className="space-y-4">
      {/* User Data Indicator */}
      {currentUser && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span className="text-sm font-medium text-primary">
              Viewing {currentUser.name}&apos;s journal
            </span>
          </div>
        </div>
      )}
      {/* Task View Toggle */}
      <div className="bg-card rounded-lg p-3 shadow flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-card-foreground">Task View</h3>
          <p className="text-xs text-muted-foreground">
            {useDashboard
              ? "Dashboard view with full details"
              : "Compact view with inline controls"}
          </p>
        </div>
        <button
          onClick={() => setUseDashboard(!useDashboard)}
          className={`px-4 py-2 rounded font-medium transition-colors ${
            useDashboard
              ? "bg-accent text-accent-foreground hover:bg-accent/90"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
        >
          {useDashboard ? "📊 Dashboard View" : "📋 Switch to Dashboard"}
        </button>
      </div>

      {/* Conditional Task View */}
      {useDashboard ? (
        <TaskDashboard date={date} userId={userId} goalProgress={goalProgress} />
      ) : (
        <Tasks date={date} userId={userId} />
      )}

      <GoalDashboard onGoalProgressUpdate={setGoalProgress} />
      <ExpenseList date={date} userId={userId} />
      <DailyInputs date={date} userId={userId} />
      <Reflection date={date} userId={userId} />
    </div>
  );
}
