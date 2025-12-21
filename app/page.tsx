"use client";

import { useState } from "react";
import { useDate } from "@/app/context/DateContext";
import { useUser } from "@/app/context/UserContext";
import DateNavigator from "@/components/DateNavigator";
import Calendar from "@/components/Calendar";
import DayView from "@/components/DayView";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import InstallPrompt from "@/components/InstallPrompt";
import BackupRestore from "@/components/BackupRestore";
import OfflineIndicator from "@/components/OfflineIndicator";
import UserSwitcher from "@/components/UserSwitcher";
import UserManagement from "@/components/UserManagement";
import AuthButton from "@/components/AuthButton";
import SyncButtonEnhanced from "@/components/SyncButtonEnhanced";
import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  const { currentDate, setCurrentDate } = useDate();
  const { currentUser } = useUser();
  const userId = currentUser?.id || "default";
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentView, setCurrentView] = useState<'daily' | 'analytics'>('daily');

  return (
    <div className="min-h-screen bg-background">
      <OfflineIndicator />

      {/* Header with Auth */}
      <div className="bg-card shadow-sm border-b border-border px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-foreground">Bullet Journal</h1>
            {currentUser && (
              <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
                <svg
                  className="w-4 h-4 text-primary"
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
                  {currentUser.name}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* View Switcher */}
            <div className="flex bg-secondary rounded-lg p-1">
              <button
                onClick={() => setCurrentView('daily')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  currentView === 'daily'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Daily
              </button>
              <button
                onClick={() => setCurrentView('analytics')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  currentView === 'analytics'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Analytics
              </button>
            </div>
            <ThemeToggle />
            <SyncButtonEnhanced />
            <UserSwitcher />
            <AuthButton />
          </div>
        </div>
      </div>

      {/* User Management */}
      <details className="max-w-4xl mx-auto px-4 py-2">
        <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground font-medium">
          User Management
        </summary>
        <div className="mt-2">
          <UserManagement />
        </div>
      </details>

      {currentView === 'daily' ? (
        <>
          <DateNavigator
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            onOpenCalendar={() => setShowCalendar(true)}
            userId={userId}
          />

          <DayView date={currentDate} />

          {showCalendar && (
            <Calendar
              currentDate={currentDate}
              onDateSelect={setCurrentDate}
              onClose={() => setShowCalendar(false)}
            />
          )}
        </>
      ) : (
        <AnalyticsDashboard />
      )}

      <InstallPrompt />
      <BackupRestore />
    </div>
  );
}
