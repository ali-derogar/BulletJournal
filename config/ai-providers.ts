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

// Get API keys - tries multiple sources
export function getAPIKeys(provider: string): string[] {
  // 1. Try to import from local ai-keys.ts (for development)
  try {
    const localKeys = require('./ai-keys');
    const keys = localKeys.AI_API_KEYS?.[provider];
    if (keys && Array.isArray(keys) && keys.length > 0) {
      console.log(`[AI Config] Found ${keys.length} API keys from ai-keys.ts for ${provider}`);
      return keys;
    }
  } catch (e) {
    // ai-keys.ts doesn't exist, continue to next method
  }

  // 2. Try environment variables (for production)
  if (typeof window !== 'undefined') {
    const envKey = `NEXT_PUBLIC_${provider.toUpperCase()}_API_KEYS`;
    const envKeys = (process.env as any)[envKey];

    if (envKeys) {
      const keyArray = envKeys.split(',').map((key: string) => key.trim()).filter(Boolean);
      console.log(`[AI Config] Found ${keyArray.length} API keys from env for ${provider}`);
      return keyArray;
    }
  }

  console.warn(`[AI Config] No API keys found for ${provider}`);
  console.log('[AI Config] To fix: Copy config/ai-keys.example.ts to config/ai-keys.ts and add your keys');
  return [];
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

// Get defaults from ai-keys.ts if available, otherwise use fallbacks
let DEFAULT_PROVIDER = 'openrouter';
let DEFAULT_MODEL = 'meta-llama/llama-3.1-8b-instruct:free';

try {
  const localKeys = require('./ai-keys');
  if (localKeys.AI_DEFAULT_PROVIDER) DEFAULT_PROVIDER = localKeys.AI_DEFAULT_PROVIDER;
  if (localKeys.AI_DEFAULT_MODEL) DEFAULT_MODEL = localKeys.AI_DEFAULT_MODEL;
} catch (e) {
  // Use environment variables as fallback
  if (typeof window !== 'undefined') {
    DEFAULT_PROVIDER = (process.env as any).NEXT_PUBLIC_DEFAULT_AI_PROVIDER || DEFAULT_PROVIDER;
    DEFAULT_MODEL = (process.env as any).NEXT_PUBLIC_DEFAULT_AI_MODEL || DEFAULT_MODEL;
  }
}

export { DEFAULT_PROVIDER, DEFAULT_MODEL };
