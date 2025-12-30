export interface UserProfile {
  id: string;
  name: string;
  email: string; // Added email as it aligns with backend
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
