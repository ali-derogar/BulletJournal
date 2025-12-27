"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import DailyInputs from "./DailyInputs";
import Tasks from "./Tasks";
import TaskDashboard from "./TaskDashboard";
import ExpenseList from "./ExpenseList";
import Reflection from "./Reflection";
import { useUser } from "@/app/context/UserContext";

interface DayViewProps {
  date: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0, scale: 0.95 },
  visible: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 12
    }
  }
};

export default function DayView({ date }: DayViewProps) {
  const { currentUser } = useUser();
  const userId = currentUser?.id || "default";
  const [useDashboard, setUseDashboard] = useState(false);

  return (
    <motion.div
      className="space-y-6 px-2 sm:px-4 max-w-4xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* User Data Indicator - Enhanced */}
      {currentUser && (
        <motion.div
          variants={itemVariants}
          whileHover={{ scale: 1.02, y: -2 }}
          className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-purple-500/20 to-pink-500/20 backdrop-blur-sm border-2 border-primary/30 rounded-2xl p-4 shadow-xl hover:shadow-2xl transition-all duration-300"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-purple-500/10 animate-pulse"></div>
          <div className="relative flex items-center gap-3">
            <motion.div
              animate={{
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 3
              }}
              className="p-2 bg-gradient-to-br from-primary to-purple-600 rounded-xl shadow-lg"
            >
              <svg
                className="w-6 h-6 text-white"
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
            </motion.div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Currently viewing</p>
              <p className="text-lg font-bold bg-gradient-to-r from-primary via-purple-600 to-pink-600 bg-clip-text text-transparent">
                {currentUser.name}&apos;s Journal
              </p>
            </div>
            <motion.div
              className="ml-auto"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              ✨
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Task View Toggle - Enhanced */}
      <motion.div
        variants={itemVariants}
        whileHover={{ scale: 1.01, y: -2 }}
        className="relative overflow-hidden bg-gradient-to-br from-card via-card to-card/90 backdrop-blur-md border border-primary/20 rounded-2xl p-5 shadow-xl hover:shadow-2xl transition-all duration-300"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.6 }}
              className="p-3 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-xl"
            >
              <svg
                className="w-6 h-6 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </motion.div>
            <div>
              <h3 className="font-bold text-lg bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Task View Mode
              </h3>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                {useDashboard ? (
                  <>
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Dashboard - Full detailed view
                  </>
                ) : (
                  <>
                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                    Compact - Quick inline view
                  </>
                )}
              </p>
            </div>
          </div>
          <motion.button
            onClick={() => setUseDashboard(!useDashboard)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-6 py-3 rounded-xl font-bold shadow-lg transition-all duration-300 ${
              useDashboard
                ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-green-500/50"
                : "bg-gradient-to-r from-primary to-purple-600 text-white hover:shadow-primary/50"
            }`}
          >
            <span className="flex items-center gap-2">
              {useDashboard ? "📊 Dashboard" : "📋 Compact"}
              <motion.span
                animate={{ x: [0, 3, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                →
              </motion.span>
            </span>
          </motion.button>
        </div>
      </motion.div>

      {/* Conditional Task View with Animation */}
      <motion.div variants={itemVariants}>
        {useDashboard ? (
          <TaskDashboard date={date} userId={userId} />
        ) : (
          <Tasks date={date} userId={userId} />
        )}
      </motion.div>

      <motion.div variants={itemVariants}>
        <ExpenseList date={date} userId={userId} />
      </motion.div>

      <motion.div variants={itemVariants}>
        <DailyInputs date={date} userId={userId} />
      </motion.div>

      <motion.div variants={itemVariants}>
        <Reflection date={date} userId={userId} />
      </motion.div>
    </motion.div>
  );
}
