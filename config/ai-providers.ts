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

// Get API keys from environment variables
// IMPORTANT: Webpack only replaces process.env.NEXT_PUBLIC_* when used as literals
export function getAPIKeys(provider: string): string[] {
  let envKeys: string | undefined;

  // We must use literal property access for Webpack to replace these at build time
  if (provider === 'openrouter') {
    envKeys = process.env.NEXT_PUBLIC_OPENROUTER_API_KEYS;
  }

  if (!envKeys) {
    console.warn(`[AI Config] No API keys found for ${provider}`);
    console.log(`[AI Config] Environment check:`, {
      providerLiteral: 'openrouter',
      requestedProvider: provider,
      hasKeys: !!process.env.NEXT_PUBLIC_OPENROUTER_API_KEYS,
      keyPrefix: process.env.NEXT_PUBLIC_OPENROUTER_API_KEYS ? process.env.NEXT_PUBLIC_OPENROUTER_API_KEYS.substring(0, 10) + '...' : 'none',
      processEnvKeys: process.env.NEXT_PUBLIC_OPENROUTER_API_KEYS ? 'EXISTS' : 'NOT FOUND',
      allPublicKeys: Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_'))
    });
    return [];
  }

  const keyArray = envKeys.split(',').map((key: string) => key.trim()).filter(Boolean);
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

export const DEFAULT_PROVIDER = process.env.NEXT_PUBLIC_DEFAULT_AI_PROVIDER || 'openrouter';
export const DEFAULT_MODEL = process.env.NEXT_PUBLIC_DEFAULT_AI_MODEL || 'meta-llama/llama-3.1-8b-instruct:free';
