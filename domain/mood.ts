export interface MoodInfo {
  id: string;
  userId: string;
  date: string;
  rating: number;
  dayScore: number;
  notes: string;
  waterIntake: number;
  studyMinutes: number;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
}
