'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useLocale, useTranslations } from 'next-intl';
import type { AnalyticsData, Period, PeriodType } from '@/domain/analytics';
import { getAnalytics, requestAIReview } from '@/services/analytics';
import { getCurrentPeriod, getPreviousPeriod, getNextPeriod, getPeriodDates } from '@/utils/analytics';
import { useUser } from '@/app/context/UserContext';
import { getRecentAIReports, saveAIReport, type AIReportRecord } from '@/storage/ai';

interface AnalyticsDashboardProps {
  initialPeriodType?: PeriodType;
}

function SparklineCard({
  title,
  data,
  className,
}: {
  title: string;
  data: Record<string, number>;
  className: string;
}) {
  const t = useTranslations();
  const pointsCount = Object.keys(data || {}).length;
  return (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h4 className="text-sm font-bold text-muted-foreground truncate">{title}</h4>
        <span className="text-xs font-semibold text-muted-foreground">
          {t('analytics.points', { count: pointsCount })}
        </span>
      </div>
      <Sparkline data={data} className={className} />
    </div>
  );
}

function Sparkline({
  data,
  className,
  height = 56,
}: {
  data: Record<string, number>;
  className: string;
  height?: number;
}) {
  const t = useTranslations();
  const entries = Object.entries(data || {}).sort(([a], [b]) => a.localeCompare(b));
  const values = entries.map(([, v]) => (Number.isFinite(v) ? v : 0));
  const n = values.length;

  if (n < 2) {
    return (
      <div className="h-14 rounded-xl bg-muted/30 border border-border flex items-center justify-center">
        <span className="text-xs text-muted-foreground font-medium">{t('analytics.notEnoughData')}</span>
      </div>
    );
  }

  const w = 240;
  const h = height;
  const pad = 8;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = pad + (i * (w - pad * 2)) / (n - 1);
    const y = pad + ((max - v) * (h - pad * 2)) / range;
    return { x, y };
  });

  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ');

  const area = `${d} L ${points[points.length - 1].x.toFixed(2)} ${(h - pad).toFixed(2)} L ${points[0].x.toFixed(2)} ${(h - pad).toFixed(2)} Z`;
  const gradId = `spark-${titleToId(className)}-${Math.round(values[0] * 1000)}-${n}`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className={`w-full ${className}`} aria-label={t('analytics.sparklineAria')}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gradId})`} />
        <path d={d} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="4" fill="currentColor" />
      </svg>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground font-medium">
        <span>{t('analytics.minValue', { value: formatCompact(min) })}</span>
        <span>{t('analytics.maxValue', { value: formatCompact(max) })}</span>
      </div>
    </div>
  );
}

function CompareBars({
  title,
  unit,
  current,
  previous,
  className,
}: {
  title: string;
  unit: string;
  current: number;
  previous: number;
  className: string;
}) {
  const t = useTranslations();
  const c = Number.isFinite(current) ? current : 0;
  const p = Number.isFinite(previous) ? previous : 0;
  const max = Math.max(c, p, 1);
  const cPct = Math.round((c / max) * 100);
  const pPct = Math.round((p / max) * 100);

  return (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h4 className="text-sm font-bold text-muted-foreground truncate">{title}</h4>
        <span className="text-xs font-semibold text-muted-foreground">{formatCompact(c)}{unit}</span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-14 text-xs text-muted-foreground font-semibold">{t('analytics.now')}</span>
          <div className="flex-1 h-3 rounded-full bg-muted/30 border border-border overflow-hidden">
            <div className={`h-full ${className}`} style={{ width: `${cPct}%`, backgroundColor: 'currentColor' }} />
          </div>
          <span className="w-14 text-right text-xs text-muted-foreground font-semibold">{formatCompact(c)}{unit}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-14 text-xs text-muted-foreground font-semibold">{t('analytics.prev')}</span>
          <div className="flex-1 h-3 rounded-full bg-muted/30 border border-border overflow-hidden">
            <div className={`h-full ${className}`} style={{ width: `${pPct}%`, opacity: 0.55, backgroundColor: 'currentColor' }} />
          </div>
          <span className="w-14 text-right text-xs text-muted-foreground font-semibold">{formatCompact(p)}{unit}</span>
        </div>
      </div>
    </div>
  );
}

function titleToId(s: string): string {
  return s.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
}

function formatCompact(v: number): string {
  if (!Number.isFinite(v)) return '0';
  const n = Math.round(v * 10) / 10;
  if (Math.abs(n) >= 1000000) return `${Math.round(n / 100000) / 10}M`;
  if (Math.abs(n) >= 1000) return `${Math.round(n / 100) / 10}K`;
  return `${n}`;
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

function normalizeAIParsedReportKeys(input: unknown): AIParsedReport | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;

  const source = input as Record<string, unknown>;
  const mapped: AIParsedReport = {
    summary: (source.summary ?? source['خلاصه']) as string | undefined,
    strengths: (source.strengths ?? source['نقاط_قوت'] ?? source['نقاط قوت']) as unknown[] | undefined,
    critiques: (source.critiques ?? source['نقدها'] ?? source['نقاط_ضعف'] ?? source['نقاط ضعف']) as unknown[] | undefined,
    root_causes: (
      source.root_causes ??
      source.rootCauses ??
      source['دلایل_ریشه‌ای'] ??
      source['دلایل ریشه‌ای']
    ) as unknown[] | undefined,
    recommendations: (source.recommendations ?? source['پیشنهادها']) as unknown[] | undefined,
    goal_alignment: (
      source.goal_alignment ??
      source.goalAlignment ??
      source['هم‌راستایی_هدف'] ??
      source['هم‌راستایی هدف']
    ) as unknown,
    plan_7_days: (
      source.plan_7_days ??
      source.plan7Days ??
      source['برنامه_۷_روز'] ??
      source['برنامه ۷ روز']
    ) as unknown,
    plan_30_days: (
      source.plan_30_days ??
      source.plan30Days ??
      source['برنامه_۳۰_روز'] ??
      source['برنامه ۳۰ روز']
    ) as unknown,
    questions: (source.questions ?? source['سوالات']) as unknown[] | undefined,
  };

  return { ...source, ...mapped };
}

export default function AnalyticsDashboard({ initialPeriodType = 'weekly' }: AnalyticsDashboardProps) {
  const t = useTranslations();
  const locale = useLocale();
  const localeTag = locale === 'fa' ? 'fa-IR' : 'en-US';
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
      setError(err instanceof Error ? err.message : t('analytics.loadFailed'));
    } finally {
      console.log('📊 AnalyticsDashboard: Setting loading to false');
      setLoading(false);
    }
  }, [currentUser?.id, period, t]);

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

  useEffect(() => {
    if (aiReport) return;
    if (selectedAiReportId) return;
    if (aiHistory.length === 0) return;
    const latest = aiHistory[0];
    setSelectedAiReportId(latest.id);
    setAiReport({ raw: latest.raw, parsed: latest.parsed });
  }, [aiHistory, aiReport, selectedAiReportId]);

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
          <p className="text-lg md:text-xl text-muted-foreground font-semibold">{t('analytics.loading')}</p>
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
                  ? t('analytics.authRequired')
                  : error.includes('Network error') || error.includes('fetch')
                    ? t('analytics.networkError')
                    : error
                }
              </p>
            </div>
            {!isAuthError && (
              <button
                onClick={loadAnalytics}
                className="ml-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                {t('common.tryAgain')}
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
        const periodTypeLabel = period.type === 'weekly' ? t('analytics.period.weekly') : t('analytics.period.monthly');
        const title = t('analytics.periodTitle', {
          type: periodTypeLabel,
          year: period.year,
          period: period.period
        });

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
      setAiError(e instanceof Error ? e.message : t('analytics.aiReviewFailed'));
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
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* Header with Gradient */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-700 dark:via-purple-700 dark:to-pink-700 rounded-3xl p-4 sm:p-6 md:p-8 mb-4 sm:mb-6 shadow-2xl border border-white/10"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
          <div className="text-white flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black mb-2 flex items-center gap-3">
              <span className="text-2xl md:text-3xl">📊</span>
              <span className="truncate">{t('analytics.dashboardTitle')}</span>
            </h1>
            <PeriodSelector period={period} onPeriodChange={handlePeriodChange} />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={runAIReview}
              disabled={aiLoading}
              className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 dark:bg-white/10 dark:hover:bg-white/20 text-white font-bold shadow-lg backdrop-blur-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              title={t('analytics.aiReview')}
            >
              {aiLoading ? t('analytics.analyzing') : t('analytics.aiReview')}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="grid grid-cols-[auto,1fr,auto] items-center gap-3 mb-6 bg-card dark:bg-card rounded-2xl p-3 sm:p-4 shadow-lg border border-border dark:border-border"
      >
        <motion.button
          onClick={() => navigatePeriod('prev')}
          whileHover={{ scale: 1.05, x: -2 }}
          whileTap={{ scale: 0.95 }}
          className="px-3 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-secondary to-secondary/80 hover:from-primary hover:to-purple-600 rounded-xl font-bold text-secondary-foreground hover:text-white shadow-md hover:shadow-lg transition-all duration-300 text-sm sm:text-base"
        >
          {t('analytics.prevButton')}
        </motion.button>
        <span className="text-base md:text-lg font-black text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-center px-2">
          {formatPeriodDisplay(period, localeTag)}
        </span>
        <motion.button
          onClick={() => navigatePeriod('next')}
          whileHover={{ scale: 1.05, x: 2 }}
          whileTap={{ scale: 0.95 }}
          disabled={isCurrentPeriod(period)}
          className="px-3 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-secondary to-secondary/80 hover:from-primary hover:to-purple-600 rounded-xl font-bold text-secondary-foreground hover:text-white shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-secondary disabled:hover:to-secondary/80 text-sm sm:text-base"
        >
          {t('analytics.nextButton')}
        </motion.button>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <MetricCard
          title={t('analytics.totalTime')}
          value={formatTime(analytics.time.totalTimeSpent, t)}
          subtitle={t('analytics.avgPerDay', { time: formatTime(analytics.time.averageTimePerDay, t) })}
        />
        <MetricCard
          title={t('analytics.tasksCompleted')}
          value={analytics.tasks.totalTasksCompleted.toString()}
          subtitle={t('analytics.completionRate', { rate: analytics.tasks.taskCompletionRate.toFixed(1) })}
        />
        <MetricCard
          title={t('analytics.activeDays')}
          value={analytics.time.activeDaysCount.toString()}
          subtitle={t('analytics.totalDays', { total: analytics.dataQuality.totalDays })}
        />
      </div>

      {/* Wellbeing Cards */}
      {analytics.wellbeing && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <MetricCard
          title={t('analytics.avgSleep')}
          value={t('analytics.hoursShort', { hours: analytics.wellbeing.avgSleepHours.toFixed(1) })}
          subtitle={t('analytics.sleepDaysLogged', { count: analytics.wellbeing.sleepDays })}
        />
          <MetricCard
            title={t('analytics.sleepQuality')}
            value={analytics.wellbeing.avgSleepQuality.toFixed(1)}
            subtitle={t('analytics.scaleOneToTen')}
          />
          <MetricCard
            title={t('analytics.mood')}
            value={analytics.wellbeing.avgMoodRating.toFixed(1)}
            subtitle={t('analytics.dayScore', { score: analytics.wellbeing.avgDayScore.toFixed(1) })}
          />
          <MetricCard
            title={t('analytics.water')}
            value={analytics.wellbeing.totalWaterIntake.toString()}
            subtitle={t('analytics.glassesSum')}
          />
        <MetricCard
          title={t('analytics.study')}
          value={t('analytics.minutesShort', { value: analytics.wellbeing.totalStudyMinutes })}
          subtitle={t('analytics.minutesSum')}
        />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, duration: 0.45 }}
          className="bg-gradient-to-br from-card via-card to-card/95 dark:from-card dark:via-card dark:to-card/95 p-4 sm:p-6 rounded-2xl shadow-xl border-2 border-border dark:border-border"
        >
          <h3 className="text-xl font-black text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text mb-4 flex items-center gap-2">
            <span>📈</span>
            {t('analytics.trends')}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <CompareBars
              title={t('analytics.time')}
              unit={t('analytics.minutesUnit')}
              current={analytics.trends.totalTimeSpent.current}
              previous={analytics.trends.totalTimeSpent.previous}
              className="text-indigo-600 dark:text-indigo-400"
            />
            <CompareBars
              title={t('analytics.completion')}
              unit="%"
              current={analytics.trends.taskCompletionRate.current}
              previous={analytics.trends.taskCompletionRate.previous}
              className="text-emerald-600 dark:text-emerald-400"
            />
            <CompareBars
              title={t('analytics.goals')}
              unit="%"
              current={analytics.trends.goalSuccessRate.current}
              previous={analytics.trends.goalSuccessRate.previous}
              className="text-amber-600 dark:text-amber-400"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.45 }}
          className="bg-gradient-to-br from-card via-card to-card/95 dark:from-card dark:via-card dark:to-card/95 p-4 sm:p-6 rounded-2xl shadow-xl border-2 border-border dark:border-border"
        >
          <h3 className="text-xl font-black text-transparent bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 dark:from-blue-400 dark:via-cyan-400 dark:to-teal-400 bg-clip-text mb-4 flex items-center gap-2">
            <span>🌙</span>
            {t('analytics.wellbeing')}
          </h3>

          {analytics.wellbeing?.series ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <SparklineCard
                title={t('analytics.sleepHours')}
                className="text-indigo-600 dark:text-indigo-400"
                data={analytics.wellbeing.series.sleepHoursByDay}
              />
              <SparklineCard
                title={t('analytics.moodRating')}
                className="text-emerald-600 dark:text-emerald-400"
                data={analytics.wellbeing.series.moodRatingByDay}
              />
              <SparklineCard
                title={t('analytics.water')}
                className="text-blue-600 dark:text-blue-400"
                data={analytics.wellbeing.series.waterIntakeByDay}
              />
              <SparklineCard
                title={t('analytics.studyMinutes')}
                className="text-amber-600 dark:text-amber-400"
                data={analytics.wellbeing.series.studyMinutesByDay}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-border/60 bg-background/40 p-4">
              <p className="text-sm text-muted-foreground font-medium">{t('analytics.noWellbeing')}</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* AI Report */}
      {(aiError || aiReport || aiHistory.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="mb-8 bg-gradient-to-br from-card via-card to-card/95 dark:from-card dark:via-card dark:to-card/95 p-4 sm:p-6 rounded-2xl shadow-xl border-2 border-border dark:border-border"
        >
          <h3 className="text-xl font-black text-transparent bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 dark:from-purple-400 dark:via-pink-400 dark:to-red-400 bg-clip-text mb-4 flex items-center gap-2">
            <span>🧠</span>
            {t('analytics.aiReport')}
          </h3>

          {aiHistory.length > 0 && (
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-2">
              <label className="text-sm font-bold text-muted-foreground">{t('analytics.history')}</label>
              <select
                className="w-full sm:w-[360px] px-3 py-2.5 rounded-xl border border-border bg-background text-foreground"
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
                <option value="">{t('analytics.selectPreviousReport')}</option>
                {aiHistory.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} — {new Date(r.createdAt).toLocaleString(localeTag)}
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

            const tryParseJson = (raw: string): AIParsedReport | null => {
              const cleanedRaw = raw
                .replace(/^```(?:json)?/i, '')
                .replace(/```$/i, '')
                .trim();
              try {
                const maybe = JSON.parse(cleanedRaw) as unknown;
                const normalized = normalizeAIParsedReportKeys(maybe);
                if (normalized) return normalized;
                return null;
              } catch {
                const first = cleanedRaw.indexOf('{');
                const last = cleanedRaw.lastIndexOf('}');
                if (first >= 0 && last > first) {
                  const slice = cleanedRaw.slice(first, last + 1);
                  try {
                    const maybe = JSON.parse(slice) as unknown;
                    const normalized = normalizeAIParsedReportKeys(maybe);
                    if (normalized) return normalized;
                  } catch {
                    return null;
                  }
                }
                return null;
              }
            };

            const parseSectionedText = (raw: string): Partial<AIParsedReport> | null => {
              const lines = raw.split(/\r?\n/).map((l) => l.trim());
              const headings: Record<string, keyof AIParsedReport> = {
                'summary': 'summary',
                'strengths': 'strengths',
                'critiques': 'critiques',
                'root causes': 'root_causes',
                'root_causes': 'root_causes',
                'recommendations': 'recommendations',
                'goal alignment': 'goal_alignment',
                'goal_alignment': 'goal_alignment',
                'plan (7 days)': 'plan_7_days',
                'plan_7_days': 'plan_7_days',
                'plan (30 days)': 'plan_30_days',
                'plan_30_days': 'plan_30_days',
                'questions': 'questions',
              };

              let current: keyof AIParsedReport | null = null;
              const out: Partial<Record<keyof AIParsedReport, string[] | string>> = {};

              for (const line of lines) {
                if (!line) continue;
                const key = headings[line.toLowerCase()];
                if (key) {
                  current = key;
                  if (out[current] == null) {
                    out[current] = (current === 'summary' || current === 'goal_alignment') ? '' : [];
                  }
                  continue;
                }

                if (!current) continue;

                const isListTarget = current !== 'summary' && current !== 'goal_alignment';
                if (isListTarget) {
                  const arr = Array.isArray(out[current]) ? (out[current] as string[]) : [];
                  const cleaned = line.replace(/^[-*•]\s*/, '').trim();
                  if (cleaned) arr.push(cleaned);
                  out[current] = arr;
                } else {
                  const prev = typeof out[current] === 'string' ? (out[current] as string) : '';
                  out[current] = prev ? `${prev}\n${line}` : line;
                }
              }

              const hasAny = Object.values(out).some((v) => (typeof v === 'string' ? v.trim().length > 0 : Array.isArray(v) && v.length > 0));
              if (!hasAny) return null;

              return out as Partial<AIParsedReport>;
            };

            const parsed: AIParsedReport | null = (() => {
              if (aiReport?.parsed && typeof aiReport.parsed === 'object') {
                return normalizeAIParsedReportKeys(aiReport.parsed);
              }

              if (aiReport?.raw) {
                const fromJson = tryParseJson(aiReport.raw);
                if (fromJson) return fromJson;

                const fromSections = parseSectionedText(aiReport.raw);
                if (fromSections) return fromSections as AIParsedReport;
              }

              return null;
            })();

            const normalizePlanItems = (v: unknown): string[] => {
              if (Array.isArray(v)) return toStringList(v);
              if (v && typeof v === 'object' && 'recommendations' in (v as Record<string, unknown>)) {
                return toStringList((v as Record<string, unknown>).recommendations);
              }
              return [];
            };

            const plan7 = normalizePlanItems(parsed?.plan_7_days);
            const plan30 = normalizePlanItems(parsed?.plan_30_days);

            const sections: Array<{ title: string; items?: string[]; text?: string }> = [
              { title: t('analytics.report.summary'), text: parsed?.summary ? String(parsed.summary) : '' },
              { title: t('analytics.report.strengths'), items: toStringList(parsed?.strengths) },
              { title: t('analytics.report.critiques'), items: toStringList(parsed?.critiques) },
              { title: t('analytics.report.rootCauses'), items: toStringList(parsed?.root_causes) },
              { title: t('analytics.report.recommendations'), items: toStringList(parsed?.recommendations) },
              { title: t('analytics.report.goalAlignment'), text: parsed?.goal_alignment ? toText(parsed.goal_alignment) : '' },
              { title: t('analytics.report.plan7Days'), items: plan7 },
              { title: t('analytics.report.plan30Days'), items: plan30 },
              { title: t('analytics.report.questions'), items: toStringList(parsed?.questions) },
            ];

            const hasAnySection = sections.some((s) => (s.text && s.text.trim().length > 0) || (s.items && s.items.length > 0));
            const rawFallbackText = (aiReport?.raw || '').trim();

            if (!hasAnySection) {
              if (rawFallbackText.length > 0) {
                return (
                  <div className="rounded-2xl border border-border/60 bg-background/40 p-3 sm:p-4">
                    <h4 className="text-sm font-bold text-muted-foreground mb-2">{t('analytics.report.summary')}</h4>
                    <p className="text-foreground font-medium whitespace-pre-wrap">{rawFallbackText}</p>
                  </div>
                );
              }
              return (
                <div className="bg-muted/30 rounded-lg p-3 border border-border">
                  <p className="text-sm text-muted-foreground font-medium">
                    {t('analytics.reportFormatUnavailable')}
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {sections.map((s) => {
                  const items = s.items && s.items.length > 0 ? s.items.slice(0, 10) : [];
                  const text = s.text ? s.text.trim() : '';

                  if (!text && items.length === 0) return null;

                  return (
                    <div key={s.title} className="rounded-2xl border border-border/60 bg-background/40 p-3 sm:p-4">
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
                <strong>{t('analytics.demoData')}:</strong> {t('analytics.demoDataDescription')}
              </p>
            </div>
            <button
              onClick={loadAnalytics}
              className="ml-4 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
            >
              {t('common.tryAgain')}
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
                <strong>{t('analytics.note')}:</strong> {t('analytics.incompleteData', { count: analytics.dataQuality.missingDays })}
              </p>
            </div>
            <button
              onClick={loadAnalytics}
              className="ml-4 px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition-colors"
            >
              {t('analytics.refresh')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PeriodSelector({ period, onPeriodChange }: { period: Period; onPeriodChange: (period: Period) => void }) {
  const t = useTranslations();
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
        <option value="weekly" className="text-gray-900">📅 {t('analytics.period.weekly')}</option>
        <option value="monthly" className="text-gray-900">📆 {t('analytics.period.monthly')}</option>
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
  const t = useTranslations();
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
        {t('analytics.timeAnalytics')}
      </h3>
      <div className="space-y-4">
        {/* Basic Time Stats */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('analytics.totalTimeLabel')}</span>
            <span className="font-medium text-foreground">{formatTime(analytics.time.totalTimeSpent, t)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('analytics.averagePerDay')}</span>
            <span className="font-medium text-foreground">{formatTime(analytics.time.averageTimePerDay, t)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('analytics.averagePerTask')}</span>
            <span className="font-medium text-foreground">{formatTime(analytics.time.averageTimePerTask, t)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('analytics.activeDaysLabel')}</span>
            <span className="font-medium text-foreground">{analytics.time.activeDaysCount}</span>
          </div>
        </div>

        {/* Estimated vs Actual */}
        {(estimatedVsActual.totalEstimated > 0 || estimatedVsActual.totalActual > 0) && (
          <div className="border-t border-border pt-4">
            <h4 className="text-sm font-medium text-foreground mb-2">{t('analytics.estimatedVsActual')}</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('analytics.estimated')}</span>
                <span className="font-medium">{formatTime(estimatedVsActual.totalEstimated, t)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('analytics.actual')}</span>
                <span className="font-medium">{formatTime(estimatedVsActual.totalActual, t)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('analytics.difference')}</span>
                <span className={`font-medium ${estimatedVsActual.difference >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {estimatedVsActual.difference >= 0 ? '+' : ''}{formatTime(Math.abs(estimatedVsActual.difference), t)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Time by Usefulness */}
        {(timeByUsefulness.useful > 0 || timeByUsefulness.notUseful > 0) && (
          <div className="border-t border-border pt-4">
            <h4 className="text-sm font-medium text-foreground mb-2">{t('analytics.timeByUsefulness')}</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center">
                  <span className="mr-1">👍</span> {t('analytics.useful')}
                </span>
                <span className="font-medium text-green-600 dark:text-green-400">{formatTime(timeByUsefulness.useful, t)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center">
                  <span className="mr-1">👎</span> {t('analytics.notUseful')}
                </span>
                <span className="font-medium text-red-600 dark:text-red-400">{formatTime(timeByUsefulness.notUseful, t)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function TaskAnalyticsCard({ analytics }: { analytics: AnalyticsData }) {
  const t = useTranslations();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="bg-gradient-to-br from-card via-card to-card/95 dark:from-card dark:via-card dark:to-card/95 p-6 rounded-2xl shadow-xl border-2 border-border dark:border-border hover:shadow-2xl transition-all duration-300"
    >
      <h3 className="text-xl font-black text-transparent bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 dark:from-green-400 dark:via-emerald-400 dark:to-teal-400 bg-clip-text mb-4 flex items-center gap-2">
        <span>✅</span>
        {t('analytics.taskAnalytics')}
      </h3>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('analytics.created')}</span>
          <span className="font-medium text-foreground">{analytics.tasks.totalTasksCreated}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('analytics.completed')}</span>
          <span className="font-medium text-foreground">{analytics.tasks.totalTasksCompleted}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('analytics.completionRateLabel')}</span>
          <span className="font-medium text-foreground">{analytics.tasks.taskCompletionRate.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('analytics.tasksPerDay')}</span>
          <span className="font-medium text-foreground">{analytics.tasks.tasksPerDay.toFixed(1)}</span>
        </div>
        {analytics.tasks.mostProductiveDay && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('analytics.mostProductive')}</span>
            <span className="font-medium text-foreground">{analytics.tasks.mostProductiveDay}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}


function TrendAnalyticsCard({ analytics }: { analytics: AnalyticsData }) {
  const t = useTranslations();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      className="bg-gradient-to-br from-card via-card to-card/95 dark:from-card dark:via-card dark:to-card/95 p-6 rounded-2xl shadow-xl border-2 border-border dark:border-border hover:shadow-2xl transition-all duration-300"
    >
      <h3 className="text-xl font-black text-transparent bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 dark:from-orange-400 dark:via-red-400 dark:to-pink-400 bg-clip-text mb-4 flex items-center gap-2">
        <span>📈</span>
        {t('analytics.trendsVsPrevious')}
      </h3>
      <div className="space-y-3">
        <TrendItem
          label={t('analytics.timeSpent')}
          trend={analytics.trends.totalTimeSpent}
          formatter={(v) => formatTime(v, t)}
        />
        <TrendItem
          label={t('analytics.taskCompletion')}
          trend={analytics.trends.taskCompletionRate}
          formatter={(v) => `${v.toFixed(1)}%`}
        />
        <TrendItem
          label={t('analytics.goalSuccess')}
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
  const t = useTranslations();
  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increase': return 'text-green-600 dark:text-green-400';
      case 'decrease': return 'text-red-600 dark:text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increase': return t('analytics.trendUp');
      case 'decrease': return t('analytics.trendDown');
      default: return t('analytics.trendStable');
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
  const t = useTranslations();
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
        {t('analytics.insights')}
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

function formatTime(minutes: number, t: ReturnType<typeof useTranslations>): string {
  if (minutes < 60) {
    return t('analytics.minutesShort', { value: Math.round(minutes) });
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0
    ? t('analytics.hoursMinutes', { hours, minutes: mins })
    : t('analytics.hoursShort', { hours });
}

function formatPeriodDisplay(period: Period, localeTag: string): string {
  if (period.type === 'weekly') {
    const { start, end } = getPeriodDates(period);
    return `${start.toLocaleDateString(localeTag)} - ${end.toLocaleDateString(localeTag)}`;
  } else {
    const month = new Intl.DateTimeFormat(localeTag, { month: 'long' })
      .format(new Date(period.year, period.period - 1, 1));
    return `${month} ${period.year}`;
  }
}

// Helper functions moved to utils/analytics.ts or using imported ones

function isCurrentPeriod(period: Period): boolean {
  const current = getCurrentPeriod(period.type);
  return period.year === current.year && period.period === current.period;
}

// getWeeksInYear removed, using imported version
