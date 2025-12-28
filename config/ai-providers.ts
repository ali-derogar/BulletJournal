export interface AIProvider {
  id: string;
  name: string;
  models: AIModel[];
  endpoint: string;
  requiresAuth: boolean;
}

export interface AIModel {
  id: string;
  name: string;
  description: string;
  isFree: boolean;
}

export const AI_PROVIDERS: Record<string, AIProvider> = {
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    requiresAuth: true,
    models: [
      {
        id: 'meta-llama/llama-3.1-8b-instruct:free',
        name: 'Llama 3.1 8B (Free)',
        description: 'Free access to Llama 3.1 - Fast and capable',
        isFree: true,
      },
      {
        id: 'google/gemma-2-9b-it:free',
        name: 'Gemma 2 9B (Free)',
        description: 'Google\'s Gemma model - Good quality',
        isFree: true,
      },
      {
        id: 'mistralai/mistral-7b-instruct:free',
        name: 'Mistral 7B (Free)',
        description: 'Mistral AI\'s model - Balanced',
        isFree: true,
      },
      {
        id: 'qwen/qwen-2-7b-instruct:free',
        name: 'Qwen 2 7B (Free)',
        description: 'Alibaba\'s Qwen model',
        isFree: true,
      },
    ],
  },
};

// Get API keys from environment (client-side)
export function getAPIKeys(provider: string): string[] {
  if (typeof window === 'undefined') return [];

  const envKey = `NEXT_PUBLIC_${provider.toUpperCase()}_API_KEYS`;
  const keys = (process.env as any)[envKey];

  if (!keys) {
    console.warn(`[AI Config] No API keys found for ${provider}. Looking for ${envKey} in process.env`);
    console.log('[AI Config] Available env vars:', Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_')));
    return [];
  }

  // Split by comma and trim whitespace
  const keyArray = keys.split(',').map((key: string) => key.trim()).filter(Boolean);
  console.log(`[AI Config] Found ${keyArray.length} API keys for ${provider}`);
  return keyArray;
}

// Rotate through API keys to avoid rate limits
let currentKeyIndex = 0;
export function getNextAPIKey(provider: string): string | null {
  const keys = getAPIKeys(provider);

  if (keys.length === 0) return null;

  const key = keys[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % keys.length;

  return key;
}

export const DEFAULT_PROVIDER = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_DEFAULT_AI_PROVIDER || 'openrouter')
  : 'openrouter';

export const DEFAULT_MODEL = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_DEFAULT_AI_MODEL || 'meta-llama/llama-3.1-8b-instruct:free')
  : 'meta-llama/llama-3.1-8b-instruct:free';
