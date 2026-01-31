"use client";

import { useState, useEffect, useCallback } from "react";
import type { Expense } from "@/domain";
import { getExpenses, saveExpense, deleteExpense, getAllExpenses } from "@/storage";

interface ExpenseListProps {
  date: string;
  userId: string;
}

export default function ExpenseList({ date, userId }: ExpenseListProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [newTitle, setNewTitle] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newType, setNewType] = useState<'income' | 'expense'>('expense');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingAmount, setEditingAmount] = useState("");
  const [editingType, setEditingType] = useState<'income' | 'expense'>('expense');
  const [loading, setLoading] = useState(true);

  const calculateTotalBalance = useCallback(async () => {
    try {
      const allExpenses = await getAllExpenses(userId);
      const balance = allExpenses.reduce((sum, item) => {
        return item.type === 'income' ? sum + item.amount : sum - item.amount;
      }, 0);
      setTotalBalance(balance);
    } catch (error) {
      console.error("Failed to calculate total balance:", error);
    }
  }, [userId]);

  useEffect(() => {
    async function loadExpenses() {
      try {
        setLoading(true);
        const data = await getExpenses(date, userId);
        setExpenses(data);
        await calculateTotalBalance();
      } catch (error) {
        console.error("Failed to load expenses:", error);
      } finally {
        setLoading(false);
      }
    }

    loadExpenses();

    // Listen for data download events to refresh expenses
    const handleDataDownloaded = () => {
      console.log('[DEBUG] Data downloaded event received, reloading expenses');
      loadExpenses();
    };

    window.addEventListener('data-downloaded', handleDataDownloaded);

    return () => {
      window.removeEventListener('data-downloaded', handleDataDownloaded);
    };
  }, [date, userId, calculateTotalBalance]);

  const handleAddExpense = async () => {
    if (!newTitle.trim() || !newAmount.trim()) return;

    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount <= 0) return;

    try {
      const now = new Date().toISOString();
      const newExpense: Expense = {
        id: `expense-${date}-${Date.now()}`,
        userId,
        date,
        title: newTitle.trim(),
        amount,
        type: newType,
        createdAt: now,
        updatedAt: now, // Set updatedAt for sync tracking
      };

      await saveExpense(newExpense);
      setExpenses([...expenses, newExpense]);
      await calculateTotalBalance();
      setNewTitle("");
      setNewAmount("");
    } catch (error) {
      console.error("Failed to add expense:", error);
    }
  };

  const handleStartEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setEditingTitle(expense.title);
    setEditingAmount(expense.amount.toString());
    setEditingType(expense.type || 'expense');
  };

  const handleSaveEdit = async (expenseId: string) => {
    if (!editingTitle.trim() || !editingAmount.trim()) return;

    const amount = parseFloat(editingAmount);
    if (isNaN(amount) || amount <= 0) return;

    try {
      const expense = expenses.find((e) => e.id === expenseId);
      if (!expense) return;

      const updatedExpense = {
        ...expense,
        title: editingTitle.trim(),
        amount,
        type: editingType,
        updatedAt: new Date().toISOString(), // Set updatedAt for sync tracking
      };

      await saveExpense(updatedExpense);
      setExpenses(expenses.map((e) => (e.id === expenseId ? updatedExpense : e)));
      await calculateTotalBalance();
      setEditingId(null);
      setEditingTitle("");
      setEditingAmount("");
    } catch (error) {
      console.error("Failed to update expense:", error);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingTitle("");
    setEditingAmount("");
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      await deleteExpense(expenseId);
      setExpenses(expenses.filter((e) => e.id !== expenseId));
      await calculateTotalBalance();
    } catch (error) {
      console.error("Failed to delete expense:", error);
    }
  };

  const dailyTotalIncome = expenses
    .filter(e => e.type === 'income')
    .reduce((sum, e) => sum + e.amount, 0);

  const dailyTotalExpense = expenses
    .filter(e => e.type === 'expense')
    .reduce((sum, e) => sum + e.amount, 0);

  if (loading) {
    return (
      <div className="bg-card rounded-lg p-4 shadow animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 bg-muted rounded w-24"></div>
          <div className="h-6 bg-muted rounded w-20"></div>
        </div>
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-10 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg p-4 shadow space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-border">
        <div>
          <h2 className="text-lg font-semibold text-card-foreground">User Balance</h2>
          <div className={`text-2xl font-bold ${totalBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
            ${totalBalance.toFixed(2)}
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-sm font-medium text-muted-foreground">Daily Net</h2>
          <div className={`text-xl font-bold ${(dailyTotalIncome - dailyTotalExpense) >= 0 ? "text-green-600" : "text-red-600"}`}>
            ${(dailyTotalIncome - dailyTotalExpense).toFixed(2)}
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {expenses.length === 0 ? (
          <p className="text-center text-muted-foreground py-4 italic">No entries for this day.</p>
        ) : (
          expenses.map((expense) => (
            <div
              key={expense.id}
              className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 border border-border rounded hover:bg-muted"
            >
              {editingId === expense.id ? (
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex flex-col sm:flex-row gap-2 w-full">
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      className="flex-1 px-2 py-1 border rounded"
                      placeholder="Title"
                      autoFocus
                    />
                    <input
                      type="number"
                      value={editingAmount}
                      onChange={(e) => setEditingAmount(e.target.value)}
                      className="flex-1 sm:w-32 px-2 py-1 border rounded"
                      placeholder="Amount"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1 text-sm cursor-pointer">
                        <input
                          type="radio"
                          checked={editingType === 'expense'}
                          onChange={() => setEditingType('expense')}
                        />
                        Expense
                      </label>
                      <label className="flex items-center gap-1 text-sm cursor-pointer text-green-600 font-medium">
                        <input
                          type="radio"
                          checked={editingType === 'income'}
                          onChange={() => setEditingType('income')}
                        />
                        Income
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(expense.id)}
                        className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1 bg-gray-400 text-white rounded text-sm hover:bg-gray-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
                  <div className="flex items-center gap-2 flex-1">
                    <div className={`w-2 h-2 rounded-full ${expense.type === 'income' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="font-medium">{expense.title}</span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                    <span className={`font-semibold ${expense.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {expense.type === 'income' ? '+' : '-'}${expense.amount.toFixed(2)}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleStartEdit(expense)}
                        className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteExpense(expense.id)}
                        className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="p-3 border rounded-lg bg-muted/50 space-y-3">
        <h3 className="text-sm font-semibold text-foreground/80">Add New Entry</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Description..."
            className="flex-1 px-3 py-2 border rounded text-sm"
          />
          <input
            type="number"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAddExpense()}
            placeholder="Amount"
            className="sm:w-32 px-3 py-2 border rounded text-sm"
            step="0.01"
            min="0"
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
              <input
                type="radio"
                name="type"
                value="expense"
                checked={newType === 'expense'}
                onChange={() => setNewType('expense')}
                className="w-4 h-4 accent-red-500"
              />
              Expense
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-green-700">
              <input
                type="radio"
                name="type"
                value="income"
                checked={newType === 'income'}
                onChange={() => setNewType('income')}
                className="w-4 h-4 accent-green-600"
              />
              Income
            </label>
          </div>
          <button
            onClick={handleAddExpense}
            className="px-6 py-2 bg-primary text-primary-foreground font-medium rounded-md hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            Add Entry
          </button>
        </div>
      </div>
    </div>
  );
}
