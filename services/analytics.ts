import type { AnalyticsData, Period, PeriodType } from '@/domain/analytics';
import { getGoals } from '@/storage/goal';
import { get } from '@/services/api';
import { getToken } from '@/services/auth';
import {
  getPeriodDates,
  calculateTrend,
  generateInsights,
  getPreviousPeriod
} from '@/utils/analytics';

interface TaskAnalyticsResponse {
  total_tasks_created: number;
  total_tasks_completed: number;
  total_time_spent: number;
  active_days: number;
  completed_tasks_by_day: { [date: string]: number };
  time_spent_by_day: { [date: string]: number };
  tasks: Array<{
    id: string;
    date: string;
    status: string;
    accumulated_time: number;
    estimated_time: number;
    is_useful: boolean | null;
  }>;
}

export async function getAnalytics(
  period: Period,
  userId: string
): Promise<AnalyticsData> {
  // Check if user is authenticated first
  const token = getToken();
  if (!token) {
    console.log('🔍 Analytics Debug: No token, returning demo analytics');
    // Return demo analytics for unauthenticated users
    return getDemoAnalytics(period);
  }

  try {
    // Get period dates and info
    const { days, start, end } = getPeriodDates(period);
    const totalDays = days.length;
    console.log('🔍 Analytics Debug: Period info', { totalDays, start: start.toISOString(), end: end.toISOString() });

    // Fetch task analytics from backend
    console.log('🔍 Analytics Debug: Fetching from backend...');
    const taskResponse = await get<TaskAnalyticsResponse>(
      `/api/analytics/tasks/${period.type}/${period.year}/${period.period}`,
      token
    );
    console.log('🔍 Analytics Debug: Backend response received', taskResponse);

    // Fetch goals for the period
    console.log('🔍 Analytics Debug: Fetching goals...');
    const goals = await getGoals(userId, period.type as any, period.year, undefined, period.period);
    console.log('🔍 Analytics Debug: Goals fetched', goals?.length || 0);

    // Calculate task analytics
    const taskAnalytics = {
      totalTasksCreated: taskResponse.total_tasks_created,
      totalTasksCompleted: taskResponse.total_tasks_completed,
      taskCompletionRate: taskResponse.total_tasks_created > 0
        ? (taskResponse.total_tasks_completed / taskResponse.total_tasks_created) * 100
        : 0,
      tasksPerDay: totalDays > 0 ? taskResponse.total_tasks_created / totalDays : 0,
      mostProductiveDay: getMostProductiveDay(taskResponse.completed_tasks_by_day),
      leastProductiveDay: getLeastProductiveDay(taskResponse.completed_tasks_by_day)
    };

    // Calculate time analytics
    const tasks = taskResponse.tasks || [];
    const timeAnalytics = {
      totalTimeSpent: taskResponse.total_time_spent,
      averageTimePerDay: taskResponse.active_days > 0
        ? taskResponse.total_time_spent / taskResponse.active_days
        : 0,
      averageTimePerTask: taskResponse.total_tasks_completed > 0
        ? taskResponse.total_time_spent / taskResponse.total_tasks_completed
        : 0,
      activeDaysCount: taskResponse.active_days,
      estimatedVsActual: calculateEstimatedVsActual(tasks),
      timeByUsefulness: calculateTimeByUsefulness(tasks)
    };

    // Calculate goal analytics
    const goalAnalytics = calculateGoalAnalytics(goals, period);

    // Calculate trends (simplified - no previous period data for now to avoid infinite loops)
    const trends = {
      totalTimeSpent: { current: timeAnalytics.totalTimeSpent, previous: 0, change: 0, trend: 'no-change' as const },
      taskCompletionRate: { current: taskAnalytics.taskCompletionRate, previous: 0, change: 0, trend: 'no-change' as const },
      goalSuccessRate: { current: goalAnalytics.goalSuccessRate, previous: 0, change: 0, trend: 'no-change' as const }
    };

    // Calculate data quality
    const dataQuality = {
      isComplete: taskResponse.active_days >= totalDays * 0.7, // At least 70% of days have activity
      missingDays: totalDays - taskResponse.active_days,
      totalDays
    };

    // Generate insights
    const analyticsData: AnalyticsData = {
      period,
      time: timeAnalytics,
      tasks: taskAnalytics,
      goals: goalAnalytics,
      trends,
      insights: [],
      dataQuality
    };

    analyticsData.insights = generateInsights(analyticsData);
    console.log('🔍 Analytics Debug: Analytics calculated successfully', {
      tasksCreated: taskAnalytics.totalTasksCreated,
      timeSpent: timeAnalytics.totalTimeSpent,
      goalsCount: goals.length
    });

    return analyticsData;

  } catch (error) {
    console.error('🔍 Analytics Debug: Failed to fetch analytics:', error);
    // Log more details for debugging
    if (error && typeof error === 'object' && 'message' in error) {
      console.error('🔍 Analytics Debug: Error details:', error.message);
    }

    // Check if it's an authentication error
    if (error && typeof error === 'object' && 'status' in error && error.status === 401) {
      console.log('🔍 Analytics Debug: Authentication error, returning demo analytics');
      // Return demo analytics for better UX
      return getDemoAnalytics(period);
    }

    console.log('🔍 Analytics Debug: Other error, returning demo analytics');
    // Return demo analytics on other errors for better UX
    return getDemoAnalytics(period);
  }
}

function calculateGoalAnalytics(goals: any[], period: Period) {
  const totalGoals = goals.length;
  const achievedGoals = goals.filter(g => g.status === 'completed').length;
  const successRate = totalGoals > 0 ? (achievedGoals / totalGoals) * 100 : 0;

  // Calculate expected vs actual progress
  const now = new Date();
  const { start, end } = getPeriodDates(period);
  const periodProgress = Math.min(1, (now.getTime() - start.getTime()) / (end.getTime() - start.getTime()));
  const expectedProgress = periodProgress * 100;

  // Simple progress calculation - this could be more sophisticated
  const actualProgress = totalGoals > 0 ? (achievedGoals / totalGoals) * 100 : 0;
  const progressVsExpected = expectedProgress > 0 ? (actualProgress / expectedProgress) * 100 : 100;

  return {
    totalGoals,
    goalsAchieved: achievedGoals,
    goalSuccessRate: successRate,
    progressVsExpected
  };
}

function getMostProductiveDay(completedByDay: { [date: string]: number }): string | null {
  if (Object.keys(completedByDay).length === 0) return null;

  const entries = Object.entries(completedByDay);
  const max = Math.max(...entries.map(([_, count]) => count));
  const bestDay = entries.find(([_, count]) => count === max)?.[0];

  if (!bestDay) return null;

  // Convert to day name
  const date = new Date(bestDay);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

function getLeastProductiveDay(completedByDay: { [date: string]: number }): string | null {
  if (Object.keys(completedByDay).length === 0) return null;

  const entries = Object.entries(completedByDay);
  const min = Math.min(...entries.map(([_, count]) => count));
  const worstDay = entries.find(([_, count]) => count === min)?.[0];

  if (!worstDay) return null;

  // Convert to day name
  const date = new Date(worstDay);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

function calculateEstimatedVsActual(tasks: any[]): { totalEstimated: number; totalActual: number; difference: number } {
  let totalEstimated = 0;
  let totalActual = 0;

  for (const task of tasks) {
    const estimated = task.estimated_time || 0;
    const actual = task.accumulated_time || 0;

    if (estimated > 0) {
      totalEstimated += estimated;
      totalActual += actual;
    }
  }

  return {
    totalEstimated,
    totalActual,
    difference: totalActual - totalEstimated
  };
}

function calculateTimeByUsefulness(tasks: any[]): { useful: number; notUseful: number } {
  let useful = 0;
  let notUseful = 0;

  for (const task of tasks) {
    const timeSpent = task.accumulated_time || 0;
    const isUseful = task.is_useful;

    if (timeSpent > 0) {
      if (isUseful === true) {
        useful += timeSpent;
      } else if (isUseful === false) {
        notUseful += timeSpent;
      }
    }
  }

  return { useful, notUseful };
}

function getDemoAnalytics(period: Period): AnalyticsData {
  // Return sample analytics data for demonstration
  const totalDays = getPeriodDates(period).days.length;
  const activeDays = Math.min(totalDays, 7); // Simulate having data for up to 7 days

  return {
    period,
    time: {
      totalTimeSpent: 1800, // 30 minutes
      averageTimePerDay: Math.round(1800 / activeDays), // Scale based on active days
      averageTimePerTask: 180, // 3 minutes per task
      activeDaysCount: activeDays,
      estimatedVsActual: {
        totalEstimated: 3600, // 1 hour estimated
        totalActual: 1800, // 30 minutes actual
        difference: -1800 // -30 minutes (under budget)
      },
      timeByUsefulness: {
        useful: 1500, // 25 minutes useful
        notUseful: 300 // 5 minutes not useful
      }
    },
    tasks: {
      totalTasksCreated: 10,
      totalTasksCompleted: 8,
      taskCompletionRate: 80,
      tasksPerDay: Math.round((10 / totalDays) * 10) / 10, // Scale based on period
      mostProductiveDay: 'Wednesday',
      leastProductiveDay: 'Sunday'
    },
    goals: {
      totalGoals: 3,
      goalsAchieved: 2,
      goalSuccessRate: 66.7,
      progressVsExpected: 75
    },
    trends: {
      totalTimeSpent: { current: 1800, previous: 1200, change: 50, trend: 'increase' },
      taskCompletionRate: { current: 80, previous: 75, change: 6.7, trend: 'increase' },
      goalSuccessRate: { current: 66.7, previous: 50, change: 33.4, trend: 'increase' }
    },
    insights: [
      'Your productivity is improving! Task completion rate increased by 6.7%.',
      'You\'re under your time estimates - great efficiency!',
      'Most of your time is spent on useful tasks. Keep it up!',
      'Wednesday is your most productive day.'
    ],
    dataQuality: {
      isComplete: activeDays >= totalDays * 0.7, // At least 70% of days have activity
      missingDays: totalDays - activeDays,
      totalDays
    },
    isDemo: true
  };
}

function getEmptyAnalytics(period: Period): AnalyticsData {
  return {
    period,
    time: {
      totalTimeSpent: 0,
      averageTimePerDay: 0,
      averageTimePerTask: 0,
      activeDaysCount: 0,
      estimatedVsActual: {
        totalEstimated: 0,
        totalActual: 0,
        difference: 0
      },
      timeByUsefulness: {
        useful: 0,
        notUseful: 0
      }
    },
    tasks: {
      totalTasksCreated: 0,
      totalTasksCompleted: 0,
      taskCompletionRate: 0,
      tasksPerDay: 0,
      mostProductiveDay: null,
      leastProductiveDay: null
    },
    goals: {
      totalGoals: 0,
      goalsAchieved: 0,
      goalSuccessRate: 0,
      progressVsExpected: 0
    },
    trends: {
      totalTimeSpent: { current: 0, previous: 0, change: 0, trend: 'no-change' },
      taskCompletionRate: { current: 0, previous: 0, change: 0, trend: 'no-change' },
      goalSuccessRate: { current: 0, previous: 0, change: 0, trend: 'no-change' }
    },
    insights: ['No data available for this period.'],
    dataQuality: {
      isComplete: false,
      missingDays: getPeriodDates(period).days.length,
      totalDays: getPeriodDates(period).days.length
    },
    isDemo: false
  };
}