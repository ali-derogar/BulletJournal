'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  getAICoachPreferences,
  updateAICoachPreferences,
  runAICoachDigest,
  getAICoachReports,
  getAICoachMemory,
  deleteAICoachMemory,
  type AICoachDigestReport,
  type AICoachMemoryItem,
  type AICoachPreferences,
} from '@/services/ai-coach';

interface EditablePreferences {
  timezone: string;
  language: string;
  daily_digest_enabled: boolean;
  daily_digest_hour: number;
  daily_digest_minute: number;
  weekly_digest_enabled: boolean;
  monthly_digest_enabled: boolean;
  yearly_digest_enabled: boolean;
  critique_style: 'gentle' | 'balanced' | 'strict';
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

const DEFAULT_PREFS: EditablePreferences = {
  timezone: 'UTC',
  language: 'fa',
  daily_digest_enabled: true,
  daily_digest_hour: 20,
  daily_digest_minute: 0,
  weekly_digest_enabled: true,
  monthly_digest_enabled: true,
  yearly_digest_enabled: true,
  critique_style: 'balanced',
  quiet_hours_enabled: false,
  quiet_hours_start: '23:00',
  quiet_hours_end: '07:00',
};

function toEditable(pref: AICoachPreferences): EditablePreferences {
  return {
    timezone: pref.timezone || 'UTC',
    language: pref.language || 'fa',
    daily_digest_enabled: pref.daily_digest_enabled,
    daily_digest_hour: pref.daily_digest_hour,
    daily_digest_minute: pref.daily_digest_minute,
    weekly_digest_enabled: pref.weekly_digest_enabled,
    monthly_digest_enabled: pref.monthly_digest_enabled,
    yearly_digest_enabled: pref.yearly_digest_enabled,
    critique_style: pref.critique_style,
    quiet_hours_enabled: pref.quiet_hours_enabled,
    quiet_hours_start: pref.quiet_hours_start || '23:00',
    quiet_hours_end: pref.quiet_hours_end || '07:00',
  };
}

function splitTime(value: string): { hour: number; minute: number } {
  const [h, m] = value.split(':').map((x) => Number.parseInt(x, 10));
  return {
    hour: Number.isFinite(h) ? h : 20,
    minute: Number.isFinite(m) ? m : 0,
  };
}

export default function AICoachPanel() {
  const [preferences, setPreferences] = useState<EditablePreferences>(DEFAULT_PREFS);
  const [reports, setReports] = useState<AICoachDigestReport[]>([]);
  const [memoryItems, setMemoryItems] = useState<AICoachMemoryItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const dailyTime = useMemo(() => {
    const hh = String(preferences.daily_digest_hour).padStart(2, '0');
    const mm = String(preferences.daily_digest_minute).padStart(2, '0');
    return `${hh}:${mm}`;
  }, [preferences.daily_digest_hour, preferences.daily_digest_minute]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pref, recentReports, memories] = await Promise.all([
        getAICoachPreferences(),
        getAICoachReports(5),
        getAICoachMemory(8),
      ]);
      setPreferences(toEditable(pref));
      setReports(recentReports);
      setMemoryItems(memories);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load AI coach data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const time = splitTime(dailyTime);
      await updateAICoachPreferences({
        ...preferences,
        daily_digest_hour: time.hour,
        daily_digest_minute: time.minute,
      });
      setSuccess('AI coach settings saved.');
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleRunNow = async (digestType: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
    setRunning(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await runAICoachDigest({
        digest_type: digestType,
        force: true,
        deliver_notification: true,
      });

      if (result.status === 'skipped') {
        setSuccess(`Digest skipped: ${result.reason || 'not eligible'}`);
      } else {
        setSuccess(`${digestType} digest ${result.status}.`);
      }

      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to run digest');
    } finally {
      setRunning(false);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      await deleteAICoachMemory(id);
      setMemoryItems((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete memory item');
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-4">
        <div className="bg-card border border-border rounded-2xl p-4 text-sm text-muted-foreground">
          Loading AI coach...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 pb-0">
      <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-foreground">AI Coach</h3>
            <p className="text-xs text-muted-foreground">
              Daily personalized review, memory-based coaching, and push digests.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleRunNow('daily')}
              disabled={running}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              Run Daily Now
            </button>
            <button
              type="button"
              onClick={() => handleRunNow('weekly')}
              disabled={running}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              Run Weekly Now
            </button>
          </div>
        </div>

        {error && <div className="text-xs text-red-600">{error}</div>}
        {success && <div className="text-xs text-green-600">{success}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={preferences.daily_digest_enabled}
                onChange={(e) => setPreferences((prev) => ({ ...prev, daily_digest_enabled: e.target.checked }))}
              />
              Enable daily digest
            </label>

            <div className="flex items-center gap-3">
              <label className="text-sm text-muted-foreground">Daily time</label>
              <input
                type="time"
                value={dailyTime}
                onChange={(e) => {
                  const t = splitTime(e.target.value);
                  setPreferences((prev) => ({
                    ...prev,
                    daily_digest_hour: t.hour,
                    daily_digest_minute: t.minute,
                  }));
                }}
                className="border border-border rounded-lg px-2 py-1 text-sm bg-background"
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm text-muted-foreground">Timezone</label>
              <input
                type="text"
                value={preferences.timezone}
                onChange={(e) => setPreferences((prev) => ({ ...prev, timezone: e.target.value }))}
                className="flex-1 border border-border rounded-lg px-2 py-1 text-sm bg-background"
                placeholder="Asia/Tehran"
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm text-muted-foreground">Critique style</label>
              <select
                value={preferences.critique_style}
                onChange={(e) => setPreferences((prev) => ({ ...prev, critique_style: e.target.value as EditablePreferences['critique_style'] }))}
                className="border border-border rounded-lg px-2 py-1 text-sm bg-background"
              >
                <option value="gentle">Gentle</option>
                <option value="balanced">Balanced</option>
                <option value="strict">Strict</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save settings'}
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-foreground">Recent digests</h4>
              <div className="mt-2 space-y-2">
                {reports.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No digest reports yet.</p>
                ) : (
                  reports.map((report) => (
                    <div key={report.id} className="border border-border rounded-lg p-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-foreground">{report.title}</span>
                        <span className="text-[11px] text-muted-foreground">{report.digest_type}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{report.summary}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-foreground">AI memory</h4>
              <div className="mt-2 space-y-2 max-h-48 overflow-auto pr-1">
                {memoryItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No memory items yet.</p>
                ) : (
                  memoryItems.map((item) => (
                    <div key={item.id} className="border border-border rounded-lg p-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-foreground">{item.key}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteMemory(item.id)}
                          className="text-[11px] text-red-600 hover:text-red-700"
                        >
                          delete
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{item.summary}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
