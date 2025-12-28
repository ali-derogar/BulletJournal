// AI API Keys Configuration - Example Template
// 1. Copy this file to 'ai-keys.ts'
// 2. Replace the placeholder values with your actual API keys
// 3. NEVER commit ai-keys.ts to Git (it's in .gitignore)

// For production deployment:
// - Use environment variables: NEXT_PUBLIC_OPENROUTER_API_KEYS
// - Or use your hosting provider's secrets management

export const AI_API_KEYS = {
  openrouter: [
    'sk-or-v1-YOUR_FIRST_KEY_HERE',
    'sk-or-v1-YOUR_SECOND_KEY_HERE',  // Optional: add more keys for rotation
  ],
};

export const AI_DEFAULT_PROVIDER = 'openrouter';
export const AI_DEFAULT_MODEL = 'meta-llama/llama-3.1-8b-instruct:free';
