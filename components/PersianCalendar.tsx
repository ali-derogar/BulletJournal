"use client";

import { useState, useEffect, useCallback } from "react";
import { toJalaali, jalaaliToDateObject, isValidJalaaliDate } from "jalaali-js";
import type { JalaaliDate } from "jalaali-js";
import { getCalendarNotes, saveCalendarNote, deleteCalendarNote } from "@/storage/calendar";
import type { CalendarNote } from "@/domain";
import type { CalendarEvent } from "@/domain/calendar-events";


interface PersianCalendarProps {
  userId: string;
}

const persianMonths = [
  "Farvardin", "Ordibehesht", "Khordad", "Tir", "Mordad", "Shahrivar",
  "Mehr", "Aban", "Azar", "Dey", "Bahman", "Esfand"
];

const persianWeekdays = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

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
  date_string?: string;
  base?: number;
}

export default function PersianCalendar({ userId }: PersianCalendarProps) {
  const now = new Date();
  const jNow = toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  console.log('[PersianCalendar] Current date:', now.toISOString(), 'Jalali:', jNow);
  const [currentYear, setCurrentYear] = useState(jNow.jy);
  const [currentMonth, setCurrentMonth] = useState(jNow.jm);
  const [notes, setNotes] = useState<CalendarNote[]>([]);
  const [holidays, setHolidays] = useState<{ [key: string]: HolidayData[] }>({});
  const [selectedDay, setSelectedDay] = useState<JalaaliDate | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loadingHolidays, setLoadingHolidays] = useState(false);
  const [eventFilter, setEventFilter] = useState<'all' | 'holidays' | 'events'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());


  const loadNotes = useCallback(async () => {
    try {
      const data = await getCalendarNotes(userId);
      setNotes(data);
    } catch (error) {
      console.error("Failed to load calendar notes:", error);
    }
  }, [userId]);

  // Load notes and holidays from storage
  useEffect(() => {
    console.log('[PersianCalendar] Loading for year:', currentYear, 'month:', currentMonth);
    loadNotes();
    loadHolidaysForMonth(currentYear, currentMonth);
  }, [userId, currentYear, currentMonth, loadNotes]);

  const loadHolidaysForMonth = async (year: number, month: number) => {
    setLoadingHolidays(true);
    try {
      const newHolidays: { [key: string]: HolidayData[] } = {};

      // NEW: Fetch all events for the month in one API call
      const response = await fetch(`/api/calendar/${year}/${month}/events`);

      if (response.ok) {
        const data = await response.json();
        console.log('[PersianCalendar] API response:', data.total_events, 'events,', data.total_holidays, 'holidays');

        // Filter events to only include those for the current month
        const monthEvents = data.events.filter((event: CalendarEvent) => {
          const dateParts = event.jalali_date.split('-');
          const eventYear = parseInt(dateParts[0], 10);
          const eventMonth = parseInt(dateParts[1], 10);
          return eventYear === year && eventMonth === month;
        });
        console.log('[PersianCalendar] Filtered to', monthEvents.length, 'events for month', month);

        // Process filtered events and store holidays
        for (const event of monthEvents) {
          // Extract day from jalali_date (format: YYYY-MM-DD)
          const dateParts = event.jalali_date.split('-');
          const day = parseInt(dateParts[2], 10);

          // Store holiday/event data
          const key = `${year}-${month}-${day}`;

          if (!newHolidays[key]) {
            newHolidays[key] = [];
          }

          const eventData: HolidayData = {
            date: event.jalali_date,
            title: event.title,
            holiday: event.is_holiday,
            description: event.description || '',
            date_string: event.date_string,
            base: event.base
          };

          newHolidays[key].push(eventData);
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


  const isHoliday = (jDate: JalaaliDate): HolidayData[] => {
    const key = `${jDate.jy}-${jDate.jm}-${jDate.jd}`;
    return holidays[key] || [];
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
    <>
      <style jsx>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: linear-gradient(to bottom, transparent, rgba(147, 51, 234, 0.1));
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #8b5cf6, #ec4899);
          border-radius: 10px;
          transition: all 0.3s ease;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #7c3aed, #db2777);
        }

        .animate-in {
          animation: slideInUp 0.4s ease-out forwards;
        }
      `}</style>

      <div className="max-w-6xl mx-auto p-2 sm:p-4 md:p-6" dir="rtl">
        {/* Beautiful Header with Gradient */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl p-4 md:p-6 mb-4 md:mb-6 shadow-lg animate-in">
          <div className="flex items-center justify-between text-white">
            <button
              onClick={handleNextMonth}
              className="p-2 md:p-3 hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-110"
              aria-label="Next month"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <div className="text-center">
              <h1 className="text-xl md:text-3xl font-bold mb-1">
                {persianMonths[currentMonth - 1]}
              </h1>
              <p className="text-sm md:text-lg opacity-90">{currentYear}</p>
              {loadingHolidays && (
                <p className="text-xs md:text-sm opacity-75 mt-1">Loading...</p>
              )}
            </div>

            <button
              onClick={handlePrevMonth}
              className="p-2 md:p-3 hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-110"
              aria-label="Previous month"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modern Calendar Card */}
        <div className="bg-card rounded-2xl shadow-xl p-2 md:p-4 border border-border">
          {/* Weekday headers with better styling */}
          <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2 md:mb-3">
            {persianWeekdays.map((day, idx) => (
              <div
                key={day}
                className={`p-1 md:p-3 text-center text-[10px] md:text-sm font-bold rounded-lg ${idx === 6 ? 'bg-red-50 text-red-600' : 'bg-muted/50 text-muted-foreground'
                  }`}
              >
                {day.substring(0, 1)}<span className="hidden md:inline">{day.substring(1)}</span>
              </div>
            ))}
          </div>

          {/* Beautiful Calendar grid with enhanced animations */}
          <div className="grid grid-cols-7 gap-1 md:gap-3">
            {calendarDays.map((jDate, index) => {
              const holidayDataArray = jDate ? isHoliday(jDate) : [];
              const holidayData = holidayDataArray.length > 0 ? holidayDataArray[0] : null;
              const hasMultiple = holidayDataArray.length > 1;
              const gregorianDay = jDate ? getGregorianDate(jDate).getDay() : -1;
              const persianWeekdayIndex = jDate ? getPersianWeekdayIndex(gregorianDay) : -1;
              const isFriday = jDate && (persianWeekdayIndex === 6); // 6 = Friday (جمعه) in Persian weekdays array
              const isToday = jDate && jDate.jy === jNow.jy && jDate.jm === jNow.jm && jDate.jd === jNow.jd;

              return (
                <div
                  key={index}
                  className={`
                  group min-h-[60px] sm:min-h-[80px] md:min-h-[100px] p-1 md:p-3 rounded-lg md:rounded-2xl relative transition-all duration-300 ease-out
                  ${jDate ? 'cursor-pointer hover:shadow-2xl hover:scale-105 md:hover:scale-110 hover:-translate-y-1 md:hover:-translate-y-2 hover:z-10' : 'bg-transparent'}
                  ${!jDate ? '' : holidayData?.holiday
                      ? 'bg-gradient-to-br from-red-50 via-orange-50 to-red-100 dark:from-red-950/40 dark:via-orange-950/40 dark:to-red-950/50 border md:border-2 border-red-300 dark:border-red-700 shadow-sm md:shadow-lg hover:shadow-red-300/50 dark:hover:shadow-red-900/50'
                      : isFriday
                        ? 'bg-gradient-to-br from-rose-50 via-pink-50 to-red-50/70 dark:from-rose-950/30 dark:via-pink-950/30 dark:to-red-950/30 border md:border-2 border-rose-200 dark:border-rose-800 shadow-sm md:shadow-md hover:shadow-pink-200/50 dark:hover:shadow-pink-900/30'
                        : 'bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/20 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 border md:border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 shadow-sm md:shadow-md hover:shadow-blue-200/50 dark:hover:shadow-blue-900/30'
                    }
                  ${isToday ? 'ring-2 md:ring-4 ring-blue-500 dark:ring-blue-600 ring-offset-2 md:ring-offset-4 dark:ring-offset-gray-900 shadow-md md:shadow-xl scale-105' : ''}
                `}
                  onClick={() => jDate && handleDayClick(jDate)}
                >
                  {jDate && (
                    <>
                      {/* Decorative corner accent */}
                      {holidayData?.holiday && (
                        <div className="absolute top-0 left-0 w-3 h-3 md:w-6 md:h-6 overflow-hidden">
                          <div className="absolute top-0 left-0 w-4 h-4 md:w-8 md:h-8 bg-gradient-to-br from-red-400 to-orange-400 dark:from-red-600 dark:to-orange-600 rotate-45 transform -translate-x-2 -translate-y-2 md:-translate-x-4 md:-translate-y-4 shadow-lg"></div>
                        </div>
                      )}

                      {/* Day number with enhanced badge */}
                      <div className="flex items-start justify-between mb-1 md:mb-2">
                        <div className={`
                        text-sm sm:text-lg md:text-xl font-black transition-all duration-300
                        ${isToday
                            ? 'bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 text-white rounded-full w-6 h-6 md:w-10 md:h-10 flex items-center justify-center shadow-lg group-hover:scale-110 animate-pulse'
                            : ''}
                        ${holidayData?.holiday && !isToday
                            ? 'text-red-700 dark:text-red-300 group-hover:scale-110'
                            : ''}
                        ${!holidayData?.holiday && !isToday
                            ? 'text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:scale-110'
                            : ''}
                      `}>
                          {jDate.jd}
                        </div>

                        {/* Note indicator with enhanced animation */}
                        {hasNote(jDate) && (
                          <div className="relative group/note">
                            <div className="relative">
                              <div className="w-2 h-2 md:w-3 md:h-3 bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 rounded-full animate-pulse shadow-lg"></div>
                              <div className="absolute inset-0 w-2 h-2 md:w-3 md:h-3 bg-blue-400 dark:bg-blue-500 rounded-full animate-ping"></div>
                            </div>
                            <div className="absolute right-0 top-7 hidden group-hover/note:block bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap z-20 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
                              <div className="absolute -top-1 right-2 w-2 h-2 bg-blue-600 dark:bg-blue-700 rotate-45"></div>
                              📝 Has note
                            </div>
                          </div>
                        )}

                        {/* Multiple events indicator */}
                        {hasMultiple && (
                          <div className="absolute top-1 left-1 md:top-2 md:left-2 bg-gradient-to-br from-purple-500 to-pink-500 dark:from-purple-600 dark:to-pink-600 text-white text-[8px] md:text-xs font-bold w-3 h-3 md:w-5 md:h-5 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                            {holidayDataArray.length}
                          </div>
                        )}
                      </div>

                      {/* Holiday/Event title with better styling */}
                      {holidayData && (
                        <div className={`
                        text-[8px] md:text-xs leading-snug mt-1 md:mt-2 line-clamp-1 md:line-clamp-2 font-semibold transition-all duration-300 hidden sm:block
                        ${holidayData.holiday
                            ? 'text-red-700 dark:text-red-300 group-hover:text-red-800 dark:group-hover:text-red-200'
                            : 'text-purple-700 dark:text-purple-300 group-hover:text-purple-800 dark:group-hover:text-purple-200'}
                      `}>
                          {holidayData.holiday && (
                            <span className="inline-block animate-bounce mr-1">🎉</span>
                          )}
                          {holidayData.title}
                        </div>
                      )}

                      {/* Mobile Only dot for events */}
                      {holidayData && (
                        <div className={`sm:hidden mt-1 h-1 rounded-full w-full ${holidayData.holiday ? 'bg-red-400' : 'bg-purple-400'
                          }`} />
                      )}

                      {/* Today badge with enhanced design */}
                      {isToday && (
                        <div className="absolute bottom-1 right-1 md:bottom-2 md:left-2 md:right-2">
                          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 text-white text-[8px] md:text-xs px-1 md:px-2 py-0.5 md:py-1 rounded-full text-center font-bold shadow-lg animate-pulse hidden md:block">
                            ✨ Today
                          </div>
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full md:hidden ml-auto"></div>
                        </div>
                      )}

                      {/* Hover overlay effect */}
                      <div className="absolute inset-0 bg-gradient-to-t from-blue-500/0 to-blue-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5 dark:group-hover:from-blue-600/10 dark:group-hover:to-purple-600/10 rounded-lg md:rounded-2xl transition-all duration-300 pointer-events-none"></div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Events List Section - Mobile Optimized */}
        <div className="mt-4 md:mt-8">
          {/* Section Header with Stats */}
          <div className="mb-4 md:mb-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-700 dark:via-purple-700 dark:to-pink-700 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-xl">
            <div className="flex flex-col items-start gap-3 md:gap-4">
              <div className="text-white w-full">
                <h2 className="text-xl md:text-3xl font-bold mb-1 md:mb-2 flex items-center gap-2 md:gap-3">
                  <span className="text-xl md:text-2xl">📋</span>
                  <span>{persianMonths[currentMonth - 1]} Events</span>
                </h2>
                <p className="text-white/90 text-xs md:text-sm">
                  {Object.values(holidays).flat().length} events
                </p>
              </div>

              {/* Stats Cards - Mobile Optimized */}
              <div className="flex gap-2 md:gap-3 w-full">
                <div className="flex-1 bg-white/20 dark:bg-white/10 backdrop-blur-sm rounded-lg md:rounded-xl px-3 md:px-4 py-2 md:py-3 text-center">
                  <div className="text-lg md:text-2xl font-bold text-white">
                    {Object.values(holidays).flat().filter(h => h.holiday).length}
                  </div>
                  <div className="text-[10px] md:text-xs text-white/80">Holidays</div>
                </div>
                <div className="flex-1 bg-white/20 dark:bg-white/10 backdrop-blur-sm rounded-lg md:rounded-xl px-3 md:px-4 py-2 md:py-3 text-center">
                  <div className="text-lg md:text-2xl font-bold text-white">
                    {Object.values(holidays).flat().filter(h => !h.holiday).length}
                  </div>
                  <div className="text-[10px] md:text-xs text-white/80">Events</div>
                </div>
              </div>
            </div>

            {/* Filter Tabs - Mobile Optimized */}
            <div className="mt-4 md:mt-6 flex gap-1.5 md:gap-2">
              <button
                onClick={() => setEventFilter('all')}
                className={`flex-1 px-2 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-base font-bold transition-all duration-200 ${eventFilter === 'all'
                  ? 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow-lg scale-105'
                  : 'bg-white/20 dark:bg-white/10 text-white hover:bg-white/30 dark:hover:bg-white/20'
                  }`}
              >
                <span className="hidden md:inline">All ({Object.values(holidays).flat().length})</span>
                <span className="md:hidden">All</span>
              </button>
              <button
                onClick={() => setEventFilter('holidays')}
                className={`flex-1 px-2 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-base font-bold transition-all duration-200 ${eventFilter === 'holidays'
                  ? 'bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 shadow-lg scale-105'
                  : 'bg-white/20 dark:bg-white/10 text-white hover:bg-white/30 dark:hover:bg-white/20'
                  }`}
              >
                <span className="hidden md:inline">🎉 Holidays ({Object.values(holidays).flat().filter(h => h.holiday).length})</span>
                <span className="md:hidden">🎉 Holidays</span>
              </button>
              <button
                onClick={() => setEventFilter('events')}
                className={`flex-1 px-2 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-base font-bold transition-all duration-200 ${eventFilter === 'events'
                  ? 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow-lg scale-105'
                  : 'bg-white/20 dark:bg-white/10 text-white hover:bg-white/30 dark:hover:bg-white/20'
                  }`}
              >
                <span className="hidden md:inline">📅 Events ({Object.values(holidays).flat().filter(h => !h.holiday).length})</span>
                <span className="md:hidden">📅 Events</span>
              </button>
            </div>

            {/* Search Box - Mobile Optimized */}
            <div className="mt-3 md:mt-4 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search events..."
                className="w-full px-4 md:px-5 py-2.5 md:py-3 pr-10 md:pr-12 rounded-lg md:rounded-xl text-sm md:text-base bg-white/20 dark:bg-white/10 backdrop-blur-sm text-white placeholder-white/60 border-2 border-white/30 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
              />
              <svg className="w-4 h-4 md:w-5 md:h-5 absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Events Timeline - Mobile Optimized */}
          <div className="bg-card dark:bg-card rounded-xl md:rounded-2xl shadow-xl border border-border dark:border-border p-3 md:p-6">
            <div className="space-y-3 md:space-y-4 max-h-[500px] md:max-h-[600px] overflow-y-auto pr-1 md:pr-2 custom-scrollbar">
              {(() => {
                const allEvents = Object.entries(holidays)
                  .sort((a, b) => {
                    const dayA = parseInt(a[0].split('-')[2]);
                    const dayB = parseInt(b[0].split('-')[2]);
                    return dayA - dayB;
                  })
                  .flatMap(([key, events]) => events.map((event, idx) => ({
                    key: `${key}-${idx}`,
                    dayNum: key.split('-')[2],
                    event,
                  })));

                const filteredEvents = allEvents.filter(({ event }) => {
                  const matchesFilter =
                    eventFilter === 'all' ||
                    (eventFilter === 'holidays' && event.holiday) ||
                    (eventFilter === 'events' && !event.holiday);

                  const matchesSearch =
                    searchQuery.trim() === '' ||
                    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (event.description && event.description.toLowerCase().includes(searchQuery.toLowerCase()));

                  return matchesFilter && matchesSearch;
                });

                if (filteredEvents.length === 0) {
                  return (
                    <div className="text-center py-16">
                      <div className="text-6xl mb-4 opacity-30">📭</div>
                      <p className="text-muted-foreground dark:text-muted-foreground text-lg font-semibold">
                        {searchQuery ? 'No events found' : 'No events in this category'}
                      </p>
                    </div>
                  );
                }

                return filteredEvents.map(({ key, dayNum, event }, index) => {
                  const isHoliday = event.holiday;
                  const isExpanded = expandedEvents.has(key);
                  const descriptionText = event.description ? event.description.replace(/<[^>]*>/g, '') : '';
                  const shouldTruncate = descriptionText.length > 150;

                  return (
                    <div
                      key={key}
                      className="group relative"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {/* Timeline Line - Hidden on mobile */}
                      {index !== filteredEvents.length - 1 && (
                        <div className="hidden md:block absolute right-[27px] top-14 bottom-0 w-0.5 bg-gradient-to-b from-purple-300 to-transparent dark:from-purple-700 opacity-30"></div>
                      )}

                      {/* Event Card - Mobile Optimized */}
                      <div className="relative md:pr-16 transition-all duration-300">
                        {/* Timeline Dot - Hidden on mobile */}
                        <div className={`hidden md:flex absolute right-5 top-5 w-8 h-8 rounded-full items-center justify-center shadow-lg ${isHoliday
                          ? 'bg-gradient-to-br from-red-500 to-orange-500 dark:from-red-600 dark:to-orange-600'
                          : 'bg-gradient-to-br from-purple-500 to-pink-500 dark:from-purple-600 dark:to-pink-600'
                          } group-hover:scale-125 transition-transform duration-300`}>
                          <span className="text-white text-sm font-bold">{dayNum}</span>
                        </div>

                        {/* Event Content */}
                        <div className={`rounded-lg md:rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden ${isHoliday
                          ? 'bg-gradient-to-br from-red-50 via-orange-50 to-red-50 dark:from-red-950/40 dark:via-orange-950/40 dark:to-red-950/40 border-2 border-red-200 dark:border-red-800'
                          : 'bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 dark:from-purple-950/40 dark:via-pink-950/40 dark:to-purple-950/40 border-2 border-purple-200 dark:border-purple-800'
                          }`}>
                          <div className="p-3 md:p-5">
                            <div className="flex items-start justify-between gap-2 md:gap-4 mb-2 md:mb-3">
                              <div className="flex-1 min-w-0">
                                {/* Event Type Badge */}
                                <div className="mb-1.5 md:mb-2">
                                  <span className={`inline-flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-bold ${isHoliday
                                    ? 'bg-red-200 dark:bg-red-900/60 text-red-700 dark:text-red-300'
                                    : 'bg-purple-200 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300'
                                    }`}>
                                    {isHoliday ? '🎉 Holiday' : '📅 Event'}
                                  </span>
                                </div>

                                {/* Event Title */}
                                <h3 className={`text-sm md:text-lg font-bold mb-0.5 md:mb-1 line-clamp-2 md:line-clamp-none ${isHoliday
                                  ? 'text-red-800 dark:text-red-300'
                                  : 'text-purple-800 dark:text-purple-300'
                                  }`}>
                                  {event.title}
                                </h3>

                                {/* Date String */}
                                {event.base !== 0 && event.date_string && (
                                  <p className={`text-[10px] md:text-sm font-medium ${isHoliday
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-purple-600 dark:text-purple-400'
                                    }`}>
                                    📍 {event.date_string}
                                  </p>
                                )}

                                {/* Description with Read More */}
                                {event.description && (
                                  <div className="mt-1 md:mt-2">
                                    <div
                                      className={`text-xs md:text-sm leading-relaxed ${isHoliday
                                        ? 'text-red-700 dark:text-red-400'
                                        : 'text-purple-700 dark:text-purple-400'
                                        } ${!isExpanded && shouldTruncate ? 'line-clamp-2' : ''}`}
                                      dangerouslySetInnerHTML={{ __html: event.description }}
                                    />
                                    {shouldTruncate && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setExpandedEvents(prev => {
                                            const newSet = new Set(prev);
                                            if (isExpanded) {
                                              newSet.delete(key);
                                            } else {
                                              newSet.add(key);
                                            }
                                            return newSet;
                                          });
                                        }}
                                        className={`mt-1 text-[10px] md:text-xs font-bold hover:underline transition-colors ${isHoliday
                                          ? 'text-red-600 dark:text-red-300 hover:text-red-800 dark:hover:text-red-200'
                                          : 'text-purple-600 dark:text-purple-300 hover:text-purple-800 dark:hover:text-purple-200'
                                          }`}
                                      >
                                        {isExpanded ? '▲ Less' : '▼ More'}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Date Badge - Smaller on mobile */}
                              <div className={`flex-shrink-0 px-2 md:px-4 py-1.5 md:py-3 rounded-lg md:rounded-xl text-center shadow-md ${isHoliday
                                ? 'bg-gradient-to-br from-red-200 to-orange-200 dark:from-red-900/70 dark:to-orange-900/70'
                                : 'bg-gradient-to-br from-purple-200 to-pink-200 dark:from-purple-900/70 dark:to-pink-900/70'
                                }`}>
                                <div className={`text-lg md:text-2xl font-black ${isHoliday
                                  ? 'text-red-800 dark:text-red-200'
                                  : 'text-purple-800 dark:text-purple-200'
                                  }`}>
                                  {dayNum}
                                </div>
                                <div className={`text-[10px] md:text-xs font-bold hidden md:block ${isHoliday
                                  ? 'text-red-700 dark:text-red-300'
                                  : 'text-purple-700 dark:text-purple-300'
                                  }`}>
                                  {persianMonths[currentMonth - 1]}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Hover Effect Bar */}
                          <div className={`h-0.5 md:h-1 w-full ${isHoliday
                            ? 'bg-gradient-to-r from-red-500 via-orange-500 to-red-500'
                            : 'bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500'
                            } opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>

        {/* Enhanced Legend */}
        <div className="mt-8 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-center text-sm font-bold text-gray-600 dark:text-gray-400 mb-4 flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Calendar Guide
          </h3>
          <div className="flex flex-wrap gap-3 justify-center">
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2.5 rounded-xl border-2 border-red-200 dark:border-red-800 shadow-sm hover:shadow-md transition-all hover:scale-105">
              <div className="w-5 h-5 bg-gradient-to-br from-red-50 to-orange-100 dark:from-red-900 dark:to-orange-900 border-2 border-red-300 dark:border-red-700 rounded shadow-sm"></div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">🎉 Official Holiday</span>
            </div>
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2.5 rounded-xl border-2 border-rose-200 dark:border-rose-800 shadow-sm hover:shadow-md transition-all hover:scale-105">
              <div className="w-5 h-5 bg-gradient-to-br from-rose-50 to-pink-100 dark:from-rose-900/50 dark:to-pink-900/50 border-2 border-rose-200 dark:border-rose-700 rounded shadow-sm"></div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Friday</span>
            </div>
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2.5 rounded-xl border-2 border-blue-200 dark:border-blue-800 shadow-sm hover:shadow-md transition-all hover:scale-105">
              <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 rounded-full shadow-md animate-pulse"></div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">✨ Today</span>
            </div>
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2.5 rounded-xl border-2 border-purple-200 dark:border-purple-800 shadow-sm hover:shadow-md transition-all hover:scale-105">
              <div className="relative">
                <div className="w-3 h-3 bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 rounded-full shadow-sm"></div>
                <div className="absolute inset-0 w-3 h-3 bg-blue-400 dark:bg-blue-500 rounded-full animate-ping"></div>
              </div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">📝 Has Note</span>
            </div>
          </div>
        </div>

        {/* Day Detail Modal */}
        {showModal && selectedDay && (
          <DayDetailModal
            jDate={selectedDay}
            note={getNoteForDay(selectedDay)}
            holidays={isHoliday(selectedDay)}
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
    </>
  );
}

interface DayDetailModalProps {
  jDate: JalaaliDate;
  note: CalendarNote | null;
  holidays: HolidayData[];
  onSave: (note: string) => void;
  onClose: () => void;
}

function DayDetailModal({ jDate, note, holidays, onSave, onClose }: DayDetailModalProps) {
  const [noteText, setNoteText] = useState(note?.note || "");
  const [expandedHolidays, setExpandedHolidays] = useState<Set<number>>(new Set());

  const gregorianDate = jalaaliToDateObject(jDate.jy, jDate.jm, jDate.jd);
  const weekday = persianWeekdays[getPersianWeekdayIndex(gregorianDate.getDay())];

  const handleSave = () => {
    onSave(noteText);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 dark:bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="bg-card dark:bg-card rounded-3xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden transform transition-all animate-in zoom-in-95 duration-300 border-2 border-purple-200 dark:border-purple-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient Header with Pattern */}
        <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-700 dark:via-purple-700 dark:to-pink-700 p-8 overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12"></div>

          <div className="relative flex items-start justify-between text-white">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg">
                  {jDate.jd}
                </div>
                <div>
                  <h2 className="text-2xl font-black mb-0.5">
                    {persianMonths[jDate.jm - 1]}
                  </h2>
                  <p className="text-base opacity-90 font-semibold">{jDate.jy}</p>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-white/20 dark:hover:bg-white/30 rounded-xl transition-all duration-200 hover:rotate-90 hover:scale-110"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content with scroll */}
        <div className="p-6 space-y-5 max-h-[calc(85vh-200px)] overflow-y-auto custom-scrollbar">
          {/* Info Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="group bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 dark:from-blue-950/50 dark:via-indigo-950/50 dark:to-blue-950/60 p-5 rounded-2xl border-2 border-blue-200 dark:border-blue-800 shadow-md hover:shadow-lg transition-all hover:scale-105">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-bold">Day of Week</p>
              </div>
              <p className="text-lg font-black text-blue-900 dark:text-blue-300">{weekday}</p>
            </div>

            <div className="group bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100 dark:from-emerald-950/50 dark:via-green-950/50 dark:to-emerald-950/60 p-5 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 shadow-md hover:shadow-lg transition-all hover:scale-105">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">Gregorian Date</p>
              </div>
              <p className="text-base font-black text-emerald-900 dark:text-emerald-300">
                {gregorianDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>

          {/* Holiday Badges with enhanced design */}
          {holidays.map((holiday, idx) => {
            const isExpanded = expandedHolidays.has(idx);
            const descriptionText = holiday.description ? holiday.description.replace(/<[^>]*>/g, '') : '';
            const shouldTruncate = descriptionText.length > 200;

            return (
              <div
                key={idx}
                className={`group relative overflow-hidden rounded-2xl border-2 shadow-lg hover:shadow-xl transition-all ${holiday.holiday
                  ? 'bg-gradient-to-br from-red-50 via-orange-50 to-red-100 dark:from-red-950/40 dark:via-orange-950/40 dark:to-red-950/50 border-red-300 dark:border-red-700'
                  : 'bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100 dark:from-purple-950/40 dark:via-pink-950/40 dark:to-purple-950/50 border-purple-300 dark:border-purple-700'
                  }`}
              >
                {/* Decorative gradient bar */}
                <div className={`h-1.5 w-full ${holiday.holiday
                  ? 'bg-gradient-to-r from-red-500 via-orange-500 to-red-500'
                  : 'bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500'
                  }`}></div>

                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-md ${holiday.holiday
                      ? 'bg-gradient-to-br from-red-200 to-orange-200 dark:from-red-900/70 dark:to-orange-900/70'
                      : 'bg-gradient-to-br from-purple-200 to-pink-200 dark:from-purple-900/70 dark:to-pink-900/70'
                      }`}>
                      {holiday.holiday ? '🎉' : '📅'}
                    </div>
                    <div className="flex-1">
                      <div className="mb-2">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${holiday.holiday
                          ? 'bg-red-200 dark:bg-red-900/60 text-red-800 dark:text-red-300'
                          : 'bg-purple-200 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300'
                          }`}>
                          {holiday.holiday ? 'Official Holiday' : 'Event'}
                        </span>
                      </div>
                      <h4 className={`font-black text-lg mb-1 ${holiday.holiday
                        ? 'text-red-800 dark:text-red-300'
                        : 'text-purple-800 dark:text-purple-300'
                        }`}>
                        {holiday.title}
                      </h4>
                      {holiday.base !== 0 && holiday.date_string && (
                        <p className={`text-sm font-semibold flex items-center gap-1 ${holiday.holiday
                          ? 'text-red-700 dark:text-red-400'
                          : 'text-purple-700 dark:text-purple-400'
                          }`}>
                          <span>📍</span>
                          {holiday.date_string}
                        </p>
                      )}
                      {holiday.description && (
                        <div className="mt-2">
                          <div
                            className={`text-sm leading-relaxed ${holiday.holiday
                              ? 'text-red-700 dark:text-red-400'
                              : 'text-purple-700 dark:text-purple-400'
                              } ${!isExpanded && shouldTruncate ? 'line-clamp-3' : ''}`}
                            dangerouslySetInnerHTML={{ __html: holiday.description }}
                          />
                          {shouldTruncate && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedHolidays(prev => {
                                  const newSet = new Set(prev);
                                  if (isExpanded) {
                                    newSet.delete(idx);
                                  } else {
                                    newSet.add(idx);
                                  }
                                  return newSet;
                                });
                              }}
                              className={`mt-2 px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-sm hover:shadow-md ${holiday.holiday
                                ? 'bg-red-200 dark:bg-red-900/60 text-red-800 dark:text-red-300 hover:bg-red-300 dark:hover:bg-red-900/80'
                                : 'bg-purple-200 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 hover:bg-purple-300 dark:hover:bg-purple-900/80'
                                }`}
                            >
                              {isExpanded ? '▲ Read Less' : '▼ Read More'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Note Section with enhanced design */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 p-5 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800">
            <label className="flex items-center gap-2 text-sm font-black text-indigo-700 dark:text-indigo-300 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              Personal Note
            </label>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Write a note for this day..."
              className="w-full p-4 border-2 border-indigo-300 dark:border-indigo-700 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-400/50 dark:focus:ring-indigo-600/50 focus:border-indigo-500 dark:focus:border-indigo-500 resize-none transition-all bg-white dark:bg-gray-900 text-foreground dark:text-foreground placeholder-gray-400 dark:placeholder-gray-500 shadow-inner"
              rows={5}
            />
            <div className="mt-2 flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Your notes are saved automatically</span>
            </div>
          </div>
        </div>

        {/* Action Buttons with modern design */}
        <div className="flex gap-4 p-6 pt-0 bg-gradient-to-t from-gray-50 to-transparent dark:from-gray-900 dark:to-transparent">
          <button
            onClick={handleSave}
            className="group flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-700 dark:via-purple-700 dark:to-pink-700 text-white rounded-2xl hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 dark:hover:from-blue-800 dark:hover:via-purple-800 dark:hover:to-pink-800 transition-all duration-300 font-black shadow-xl hover:shadow-2xl hover:scale-105 transform relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            <span className="relative flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Save
            </span>
          </button>
          <button
            onClick={onClose}
            className="group flex-1 px-6 py-4 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-200 rounded-2xl hover:from-gray-300 hover:to-gray-400 dark:hover:from-gray-600 dark:hover:to-gray-500 transition-all duration-300 font-black shadow-lg hover:shadow-xl hover:scale-105 transform relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 dark:bg-black/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            <span className="relative flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}