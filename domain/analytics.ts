export type PeriodType = 'weekly' | 'monthly';

export interface Period {
  type: PeriodType;
  year: number;
  period: number; // week number (1-53) for weekly, month number (1-12) for monthly
}

export interface TimeAnalytics {
  totalTimeSpent: number; // minutes
  averageTimePerDay: number; // minutes
  averageTimePerTask: number; // minutes
  activeDaysCount: number;
  estimatedVsActual: {
    totalEstimated: number; // minutes
    totalActual: number; // minutes
    difference: number; // minutes (actual - estimated)
  };
  timeByUsefulness: {
    useful: number; // minutes
    notUseful: number; // minutes
  };
}

export interface TaskAnalytics {
  totalTasksCreated: number;
  totalTasksCompleted: number;
  taskCompletionRate: number; // percentage
  tasksPerDay: number; // average
  mostProductiveDay: string | null; // day name or date
  leastProductiveDay: string | null; // day name or date
}

export interface GoalAnalytics {
  totalGoals: number;
  goalsAchieved: number;
  goalSuccessRate: number; // percentage
  progressVsExpected: number; // percentage (actual vs expected progress)
}

export interface TrendComparison {
  current: number;
  previous: number;
  change: number; // percentage difference
  trend: 'increase' | 'decrease' | 'no-change';
}

export interface TrendsAnalytics {
  totalTimeSpent: TrendComparison;
  taskCompletionRate: TrendComparison;
  goalSuccessRate: TrendComparison;
}

export interface AnalyticsData {
  period: Period;
  time: TimeAnalytics;
  tasks: TaskAnalytics;
  goals: GoalAnalytics;
  trends: TrendsAnalytics;
  insights: string[];
  dataQuality: {
    isComplete: boolean;
    missingDays: number;
    totalDays: number;
  };
  isDemo?: boolean; // Indicates if this is demo/sample data
}

export interface AnalyticsRequest {
  periodType: PeriodType;
  year: number;
  period: number;
}
