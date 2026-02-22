import { NextResponse } from 'next/server';

export async function GET() {
  const backendKeys = process.env.OPENROUTER_API_KEYS || process.env.NEXT_PUBLIC_OPENROUTER_API_KEYS || '';
  const hasKeys = backendKeys.length > 0;
  const provider = process.env.NEXT_PUBLIC_DEFAULT_AI_PROVIDER;
  const model = process.env.NEXT_PUBLIC_DEFAULT_AI_MODEL;

  return NextResponse.json({
    hasBackendOpenRouterKeys: hasKeys,
    keysLength: backendKeys ? backendKeys.split(',').filter(Boolean).length : 0,
    provider,
    model,
  });
}
