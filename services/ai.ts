import {
  AI_PROVIDERS,
  getNextAPIKey,
  getCurrentKeyIndex,
  markKeyAsRateLimited,
  markKeyAsFailed,
  markKeyAsSuccess,
  DEFAULT_PROVIDER,
  DEFAULT_MODEL
} from '@/config/ai-providers';

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

  // Get provider config
  const providerConfig = AI_PROVIDERS[provider];
  if (!providerConfig) {
    return { message: '', error: `Provider ${provider} not found` };
  }

  // Try up to 3 different API keys if rate limited
  const maxRetries = 3;
  let lastError = '';

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Get API key (rotates through available keys)
    const apiKey = getNextAPIKey(provider);
    if (!apiKey) {
      return { message: '', error: `No API key configured for ${provider}` };
    }

    const keyIndex = getCurrentKeyIndex();
    console.log(`[AI Service] Attempt ${attempt + 1}/${maxRetries} with key ${keyIndex + 1}`);

    const result = await sendChatMessageWithKey(
      messages,
      provider,
      model,
      temperature,
      maxTokens,
      apiKey,
      keyIndex,
      providerConfig.endpoint
    );

    // Success!
    if (!result.error) {
      return result;
    }

    // If it's a rate limit error, try next key
    if (result.error.includes('Rate limit')) {
      console.log(`[AI Service] Rate limited, trying next key...`);
      lastError = result.error;
      continue;
    }

    // Other error, return immediately
    return result;
  }

  // All retries failed
  return {
    message: '',
    error: lastError || 'All API keys are rate limited. Please try again later.',
  };
}

/**
 * Internal function to send message with a specific API key
 */
async function sendChatMessageWithKey(
  messages: ChatMessage[],
  provider: string,
  model: string,
  temperature: number,
  maxTokens: number,
  apiKey: string,
  keyIndex: number,
  endpoint: string
): Promise<ChatResponse> {

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'BulletJournal AI Assistant',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    // Check for rate limit
    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      const retrySeconds = retryAfter ? parseInt(retryAfter) : 60;

      console.warn(`[AI Service] Rate limited! Retry after ${retrySeconds}s`);
      markKeyAsRateLimited(provider, keyIndex, retrySeconds);

      return {
        message: '',
        error: `Rate limit reached. Trying next API key...`,
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AI Service] API Error Response:', errorText);

      // Mark as failed
      markKeyAsFailed(provider, keyIndex);

      try {
        const errorData = JSON.parse(errorText);
        const errorMessage = errorData.error?.message || `HTTP error ${response.status}`;

        // Check if it's a rate limit error in the message
        if (errorMessage.toLowerCase().includes('rate limit') ||
          errorMessage.toLowerCase().includes('too many requests')) {
          markKeyAsRateLimited(provider, keyIndex, 60);
        }

        return {
          message: '',
          error: errorMessage,
        };
      } catch {
        return {
          message: '',
          error: `HTTP error ${response.status}: ${errorText}`,
        };
      }
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content || '';

    // Mark as success
    markKeyAsSuccess(provider, keyIndex);

    return { message };
  } catch (error) {
    console.error('AI service error:', error);

    // Mark as failed
    markKeyAsFailed(provider, keyIndex);

    return {
      message: '',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
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
