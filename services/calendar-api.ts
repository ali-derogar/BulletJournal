/**
 * Calendar API service for fetching Persian calendar events from backend
 */

import type {
  CalendarEvent,
  CalendarEventsResponse,
  CalendarFullResponse,
  DayInfo,
} from "@/domain/calendar-events";

import { API_BASE_URL } from "./api";

/**
 * Fetch full calendar data for a month
 */
export async function getCalendarMonth(
  year: number,
  month: number,
  day: number = 0,
  base1: number = 0,
  base2: number = 1,
  base3: number = 2
): Promise<CalendarFullResponse | null> {
  try {
    const params = new URLSearchParams({
      day: day.toString(),
      base1: base1.toString(),
      base2: base2.toString(),
      base3: base3.toString(),
    });

    const response = await fetch(
      `${API_BASE_URL}/calendar/${year}/${month}?${params.toString()}`
    );

    if (!response.ok) {
      console.error("Failed to fetch calendar:", response.statusText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching calendar:", error);
    return null;
  }
}

/**
 * Fetch calendar events for a month (formatted)
 */
export async function getCalendarEvents(
  year: number,
  month: number,
  day: number = 0
): Promise<CalendarEventsResponse | null> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/calendar/${year}/${month}/events?day=${day}`
    );

    if (!response.ok) {
      console.error("Failed to fetch calendar events:", response.statusText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    return null;
  }
}

/**
 * Fetch detailed information for a specific day
 */
export async function getDayInfo(
  year: number,
  month: number,
  day: number
): Promise<DayInfo | null> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/calendar/${year}/${month}/${day}/info`
    );

    if (!response.ok) {
      console.error("Failed to fetch day info:", response.statusText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching day info:", error);
    return null;
  }
}

/**
 * Fetch current month calendar
 */
export async function getCurrentMonthCalendar(): Promise<CalendarEventsResponse | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/calendar/current`);

    if (!response.ok) {
      console.error("Failed to fetch current calendar:", response.statusText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching current calendar:", error);
    return null;
  }
}

/**
 * Get events for a specific date
 */
export function getEventsForDate(
  events: CalendarEvent[],
  jalaliDate: string
): CalendarEvent[] {
  return events.filter((event) => event.jalali_date === jalaliDate);
}

/**
 * Get holidays for a specific date
 */
export function getHolidaysForDate(
  events: CalendarEvent[],
  jalaliDate: string
): CalendarEvent[] {
  return events.filter(
    (event) => event.jalali_date === jalaliDate && event.is_holiday
  );
}

/**
 * Check if a date is a holiday
 */
export function isHoliday(events: CalendarEvent[], jalaliDate: string): boolean {
  return events.some(
    (event) => event.jalali_date === jalaliDate && event.is_holiday
  );
}

/**
 * Get all holidays in a month
 */
export function getMonthHolidays(events: CalendarEvent[]): CalendarEvent[] {
  return events.filter((event) => event.is_holiday);
}

/**
 * Format Jalali date for display (e.g., "۱ بهمن ۱۴۰۴")
 */
export function formatJalaliDate(year: number, month: number, day: number): string {
  const monthNames = [
    "فروردین",
    "اردیبهشت",
    "خرداد",
    "تیر",
    "مرداد",
    "شهریور",
    "مهر",
    "آبان",
    "آذر",
    "دی",
    "بهمن",
    "اسفند",
  ];

  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  const toPersianDigits = (num: number) =>
    num
      .toString()
      .split("")
      .map((d) => persianDigits[parseInt(d)])
      .join("");

  return `${toPersianDigits(day)} ${monthNames[month - 1]} ${toPersianDigits(year)}`;
}
