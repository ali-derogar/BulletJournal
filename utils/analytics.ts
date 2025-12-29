import type { Period, PeriodType, AnalyticsData, TrendComparison } from '@/domain/analytics';
import type { Task } from '@/domain/task';
import type { Goal } from '@/domain/goal';

export function getCurrentPeriod(type: PeriodType): Period {
  const now = new Date();

  if (type === 'weekly') {
    const { week, year } = getISOWeek(now);
    return { type: 'weekly', year, period: week };
  } else {
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // getMonth() returns 0-11
    return { type: 'monthly', year, period: month };
  }
}

export function getPreviousPeriod(period: Period): Period {
  if (period.type === 'weekly') {
    if (period.period === 1) {
      // Go to last week of previous year
      const prevYear = period.year - 1;
      const lastWeek = getWeeksInYear(prevYear);
      return { type: 'weekly', year: prevYear, period: lastWeek };
    } else {
      return { type: 'weekly', year: period.year, period: period.period - 1 };
    }
  } else {
    if (period.period === 1) {
      // Go to December of previous year
      return { type: 'monthly', year: period.year - 1, period: 12 };
    } else {
      return { type: 'monthly', year: period.year, period: period.period - 1 };
    }
  }
}

export function getPeriodDates(period: Period): { start: Date; end: Date; days: string[] } {
  if (period.type === 'weekly') {
    const start = getDateOfISOWeek(period.period, period.year);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      days.push(formatDate(date));
    }
    return { start, end, days };
  } else {
    const start = new Date(period.year, period.period - 1, 1);
    const end = new Date(period.year, period.period, 0); // Last day of month
    const days = [];
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      days.push(formatDate(date));
    }
    return { start, end, days };
  }
}

export function getISOWeek(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { week, year: d.getUTCFullYear() };
}

export function getNextPeriod(period: Period): Period {
  if (period.type === 'weekly') {
    const maxWeeks = getWeeksInYear(period.year);
    if (period.period >= maxWeeks) {
      return { type: 'weekly', year: period.year + 1, period: 1 };
    } else {
      return { type: 'weekly', year: period.year, period: period.period + 1 };
    }
  } else {
    if (period.period >= 12) {
      return { type: 'monthly', year: period.year + 1, period: 1 };
    } else {
      return { type: 'monthly', year: period.year, period: period.period + 1 };
    }
  }
}

function getDateOfISOWeek(week: number, year: number): Date {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4) {
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  }
  return ISOweekStart;
}

export function getWeeksInYear(year: number): number {
  const d = new Date(year, 11, 31);
  return getISOWeek(d).week;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateTrend(current: number, previous: number): TrendComparison {
  const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  let trend: 'increase' | 'decrease' | 'no-change' = 'no-change';
  if (change > 5) trend = 'increase';
  else if (change < -5) trend = 'decrease';

  return {
    current,
    previous,
    change: Math.round(change * 100) / 100, // Round to 2 decimal places
    trend
  };
}

export function generateInsights(analytics: AnalyticsData): string[] {
  const insights: string[] = [];

  // Time vs productivity insights
  const { time, tasks, goals, trends } = analytics;

  if (time.totalTimeSpent > 0 && tasks.totalTasksCompleted > 0) {
    const timePerTask = time.totalTimeSpent / tasks.totalTasksCompleted;
    if (timePerTask > 120) { // More than 2 hours per task
      insights.push("You're spending significant time per task. Consider breaking down complex tasks.");
    } else if (timePerTask < 15) { // Less than 15 minutes per task
      insights.push("Your tasks are completed quickly. Great efficiency!");
    }
  }

  // Productivity trends (disabled for now due to infinite loop issue)
  // if (trends.taskCompletionRate.trend === 'decrease') {
  //   insights.push("Task completion rate decreased compared to last period.");
  // } else if (trends.taskCompletionRate.trend === 'increase') {
  //   insights.push("Task completion rate improved! Keep up the good work.");
  // }

  // Goal progress
  if (goals.totalGoals > 0) {
    if (goals.goalSuccessRate < 50) {
      insights.push("Goal success rate is below 50%. Consider adjusting your goals or strategies.");
    } else if (goals.goalSuccessRate > 80) {
      insights.push("Excellent goal achievement rate!");
    }

    if (goals.progressVsExpected < 80) {
      insights.push("You're behind your expected goal pace. Consider increasing focus or adjusting timelines.");
    }
  }

  // Consistency insights
  if (time.activeDaysCount < analytics.dataQuality.totalDays * 0.5) {
    insights.push("Low activity days detected. Try to maintain more consistent daily engagement.");
  }

  // Most/least productive days
  if (tasks.mostProductiveDay) {
    insights.push(`Your most productive day was ${tasks.mostProductiveDay}.`);
  }

  // Default insights if none generated
  if (insights.length === 0) {
    if (analytics.tasks.totalTasksCreated === 0) {
      insights.push("No tasks found for this period. Create some tasks to see your productivity analytics!");
      insights.push("Try switching to a different period or create new tasks to get started.");
    } else if (analytics.dataQuality.isComplete) {
      insights.push("Your productivity data looks consistent. Keep maintaining your routines!");
    } else {
      insights.push("Limited data available for this period. Insights will improve with more activity.");
    }
  }

  return insights.slice(0, 3); // Limit to 3 insights
}