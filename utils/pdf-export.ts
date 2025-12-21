import jsPDF from "jspdf";
import type { Task, Expense, SleepInfo, MoodInfo } from "@/domain";

export interface DailyReportData {
  date: string;
  tasks: Task[];
  expenses: Expense[];
  sleep: SleepInfo | null;
  mood: MoodInfo | null;
}

export function exportDailyReportToPDF(data: DailyReportData) {
  const doc = new jsPDF();
  let yPosition = 20;

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  doc.setFontSize(20);
  doc.text("Daily Journal Report", 20, yPosition);
  yPosition += 10;

  doc.setFontSize(12);
  doc.text(formatDate(data.date), 20, yPosition);
  yPosition += 15;

  doc.setFontSize(16);
  doc.text("Tasks", 20, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  if (data.tasks.length > 0) {
    const todoTasks = data.tasks.filter((t) => t.status === "todo");
    const inProgressTasks = data.tasks.filter(
      (t) => t.status === "in-progress"
    );
    const doneTasks = data.tasks.filter((t) => t.status === "done");

    // Helper function to format time
    const formatTime = (minutes: number): string => {
      if (minutes < 1) return "0m";
      const hours = Math.floor(minutes / 60);
      const mins = Math.floor(minutes % 60);
      if (hours > 0) return `${hours}h ${mins}m`;
      return `${mins}m`;
    };

    // Helper function to get total time for a task
    const getTotalTime = (task: Task): number => {
      let total = task.spentTime;
      if (task.timerRunning && task.timerStart) {
        const startTime = new Date(task.timerStart).getTime();
        const elapsedMinutes = (Date.now() - startTime) / 1000 / 60;
        total += elapsedMinutes;
      }
      return total;
    };

    // Calculate aggregations
    const totalEstimated = data.tasks.reduce(
      (sum, t) => sum + (t.estimatedTime || 0),
      0
    );
    const totalActual = data.tasks.reduce(
      (sum, t) => sum + getTotalTime(t),
      0
    );
    const usefulTime = data.tasks
      .filter((t) => t.isUseful === true)
      .reduce((sum, t) => sum + getTotalTime(t), 0);
    const notUsefulTime = data.tasks
      .filter((t) => t.isUseful === false)
      .reduce((sum, t) => sum + getTotalTime(t), 0);

    doc.text(
      `Total: ${data.tasks.length} | Done: ${doneTasks.length} (${Math.round((doneTasks.length / data.tasks.length) * 100)}%)`,
      20,
      yPosition
    );
    yPosition += 6;

    // Time tracking summary
    if (totalEstimated > 0 || totalActual > 0) {
      doc.text(
        `Time - Estimated: ${formatTime(totalEstimated)} | Actual: ${formatTime(totalActual)}`,
        20,
        yPosition
      );
      yPosition += 5;
      if (usefulTime > 0 || notUsefulTime > 0) {
        doc.text(
          `Useful: ${formatTime(usefulTime)} | Not Useful: ${formatTime(notUsefulTime)}`,
          20,
          yPosition
        );
        yPosition += 5;
      }
      yPosition += 3;
    }

    if (doneTasks.length > 0) {
      doc.text("Completed:", 20, yPosition);
      yPosition += 5;
      doneTasks.forEach((task) => {
        const totalTime = getTotalTime(task);
        const timeInfo =
          totalTime > 0
            ? ` (${formatTime(totalTime)}${task.estimatedTime ? ` / ${formatTime(task.estimatedTime)} est` : ""})`
            : "";
        const usefulInfo = task.isUseful !== null ? (task.isUseful ? " [Useful]" : " [Not Useful]") : "";
        doc.text(`  ✓ ${task.title}${timeInfo}${usefulInfo}`, 25, yPosition);
        yPosition += 5;
      });
    }

    if (inProgressTasks.length > 0) {
      doc.text("In Progress:", 20, yPosition);
      yPosition += 5;
      inProgressTasks.forEach((task) => {
        const totalTime = getTotalTime(task);
        const timeInfo =
          totalTime > 0
            ? ` (${formatTime(totalTime)}${task.estimatedTime ? ` / ${formatTime(task.estimatedTime)} est` : ""})`
            : "";
        const usefulInfo = task.isUseful !== null ? (task.isUseful ? " [Useful]" : " [Not Useful]") : "";
        doc.text(`  ◐ ${task.title}${timeInfo}${usefulInfo}`, 25, yPosition);
        yPosition += 5;
      });
    }

    if (todoTasks.length > 0) {
      doc.text("To Do:", 20, yPosition);
      yPosition += 5;
      todoTasks.forEach((task) => {
        const estimateInfo = task.estimatedTime ? ` (est: ${formatTime(task.estimatedTime)})` : "";
        doc.text(`  ○ ${task.title}${estimateInfo}`, 25, yPosition);
        yPosition += 5;
      });
    }
  } else {
    doc.text("No tasks recorded", 20, yPosition);
    yPosition += 6;
  }

  yPosition += 5;

  doc.setFontSize(16);
  doc.text("Expenses", 20, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  if (data.expenses.length > 0) {
    const total = data.expenses.reduce((sum, e) => sum + e.amount, 0);
    doc.text(`Total Expenses: $${total.toFixed(2)}`, 20, yPosition);
    yPosition += 6;

    data.expenses.forEach((expense) => {
      doc.text(
        `  ${expense.title}: $${expense.amount.toFixed(2)}`,
        20,
        yPosition
      );
      yPosition += 5;
    });
  } else {
    doc.text("No expenses recorded", 20, yPosition);
    yPosition += 6;
  }

  yPosition += 5;

  doc.setFontSize(16);
  doc.text("Sleep & Mood", 20, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  if (data.sleep) {
    doc.text(
      `Sleep: ${data.sleep.sleepTime || "N/A"} - ${data.sleep.wakeTime || "N/A"}`,
      20,
      yPosition
    );
    yPosition += 5;
    doc.text(
      `Duration: ${data.sleep.hoursSlept.toFixed(1)} hours | Quality: ${data.sleep.quality}/10`,
      20,
      yPosition
    );
    yPosition += 6;
  } else {
    doc.text("No sleep data recorded", 20, yPosition);
    yPosition += 6;
  }

  if (data.mood) {
    doc.text(`Mood: ${data.mood.rating}/10`, 20, yPosition);
    yPosition += 5;
    doc.text(`Day Score: ${data.mood.dayScore}/10`, 20, yPosition);
    yPosition += 5;
    doc.text(`Water Intake: ${data.mood.waterIntake} glasses`, 20, yPosition);
    yPosition += 5;
    doc.text(`Study Time: ${data.mood.studyMinutes} minutes`, 20, yPosition);
    yPosition += 6;
  } else {
    doc.text("No mood data recorded", 20, yPosition);
    yPosition += 6;
  }

  yPosition += 5;

  doc.setFontSize(16);
  doc.text("Reflection", 20, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  if (data.mood && data.mood.notes.trim()) {
    const lines = doc.splitTextToSize(data.mood.notes, 170);
    lines.forEach((line: string) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(line, 20, yPosition);
      yPosition += 5;
    });
  } else {
    doc.text("No reflection written", 20, yPosition);
  }

  const fileName = `journal-${data.date}.pdf`;
  doc.save(fileName);
}
