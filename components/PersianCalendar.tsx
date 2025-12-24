"use client";

import { useState, useEffect } from "react";
import { toJalaali, jalaaliToDateObject, isValidJalaaliDate } from "jalaali-js";
import type { JalaaliDate } from "jalaali-js";
import { getCalendarNotes, saveCalendarNote, deleteCalendarNote } from "@/storage/calendar";
import type { CalendarNote } from "@/domain";


interface PersianCalendarProps {
  userId: string;
}

const persianMonths = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
];

const persianWeekdays = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"];

const getPersianWeekdayIndex = (gregorianDay: number): number => {
  // gregorianDay: 0=Sun, 1=Mon, ..., 6=Sat
  // Persian weekdays array: 0=Sat, 1=Sun, 2=Mon, ..., 6=Fri
  return (gregorianDay + 1) % 7;
};

interface HolidayData {
  date: string;
  title: string;
  holiday: boolean;
  description?: string;
}

export default function PersianCalendar({ userId }: PersianCalendarProps) {
  const now = new Date();
  const jNow = toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const [currentYear, setCurrentYear] = useState(jNow.jy);
  const [currentMonth, setCurrentMonth] = useState(jNow.jm);
  const [notes, setNotes] = useState<CalendarNote[]>([]);
  const [holidays, setHolidays] = useState<{ [key: string]: HolidayData }>({});
  const [selectedDay, setSelectedDay] = useState<JalaaliDate | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loadingHolidays, setLoadingHolidays] = useState(false);

  // Load notes and holidays from storage
  useEffect(() => {
    loadNotes();
    loadHolidaysForMonth(currentYear, currentMonth);
  }, [userId, currentYear, currentMonth]);

  const loadNotes = async () => {
    try {
      const data = await getCalendarNotes(userId);
      setNotes(data);
    } catch (error) {
      console.error("Failed to load calendar notes:", error);
    }
  };

  const loadHolidaysForMonth = async (year: number, month: number) => {
    const monthKey = `${year}-${month}`;
    setLoadingHolidays(true);
    try {
      const newHolidays: { [key: string]: HolidayData } = {};

      // NEW: Fetch all events for the month in one API call
      const response = await fetch(`/api/calendar/${year}/${month}/events`);

      if (response.ok) {
        const data = await response.json();

        // Process all events and store holidays
        for (const event of data.events) {
          // Extract day from jalali_date (format: YYYY-MM-DD)
          const dateParts = event.jalali_date.split('-');
          const day = parseInt(dateParts[2], 10);

          // Store holiday/event data
          const key = `${year}-${month}-${day}`;

          if (event.is_holiday) {
            newHolidays[key] = {
              date: event.jalali_date,
              title: event.title,
              holiday: true,
              description: event.description || ''
            };
          } else if (event.title) {
            // Store non-holiday events too
            newHolidays[key] = {
              date: event.jalali_date,
              title: event.title,
              holiday: false,
              description: event.description || ''
            };
          }
        }
      } else {
        console.warn(`Failed to fetch calendar events:`, response.status);
      }

      setHolidays(prev => ({ ...prev, ...newHolidays }));
    } catch (error) {
      console.error("Failed to load holidays:", error);
    } finally {
      setLoadingHolidays(false);
    }
  };

  const saveNotes = async (newNotes: CalendarNote[]) => {
    try {
      // Save each note individually (for updates/deletes)
      for (const note of newNotes) {
        await saveCalendarNote(note);
      }
      // For deletes, we need to handle separately, but for now assume all are saves
      setNotes(newNotes);
    } catch (error) {
      console.error("Failed to save calendar notes:", error);
    }
  };

  const getDaysInPersianMonth = (year: number, month: number): JalaaliDate[] => {
    const days: JalaaliDate[] = [];
    // Persian months have 29 or 30 days, but to be safe, check up to 31
    for (let day = 1; day <= 31; day++) {
      if (isValidJalaaliDate(year, month, day)) {
        days.push({ jy: year, jm: month, jd: day });
      }
    }
    return days;
  };

  const getFirstDayOfMonth = (year: number, month: number): number => {
    const firstDay = jalaaliToDateObject(year, month, 1);
    const gregorianDay = firstDay.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    return getPersianWeekdayIndex(gregorianDay);
  };

  const getGregorianDate = (jDate: JalaaliDate): Date => {
    return jalaaliToDateObject(jDate.jy, jDate.jm, jDate.jd);
  };

  const formatPersianDate = (jDate: JalaaliDate): string => {
    return `${jDate.jd} ${persianMonths[jDate.jm - 1]} ${jDate.jy}`;
  };

  const isHoliday = (jDate: JalaaliDate): HolidayData | null => {
    const key = `${jDate.jy}-${jDate.jm}-${jDate.jd}`;
    return holidays[key] || null;
  };

  const hasNote = (jDate: JalaaliDate): boolean => {
    const dateStr = `${jDate.jy}-${String(jDate.jm).padStart(2, '0')}-${String(jDate.jd).padStart(2, '0')}`;
    return notes.some(note => note.date === dateStr);
  };

  const getNoteForDay = (jDate: JalaaliDate): CalendarNote | null => {
    const dateStr = `${jDate.jy}-${String(jDate.jm).padStart(2, '0')}-${String(jDate.jd).padStart(2, '0')}`;
    return notes.find(note => note.date === dateStr) || null;
  };

  const handleDayClick = (jDate: JalaaliDate) => {
    setSelectedDay(jDate);
    setShowModal(true);
  };

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const days = getDaysInPersianMonth(currentYear, currentMonth);
  const firstDayOfWeek = getFirstDayOfMonth(currentYear, currentMonth);

  // Create calendar grid (6 weeks max)
  const calendarDays: (JalaaliDate | null)[] = [];
  // Add empty cells for days before the first day of month
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null);
  }
  // Add month days
  calendarDays.push(...days);
  // Fill remaining cells to complete 6 weeks
  while (calendarDays.length < 42) {
    calendarDays.push(null);
  }

  return (
    <div className="max-w-6xl mx-auto p-6" dir="rtl">
      {/* Beautiful Header with Gradient */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl p-6 mb-6 shadow-lg">
        <div className="flex items-center justify-between text-white">
          <button
            onClick={handlePrevMonth}
            className="p-3 hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-110"
            aria-label="ماه قبل"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="text-center">
            <h1 className="text-3xl font-bold mb-1">
              {persianMonths[currentMonth - 1]}
            </h1>
            <p className="text-lg opacity-90">{currentYear}</p>
            {loadingHolidays && (
              <p className="text-sm opacity-75 mt-1">در حال بارگذاری...</p>
            )}
          </div>

          <button
            onClick={handleNextMonth}
            className="p-3 hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-110"
            aria-label="ماه بعد"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Modern Calendar Card */}
      <div className="bg-card rounded-2xl shadow-xl p-4 border border-border">
        {/* Weekday headers with better styling */}
        <div className="grid grid-cols-7 gap-2 mb-3">
          {persianWeekdays.map((day, idx) => (
            <div
              key={day}
              className={`p-3 text-center text-sm font-bold rounded-lg ${
                idx === 6 ? 'bg-red-50 text-red-600' : 'bg-muted/50 text-muted-foreground'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Beautiful Calendar grid */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((jDate, index) => {
            const holidayData = jDate ? isHoliday(jDate) : null;
            const gregorianDay = jDate ? getGregorianDate(jDate).getDay() : -1;
            const persianWeekdayIndex = jDate ? getPersianWeekdayIndex(gregorianDay) : -1;
            const isFriday = jDate && (persianWeekdayIndex === 6); // 6 = Friday (جمعه) in Persian weekdays array
            const isToday = jDate && jDate.jy === jNow.jy && jDate.jm === jNow.jm && jDate.jd === jNow.jd;

            return (
              <div
                key={index}
                className={`
                  min-h-[90px] p-3 rounded-xl relative transition-all duration-200
                  ${jDate ? 'cursor-pointer hover:shadow-lg hover:scale-105 hover:-translate-y-1' : 'bg-transparent'}
                  ${!jDate ? '' : holidayData?.holiday
                    ? 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-2 border-red-200 dark:border-red-800 shadow-md'
                    : isFriday
                    ? 'bg-gradient-to-br from-red-50/50 to-pink-50/50 dark:from-red-950/20 dark:to-pink-950/20 border border-red-100 dark:border-red-900'
                    : 'bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border border-border dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                  }
                  ${isToday ? 'ring-4 ring-blue-400 dark:ring-blue-600 ring-offset-2 dark:ring-offset-gray-900' : ''}
                `}
                onClick={() => jDate && handleDayClick(jDate)}
              >
                {jDate && (
                  <>
                    {/* Day number with badge */}
                    <div className="flex items-start justify-between mb-1">
                      <div className={`
                        text-lg font-bold
                        ${isToday ? 'bg-blue-500 dark:bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center' : ''}
                        ${holidayData?.holiday && !isToday ? 'text-red-600 dark:text-red-400' : ''}
                        ${!holidayData?.holiday && !isToday ? 'text-foreground dark:text-foreground' : ''}
                      `}>
                        {jDate.jd}
                      </div>

                      {/* Note indicator */}
                      {hasNote(jDate) && (
                        <div className="relative group">
                          <div className="w-2.5 h-2.5 bg-blue-500 dark:bg-blue-600 rounded-full animate-pulse"></div>
                          <div className="absolute right-0 top-6 hidden group-hover:block bg-blue-600 dark:bg-blue-700 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                            یادداشت دارد
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Holiday/Event title */}
                    {holidayData && (
                      <div className={`
                        text-xs leading-tight mt-2 line-clamp-2
                        ${holidayData.holiday ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-purple-600 dark:text-purple-400 font-medium'}
                      `}>
                        {holidayData.holiday && '🎉 '}
                        {holidayData.title}
                      </div>
                    )}

                    {/* Today badge */}
                    {isToday && (
                      <div className="absolute bottom-1 left-1 right-1">
                        <div className="bg-blue-500 dark:bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full text-center font-medium">
                          امروز
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Events List Section */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Holidays Section */}
        <div className="bg-card dark:bg-card rounded-2xl shadow-lg border border-border dark:border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
              <span className="text-white text-xl">🎉</span>
            </div>
            <h3 className="text-xl font-bold text-foreground dark:text-foreground">تعطیلات رسمی</h3>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {Object.values(holidays).filter(h => h.holiday).length === 0 ? (
              <p className="text-muted-foreground dark:text-muted-foreground text-center py-8">
                تعطیلی رسمی در این ماه وجود ندارد
              </p>
            ) : (
              Object.entries(holidays)
                .filter(([_, h]) => h.holiday)
                .map(([key, holiday]) => {
                  const dayNum = key.split('-')[2];
                  return (
                    <div
                      key={key}
                      className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-r-4 border-red-500 p-4 rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => {
                        const day = parseInt(dayNum);
                        handleDayClick({ jy: currentYear, jm: currentMonth, jd: day });
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-bold text-red-700 dark:text-red-400 text-lg">{holiday.title}</p>
                          {holiday.description && (
                            <p className="text-sm text-red-600 dark:text-red-500 mt-1">{holiday.description}</p>
                          )}
                        </div>
                        <div className="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 px-3 py-1 rounded-full text-sm font-bold whitespace-nowrap">
                          {dayNum} {persianMonths[currentMonth - 1]}
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* All Events Section */}
        <div className="bg-card dark:bg-card rounded-2xl shadow-lg border border-border dark:border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <span className="text-white text-xl">📅</span>
            </div>
            <h3 className="text-xl font-bold text-foreground dark:text-foreground">رویدادهای ماه</h3>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {Object.values(holidays).length === 0 ? (
              <p className="text-muted-foreground dark:text-muted-foreground text-center py-8">
                رویدادی در این ماه ثبت نشده است
              </p>
            ) : (
              Object.entries(holidays)
                .sort((a, b) => {
                  const dayA = parseInt(a[0].split('-')[2]);
                  const dayB = parseInt(b[0].split('-')[2]);
                  return dayA - dayB;
                })
                .map(([key, event]) => {
                  const dayNum = key.split('-')[2];
                  const isHoliday = event.holiday;
                  return (
                    <div
                      key={key}
                      className={`${
                        isHoliday
                          ? 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border-r-4 border-red-400'
                          : 'bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-r-4 border-purple-400'
                      } p-4 rounded-lg hover:shadow-md transition-all cursor-pointer`}
                      onClick={() => {
                        const day = parseInt(dayNum);
                        handleDayClick({ jy: currentYear, jm: currentMonth, jd: day });
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className={`font-semibold text-base ${
                            isHoliday
                              ? 'text-red-700 dark:text-red-400'
                              : 'text-purple-700 dark:text-purple-400'
                          }`}>
                            {isHoliday && '🎉 '}
                            {event.title}
                          </p>
                          {event.description && (
                            <p className={`text-sm mt-1 ${
                              isHoliday
                                ? 'text-red-600 dark:text-red-500'
                                : 'text-purple-600 dark:text-purple-500'
                            }`}>
                              {event.description}
                            </p>
                          )}
                        </div>
                        <div className={`${
                          isHoliday
                            ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                            : 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300'
                        } px-3 py-1 rounded-full text-sm font-bold whitespace-nowrap`}>
                          {dayNum}
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>

      {/* Holiday Legend */}
      <div className="mt-6 flex flex-wrap gap-4 justify-center text-sm">
        <div className="flex items-center gap-2 bg-card dark:bg-card px-4 py-2 rounded-lg border border-border dark:border-border">
          <div className="w-4 h-4 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900 dark:to-orange-900 border-2 border-red-200 dark:border-red-700 rounded"></div>
          <span className="text-foreground dark:text-foreground">تعطیل رسمی</span>
        </div>
        <div className="flex items-center gap-2 bg-card dark:bg-card px-4 py-2 rounded-lg border border-border dark:border-border">
          <div className="w-4 h-4 bg-gradient-to-br from-red-50/50 to-pink-50/50 dark:from-red-900/30 dark:to-pink-900/30 border border-red-100 dark:border-red-800 rounded"></div>
          <span className="text-foreground dark:text-foreground">جمعه</span>
        </div>
        <div className="flex items-center gap-2 bg-card dark:bg-card px-4 py-2 rounded-lg border border-border dark:border-border">
          <div className="w-4 h-4 bg-blue-500 dark:bg-blue-600 rounded-full"></div>
          <span className="text-foreground dark:text-foreground">امروز</span>
        </div>
        <div className="flex items-center gap-2 bg-card dark:bg-card px-4 py-2 rounded-lg border border-border dark:border-border">
          <div className="w-2.5 h-2.5 bg-blue-500 dark:bg-blue-600 rounded-full"></div>
          <span className="text-foreground dark:text-foreground">دارای یادداشت</span>
        </div>
      </div>

      {/* Day Detail Modal */}
      {showModal && selectedDay && (
        <DayDetailModal
          jDate={selectedDay}
          note={getNoteForDay(selectedDay)}
          holiday={isHoliday(selectedDay)}
          onSave={async (note) => {
            const dateStr = `${selectedDay.jy}-${String(selectedDay.jm).padStart(2, '0')}-${String(selectedDay.jd).padStart(2, '0')}`;
            const existingNote = getNoteForDay(selectedDay);

            try {
              if (existingNote) {
                if (note.trim()) {
                  // Update existing
                  const updatedNote = { ...existingNote, note: note.trim(), updatedAt: new Date().toISOString() };
                  await saveCalendarNote(updatedNote);
                  setNotes(notes.map(n => n.id === existingNote.id ? updatedNote : n));
                } else {
                  // Delete if empty
                  await deleteCalendarNote(existingNote.id);
                  setNotes(notes.filter(n => n.id !== existingNote.id));
                }
              } else if (note.trim()) {
                // Add new
                const newNote: CalendarNote = {
                  id: `note-${Date.now()}`,
                  userId,
                  date: dateStr,
                  note: note.trim(),
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
                await saveCalendarNote(newNote);
                setNotes([...notes, newNote]);
              }
            } catch (error) {
              console.error("Failed to save note:", error);
            }
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

interface DayDetailModalProps {
  jDate: JalaaliDate;
  note: CalendarNote | null;
  holiday: HolidayData | null;
  onSave: (note: string) => void;
  onClose: () => void;
}

function DayDetailModal({ jDate, note, holiday, onSave, onClose }: DayDetailModalProps) {
  const [noteText, setNoteText] = useState(note?.note || "");

  const gregorianDate = jalaaliToDateObject(jDate.jy, jDate.jm, jDate.jd);
  const weekday = persianWeekdays[getPersianWeekdayIndex(gregorianDate.getDay())];

  const handleSave = () => {
    onSave(noteText);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-card dark:bg-card rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto transform transition-all animate-in zoom-in-95 duration-300 border border-border dark:border-gray-700">
        {/* Gradient Header */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-700 dark:via-purple-700 dark:to-pink-700 p-6 rounded-t-2xl">
          <div className="flex items-start justify-between text-white">
            <div>
              <h2 className="text-2xl font-bold mb-1">
                {jDate.jd} {persianMonths[jDate.jm - 1]}
              </h2>
              <p className="text-lg opacity-90">{jDate.jy}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 dark:hover:bg-white/30 rounded-xl transition-all duration-200"
              aria-label="بستن"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Info Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">روز هفته</p>
              <p className="font-bold text-blue-900 dark:text-blue-300">{weekday}</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 p-4 rounded-xl border border-green-200 dark:border-green-800">
              <p className="text-xs text-green-600 dark:text-green-400 font-semibold mb-1">تاریخ میلادی</p>
              <p className="font-bold text-green-900 dark:text-green-300 text-sm">
                {gregorianDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>

          {/* Holiday Badge */}
          {holiday && (
            <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-2 border-red-200 dark:border-red-800 p-4 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎉</span>
                <div>
                  <p className="text-xs text-red-600 dark:text-red-400 font-semibold mb-0.5">
                    {holiday.holiday ? 'تعطیل رسمی' : 'رویداد'}
                  </p>
                  <p className="font-bold text-red-700 dark:text-red-400">{holiday.title}</p>
                  {holiday.description && (
                    <p className="text-sm text-red-600 dark:text-red-500 mt-1">{holiday.description}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Note Section */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-foreground dark:text-foreground mb-3">
              <svg className="w-5 h-5 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              یادداشت شخصی
            </label>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="یادداشتی برای این روز بنویسید..."
              className="w-full p-4 border-2 border-border dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-600 focus:border-blue-400 dark:focus:border-blue-600 resize-none transition-all bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 text-foreground dark:text-foreground"
              rows={5}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 p-6 pt-0">
          <button
            onClick={handleSave}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 dark:hover:from-blue-800 dark:hover:to-purple-800 transition-all duration-200 font-bold shadow-lg hover:shadow-xl hover:scale-105 transform"
          >
            💾 ذخیره
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200 font-bold hover:scale-105 transform"
          >
            ✕ لغو
          </button>
        </div>
      </div>
    </div>
  );
}