'use client';

import { useState, useEffect } from 'react';
import type { AnalyticsData, Period, PeriodType } from '@/domain/analytics';
import { getAnalytics } from '@/services/analytics';
import { getCurrentPeriod, getPreviousPeriod, getPeriodDates } from '@/utils/analytics';
import { useUser } from '@/app/context/UserContext';

interface AnalyticsDashboardProps {
  initialPeriodType?: PeriodType;
}

export default function AnalyticsDashboard({ initialPeriodType = 'weekly' }: AnalyticsDashboardProps) {
  const { currentUser } = useUser();
  const [period, setPeriod] = useState<Period>(getCurrentPeriod(initialPeriodType));
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('📊 AnalyticsDashboard: useEffect triggered', { period, userId: currentUser?.id });
    if (currentUser?.id) {
      loadAnalytics();
    }
  }, [period, currentUser?.id]);

  const loadAnalytics = async () => {
    console.log('📊 AnalyticsDashboard: loadAnalytics called');
    if (!currentUser?.id) {
      console.log('📊 AnalyticsDashboard: No user ID, returning');
      return;
    }

    try {
      console.log('📊 AnalyticsDashboard: Setting loading state');
      setLoading(true);
      setError(null);
      console.log('📊 AnalyticsDashboard: Calling getAnalytics...');
      const data = await getAnalytics(period, currentUser.id);
      console.log('📊 AnalyticsDashboard: Analytics data received', data);
      setAnalytics(data);
      console.log('📊 AnalyticsDashboard: Analytics state updated');
    } catch (err) {
      console.log('📊 AnalyticsDashboard: Error occurred', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      console.log('📊 AnalyticsDashboard: Setting loading to false');
      setLoading(false);
    }
  };

  const handlePeriodChange = (newPeriod: Period) => {
    console.log('📊 AnalyticsDashboard: Period changed', { from: period, to: newPeriod });
    setPeriod(newPeriod);
  };

  const navigatePeriod = (direction: 'prev' | 'next') => {
    console.log('📊 AnalyticsDashboard: Navigating period', { direction, current: period });
    const newPeriod = direction === 'prev'
      ? getPreviousPeriod(period)
      : getNextPeriod(period);
    console.log('📊 AnalyticsDashboard: New period calculated', newPeriod);
    setPeriod(newPeriod);
  };

  console.log('📊 AnalyticsDashboard: Render state', { loading, error, hasAnalytics: !!analytics });

  if (loading) {
    console.log('📊 AnalyticsDashboard: Rendering loading state');
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    console.log('📊 AnalyticsDashboard: Rendering error state', { error });
    const isAuthError = error.includes('401') || error.includes('validate credentials') || error.includes('Authentication required');

    return (
      <div className="p-6">
        <div className={`border rounded-lg p-4 ${isAuthError ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
          <p className={isAuthError ? 'text-yellow-800' : 'text-red-800'}>
            {isAuthError
              ? 'Analytics requires authentication. Please log in to view your productivity data.'
              : error.includes('Network error') || error.includes('fetch')
              ? 'Unable to load analytics data. Please ensure the backend server is running and try again.'
              : error
            }
          </p>
          {!isAuthError && (
            <button
              onClick={loadAnalytics}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!analytics) {
    console.log('📊 AnalyticsDashboard: No analytics data, returning null');
    return null;
  }

  console.log('📊 AnalyticsDashboard: Rendering analytics data', {
    period: analytics.period,
    tasksCreated: analytics.tasks.totalTasksCreated,
    insightsCount: analytics.insights.length
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Analytics</h1>
        <PeriodSelector period={period} onPeriodChange={handlePeriodChange} />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigatePeriod('prev')}
          className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg transition-colors"
        >
          ← Previous {period.type === 'weekly' ? 'Week' : 'Month'}
        </button>
        <span className="text-lg font-medium text-foreground">
          {formatPeriodDisplay(period)}
        </span>
        <button
          onClick={() => navigatePeriod('next')}
          className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isCurrentPeriod(period)}
        >
          Next {period.type === 'weekly' ? 'Week' : 'Month'} →
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <MetricCard
          title="Total Time"
          value={formatTime(analytics.time.totalTimeSpent)}
          subtitle={`Avg ${formatTime(analytics.time.averageTimePerDay)}/day`}
        />
        <MetricCard
          title="Tasks Completed"
          value={analytics.tasks.totalTasksCompleted.toString()}
          subtitle={`${analytics.tasks.taskCompletionRate.toFixed(1)}% completion rate`}
        />
        <MetricCard
          title="Active Days"
          value={analytics.time.activeDaysCount.toString()}
          subtitle={`of ${analytics.dataQuality.totalDays} total days`}
        />
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <TimeAnalyticsCard analytics={analytics} />
        <TaskAnalyticsCard analytics={analytics} />
        <TrendAnalyticsCard analytics={analytics} />
      </div>

      {/* Insights */}
      <InsightsCard insights={analytics.insights} />

      {/* Data Quality Notice */}
      {!analytics.dataQuality.isComplete && (
        <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200 text-sm">
            <strong>Note:</strong> This period has incomplete data ({analytics.dataQuality.missingDays} missing days).
            Analytics may not be fully representative.
          </p>
        </div>
      )}
    </div>
  );
}

function PeriodSelector({ period, onPeriodChange }: { period: Period; onPeriodChange: (period: Period) => void }) {
  return (
    <div className="flex items-center space-x-4">
      <select
        value={period.type}
        onChange={(e) => {
          const newType = e.target.value as PeriodType;
          const current = getCurrentPeriod(newType);
          onPeriodChange(current);
        }}
        className="px-3 py-2 border border-border rounded-lg bg-background text-foreground"
      >
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
      </select>
    </div>
  );
}

function MetricCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
      <h3 className="text-sm font-medium text-muted-foreground mb-1">{title}</h3>
      <p className="text-2xl font-bold text-foreground mb-1">{value}</p>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function TimeAnalyticsCard({ analytics }: { analytics: AnalyticsData }) {
  const { estimatedVsActual, timeByUsefulness } = analytics.time;

  return (
    <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
      <h3 className="text-lg font-semibold text-foreground mb-4">Time Analytics</h3>
      <div className="space-y-4">
        {/* Basic Time Stats */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Time:</span>
            <span className="font-medium text-foreground">{formatTime(analytics.time.totalTimeSpent)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Average per Day:</span>
            <span className="font-medium text-foreground">{formatTime(analytics.time.averageTimePerDay)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Average per Task:</span>
            <span className="font-medium text-foreground">{formatTime(analytics.time.averageTimePerTask)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Active Days:</span>
            <span className="font-medium text-foreground">{analytics.time.activeDaysCount}</span>
          </div>
        </div>

        {/* Estimated vs Actual */}
        {(estimatedVsActual.totalEstimated > 0 || estimatedVsActual.totalActual > 0) && (
          <div className="border-t border-border pt-4">
            <h4 className="text-sm font-medium text-foreground mb-2">Estimated vs Actual</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Estimated:</span>
                <span className="font-medium">{formatTime(estimatedVsActual.totalEstimated)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Actual:</span>
                <span className="font-medium">{formatTime(estimatedVsActual.totalActual)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Difference:</span>
                <span className={`font-medium ${estimatedVsActual.difference >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {estimatedVsActual.difference >= 0 ? '+' : ''}{formatTime(Math.abs(estimatedVsActual.difference))}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Time by Usefulness */}
        {(timeByUsefulness.useful > 0 || timeByUsefulness.notUseful > 0) && (
          <div className="border-t border-border pt-4">
            <h4 className="text-sm font-medium text-foreground mb-2">Time by Usefulness</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center">
                  <span className="mr-1">👍</span> Useful:
                </span>
                <span className="font-medium text-green-600 dark:text-green-400">{formatTime(timeByUsefulness.useful)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center">
                  <span className="mr-1">👎</span> Not Useful:
                </span>
                <span className="font-medium text-red-600 dark:text-red-400">{formatTime(timeByUsefulness.notUseful)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskAnalyticsCard({ analytics }: { analytics: AnalyticsData }) {
  return (
    <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
      <h3 className="text-lg font-semibold text-foreground mb-4">Task Analytics</h3>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Created:</span>
          <span className="font-medium text-foreground">{analytics.tasks.totalTasksCreated}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Completed:</span>
          <span className="font-medium text-foreground">{analytics.tasks.totalTasksCompleted}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Completion Rate:</span>
          <span className="font-medium text-foreground">{analytics.tasks.taskCompletionRate.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tasks per Day:</span>
          <span className="font-medium text-foreground">{analytics.tasks.tasksPerDay.toFixed(1)}</span>
        </div>
        {analytics.tasks.mostProductiveDay && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Most Productive:</span>
            <span className="font-medium text-foreground">{analytics.tasks.mostProductiveDay}</span>
          </div>
        )}
      </div>
    </div>
  );
}


function TrendAnalyticsCard({ analytics }: { analytics: AnalyticsData }) {
  return (
    <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
      <h3 className="text-lg font-semibold text-foreground mb-4">Trends vs Previous Period</h3>
      <div className="space-y-3">
        <TrendItem
          label="Time Spent"
          trend={analytics.trends.totalTimeSpent}
          formatter={formatTime}
        />
        <TrendItem
          label="Task Completion"
          trend={analytics.trends.taskCompletionRate}
          formatter={(v) => `${v.toFixed(1)}%`}
        />
        <TrendItem
          label="Goal Success"
          trend={analytics.trends.goalSuccessRate}
          formatter={(v) => `${v.toFixed(1)}%`}
        />
      </div>
    </div>
  );
}

function TrendItem({
  label,
  trend,
  formatter
}: {
  label: string;
  trend: { current: number; previous: number; change: number; trend: string };
  formatter: (value: number) => string;
}) {
  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increase': return 'text-green-600 dark:text-green-400';
      case 'decrease': return 'text-red-600 dark:text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increase': return '↑';
      case 'decrease': return '↓';
      default: return '→';
    }
  };

  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}:</span>
      <div className="flex items-center space-x-2">
        <span className="text-sm text-muted-foreground">{formatter(trend.previous)}</span>
        <span className={`font-medium ${getTrendColor(trend.trend)}`}>
          {getTrendIcon(trend.trend)} {Math.abs(trend.change)}%
        </span>
        <span className="font-medium text-foreground">{formatter(trend.current)}</span>
      </div>
    </div>
  );
}

function InsightsCard({ insights }: { insights: string[] }) {
  if (insights.length === 0) return null;

  return (
    <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
      <h3 className="text-lg font-semibold text-foreground mb-4">Insights</h3>
      <ul className="space-y-2">
        {insights.map((insight, index) => (
          <li key={index} className="flex items-start">
            <span className="text-blue-500 dark:text-blue-400 mr-2">💡</span>
            <span className="text-foreground">{insight}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatTime(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatPeriodDisplay(period: Period): string {
  if (period.type === 'weekly') {
    const { start, end } = getPeriodDates(period);
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  } else {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${monthNames[period.period - 1]} ${period.year}`;
  }
}

function getNextPeriod(period: Period): Period {
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

function isCurrentPeriod(period: Period): boolean {
  const current = getCurrentPeriod(period.type);
  return period.year === current.year && period.period === current.period;
}

function getWeeksInYear(year: number): number {
  const d = new Date(year, 11, 31);
  const dayNum = d.getDay() || 7;
  return Math.ceil((((d.getTime() - new Date(year, 0, 1).getTime()) / 86400000) + 1) / 7);
}