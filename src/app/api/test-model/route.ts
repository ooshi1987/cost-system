import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'API key not set' }, { status: 500 });
  }

  const models = [
    'claude-opus-4-7',
    'claude-opus-4-6',
    'claude-sonnet-4-6',
    'claude-haiku-4-5',
  ];

  const results = [];

  for (const model of models) {
    try {
      const client = new Anthropic({ apiKey });
      const response = await client.messages.create({
        model,
        max_tokens: 50,
        messages: [
          {
            role: 'user',
            content: 'Say works',
          },
        ],
      });

      results.push({
        model,
        success: true,
        response: response.content[0],
      });
      break; // Found a working model
    } catch (error: any) {
      results.push({
        model,
        success: false,
        error: error.message?.substring(0, 100),
      });
    }
  }

  return NextResponse.json({ results });
}
