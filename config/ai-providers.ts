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
        id: 'google/gemma-2-9b-it:free',
        name: 'Gemma 2 9B (Free)',
        description: 'Google\'s Gemma model - Good quality',
        isFree: true,
      },
      {
        id: 'meta-llama/llama-3.1-8b-instruct:free',
        name: 'Llama 3.1 8B (Free)',
        description: 'Free access to Llama 3.1 - Fast and capable',
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
    return [];
  }

  const keyArray = envKeys.split(',').map((key: string) => key.trim()).filter(Boolean);
  console.log(`[AI Config] Found ${keyArray.length} API keys for ${provider}`);
  return keyArray;
}

// Smart API Key rotation with rate limit tracking
let currentKeyIndex = 0;
const rateLimitedKeys = new Map<string, number>(); // key -> timestamp when it can be used again
const failedKeyAttempts = new Map<string, number>(); // key -> consecutive failures

export function getNextAPIKey(provider: string): string | null {
  const keys = getAPIKeys(provider);

  if (keys.length === 0) return null;

  const now = Date.now();
  let attempts = 0;
  const maxAttempts = keys.length;

  // Try to find a non-rate-limited key
  while (attempts < maxAttempts) {
    const key = keys[currentKeyIndex];
    const keyId = `${provider}:${currentKeyIndex}`;

    // Check if this key is rate limited
    const rateLimitExpiry = rateLimitedKeys.get(keyId);
    if (rateLimitExpiry && now < rateLimitExpiry) {
      // This key is still rate limited, try next
      console.log(`[API Key Rotation] Key ${currentKeyIndex + 1}/${keys.length} is rate limited until ${new Date(rateLimitExpiry).toLocaleTimeString()}`);
      currentKeyIndex = (currentKeyIndex + 1) % keys.length;
      attempts++;
      continue;
    }

    // This key is available
    console.log(`[API Key Rotation] Using key ${currentKeyIndex + 1}/${keys.length} for ${provider}`);
    currentKeyIndex = (currentKeyIndex + 1) % keys.length;
    return key;
  }

  // All keys are rate limited! Return the first one anyway (user will see error)
  console.warn(`[API Key Rotation] All ${keys.length} API keys are rate limited!`);
  return keys[0];
}

export function markKeyAsRateLimited(provider: string, keyIndex: number, retryAfterSeconds: number = 60) {
  const keyId = `${provider}:${keyIndex}`;
  const retryAfter = Date.now() + (retryAfterSeconds * 1000);

  rateLimitedKeys.set(keyId, retryAfter);
  console.warn(`[API Key Rotation] Marked key ${keyIndex + 1} as rate limited for ${retryAfterSeconds}s`);

  // Cleanup expired entries after 5 minutes
  setTimeout(() => {
    if (rateLimitedKeys.get(keyId) === retryAfter) {
      rateLimitedKeys.delete(keyId);
      console.log(`[API Key Rotation] Key ${keyIndex + 1} rate limit expired`);
    }
  }, retryAfterSeconds * 1000);
}

export function markKeyAsFailed(provider: string, keyIndex: number) {
  const keyId = `${provider}:${keyIndex}`;
  const failures = (failedKeyAttempts.get(keyId) || 0) + 1;
  failedKeyAttempts.set(keyId, failures);

  // If key fails 3 times in a row, mark it as rate limited for 5 minutes
  if (failures >= 3) {
    markKeyAsRateLimited(provider, keyIndex, 300); // 5 minutes
    failedKeyAttempts.delete(keyId);
    console.error(`[API Key Rotation] Key ${keyIndex + 1} failed ${failures} times, temporarily disabled`);
  }
}

export function markKeyAsSuccess(provider: string, keyIndex: number) {
  const keyId = `${provider}:${keyIndex}`;
  failedKeyAttempts.delete(keyId);
}

export function getCurrentKeyIndex(): number {
  return (currentKeyIndex - 1 + getAPIKeys(DEFAULT_PROVIDER).length) % getAPIKeys(DEFAULT_PROVIDER).length;
}

export const DEFAULT_PROVIDER = process.env.NEXT_PUBLIC_DEFAULT_AI_PROVIDER || 'openrouter';
export const DEFAULT_MODEL = process.env.NEXT_PUBLIC_DEFAULT_AI_MODEL || 'google/gemma-2-9b-it:free';
