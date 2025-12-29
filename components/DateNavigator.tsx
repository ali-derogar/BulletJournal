"use client";

import { motion } from "framer-motion";
import { formatDate, addDays, parseDate } from "@/utils/date";

interface DateNavigatorProps {
  currentDate: string;
  onDateChange: (date: string) => void;
  onOpenCalendar: () => void;
}

export default function DateNavigator({
  currentDate,
  onDateChange,
  onOpenCalendar,
}: DateNavigatorProps) {
  const handlePrevDay = () => {
    onDateChange(addDays(currentDate, -1));
  };

  const handleNextDay = () => {
    onDateChange(addDays(currentDate, 1));
  };

  const handleToday = () => {
    onDateChange(formatDate(new Date()));
  };

  const formatDisplayDate = (dateString: string): string => {
    const date = parseDate(dateString);
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return date.toLocaleDateString("en-US", options);
  };

  const isToday = currentDate === formatDate(new Date());

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, type: "spring" }}
      className="relative overflow-hidden bg-gradient-to-br from-card via-card to-card/95 backdrop-blur-lg border-b-2 border-primary/20 shadow-xl"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-purple-500/5 to-pink-500/5"></div>
      <div className="relative max-w-4xl mx-auto flex items-center justify-between gap-2 sm:gap-4 p-3 sm:p-4">
        <motion.button
          onClick={handlePrevDay}
          whileHover={{ scale: 1.05, x: -2 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Previous day"
          className="group relative px-3 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-secondary to-secondary/80 hover:from-primary hover:to-purple-600 rounded-xl font-bold text-secondary-foreground hover:text-white shadow-lg hover:shadow-primary/50 transition-all duration-300 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
          <span className="relative flex items-center gap-1 sm:gap-2">
            <motion.span
              animate={{ x: [-2, 2, -2] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              ←
            </motion.span>
            <span className="hidden sm:inline">Prev</span>
          </span>
        </motion.button>

        <div className="flex flex-col items-center gap-1 sm:gap-2 flex-1 min-w-0">
          <motion.button
            onClick={onOpenCalendar}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            aria-label="Open calendar"
            className="group relative px-3 sm:px-6 py-2 bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 hover:from-primary/20 hover:via-purple-500/20 hover:to-pink-500/20 rounded-2xl border border-primary/30 hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-xl w-full"
          >
            <div className="flex items-center justify-center gap-2">
              <motion.svg
                className="w-4 h-4 sm:w-5 sm:h-5 text-primary hidden sm:block"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                whileHover={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5 }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </motion.svg>
              <span className="text-base sm:text-lg font-bold bg-gradient-to-r from-primary via-purple-600 to-pink-600 bg-clip-text text-transparent truncate">
                {formatDisplayDate(currentDate)}
              </span>
            </div>
          </motion.button>
          <motion.button
            onClick={handleToday}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Go to today"
            disabled={isToday}
            className={`relative px-3 sm:px-4 py-1 rounded-full text-xs sm:text-sm font-bold transition-all duration-300 ${isToday
              ? "bg-green-500/20 text-green-600 cursor-not-allowed"
              : "bg-gradient-to-r from-primary to-purple-600 text-white hover:shadow-lg hover:shadow-primary/50"
              }`}
          >
            {isToday ? (
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                You are here
              </span>
            ) : (
              "Jump to Today"
            )}
          </motion.button>
        </div>

        <motion.button
          onClick={handleNextDay}
          whileHover={{ scale: 1.05, x: 2 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Next day"
          className="group relative px-3 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-secondary to-secondary/80 hover:from-primary hover:to-purple-600 rounded-xl font-bold text-secondary-foreground hover:text-white shadow-lg hover:shadow-primary/50 transition-all duration-300 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
          <span className="relative flex items-center gap-1 sm:gap-2">
            <span className="hidden sm:inline">Next</span>
            <motion.span
              animate={{ x: [-2, 2, -2] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              →
            </motion.span>
          </span>
        </motion.button>
      </div>
    </motion.div>
  );
}
