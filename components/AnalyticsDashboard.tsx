'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { AnalyticsData, Period, PeriodType } from '@/domain/analytics';
import { getAnalytics, requestAIReview } from '@/services/analytics';
import { getCurrentPeriod, getPreviousPeriod, getNextPeriod, getPeriodDates } from '@/utils/analytics';
import { useUser } from '@/app/context/UserContext';
import { getRecentAIReports, saveAIReport, type AIReportRecord } from '@/storage/ai';

interface AnalyticsDashboardProps {
  initialPeriodType?: PeriodType;
}

type AIParsedReport = {
  summary?: string;
  strengths?: unknown[];
  critiques?: unknown[];
  root_causes?: unknown[];
  recommendations?: unknown[];
  goal_alignment?: unknown;
  plan_7_days?: unknown;
  plan_30_days?: unknown;
  questions?: unknown[];
  [key: string]: unknown;
};

export default function AnalyticsDashboard({ initialPeriodType = 'weekly' }: AnalyticsDashboardProps) {
  const { currentUser } = useUser();
  const [period, setPeriod] = useState<Period>(getCurrentPeriod(initialPeriodType));
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiReport, setAiReport] = useState<{ raw: string; parsed?: unknown } | null>(null);
  const [aiHistory, setAiHistory] = useState<AIReportRecord[]>([]);
  const [selectedAiReportId, setSelectedAiReportId] = useState<string | null>(null);


  const loadAnalytics = useCallback(async () => {
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
  }, [currentUser?.id, period]);

  useEffect(() => {
    console.log('📊 AnalyticsDashboard: useEffect triggered', { period, userId: currentUser?.id });
    if (currentUser?.id) {
      loadAnalytics();
    }
  }, [period, currentUser?.id, loadAnalytics]);

  useEffect(() => {
    const loadHistory = async () => {
      if (!currentUser?.id) return;
      const items = await getRecentAIReports(currentUser.id, 5);
      setAiHistory(items);
    };
    loadHistory();
  }, [currentUser?.id, period]);

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
      <div className="max-w-7xl mx-auto p-2 sm:p-4 md:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16"
        >
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 dark:border-t-indigo-400"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl">📊</span>
            </div>
          </div>
          <p className="text-lg md:text-xl text-muted-foreground font-semibold">Loading Analytics...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    console.log('📊 AnalyticsDashboard: Rendering error state', { error });
    const isAuthError = error.includes('401') || error.includes('validate credentials') || error.includes('Authentication required');

    return (
      <div className="p-6">
        <div className={`border rounded-lg p-4 ${isAuthError ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className={isAuthError ? 'text-yellow-800' : 'text-red-800'}>
                {isAuthError
                  ? 'Analytics requires authentication. Please log in to view your productivity data.'
                  : error.includes('Network error') || error.includes('fetch')
                    ? 'Unable to load analytics data. Please ensure the backend server is running and try again.'
                    : error
                }
              </p>
            </div>
            {!isAuthError && (
              <button
                onClick={loadAnalytics}
                className="ml-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    console.log('📊 AnalyticsDashboard: No analytics data, returning null');
    return null;
  }

  const runAIReview = async () => {
    try {
      setAiError(null);
      setAiLoading(true);
      const result = await requestAIReview(period);
      setAiReport(result);

      if (currentUser?.id) {
        const nowIso = new Date().toISOString();
        const periodKey = `${period.type}:${period.year}:${period.period}`;
        const title = `${period.type} ${period.year}/${period.period}`;

        const record: AIReportRecord = {
          id: `ai-report-${currentUser.id}-${Date.now()}`,
          userId: currentUser.id,
          createdAt: nowIso,
          periodKey,
          title,
          raw: result.raw,
          parsed: result.parsed,
        };

        await saveAIReport(record, 5);
        const items = await getRecentAIReports(currentUser.id, 5);
        setAiHistory(items);
        setSelectedAiReportId(record.id);
      }
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'AI review failed');
    } finally {
      setAiLoading(false);
    }
  };

  console.log('📊 AnalyticsDashboard: Rendering analytics data', {
    period: analytics.period,
    tasksCreated: analytics.tasks.totalTasksCreated,
    insightsCount: analytics.insights.length
  });

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-4 md:p-6">
      {/* Header with Gradient */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-700 dark:via-purple-700 dark:to-pink-700 rounded-2xl p-4 md:p-6 mb-4 md:mb-6 shadow-2xl"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-white">
            <h1 className="text-2xl md:text-3xl font-black mb-2 flex items-center gap-3">
              <span className="text-2xl md:text-3xl">📊</span>
              Analytics Dashboard
            </h1>
            <PeriodSelector period={period} onPeriodChange={handlePeriodChange} />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={runAIReview}
              disabled={aiLoading}
              className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 dark:bg-white/10 dark:hover:bg-white/20 text-white font-bold shadow-lg backdrop-blur-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              title="AI Review"
            >
              {aiLoading ? 'Analyzing…' : 'AI Review'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="flex items-center justify-between mb-6 bg-card dark:bg-card rounded-xl p-4 shadow-lg border border-border dark:border-border"
      >
        <motion.button
          onClick={() => navigatePeriod('prev')}
          whileHover={{ scale: 1.05, x: -2 }}
          whileTap={{ scale: 0.95 }}
          className="px-4 md:px-6 py-2 md:py-3 bg-gradient-to-r from-secondary to-secondary/80 hover:from-primary hover:to-purple-600 rounded-xl font-bold text-secondary-foreground hover:text-white shadow-md hover:shadow-lg transition-all duration-300"
        >
          ← Prev
        </motion.button>
        <span className="text-base md:text-lg font-black text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-center px-2">
          {formatPeriodDisplay(period)}
        </span>
        <motion.button
          onClick={() => navigatePeriod('next')}
          whileHover={{ scale: 1.05, x: 2 }}
          whileTap={{ scale: 0.95 }}
          disabled={isCurrentPeriod(period)}
          className="px-4 md:px-6 py-2 md:py-3 bg-gradient-to-r from-secondary to-secondary/80 hover:from-primary hover:to-purple-600 rounded-xl font-bold text-secondary-foreground hover:text-white shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-secondary disabled:hover:to-secondary/80"
        >
          Next →
        </motion.button>
      </motion.div>

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

      {/* Wellbeing Cards */}
      {analytics.wellbeing && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <MetricCard
            title="Avg Sleep"
            value={`${analytics.wellbeing.avgSleepHours.toFixed(1)}h`}
            subtitle={`${analytics.wellbeing.sleepDays} day(s) logged`}
          />
          <MetricCard
            title="Sleep Quality"
            value={analytics.wellbeing.avgSleepQuality.toFixed(1)}
            subtitle="1-10 scale"
          />
          <MetricCard
            title="Mood"
            value={analytics.wellbeing.avgMoodRating.toFixed(1)}
            subtitle={`Day score ${analytics.wellbeing.avgDayScore.toFixed(1)}`}
          />
          <MetricCard
            title="Water"
            value={analytics.wellbeing.totalWaterIntake.toString()}
            subtitle="glasses (sum)"
          />
          <MetricCard
            title="Study"
            value={`${analytics.wellbeing.totalStudyMinutes}m`}
            subtitle="minutes (sum)"
          />
        </div>
      )}

      {/* AI Report */}
      {(aiError || aiReport) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="mb-8 bg-gradient-to-br from-card via-card to-card/95 dark:from-card dark:via-card dark:to-card/95 p-6 rounded-2xl shadow-xl border-2 border-border dark:border-border"
        >
          <h3 className="text-xl font-black text-transparent bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 dark:from-purple-400 dark:via-pink-400 dark:to-red-400 bg-clip-text mb-4 flex items-center gap-2">
            <span>🧠</span>
            AI Report
          </h3>

          {aiHistory.length > 0 && (
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-2">
              <label className="text-sm font-bold text-muted-foreground">History</label>
              <select
                className="px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                value={selectedAiReportId || ''}
                onChange={(e) => {
                  const id = e.target.value || null;
                  setSelectedAiReportId(id);
                  const item = aiHistory.find((x) => x.id === id);
                  if (item) {
                    setAiReport({ raw: item.raw, parsed: item.parsed });
                  }
                }}
              >
                <option value="">Select a previous report…</option>
                {aiHistory.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} — {new Date(r.createdAt).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
          )}

          {aiError && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-red-800 dark:text-red-200 text-sm">{aiError}</p>
            </div>
          )}

          {(() => {
            const toText = (v: unknown): string => {
              if (typeof v === 'string') return v;
              if (typeof v === 'number' || typeof v === 'boolean') return String(v);
              if (v == null) return '';
              try {
                return JSON.stringify(v);
              } catch {
                return String(v);
              }
            };

            const toStringList = (v: unknown): string[] => {
              if (!Array.isArray(v)) return [];
              return v
                .map((x) => toText(x))
                .map((s) => s.trim())
                .filter(Boolean);
            };

            const parsed: AIParsedReport | null = (() => {
              if (aiReport?.parsed && typeof aiReport.parsed === 'object') {
                return aiReport.parsed as AIParsedReport;
              }

              if (aiReport?.raw) {
                try {
                  const maybe = JSON.parse(aiReport.raw) as unknown;
                  if (maybe && typeof maybe === 'object') return maybe as AIParsedReport;
                } catch {
                  return null;
                }
              }

              return null;
            })();

            const plan7 = parsed && parsed.plan_7_days && typeof parsed.plan_7_days === 'object'
              ? (parsed.plan_7_days as { recommendations?: unknown }).recommendations
              : undefined;

            const plan30 = parsed && parsed.plan_30_days && typeof parsed.plan_30_days === 'object'
              ? (parsed.plan_30_days as { recommendations?: unknown }).recommendations
              : undefined;

            const sections: Array<{ title: string; items?: string[]; text?: string }> = [
              { title: 'Summary', text: parsed?.summary ? String(parsed.summary) : '' },
              { title: 'Strengths', items: toStringList(parsed?.strengths) },
              { title: 'Critiques', items: toStringList(parsed?.critiques) },
              { title: 'Root Causes', items: toStringList(parsed?.root_causes) },
              { title: 'Recommendations', items: toStringList(parsed?.recommendations) },
              { title: 'Goal Alignment', text: parsed?.goal_alignment ? toText(parsed.goal_alignment) : '' },
              { title: 'Plan (7 Days)', items: toStringList(plan7) },
              { title: 'Plan (30 Days)', items: toStringList(plan30) },
              { title: 'Questions', items: toStringList(parsed?.questions) },
            ];

            const hasAnySection = sections.some((s) => (s.text && s.text.trim().length > 0) || (s.items && s.items.length > 0));

            if (!hasAnySection) {
              return aiReport?.raw ? (
                <pre className="text-xs whitespace-pre-wrap break-words bg-muted/30 rounded-lg p-3 border border-border">
                  {aiReport.raw}
                </pre>
              ) : null;
            }

            return (
              <div className="space-y-4">
                {sections.map((s) => {
                  const items = s.items && s.items.length > 0 ? s.items.slice(0, 10) : [];
                  const text = s.text ? s.text.trim() : '';

                  if (!text && items.length === 0) return null;

                  return (
                    <div key={s.title}>
                      <h4 className="text-sm font-bold text-muted-foreground mb-2">{s.title}</h4>
                      {text ? (
                        <p className="text-foreground font-medium whitespace-pre-wrap">{text}</p>
                      ) : (
                        <ul className="space-y-2">
                          {items.map((x, i) => (
                            <li key={`${s.title}-${i}`} className="text-foreground font-medium">- {x}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </motion.div>
      )}

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <TimeAnalyticsCard analytics={analytics} />
        <TaskAnalyticsCard analytics={analytics} />
        <TrendAnalyticsCard analytics={analytics} />
      </div>

      {/* Insights */}
      <InsightsCard insights={analytics.insights} />

      {/* Demo Data Notice */}
      {analytics.isDemo && (
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-blue-800 dark:text-blue-200 text-sm">
                <strong>Demo Data:</strong> You&apos;re viewing sample analytics data. Connect to the backend server for real data.
              </p>
            </div>
            <button
              onClick={loadAnalytics}
              className="ml-4 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Data Quality Notice */}
      {!analytics.dataQuality.isComplete && !analytics.isDemo && (
        <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                <strong>Note:</strong> This period has incomplete data ({analytics.dataQuality.missingDays} missing days).
                Analytics may not be fully representative.
              </p>
            </div>
            <button
              onClick={loadAnalytics}
              className="ml-4 px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition-colors"
            >
              Refresh
            </button>
          </div>
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
        className="px-4 py-2 border-2 border-white/30 rounded-xl bg-white/20 dark:bg-white/10 text-white font-bold shadow-lg backdrop-blur-sm hover:bg-white/30 dark:hover:bg-white/20 transition-all cursor-pointer"
      >
        <option value="weekly" className="text-gray-900">📅 Weekly</option>
        <option value="monthly" className="text-gray-900">📆 Monthly</option>
      </select>
    </div>
  );
}

function MetricCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden bg-gradient-to-br from-card via-card to-card/90 dark:from-card dark:via-card dark:to-card/90 p-6 rounded-2xl shadow-xl border-2 border-primary/20 dark:border-primary/30 hover:border-primary/40 dark:hover:border-primary/50 transition-all duration-300"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-full blur-2xl -mr-12 -mt-12"></div>
      <div className="relative">
        <h3 className="text-sm font-bold text-muted-foreground mb-2">{title}</h3>
        <p className="text-3xl md:text-4xl font-black text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text mb-2">{value}</p>
        <p className="text-sm font-semibold text-muted-foreground">{subtitle}</p>
      </div>
    </motion.div>
  );
}

function TimeAnalyticsCard({ analytics }: { analytics: AnalyticsData }) {
  const { estimatedVsActual, timeByUsefulness } = analytics.time;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.5 }}
      className="bg-gradient-to-br from-card via-card to-card/95 dark:from-card dark:via-card dark:to-card/95 p-6 rounded-2xl shadow-xl border-2 border-border dark:border-border hover:shadow-2xl transition-all duration-300"
    >
      <h3 className="text-xl font-black text-transparent bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 dark:from-blue-400 dark:via-cyan-400 dark:to-teal-400 bg-clip-text mb-4 flex items-center gap-2">
        <span>⏱️</span>
        Time Analytics
      </h3>
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
    </motion.div>
  );
}

function TaskAnalyticsCard({ analytics }: { analytics: AnalyticsData }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="bg-gradient-to-br from-card via-card to-card/95 dark:from-card dark:via-card dark:to-card/95 p-6 rounded-2xl shadow-xl border-2 border-border dark:border-border hover:shadow-2xl transition-all duration-300"
    >
      <h3 className="text-xl font-black text-transparent bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 dark:from-green-400 dark:via-emerald-400 dark:to-teal-400 bg-clip-text mb-4 flex items-center gap-2">
        <span>✅</span>
        Task Analytics
      </h3>
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
    </motion.div>
  );
}


function TrendAnalyticsCard({ analytics }: { analytics: AnalyticsData }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      className="bg-gradient-to-br from-card via-card to-card/95 dark:from-card dark:via-card dark:to-card/95 p-6 rounded-2xl shadow-xl border-2 border-border dark:border-border hover:shadow-2xl transition-all duration-300"
    >
      <h3 className="text-xl font-black text-transparent bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 dark:from-orange-400 dark:via-red-400 dark:to-pink-400 bg-clip-text mb-4 flex items-center gap-2">
        <span>📈</span>
        Trends vs Previous Period
      </h3>
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
    </motion.div>
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      className="bg-gradient-to-br from-card via-card to-card/95 dark:from-card dark:via-card dark:to-card/95 p-6 rounded-2xl shadow-xl border-2 border-border dark:border-border"
    >
      <h3 className="text-xl font-black text-transparent bg-gradient-to-r from-yellow-600 via-amber-600 to-orange-600 dark:from-yellow-400 dark:via-amber-400 dark:to-orange-400 bg-clip-text mb-4 flex items-center gap-2">
        <span>💡</span>
        Insights
      </h3>
      <ul className="space-y-3">
        {insights.map((insight, index) => (
          <motion.li
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + index * 0.1 }}
            className="flex items-start gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-blue-200 dark:border-blue-800"
          >
            <span className="text-xl flex-shrink-0">💡</span>
            <span className="text-foreground font-medium">{insight}</span>
          </motion.li>
        ))}
      </ul>
    </motion.div>
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

// Helper functions moved to utils/analytics.ts or using imported ones

function isCurrentPeriod(period: Period): boolean {
  const current = getCurrentPeriod(period.type);
  return period.year === current.year && period.period === current.period;
}

// getWeeksInYear removed, using imported version