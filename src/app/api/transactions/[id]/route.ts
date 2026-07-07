import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';

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

    const body = await request.json();
    const { type, date, amount, categoryId, vendor, method, memo, needsReview, imagePath, statedTotal } = body;

    if (type !== undefined && type !== 'sale' && type !== 'expense') {
      return NextResponse.json({ error: 'type は sale または expense を指定してください' }, { status: 400 });
    }
    if (amount !== undefined) {
      const parsedAmount = parseFloat(amount);
      if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
        return NextResponse.json({ error: 'amount は0以上の数値を指定してください' }, { status: 400 });
      }
    }
    if (categoryId) {
      const category = await prisma.category.findFirst({ where: { id: categoryId, storeId: auth.storeId } });
      if (!category) {
        return NextResponse.json({ error: '指定された科目が見つかりません' }, { status: 400 });
      }
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        ...(type !== undefined ? { type } : {}),
        ...(date !== undefined ? { date: new Date(date) } : {}),
        ...(amount !== undefined ? { amount: parseFloat(amount) } : {}),
        ...(categoryId !== undefined ? { categoryId: categoryId || null } : {}),
        ...(vendor !== undefined ? { vendor: vendor || null } : {}),
        ...(method !== undefined ? { method } : {}),
        ...(memo !== undefined ? { memo: memo || null } : {}),
        ...(needsReview !== undefined ? { needsReview } : {}),
        ...(imagePath !== undefined ? { imagePath: imagePath || null } : {}),
        ...(statedTotal !== undefined ? { statedTotal: statedTotal === null ? null : parseFloat(statedTotal) } : {}),
      },
      include: { category: true },
    });
    return NextResponse.json(transaction);
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

    await prisma.transaction.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
  }
}
