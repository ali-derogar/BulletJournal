"use client";

import { formatDate, addDays, parseDate } from "@/utils/date";
import ExportButton from "./ExportButton";

interface DateNavigatorProps {
  currentDate: string;
  onDateChange: (date: string) => void;
  onOpenCalendar: () => void;
  userId: string;
}

export default function DateNavigator({
  currentDate,
  onDateChange,
  onOpenCalendar,
  userId,
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

  return (
    <div className="border-b border-border bg-card">
      <div className="flex items-center justify-between gap-4 p-4">
        <button
          onClick={handlePrevDay}
          aria-label="Previous day"
          className="px-4 py-2 bg-secondary hover:bg-secondary/80 rounded font-medium text-secondary-foreground"
        >
          ← Prev
        </button>

        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onOpenCalendar}
            aria-label="Open calendar"
            className="text-lg font-semibold hover:text-primary text-card-foreground"
          >
            {formatDisplayDate(currentDate)}
          </button>
          <button
            onClick={handleToday}
            aria-label="Go to today"
            className="text-sm text-primary hover:text-primary/80 hover:underline font-medium"
          >
            Today
          </button>
        </div>

        <button
          onClick={handleNextDay}
          aria-label="Next day"
          className="px-4 py-2 bg-secondary hover:bg-secondary/80 rounded font-medium text-secondary-foreground"
        >
          Next →
        </button>
      </div>

      <div className="px-4 pb-4">
        <ExportButton date={currentDate} userId={userId} />
      </div>
    </div>
  );
}
