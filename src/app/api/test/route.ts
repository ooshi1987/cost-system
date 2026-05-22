import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  return NextResponse.json({
    apiKeyExists: !!apiKey,
    apiKeyLength: apiKey?.length || 0,
    apiKeyStart: apiKey?.substring(0, 20) || 'NOT FOUND',
    allEnvKeys: Object.keys(process.env).filter(k => k.includes('ANTHROPIC')),
    nodeEnv: process.env.NODE_ENV,
  });
}
