import {
  AI_PROVIDERS,
  DEFAULT_PROVIDER,
  DEFAULT_MODEL
} from '@/config/ai-providers';
import { post } from '@/services/api';
import { getToken } from '@/services/auth';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatOptions {
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  message: string;
  error?: string;
}

/**
 * Send a chat message to the AI provider with automatic retry on rate limit
 */
export async function sendChatMessage(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<ChatResponse> {
  const provider = options.provider || DEFAULT_PROVIDER;
  const model = options.model || DEFAULT_MODEL;
  const temperature = options.temperature ?? 0.7;
  const maxTokens = options.maxTokens ?? 1000;

  try {
    const token = getToken();
    if (!token) {
      return { message: '', error: 'Authentication required' };
    }

    // Get provider config
    const providerConfig = AI_PROVIDERS[provider];
    if (!providerConfig) {
      return { message: '', error: `Provider ${provider} not found` };
    }

    const endpoint = providerConfig.endpoint.startsWith('/api/')
      ? providerConfig.endpoint.slice(4)
      : providerConfig.endpoint;

    const result = await post<{ message: string }>(
      endpoint,
      {
        messages,
        provider,
        model,
        temperature,
        maxTokens,
      },
      token
    );

    return { message: result.message || '' };
  } catch (error) {
    console.error('AI proxy service error:', error);

    return {
      message: '',
      error: error instanceof Error ? error.message : 'AI service unavailable',
    };
  }
}

/**
 * Get AI suggestions for tasks based on current context
 */
export async function getTaskSuggestions(context: {
  currentTasks?: string[];
  completedTasks?: string[];
  goals?: string[];
}): Promise<string[]> {
  const systemPrompt = `You are a productivity assistant for a Bullet Journal app.
Based on the user's current tasks, completed tasks, and goals, suggest 3-5 relevant tasks they should consider.
Respond ONLY with a JSON array of task strings, nothing else.`;

  const userPrompt = `Context:
- Current tasks: ${context.currentTasks?.join(', ') || 'None'}
- Completed today: ${context.completedTasks?.join(', ') || 'None'}
- Goals: ${context.goals?.join(', ') || 'None'}

Suggest productive tasks:`;

  const response = await sendChatMessage([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  if (response.error || !response.message) {
    return [];
  }

  try {
    const suggestions = JSON.parse(response.message);
    return Array.isArray(suggestions) ? suggestions : [];
  } catch {
    return [];
  }
}

/**
 * Get motivational message based on progress
 */
export async function getMotivationalMessage(progress: {
  tasksCompleted: number;
  tasksTotal: number;
  goalsProgress: number;
}): Promise<string> {
  const systemPrompt = `You are an encouraging productivity coach.
Give a SHORT motivational message (1-2 sentences) based on the user's progress.
Be positive and specific to their achievements.`;

  const userPrompt = `Today's progress:
- Completed ${progress.tasksCompleted} out of ${progress.tasksTotal} tasks
- Goals progress: ${progress.goalsProgress}%

Give me an encouraging message:`;

  const response = await sendChatMessage([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  return response.message || 'Keep up the great work! 🎉';
}
