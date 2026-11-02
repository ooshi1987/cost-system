import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';
import { japanDateKey } from '@/lib/deliveryAmounts';
import { lockStoreForWrite } from '@/lib/storeWriteLock';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuth(request);
    if (!auth?.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const transaction = await prisma.transaction.findFirst({
      where: { id, storeId: auth.storeId },
      include: { category: true },
    });
    if (!transaction) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(transaction);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch transaction' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuth(request);
    if (!auth?.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const existing = await prisma.transaction.findFirst({ where: { id, storeId: auth.storeId } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (existing.source === 'sales_closing_v1') return NextResponse.json({ error: '売上締めは内訳をまとめて確認してください。' }, { status: 409 });

    const body = await request.json();
    const { type, date, amount, categoryId, vendor, method, memo, needsReview, imagePath, statedTotal } = body;

    if (type !== undefined && type !== 'sale' && type !== 'expense') {
      return NextResponse.json({ error: 'type は sale または expense を指定してください' }, { status: 400 });
    }
    const parsedAmount = typeof amount === 'number' ? amount : typeof amount === 'string' && amount.trim() ? Number(amount) : NaN;
    if (amount !== undefined) {
      if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
        return NextResponse.json({ error: 'amount は0以上の数値を指定してください' }, { status: 400 });
      }
    }
    if (date !== undefined && (typeof date !== 'string' || !Number.isFinite(new Date(date).getTime()))) {
      return NextResponse.json({ error: 'date の形式が不正です' }, { status: 400 });
    }
    if (categoryId) {
      const category = await prisma.category.findFirst({ where: { id: categoryId, storeId: auth.storeId } });
      if (!category) {
        return NextResponse.json({ error: '指定された科目が見つかりません' }, { status: 400 });
      }
    }

    const storeId = auth.storeId;
    const transaction = await prisma.$transaction(async (tx) => {
      await lockStoreForWrite(tx, storeId);
      const current = await tx.transaction.findFirst({ where: { id, storeId } });
      if (!current) return { kind: 'missing' as const };
      if (current.source === 'sales_closing_v1') return { kind: 'closing' as const };
      const finalType = type ?? current.type;
      const finalDate = date !== undefined ? new Date(date) : current.date;
      if (finalType === 'sale') {
        const from = new Date(`${japanDateKey(finalDate)}T00:00:00+09:00`);
        const close = await tx.transaction.findFirst({ where: {
          storeId, type: 'sale', source: 'sales_closing_v1',
          date: { gte: from, lt: new Date(from.getTime() + 24 * 60 * 60 * 1000) },
        }, select: { id: true } });
        if (close) return { kind: 'duplicate' as const };
      }
      const updated = await tx.transaction.update({ where: { id }, data: {
        ...(type !== undefined ? { type } : {}),
        ...(date !== undefined ? { date: new Date(date) } : {}),
        ...(amount !== undefined ? { amount: parsedAmount } : {}),
        ...(categoryId !== undefined ? { categoryId: categoryId || null } : {}),
        ...(vendor !== undefined ? { vendor: vendor || null } : {}),
        ...(method !== undefined ? { method } : {}),
        ...(memo !== undefined ? { memo: memo || null } : {}),
        ...(needsReview !== undefined ? { needsReview } : {}),
        ...(imagePath !== undefined ? { imagePath: imagePath || null } : {}),
        ...(statedTotal !== undefined ? { statedTotal: statedTotal === null ? null : parseFloat(statedTotal) } : {}),
      }, include: { category: true } });
      return { kind: 'saved' as const, updated };
    }, { maxWait: 15000, timeout: 30000 });
    if (transaction.kind === 'missing') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (transaction.kind === 'closing') return NextResponse.json({ error: '売上締めは内訳をまとめて確認してください。' }, { status: 409 });
    if (transaction.kind === 'duplicate') return NextResponse.json({ error: 'この営業日は売上締めが登録済みです。既存の記録を確認してください。' }, { status: 409 });
    return NextResponse.json(transaction.updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuth(request);
    if (!auth?.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const existing = await prisma.transaction.findFirst({ where: { id, storeId: auth.storeId } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (existing.source === 'sales_closing_v1') return NextResponse.json({ error: '売上締めの個別削除はできません。' }, { status: 409 });

    await prisma.transaction.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
  }
}
