export interface SleepInfo {
  id: string;
  userId: string;
  date: string;
  sleepTime: string | null;
  wakeTime: string | null;
  hoursSlept: number;
  quality: number;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
}
