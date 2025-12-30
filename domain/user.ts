export interface UserProfile {
  id: string;
  name: string;
  username?: string;
  avatar_url?: string;
  email: string; // Added email as it aligns with backend
  level?: string;
  xp?: number;
  createdAt: string;
  // Professional Profile Fields
  education_level?: string;
  job_title?: string;
  general_goal?: string;
  income_level?: string;
  mbti_type?: string;
  bio?: string;
  skills?: string;
  location?: string;
}
