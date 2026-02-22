import { get, post, put, del } from './api';
import { getToken } from './auth';

export interface AICoachPreferences {
  id: string;
  user_id: string;
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
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AICoachDigestReport {
  id: string;
  user_id: string;
  digest_type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  period_key: string;
  target_date: string;
  language: string;
  title: string;
  summary: string;
  score?: number;
  delivered: boolean;
  delivered_at?: string | null;
  delivery_channel?: string | null;
  created_by: string;
  created_at?: string;
  parsed?: Record<string, unknown>;
  raw?: string;
}

export interface RunDigestResponse {
  status: 'created' | 'updated' | 'exists' | 'skipped';
  reason?: string;
  report?: AICoachDigestReport;
  push_result?: {
    sent: number;
    failed: number;
    expired: number;
  };
}

export interface AICoachMemoryItem {
  id: string;
  type: string;
  key: string;
  summary: string;
  value?: Record<string, unknown>;
  confidence: number;
  salience: number;
  last_reinforced_at?: string | null;
}

function requireToken(): string {
  const token = getToken();
  if (!token) {
    throw new Error('Authentication required');
  }
  return token;
}

export async function getAICoachPreferences(): Promise<AICoachPreferences> {
  return get<AICoachPreferences>('/ai-coach/preferences', requireToken());
}

export async function updateAICoachPreferences(
  payload: Omit<AICoachPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<AICoachPreferences> {
  return put<AICoachPreferences>('/ai-coach/preferences', payload, requireToken());
}

export async function getAICoachReports(
  limit: number = 20,
  digestType?: 'daily' | 'weekly' | 'monthly' | 'yearly'
): Promise<AICoachDigestReport[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (digestType) params.set('digest_type', digestType);
  return get<AICoachDigestReport[]>(`/ai-coach/reports?${params.toString()}`, requireToken());
}

export async function runAICoachDigest(payload: {
  digest_type?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  target_date?: string;
  force?: boolean;
  deliver_notification?: boolean;
}): Promise<RunDigestResponse> {
  return post<RunDigestResponse>(
    '/ai-coach/run-digest',
    {
      digest_type: payload.digest_type || 'daily',
      target_date: payload.target_date,
      force: payload.force ?? true,
      deliver_notification: payload.deliver_notification ?? true,
    },
    requireToken()
  );
}

export async function getAICoachMemory(limit: number = 20): Promise<AICoachMemoryItem[]> {
  return get<AICoachMemoryItem[]>(`/ai-coach/memory?limit=${limit}`, requireToken());
}

export async function deleteAICoachMemory(memoryId: string): Promise<void> {
  await del(`/ai-coach/memory/${memoryId}`, undefined, requireToken());
}
