"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import type { GoalType } from "@/domain";

interface GoalCalendarProps {
  onPeriodSelect: (type: GoalType, year: number, quarter?: number, month?: number, week?: number) => void;
  onClose: () => void;
}

export default function GoalCalendar({ onPeriodSelect, onClose }: GoalCalendarProps) {
  const [view, setView] = useState<"year" | "month" | "week">("year");
  const [selectedYear, setSelectedYear] = useState(2024); // Initialize with a default year

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 2 + i);

  // Set selectedYear to current year after hydration
  useEffect(() => {
    setSelectedYear(new Date().getFullYear());
  }, []);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getWeeksInYear = (year: number): number[] => {
    const weeks: number[] = [];
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 7)) {
      const weekNum = Math.ceil((d.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
      if (!weeks.includes(weekNum)) {
        weeks.push(weekNum);
      }
    }
    return weeks.slice(0, 52); // Limit to 52 weeks
  };

  const handleYearSelect = (year: number) => {
    console.log("Year selected:", year);
    setSelectedYear(year);
    setView("month");
  };

  const handleMonthSelect = (monthIndex: number) => {
    console.log("Month selected:", monthIndex + 1);
    onPeriodSelect("monthly", selectedYear, undefined, monthIndex + 1);
  };

  const handleQuarterSelect = (quarter: number) => {
    console.log("Quarter selected:", quarter);
    onPeriodSelect("quarterly", selectedYear, quarter);
  };

  const handleWeekSelect = (week: number) => {
    console.log("Week selected:", week);
    onPeriodSelect("weekly", selectedYear, undefined, undefined, week);
  };

  const handleYearlySelect = () => {
    console.log("Yearly goal selected for year:", selectedYear);
    onPeriodSelect("yearly", selectedYear);
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
            {view === "year" && "Select Year"}
            {view === "month" && `${selectedYear} - Select Period`}
            {view === "week" && `${selectedYear} - Select Week`}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {view === "year" && (
            <div className="grid grid-cols-3 gap-3">
              {years.map((year) => (
                <motion.button
                  key={year}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleYearSelect(year)}
                  className={`p-4 rounded-lg font-medium transition-colors ${
                    year === currentYear
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {year}
                </motion.button>
              ))}
            </div>
          )}

          {view === "month" && (
            <div className="space-y-4">
              {/* Yearly Goal */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleYearlySelect}
                className="w-full p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-medium hover:from-purple-600 hover:to-purple-700 transition-all"
              >
                📅 {selectedYear} Yearly Goals
              </motion.button>

              {/* Quarterly Goals */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Quarterly Goals</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((quarter) => (
                    <motion.button
                      key={quarter}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleQuarterSelect(quarter)}
                      className="p-3 bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200 transition-colors"
                    >
                      Q{quarter}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Monthly Goals */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Monthly Goals</h3>
                <div className="grid grid-cols-3 gap-2">
                  {months.map((month, index) => (
                    <motion.button
                      key={month}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleMonthSelect(index)}
                      className="p-2 text-sm bg-primary/10 text-primary rounded font-medium hover:bg-primary/20 transition-colors"
                    >
                      {month.slice(0, 3)}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Weekly Goals */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Weekly Goals</h3>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setView("week")}
                  className="w-full p-3 bg-orange-100 text-orange-700 rounded-lg font-medium hover:bg-orange-200 transition-colors"
                >
                  📅 Select Week
                </motion.button>
              </div>

              {/* Back to Year Selection */}
              <button
                onClick={() => setView("year")}
                className="w-full p-2 text-sm text-muted-foreground hover:text-card-foreground transition-colors"
              >
                ← Back to Year Selection
              </button>
            </div>
          )}

          {view === "week" && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2">
                {getWeeksInYear(selectedYear).map((week) => (
                  <motion.button
                    key={week}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleWeekSelect(week)}
                    className="p-3 bg-orange-100 text-orange-700 rounded-lg font-medium hover:bg-orange-200 transition-colors text-sm"
                  >
                    W{week}
                  </motion.button>
                ))}
              </div>

              <button
                onClick={() => setView("month")}
                className="w-full p-2 text-sm text-muted-foreground hover:text-card-foreground transition-colors"
              >
                ← Back to Period Selection
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}