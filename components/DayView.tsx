"use client";

import { motion } from "framer-motion";
import DailyInputs from "./DailyInputs";
import UnifiedTasks from "./UnifiedTasks";
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

      {/* Unified Task View - Dashboard Header + Efficient List */}
      <motion.div variants={itemVariants}>
        <UnifiedTasks date={date} userId={userId} />
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
