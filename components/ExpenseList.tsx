"use client";

import { useState, useEffect } from "react";
import type { Expense } from "@/domain";
import { getExpenses, saveExpense, deleteExpense } from "@/storage";

interface ExpenseListProps {
  date: string;
  userId: string;
}

export default function ExpenseList({ date, userId }: ExpenseListProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingAmount, setEditingAmount] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadExpenses() {
      try {
        setLoading(true);
        const data = await getExpenses(date, userId);
        setExpenses(data);
      } catch (error) {
        console.error("Failed to load expenses:", error);
      } finally {
        setLoading(false);
      }
    }

    loadExpenses();
  }, [date, userId]);

  const handleAddExpense = async () => {
    if (!newTitle.trim() || !newAmount.trim()) return;

    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount <= 0) return;

    try {
      const newExpense: Expense = {
        id: `expense-${date}-${Date.now()}`,
        userId,
        date,
        title: newTitle.trim(),
        amount,
        createdAt: new Date().toISOString(),
      };

      await saveExpense(newExpense);
      setExpenses([...expenses, newExpense]);
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
      };

      await saveExpense(updatedExpense);
      setExpenses(expenses.map((e) => (e.id === expenseId ? updatedExpense : e)));
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
    } catch (error) {
      console.error("Failed to delete expense:", error);
    }
  };

  const totalExpense = expenses.reduce((sum, expense) => sum + expense.amount, 0);

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
    <div className="bg-card rounded-lg p-4 shadow">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-card-foreground">Expenses</h2>
        <div className="text-xl font-bold text-destructive">
          ${totalExpense.toFixed(2)}
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {expenses.map((expense) => (
          <div
            key={expense.id}
            className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 border border-border rounded hover:bg-muted"
          >
            {editingId === expense.id ? (
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
                  className="flex-1 sm:w-24 px-2 py-1 border rounded"
                  placeholder="Amount"
                  step="0.01"
                  min="0"
                />
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
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
                <span className="flex-1 font-medium">{expense.title}</span>
                <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                  <span className="font-semibold text-red-600">
                    ${expense.amount.toFixed(2)}
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
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Expense title..."
          className="flex-1 px-3 py-2 border rounded"
        />
        <div className="flex gap-2">
          <input
            type="number"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAddExpense()}
            placeholder="Amount"
            className="flex-1 sm:w-32 px-3 py-2 border rounded"
            step="0.01"
            min="0"
          />
          <button
            onClick={handleAddExpense}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
