import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { japanDateKey } from '@/lib/deliveryAmounts';
import { closingMemo, parseSalesClosing, salesDifference } from '@/lib/salesClosing';
import { lockStoreForWrite } from '@/lib/storeWriteLock';
import { salesClosingVersion } from '@/lib/salesClosingVersion';

const SOURCE = 'sales_closing_v1';
const GROUP_ID = /^(sc1_[0-9a-f]{64}_)\d+$/;
type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  const auth = await getAuth(request);
  if (!auth?.storeId) return NextResponse.json({ error: 'ログインしてください' }, { status: 401 });
  const prefix = (await params).id.match(GROUP_ID)?.[1];
  if (!prefix) return NextResponse.json({ error: '売上締めが見つかりません' }, { status: 404 });
  try {
    const rows = await prisma.transaction.findMany({
      where: { storeId: auth.storeId, source: SOURCE, id: { startsWith: prefix } },
      select: { id: true, date: true, amount: true, method: true, vendor: true, statedTotal: true, needsReview: true, memo: true, updatedAt: true },
    });
    rows.sort((a, b) => Number(a.id.slice(prefix.length)) - Number(b.id.slice(prefix.length)));
    if (!rows.length) return NextResponse.json({ error: '売上締めが見つかりません' }, { status: 404 });
    if (rows.some((row, index) => row.id !== `${prefix}${index}` || row.statedTotal === null || row.statedTotal !== rows[0].statedTotal || japanDateKey(row.date) !== japanDateKey(rows[0].date))) {
      return NextResponse.json({ error: '売上締めの記録を確認できません。管理者にお問い合わせください。' }, { status: 409 });
    }
    const customerMatch = rows[0].memo?.match(/^客数 (\d+)名(?:\s|$)/);
    return NextResponse.json({
      businessDate: japanDateKey(rows[0].date), statedTotal: rows[0].statedTotal,
      customerCount: customerMatch ? Number(customerMatch[1]) : null,
      items: rows.map((row) => ({ id: row.id, version: salesClosingVersion(row), label: row.vendor ?? '', method: row.method, amount: row.amount, needsReview: row.needsReview })),
    });
  } catch (error) {
    console.error('Sales closing read failed', error);
    return NextResponse.json({ error: '売上締めを読み込めませんでした' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Context) {
  const auth = await getAuth(request);
  if (!auth?.storeId) return NextResponse.json({ error: 'ログインしてください' }, { status: 401 });
  const prefix = (await params).id.match(GROUP_ID)?.[1];
  if (!prefix) return NextResponse.json({ error: '売上締めが見つかりません' }, { status: 404 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: '入力内容を確認してください' }, { status: 400 }); }
  const parsed = parseSalesClosing(body);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const input = body as { items: { id?: unknown; version?: unknown }[] };
  const existingInputs = input.items.filter((item) => item.id !== null);
  if (input.items.some((item, index) => index < existingInputs.length
    ? item.id !== `${prefix}${index}` || typeof item.version !== 'string'
    : item.id !== null || item.version !== null)) {
    return NextResponse.json({ error: '売上締めの内訳を確認してください' }, { status: 400 });
  }
  const data = parsed.data;
  const storeId = auth.storeId;
  const difference = salesDifference(data.statedTotal, data.items);
  try {
    const result = await prisma.$transaction(async (tx) => {
      await lockStoreForWrite(tx, storeId);
      const rows = await tx.transaction.findMany({
        where: { storeId, source: SOURCE, id: { startsWith: prefix } },
        select: { id: true, date: true, updatedAt: true, amount: true, method: true, vendor: true, statedTotal: true, needsReview: true, memo: true },
      });
      if (!rows.length || rows.length !== existingInputs.length) return 'conflict';
      const byId = new Map(rows.map((row) => [row.id, row]));
      if (existingInputs.some((item) => {
        const row = byId.get(item.id as string);
        return !row || salesClosingVersion(row) !== item.version || japanDateKey(row.date) !== data.businessDate;
      })) return 'conflict';
      for (const [index, item] of data.items.entries()) {
        const values = {
          vendor: item.label, method: item.method, amount: item.amount, statedTotal: data.statedTotal,
          needsReview: item.needsReview || (index === 0 && difference !== 0),
          memo: index === 0 ? closingMemo(data) : null,
        };
        if (index < existingInputs.length) {
          await tx.transaction.update({ where: { id: input.items[index].id as string }, data: values });
        } else {
          await tx.transaction.create({ data: { ...values, id: `${prefix}${index}`, storeId, type: 'sale', source: SOURCE, date: rows[0].date } });
        }
      }
      return 'saved';
    }, { maxWait: 15000, timeout: 30000 });
    if (result === 'conflict') return NextResponse.json({ error: '他の画面で更新されたか、営業日が異なります。再読み込みして確認してください。' }, { status: 409 });
    return NextResponse.json({ needsReview: difference !== 0 || data.items.some((item) => item.needsReview), difference });
  } catch (error) {
    console.error('Sales closing update failed', error);
    return NextResponse.json({ error: '売上締めを更新できませんでした' }, { status: 500 });
  }
}
