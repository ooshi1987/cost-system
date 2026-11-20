import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from './prisma';
import { japanDateKey } from './deliveryAmounts';

// AI読み取り（有料）の店舗ごと・日本時間の1日あたり上限。
// 回数は Settings テーブルに予約キーで記録する（スキーマ変更なし）。
export const AI_USAGE_KEY_PREFIX = '__ai_usage:';
const DEFAULT_DAILY_LIMIT = 50;

function dailyLimit(): number {
  const value = Number(process.env.AI_DAILY_LIMIT_PER_STORE);
  return Number.isInteger(value) && value > 0 ? value : DEFAULT_DAILY_LIMIT;
}

export function isReservedSettingsKey(key: unknown): boolean {
  return typeof key === 'string' && key.startsWith('__');
}

/**
 * AI呼び出しの直前に1回分を記録し、上限を超えていれば 429 応答を返す。
 * 失敗した呼び出しも課金され得るため、呼び出し前に数える。
 */
export async function consumeAiQuota(storeId: string): Promise<NextResponse | null> {
  const key = `${AI_USAGE_KEY_PREFIX}${japanDateKey()}`;
  const rows = await prisma.$queryRaw<{ value: string }[]>`
    INSERT INTO "Settings" ("id", "storeId", "key", "value")
    VALUES (${randomUUID()}, ${storeId}, ${key}, '1')
    ON CONFLICT ("storeId", "key") DO UPDATE SET "value" = ((COALESCE(NULLIF("Settings"."value", ''), '0'))::int + 1)::text
    RETURNING "value"`;
  const used = Number(rows[0]?.value ?? 0);
  const limit = dailyLimit();
  if (used > limit) {
    return NextResponse.json(
      { error: `本日のAI読み取りの上限（${limit}回）に達しました。明日以降に読み取るか、手入力で記録してください。` },
      { status: 429 },
    );
  }
  return null;
}
