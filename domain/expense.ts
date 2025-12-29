export interface Expense {
  id: string;
  userId: string;
  date: string;
  title: string;
  amount: number;
  createdAt: string;
  updatedAt?: string; // Optional for backward compatibility, auto-populated on save
}
