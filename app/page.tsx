                                                                                                                                                                                                            "use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDate } from "@/app/context/DateContext";
import { useUser } from "@/app/context/UserContext";
import DateNavigator from "@/components/DateNavigator";
import Calendar from "@/components/Calendar";
import DayView from "@/components/DayView";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import GoalDashboard from "@/components/GoalDashboard";
import PersianCalendar from "@/components/PersianCalendar";
import InstallPrompt from "@/components/InstallPrompt";
import BackupRestore from "@/components/BackupRestore";
import OfflineIndicator from "@/components/OfflineIndicator";
import AuthButton from "@/components/AuthButton";
import UploadDownloadButtons from "@/components/UploadDownloadButtons";
import ThemeToggle from "@/components/ThemeToggle";
import LoginPage from "@/components/LoginPage";
import AIChat from "@/components/AIChat";
import InstallButton from "@/components/InstallButton";

export default function Home() {
  const { currentDate, setCurrentDate } = useDate();
  const { currentUser } = useUser();
  const userId = currentUser?.id || "default";
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentView, setCurrentView] = useState<'daily' | 'analytics' | 'goals' | 'calendar' | 'ai' | 'login'>('daily');

  return (
    <div className="min-h-screen bg-background isolation-auto">
      <OfflineIndicator />

      {/* Header with Auth - Enhanced with animations */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="bg-gradient-to-r from-card via-card to-card shadow-lg border-b-2 border-primary/20 px-2 sm:px-4 py-3 backdrop-blur-sm bg-card/95 relative z-[60]"
      >
        <div className="max-w-4xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex items-center justify-center sm:justify-start gap-2 sm:gap-4 min-w-0 flex-1"
          >
            <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-primary via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Bullet Journal
            </h1>
            {currentUser && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                className="hidden sm:flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/30 rounded-full min-w-0 shadow-sm hover:shadow-md transition-all hover:scale-105"
              >
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
              </motion.div>
            )}
          </motion.div>
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex flex-wrap items-center justify-center sm:justify-end gap-2 sm:gap-3"
          >
            <ThemeToggle />
            <InstallButton />
            <UploadDownloadButtons />
            <AuthButton />
          </motion.div>
        </div>
      </motion.div>


      <AnimatePresence mode="wait">
        {currentView === 'daily' ? (
          <motion.div
            key="daily"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <DateNavigator
              currentDate={currentDate}
              onDateChange={setCurrentDate}
              onOpenCalendar={() => setShowCalendar(true)}
            />

            <DayView date={currentDate} />

            <AnimatePresence>
              {showCalendar && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Calendar
                    currentDate={currentDate}
                    onDateSelect={setCurrentDate}
                    onClose={() => setShowCalendar(false)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : currentView === 'analytics' ? (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <AnalyticsDashboard />
          </motion.div>
        ) : currentView === 'goals' ? (
          <motion.div
            key="goals"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <GoalDashboard />
          </motion.div>
        ) : currentView === 'ai' ? (
          <motion.div
            key="ai"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            {currentUser ? (
              <AIChat userId={userId} isFullScreen={true} />
            ) : (
              <div className="max-w-4xl mx-auto p-8 text-center">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="bg-card rounded-2xl p-12 shadow-lg border border-border"
                >
                  <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12,2C6.477,2,2,6.477,2,12c0,4.418,2.865,8.166,6.839,9.489c0.111,0.02,0.211-0.052,0.228-0.162 c0.017-0.109-0.047-0.216-0.155-0.246C6.18,19.344,4,16.488,4,13.25c0-4.005,3.245-7.25,7.25-7.25c4.005,0,7.25,3.245,7.25,7.25 c0,3.238-2.18,6.094-4.912,6.831c-0.108,0.03-0.172,0.137-0.155,0.246c0.017,0.11,0.117,0.182,0.228,0.162 C19.135,20.166,22,16.418,22,12C22,6.477,17.523,2,12,2z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-4">AI Assistant</h2>
                  <p className="text-muted-foreground mb-6">
                    برای استفاده از دستیار هوش مصنوعی، لطفاً وارد شوید
                    <br />
                    Please login to use the AI Assistant
                  </p>
                  <button
                    onClick={() => setCurrentView('login')}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                  >
                    ورود / Login
                  </button>
                </motion.div>
              </div>
            )}
          </motion.div>
        ) : currentView === 'login' ? (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <LoginPage />
          </motion.div>
        ) : (
          <motion.div
            key="calendar"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3 }}
          >
            <PersianCalendar userId={userId} />
          </motion.div>
        )}
      </AnimatePresence>

      <InstallPrompt />
      <BackupRestore />

      {/* Footer Navigation - Enhanced with glass effect and animations */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5, type: "spring" }}
        className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-card/98 via-card/95 to-card/90 backdrop-blur-xl border-t-2 border-primary/20 shadow-2xl z-40 pb-safe"
      >
        <div className="max-w-4xl mx-auto px-2 sm:px-4 py-2 sm:py-3">
          <div className="flex justify-around items-center relative">
            {/* Active indicator */}
            <motion.div
              layoutId="activeTab"
              className="absolute h-1 bg-gradient-to-r from-primary via-purple-600 to-pink-600 rounded-full top-0"
              style={{
                width: '20%',
                left: currentView === 'daily' ? '0%' :
                  currentView === 'analytics' ? '20%' :
                    currentView === 'goals' ? '40%' :
                      currentView === 'ai' ? '60%' : '80%'
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />

            <motion.button
              onClick={() => setCurrentView('daily')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-300 min-w-0 flex-1 ${currentView === 'daily'
                ? 'bg-gradient-to-br from-primary/20 to-purple-500/20 text-primary scale-105 shadow-lg'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
            >
              <motion.svg
                className="w-5 h-5 sm:w-6 sm:h-6 mb-0.5 sm:mb-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                animate={{ rotate: currentView === 'daily' ? [0, -10, 10, 0] : 0 }}
                transition={{ duration: 0.5 }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </motion.svg>
              <span className="text-[10px] sm:text-xs font-bold">Daily</span>
            </motion.button>

            <motion.button
              onClick={() => setCurrentView('analytics')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-300 min-w-0 flex-1 ${currentView === 'analytics'
                ? 'bg-gradient-to-br from-primary/20 to-purple-500/20 text-primary scale-105 shadow-lg'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
            >
              <motion.svg
                className="w-5 h-5 sm:w-6 sm:h-6 mb-0.5 sm:mb-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                animate={{ y: currentView === 'analytics' ? [-2, 2, -2, 0] : 0 }}
                transition={{ duration: 0.5 }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </motion.svg>
              <span className="text-[10px] sm:text-xs font-bold">Analytics</span>
            </motion.button>

            <motion.button
              onClick={() => setCurrentView('goals')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-300 min-w-0 flex-1 ${currentView === 'goals'
                ? 'bg-gradient-to-br from-primary/20 to-purple-500/20 text-primary scale-105 shadow-lg'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
            >
              <motion.svg
                className="w-5 h-5 sm:w-6 sm:h-6 mb-0.5 sm:mb-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                animate={{ scale: currentView === 'goals' ? [1, 1.2, 1] : 1 }}
                transition={{ duration: 0.5 }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </motion.svg>
              <span className="text-[10px] sm:text-xs font-bold">Goals</span>
            </motion.button>

            <motion.button
              onClick={() => setCurrentView('ai')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-300 min-w-0 flex-1 relative ${currentView === 'ai'
                ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-600 dark:text-indigo-400 scale-105 shadow-lg'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
            >
              {currentUser && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"
                />
              )}
              <motion.svg
                className="w-5 h-5 sm:w-6 sm:h-6 mb-0.5 sm:mb-1"
                fill="currentColor"
                viewBox="0 0 24 24"
                animate={{
                  rotate: currentView === 'ai' ? 360 : 0,
                  scale: currentView === 'ai' ? [1, 1.1, 1] : 1
                }}
                transition={{ duration: currentView === 'ai' ? 2 : 0.5, repeat: currentView === 'ai' ? Infinity : 0, ease: "linear" }}
              >
                <path d="M12,2C6.477,2,2,6.477,2,12c0,4.418,2.865,8.166,6.839,9.489c0.111,0.02,0.211-0.052,0.228-0.162 c0.017-0.109-0.047-0.216-0.155-0.246C6.18,19.344,4,16.488,4,13.25c0-4.005,3.245-7.25,7.25-7.25c4.005,0,7.25,3.245,7.25,7.25 c0,3.238-2.18,6.094-4.912,6.831c-0.108,0.03-0.172,0.137-0.155,0.246c0.017,0.11,0.117,0.182,0.228,0.162 C19.135,20.166,22,16.418,22,12C22,6.477,17.523,2,12,2z" />
              </motion.svg>
              <span className="text-[10px] sm:text-xs font-bold">AI</span>
            </motion.button>

            <motion.button
              onClick={() => setCurrentView('calendar')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-300 min-w-0 flex-1 ${currentView === 'calendar'
                ? 'bg-gradient-to-br from-primary/20 to-purple-500/20 text-primary scale-105 shadow-lg'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
            >
              <motion.svg
                className="w-5 h-5 sm:w-6 sm:h-6 mb-0.5 sm:mb-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                animate={{ rotate: currentView === 'calendar' ? [0, 5, -5, 0] : 0 }}
                transition={{ duration: 0.5 }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </motion.svg>
              <span className="text-[10px] sm:text-xs font-bold">Calendar</span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Add padding to account for fixed footer */}
      <div className="pb-24"></div>
    </div>
  );
}
