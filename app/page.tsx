"use client";

import { useState } from "react";
import { useDate } from "@/app/context/DateContext";
import { useUser } from "@/app/context/UserContext";
import DateNavigator from "@/components/DateNavigator";
import Calendar from "@/components/Calendar";
import DayView from "@/components/DayView";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import GoalDashboard from "@/components/GoalDashboard";
import InstallPrompt from "@/components/InstallPrompt";
import BackupRestore from "@/components/BackupRestore";
import OfflineIndicator from "@/components/OfflineIndicator";
import AuthButton from "@/components/AuthButton";
import UploadDownloadButtons from "@/components/UploadDownloadButtons";
import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  const { currentDate, setCurrentDate } = useDate();
  const { currentUser } = useUser();
  const userId = currentUser?.id || "default";
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentView, setCurrentView] = useState<'daily' | 'analytics' | 'goals'>('daily');

  return (
    <div className="min-h-screen bg-background">
      <OfflineIndicator />

      {/* Header with Auth */}
      <div className="bg-card shadow-sm border-b border-border px-2 sm:px-4 py-3">
        <div className="max-w-4xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-4 min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-bold text-foreground">Bullet Journal</h1>
            {currentUser && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full min-w-0">
                <svg
                  className="w-4 h-4 text-primary flex-shrink-0"
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
                <span className="text-sm font-medium text-primary truncate">
                  {currentUser.name}
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 sm:gap-3">
            <ThemeToggle />
            <UploadDownloadButtons />
            <AuthButton />
          </div>
        </div>
      </div>


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
      ) : currentView === 'analytics' ? (
        <AnalyticsDashboard />
      ) : (
        <GoalDashboard />
      )}

      <InstallPrompt />
      <BackupRestore />

      {/* Footer Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border shadow-2xl">
        <div className="max-w-4xl mx-auto px-4 py-2">
          <div className="flex justify-around items-center">
            <button
              onClick={() => setCurrentView('daily')}
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 min-w-0 flex-1 ${
                currentView === 'daily'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs font-medium">Daily</span>
            </button>
            <button
              onClick={() => setCurrentView('analytics')}
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 min-w-0 flex-1 ${
                currentView === 'analytics'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-xs font-medium">Analytics</span>
            </button>
            <button
              onClick={() => setCurrentView('goals')}
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 min-w-0 flex-1 ${
                currentView === 'goals'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-medium">Goals</span>
            </button>
          </div>
        </div>
      </div>

      {/* Add padding to account for fixed footer */}
      <div className="pb-24"></div>
    </div>
  );
}
