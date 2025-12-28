# AI Configuration

This directory contains AI provider configurations for the Bullet Journal app.

## Setup for Development

1. Copy the example file:
   ```bash
   cp ai-keys.example.ts ai-keys.ts
   ```

2. Edit `ai-keys.ts` and add your OpenRouter API keys

3. The `ai-keys.ts` file is in `.gitignore` and will NOT be committed to Git

## Setup for Production

### Option 1: Environment Variables (Recommended)

Set these environment variables in your hosting provider (Vercel, Netlify, etc.):

```bash
NEXT_PUBLIC_OPENROUTER_API_KEYS=sk-or-v1-key1,sk-or-v1-key2
NEXT_PUBLIC_DEFAULT_AI_PROVIDER=openrouter
NEXT_PUBLIC_DEFAULT_AI_MODEL=meta-llama/llama-3.1-8b-instruct:free
```

### Option 2: GitHub Secrets (for CI/CD)

1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions
3. Add repository secrets:
   - `NEXT_PUBLIC_OPENROUTER_API_KEYS`
   - `NEXT_PUBLIC_DEFAULT_AI_PROVIDER`
   - `NEXT_PUBLIC_DEFAULT_AI_MODEL`

## How It Works

The app tries to load API keys in this order:

1. **Local file** (`ai-keys.ts`) - for development
2. **Environment variables** (`NEXT_PUBLIC_*`) - for production

## Security Notes

- ⚠️ NEVER commit `ai-keys.ts` to Git
- ✅ Always use environment variables in production
- ✅ Keep API keys in GitHub Secrets for CI/CD
- ✅ Rotate keys regularly for security
