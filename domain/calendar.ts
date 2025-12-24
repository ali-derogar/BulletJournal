export interface CalendarNote {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD in Persian format
  note: string;
  createdAt: string;
  updatedAt: string;
}