export interface DailyJournal {
  id: string;
  userId: string;
  date: string;
  tasks: string[];
  expenses: string[];
  sleepId: string | null;
  moodId: string | null;
  createdAt: string;
  updatedAt?: string; // Optional for backward compatibility, auto-populated on save
}
