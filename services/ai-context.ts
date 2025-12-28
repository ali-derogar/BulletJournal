import { getGoals, getTasks, getDay } from '@/storage';
import { getCurrentPeriod } from '@/utils/goalUtils';
import type { Goal } from '@/domain';

export interface UserContext {
  goals: {
    yearly: Goal[];
    quarterly: Goal[];
    monthly: Goal[];
    weekly: Goal[];
  };
  tasks: {
    today: any[];
    thisWeek: any[];
    completed: any[];
  };
  journal: {
    today: any | null;
    recentDays: any[];
  };
  analytics: {
    productivity: string;
    patterns: string[];
  };
}

/**
 * Gather all user context for AI analysis
 */
export async function gatherUserContext(userId: string): Promise<UserContext> {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  // Get current periods
  const yearlyPeriod = getCurrentPeriod('yearly');
  const quarterlyPeriod = getCurrentPeriod('quarterly') as { year: number; quarter: number };
  const monthlyPeriod = getCurrentPeriod('monthly') as { year: number; month: number };
  const weeklyPeriod = getCurrentPeriod('weekly') as { year: number; week: number };

  try {
    // Gather all data in parallel
    const [
      yearlyGoals,
      quarterlyGoals,
      monthlyGoals,
      weeklyGoals,
    ] = await Promise.all([
      getGoals(userId, 'yearly', yearlyPeriod.year),
      getGoals(userId, 'quarterly', quarterlyPeriod.year, quarterlyPeriod.quarter),
      getGoals(userId, 'monthly', monthlyPeriod.year, undefined, monthlyPeriod.month),
      getGoals(userId, 'weekly', weeklyPeriod.year, undefined, undefined, weeklyPeriod.week),
    ]);

    // Gather tasks and journal data for the past week
    const dates: string[] = [];
    for (let i = 0; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    const tasksAndJournalsPromises = dates.map(async (date) => ({
      date,
      tasks: await getTasks(date, userId).catch(() => []),
      journal: await getDay(date, userId).catch(() => null),
    }));

    const tasksAndJournals = await Promise.all(tasksAndJournalsPromises);
    const allTasks = tasksAndJournals.flatMap(d => d.tasks);
    const journalEntries = tasksAndJournals.map(d => d.journal).filter(Boolean);

    // Filter tasks
    const todayStr = today.toISOString().split('T')[0];
    const todayTasks = allTasks.filter((t: any) =>
      t.date?.startsWith(todayStr) || t.createdAt?.startsWith(todayStr)
    );
    const completedTasks = allTasks.filter((t: any) => t.completed);
    const weekTasks = allTasks.filter((t: any) => {
      const taskDate = new Date(t.date || t.createdAt);
      return taskDate >= weekAgo && taskDate <= today;
    });

    // Filter journal entries
    const todayJournal = journalEntries.find((j: any) =>
      j.date?.startsWith(todayStr)
    );
    const recentJournals = journalEntries.filter((j: any) => {
      const journalDate = new Date(j.date);
      return journalDate >= weekAgo && journalDate <= today;
    });

    // Calculate analytics
    const completionRate = allTasks.length > 0
      ? (completedTasks.length / allTasks.length * 100).toFixed(0)
      : '0';

    const goalProgress = [...yearlyGoals, ...quarterlyGoals, ...monthlyGoals, ...weeklyGoals]
      .reduce((sum, g) => sum + (g.currentValue / g.targetValue * 100), 0) /
      Math.max([...yearlyGoals, ...quarterlyGoals, ...monthlyGoals, ...weeklyGoals].length, 1);

    return {
      goals: {
        yearly: yearlyGoals,
        quarterly: quarterlyGoals,
        monthly: monthlyGoals,
        weekly: weeklyGoals,
      },
      tasks: {
        today: todayTasks,
        thisWeek: weekTasks,
        completed: completedTasks,
      },
      journal: {
        today: todayJournal,
        recentDays: recentJournals,
      },
      analytics: {
        productivity: `${completionRate}% completion rate, ${goalProgress.toFixed(0)}% goal progress`,
        patterns: analyzePatterns(weekTasks, completedTasks),
      },
    };
  } catch (error) {
    console.error('Error gathering user context:', error);
    // Return empty context on error
    return {
      goals: { yearly: [], quarterly: [], monthly: [], weekly: [] },
      tasks: { today: [], thisWeek: [], completed: [] },
      journal: { today: null, recentDays: [] },
      analytics: { productivity: 'No data', patterns: [] },
    };
  }
}

function analyzePatterns(weekTasks: any[], completedTasks: any[]): string[] {
  const patterns: string[] = [];

  // Find most productive day
  const tasksByDay: Record<string, number> = {};
  weekTasks.forEach(task => {
    const day = new Date(task.date || task.createdAt).toLocaleDateString('en-US', { weekday: 'long' });
    tasksByDay[day] = (tasksByDay[day] || 0) + 1;
  });
  const mostProductiveDay = Object.entries(tasksByDay).sort((a, b) => b[1] - a[1])[0];
  if (mostProductiveDay) {
    patterns.push(`Most productive on ${mostProductiveDay[0]}s`);
  }

  // Check completion rate
  const weekCompletionRate = weekTasks.length > 0
    ? (weekTasks.filter(t => t.completed).length / weekTasks.length * 100)
    : 0;
  if (weekCompletionRate > 70) {
    patterns.push('High completion rate this week');
  } else if (weekCompletionRate < 30) {
    patterns.push('Low completion rate - may need support');
  }

  return patterns;
}

/**
 * Generate AI system prompt with user context
 */
export function generateSystemPrompt(context: UserContext): string {
  const totalGoals = Object.values(context.goals).flat().length;
  const totalTasks = context.tasks.today.length;
  const completedToday = context.tasks.today.filter((t: any) => t.completed).length;

  return `You are a personal productivity assistant for a Bullet Journal app.

CURRENT USER CONTEXT:
- **Goals**: ${totalGoals} active goals (${context.goals.yearly.length} yearly, ${context.goals.quarterly.length} quarterly, ${context.goals.monthly.length} monthly, ${context.goals.weekly.length} weekly)
- **Today's Tasks**: ${totalTasks} tasks (${completedToday} completed)
- **This Week**: ${context.tasks.thisWeek.length} tasks total
- **Productivity**: ${context.analytics.productivity}
- **Patterns**: ${context.analytics.patterns.join(', ') || 'Building patterns'}

GOALS DETAILS:
${formatGoals(context.goals)}

TODAY'S TASKS:
${formatTasks(context.tasks.today)}

RECENT JOURNAL:
${context.journal.today?.content || 'No journal entry today'}

YOUR ROLE:
1. Be encouraging and supportive
2. Give specific, actionable advice based on their actual data
3. Help prioritize tasks aligned with their goals
4. Recognize their progress and patterns
5. Suggest improvements based on their productivity patterns
6. Keep responses concise (2-4 sentences max)

Respond in a friendly, motivating tone. Use their actual goals and tasks in your suggestions.`;
}

function formatGoals(goals: UserContext['goals']): string {
  const allGoals = [
    ...goals.yearly.map(g => `Yearly: ${g.title} (${g.currentValue}/${g.targetValue})`),
    ...goals.quarterly.map(g => `Quarterly: ${g.title} (${g.currentValue}/${g.targetValue})`),
    ...goals.monthly.map(g => `Monthly: ${g.title} (${g.currentValue}/${g.targetValue})`),
    ...goals.weekly.map(g => `Weekly: ${g.title} (${g.currentValue}/${g.targetValue})`),
  ];

  return allGoals.length > 0 ? allGoals.slice(0, 10).join('\n') : 'No active goals';
}

function formatTasks(tasks: any[]): string {
  if (tasks.length === 0) return 'No tasks for today';

  return tasks
    .slice(0, 10)
    .map(t => `${t.completed ? '✅' : '⬜'} ${t.title || t.description}`)
    .join('\n');
}

/**
 * Check if this is the first AI interaction today
 */
export function shouldLoadFullContext(): boolean {
  const lastContextLoad = localStorage.getItem('ai_last_context_load');
  const today = new Date().toISOString().split('T')[0];

  if (lastContextLoad !== today) {
    localStorage.setItem('ai_last_context_load', today);
    return true;
  }

  return false;
}
