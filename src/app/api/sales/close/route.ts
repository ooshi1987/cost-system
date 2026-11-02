import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { closingMemo, parseSalesClosing, salesDifference, type SalesClosing } from '@/lib/salesClosing';
import { lockStoreForWrite } from '@/lib/storeWriteLock';
import { getJapanMonthWindows, isDocumentDate, japanDateKey } from '@/lib/deliveryAmounts';

const SOURCE = 'sales_closing_v1';

export async function GET(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth?.storeId) return NextResponse.json({ error: 'ログインしてください' }, { status: 401 });
  const month = request.nextUrl.searchParams.get('month') ?? getJapanMonthWindows(new Date(), 1)[0].key;
  if (!/^\d{4}-\d{2}$/.test(month) || !isDocumentDate(`${month}-01`)) return NextResponse.json({ error: '年月を確認してください' }, { status: 400 });
  const from = new Date(`${month}-01T00:00:00+09:00`);
  const next = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1)).toISOString().slice(0, 10);
  const until = new Date(`${next}T00:00:00+09:00`);
  try {
    const rows = await prisma.transaction.findMany({
      where: { storeId: auth.storeId, type: 'sale', source: SOURCE, date: { gte: from, lt: until } },
      select: { id: true, date: true, amount: true, statedTotal: true, needsReview: true },
      orderBy: { date: 'desc' },
    });
    const groups = new Map<string, { id: string; date: string; statedTotal: number | null; itemsTotal: number; needsReview: boolean }>();
    for (const row of rows) {
      const prefix = row.id.match(/^(sc1_[0-9a-f]{64}_)/)?.[1];
      if (!prefix) continue;
      const existing = groups.get(prefix);
      if (existing) {
        existing.itemsTotal += row.amount;
        existing.needsReview ||= row.needsReview || existing.statedTotal !== row.statedTotal;
      } else {
        groups.set(prefix, { id: row.id, date: japanDateKey(row.date), statedTotal: row.statedTotal, itemsTotal: row.amount, needsReview: row.needsReview });
      }
    }
    return NextResponse.json({ closings: [...groups.values()].map((group) => ({
      ...group,
      itemsTotal: Math.round(group.itemsTotal * 100) / 100,
      needsReview: group.needsReview || group.statedTotal === null || Math.round(group.itemsTotal * 100) !== Math.round(group.statedTotal * 100),
    })) });
  } catch (error) {
    console.error('Sales closing history failed', error);
    return NextResponse.json({ error: '売上締め履歴を読み込めませんでした' }, { status: 500 });
  }
}

function closingIds(storeId: string, businessDate: string, count: number): string[] {
  const key = createHash('sha256').update(JSON.stringify([storeId, businessDate])).digest('hex');
  return Array.from({ length: count }, (_, index) => `sc1_${key}_${index}`);
}

function sameClosing(existing: { id: string; source: string; amount: number; method: string; vendor: string | null; statedTotal: number | null; needsReview: boolean; memo: string | null }[], data: SalesClosing, ids: string[]): boolean {
  if (existing.length !== data.items.length) return false;
  const byId = new Map(existing.map((item) => [item.id, item]));
  const difference = salesDifference(data.statedTotal, data.items);
  return data.items.every((item, index) => {
    const saved = byId.get(ids[index]);
    return saved?.source === SOURCE && saved.amount === item.amount && saved.method === item.method &&
      saved.vendor === item.label && saved.statedTotal === data.statedTotal &&
      saved.needsReview === (item.needsReview || (index === 0 && difference !== 0)) &&
      saved.memo === (index === 0 ? closingMemo(data) : null);
  });
}

export async function POST(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth?.storeId) return NextResponse.json({ error: 'ログインしてください' }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: '入力内容を確認してください' }, { status: 400 }); }
  const parsed = parseSalesClosing(body);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const data = parsed.data;
  const storeId = auth.storeId;
  const ids = closingIds(storeId, data.businessDate, data.items.length);
  const from = new Date(`${data.businessDate}T00:00:00+09:00`);
  const until = new Date(from.getTime() + 24 * 60 * 60 * 1000);
  // 正午JSTは既存の日次集計がUTC/日本時間のどちらで日付を読む場合も同じ暦日になる。
  const date = new Date(`${data.businessDate}T12:00:00+09:00`);
  const difference = salesDifference(data.statedTotal, data.items);
  const hasReview = difference !== 0 || data.items.some((item) => item.needsReview);

  try {
    const result = await prisma.$transaction(async (tx) => {
      await lockStoreForWrite(tx, storeId);
      const existing = await tx.transaction.findMany({
        where: { storeId, type: 'sale', date: { gte: from, lt: until } },
        select: { id: true, source: true, amount: true, method: true, vendor: true, statedTotal: true, needsReview: true, memo: true },
      });
      if (existing.length) return sameClosing(existing, data, ids) ? 'already-saved' : 'conflict';
      await tx.transaction.createMany({ data: data.items.map((item, index) => ({
        id: ids[index], storeId, type: 'sale', date, amount: item.amount,
        method: item.method, vendor: item.label, source: SOURCE,
        needsReview: item.needsReview || (index === 0 && difference !== 0),
        statedTotal: data.statedTotal, memo: index === 0 ? closingMemo(data) : null,
      })) });
      return 'saved';
    }, { maxWait: 15000, timeout: 30000 });
    if (result === 'conflict') return NextResponse.json({ error: 'この営業日の売上はすでに登録されています。二重登録を防ぐため、既存の記録を確認してください。' }, { status: 409 });
    return NextResponse.json({ status: result, needsReview: hasReview, difference }, { status: result === 'saved' ? 201 : 200 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      // 同じ営業日への同時送信では決定的IDの一意制約が片方だけを通す。
      try {
        const existing = await prisma.transaction.findMany({
          where: { storeId, type: 'sale', date: { gte: from, lt: until } },
          select: { id: true, source: true, amount: true, method: true, vendor: true, statedTotal: true, needsReview: true, memo: true },
        });
        if (sameClosing(existing, data, ids)) return NextResponse.json({ status: 'already-saved', needsReview: hasReview, difference });
        return NextResponse.json({ error: 'この営業日の売上はすでに登録されています。既存の記録を確認してください。' }, { status: 409 });
      } catch (lookupError) {
        console.error('Sales closing retry lookup failed', lookupError);
      }
    }
    console.error('Sales closing save failed', error);
    return NextResponse.json({ error: '保存できませんでした。通信が切れた場合は、同じ内容でもう一度保存できます。' }, { status: 500 });
  }
}
