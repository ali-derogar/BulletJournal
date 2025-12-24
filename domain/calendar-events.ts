/**
 * Calendar event types from Time.ir API
 */

export interface CalendarEvent {
  id: number;
  title: string;
  description: string;
  is_holiday: boolean;
  jalali_date: string; // Format: YYYY-MM-DD
  gregorian_date: string; // Format: YYYY-MM-DD
  hijri_date: string; // Format: YYYY-MM-DD
  jalali_day_title: string; // e.g., "شنبه", "یکشنبه"
  gregorian_day_title?: string; // e.g., "Saturday", "Sunday"
  date_string: string; // e.g., "۱ بهمن"
  base: number; // 0=Persian, 1=Gregorian, 2=Hijri
}

export interface CalendarDay {
  index_in_base1: number; // Day index in Persian calendar
  index_in_base2: number; // Day index in Gregorian calendar
  index_in_base3: number; // Day index in Hijri calendar
  enabled: boolean;
  is_holiday: boolean;
  is_weekend: boolean;
  is_today: boolean;
  row_index: number;
  column_index: number;
}

export interface CalendarMonthDetail {
  month_index: number;
  month_title: string;
  year: number;
}

export interface CalendarBase {
  base: number;
  month_list: CalendarMonthDetail[];
  year_list: number[];
}

export interface CalendarEventsResponse {
  year: number;
  month: number;
  day: number;
  events: CalendarEvent[];
  holidays: CalendarEvent[];
  total_events: number;
  total_holidays: number;
}

export interface DayInfo {
  jalali_date: string;
  events: {
    title: string;
    description: string;
    is_holiday: boolean;
    base: number;
  }[];
  is_holiday: boolean;
  is_weekend: boolean;
  is_today: boolean;
  enabled: boolean;
}

export interface CalendarFullResponse {
  status_code: number;
  object_type: string;
  time_taken: number;
  creation_date: string;
  url: string;
  message: string;
  error: null | string;
  data: {
    year: number;
    month: number;
    day: number;
    base1: number;
    base2: number;
    base3: number;
    created_date: string;
    calendar_detail_list: CalendarBase[];
    day_list: CalendarDay[];
    event_list: Array<{
      id: number;
      title: string;
      body: string;
      reoccur: boolean;
      base: number;
      gregorian_year: number;
      gregorian_month: number;
      gregorian_day: number;
      gregorian_day_title: string;
      jalali_year: number;
      jalali_month: number;
      jalali_day: number;
      jalali_day_title: string;
      hijri_year: number;
      hijri_month: number;
      hijri_day: number;
      hijri_day_title: string;
      is_holiday: boolean;
      date_string: string;
      media: null | string;
    }>;
  };
  meta: {
    title: string;
    description: string;
    term_of_use: string;
    copyright: string;
    version: string;
    contact: {
      name: string;
      url: string;
      email: string;
    };
    license: {
      name: string;
      url: string;
    };
  };
}
