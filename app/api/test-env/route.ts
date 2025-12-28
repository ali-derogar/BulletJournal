import { NextResponse } from 'next/server';

export async function GET() {
  const hasKeys = !!process.env.NEXT_PUBLIC_OPENROUTER_API_KEYS;
  const provider = process.env.NEXT_PUBLIC_DEFAULT_AI_PROVIDER;
  const model = process.env.NEXT_PUBLIC_DEFAULT_AI_MODEL;

  return NextResponse.json({
    hasOpenRouterKeys: hasKeys,
    keysLength: process.env.NEXT_PUBLIC_OPENROUTER_API_KEYS?.split(',').length || 0,
    provider,
    model,
    allEnvVars: Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_'))
  });
}
