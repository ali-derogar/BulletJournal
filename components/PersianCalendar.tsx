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

interface HolidayData {
  date: string;
  title: string;
  holiday: boolean;
  description?: string;
}

export default function PersianCalendar({ userId }: PersianCalendarProps) {
  console.log('[DEBUG] PersianCalendar: Component mounted with userId:', userId);
  const now = new Date();
  const jNow = toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  console.log('[DEBUG] PersianCalendar: Current date - Gregorian:', now, 'Jalaali:', jNow);
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
    console.log(`[DEBUG] loadHolidaysForMonth: Loading holidays for ${year}/${month}`);
    const monthKey = `${year}-${month}`;

    console.log(`[DEBUG] loadHolidaysForMonth: Fetching from API for ${monthKey}`);
    setLoadingHolidays(true);
    try {
      const newHolidays: { [key: string]: HolidayData } = {};

      // Fetch holidays for each day of the month
      const daysInMonth = getDaysInPersianMonth(year, month);
      console.log(`[DEBUG] loadHolidaysForMonth: Days in month: ${daysInMonth.length}`);
      console.log(`[DEBUG] loadHolidaysForMonth: About to start fetching for ${daysInMonth.length} days`);

      const fetchPromises = daysInMonth.map(async (jDate) => {
        try {
          console.log(`[DEBUG] Fetching holiday for ${jDate.jy}/${jDate.jm}/${jDate.jd}`);
          const response = await fetch(`/api/holidays/${jDate.jy}/${jDate.jm}/${jDate.jd}`);
          console.log(`[DEBUG] Response status for ${jDate.jy}/${jDate.jm}/${jDate.jd}:`, response.status);
          if (response.ok) {
            const data: HolidayData = await response.json();
            console.log(`[DEBUG] Holiday data for ${jDate.jy}/${jDate.jm}/${jDate.jd}:`, data);
            if (data.holiday) {
              newHolidays[`${jDate.jy}-${jDate.jm}-${jDate.jd}`] = data;
            }
          } else {
            console.warn(`[DEBUG] Bad response for ${jDate.jy}/${jDate.jm}/${jDate.jd}:`, response.status);
          }
        } catch (error) {
          console.warn(`Failed to fetch holiday for ${jDate.jy}/${jDate.jm}/${jDate.jd}:`, error);
        }
      });

      await Promise.all(fetchPromises);
      console.log(`[DEBUG] loadHolidaysForMonth: Fetched ${Object.keys(newHolidays).length} holidays`);

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
    // 0 = Saturday in Persian calendar
    return firstDay.getDay(); // 0=Sat, 1=Sun, etc.
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
  console.log(`[DEBUG] Rendering calendar for ${currentYear}/${currentMonth}, days in month:`, days.length);
  const firstDayOfWeek = getFirstDayOfMonth(currentYear, currentMonth);
  console.log(`[DEBUG] First day of week:`, firstDayOfWeek);

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
  console.log(`[DEBUG] Calendar grid created with ${calendarDays.filter(d => d !== null).length} days`);

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
          aria-label="ماه قبل"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <h1 className="text-2xl font-bold text-foreground">
          {persianMonths[currentMonth - 1]} {currentYear}
        </h1>

        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
          aria-label="ماه بعد"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {persianWeekdays.map((day) => (
          <div
            key={day}
            className="p-2 text-center text-sm font-semibold text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((jDate, index) => (
          <div
            key={index}
            className={`
              min-h-[60px] p-2 border border-border rounded-lg relative
              ${jDate ? 'cursor-pointer hover:bg-muted transition-colors' : ''}
              ${jDate && isHoliday(jDate) ? 'bg-orange-50 border-orange-200' : ''}
            `}
            onClick={() => jDate && handleDayClick(jDate)}
          >
            {jDate && (
              <>
                <div className="text-sm font-medium text-foreground">
                  {jDate.jd}
                </div>
                {hasNote(jDate) && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
                {isHoliday(jDate) && (
                  <div className="text-xs text-red-600 mt-1 truncate">
                    {isHoliday(jDate)?.title}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
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
  const weekday = persianWeekdays[gregorianDate.getDay()];

  const handleSave = () => {
    onSave(noteText);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-card-foreground">
              {jDate.jd} {persianMonths[jDate.jm - 1]} {jDate.jy}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg"
              aria-label="بستن"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">روز هفته</p>
              <p className="font-medium">{weekday}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">تاریخ میلادی</p>
              <p className="font-medium">
                {gregorianDate.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>

            {holiday && (
              <div>
                <p className="text-sm text-muted-foreground">تعطیلات</p>
                <p className="font-medium text-orange-600">{holiday.title}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                یادداشت
              </label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="یادداشتی برای این روز اضافه کنید..."
                className="w-full p-3 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                rows={4}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              ذخیره
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
            >
              لغو
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}