"use client";

import { useState, useEffect, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatDate, getMonthCalendarDays, isToday, isFuture, isPast } from "@/utils/date";

interface CalendarProps {
  currentDate: string;
  onDateSelect: (date: string) => void;
  onClose: () => void;
}

export default function Calendar({
  currentDate,
  onDateSelect,
  onClose,
}: CalendarProps) {
  const t = useTranslations();
  const locale = useLocale();
  const localeTag = locale === "fa" ? "fa-IR" : "en-US";
  const current = new Date(currentDate);
  const [viewYear, setViewYear] = useState(current.getFullYear());
  const [viewMonth, setViewMonth] = useState(current.getMonth());

  const monthName = useMemo(() => {
    return new Intl.DateTimeFormat(localeTag, { month: "long" }).format(
      new Date(viewYear, viewMonth, 1)
    );
  }, [localeTag, viewMonth, viewYear]);

  const dayNames = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(localeTag, { weekday: "short" });
    const base = new Date(2020, 5, 7); // Sunday
    return Array.from({ length: 7 }, (_, i) =>
      formatter.format(new Date(base.getFullYear(), base.getMonth(), base.getDate() + i))
    );
  }, [localeTag]);

  const days = getMonthCalendarDays(viewYear, viewMonth);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        handlePrevMonth();
      } else if (e.key === "ArrowRight") {
        handleNextMonth();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewYear, viewMonth, onClose]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleDateClick = (date: Date) => {
    onDateSelect(formatDate(date));
    onClose();
  };

  const getDayClassName = (date: Date): string => {
    const dateString = formatDate(date);
    const isCurrentMonth = date.getMonth() === viewMonth;
    const isSelected = dateString === currentDate;
    const isTodayDate = isToday(dateString);
    const isFutureDate = isFuture(dateString);
    const isPastDate = isPast(dateString);

    let className = "w-10 h-10 flex items-center justify-center rounded cursor-pointer ";

    if (!isCurrentMonth) {
      className += "text-gray-400 ";
    }

    if (isSelected) {
      className += "bg-blue-600 text-white font-bold ";
    } else if (isTodayDate) {
      className += "bg-blue-100 text-blue-800 font-semibold ";
    } else if (isFutureDate) {
      className += "text-gray-500 hover:bg-gray-100 ";
    } else if (isPastDate) {
      className += "text-gray-700 hover:bg-gray-100 ";
    } else {
      className += "hover:bg-gray-100 ";
    }

    return className;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg shadow-xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handlePrevMonth}
            className="px-3 py-1 hover:bg-muted rounded text-card-foreground"
          >
            ←
          </button>
          <h2 className="text-xl font-bold text-card-foreground">
            {monthName} {viewYear}
          </h2>
          <button
            onClick={handleNextMonth}
            className="px-3 py-1 hover:bg-muted rounded text-card-foreground"
          >
            →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((day) => (
            <div
              key={day}
              className="w-10 h-10 flex items-center justify-center text-sm font-semibold text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((date, index) => (
            <div
              key={index}
              onClick={() => handleDateClick(date)}
              className={getDayClassName(date)}
            >
              {date.getDate()}
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded"
          >
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
