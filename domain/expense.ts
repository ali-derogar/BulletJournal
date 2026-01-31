export interface Expense {
  id: string;
  userId: string;
  date: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  createdAt: string;
  updatedAt?: string; // Optional for backward compatibility, auto-populated on save
}
