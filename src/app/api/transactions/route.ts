import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';
import { ensureDefaultCategories } from '@/lib/categories';

// 経費の集計対象は Transaction(type:"expense") のみ。
// DeliverySlip/DeliveryItem は食材単価更新専用のまま据え置き、P&Lには加算しない（二重計上防止）。

function parseDateOnly(value: string): Date | null {
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    if (!auth?.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await ensureDefaultCategories(auth.storeId);

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const needsReview = searchParams.get('needsReview');
    const categoryId = searchParams.get('categoryId');
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const from = fromParam ? parseDateOnly(fromParam) : defaultFrom;
    const toBase = toParam ? parseDateOnly(toParam) : null;
    const to = toBase ? new Date(toBase.getFullYear(), toBase.getMonth(), toBase.getDate() + 1) : defaultTo;

    if (!from || !to) {
      return NextResponse.json({ error: 'from/to の日付形式が不正です' }, { status: 400 });
    }

    const where = {
      storeId: auth.storeId,
      date: { gte: from, lt: to },
      ...(type ? { type } : {}),
      ...(needsReview === '1' ? { needsReview: true } : {}),
      ...(categoryId ? { categoryId } : {}),
    };

    const transactions = await prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });

    const [salesAgg, expenseAgg, reviewCount] = await Promise.all([
      prisma.transaction.aggregate({ where: { ...where, type: 'sale' }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { ...where, type: 'expense' }, _sum: { amount: true } }),
      prisma.transaction.count({ where: { ...where, needsReview: true } }),
    ]);

    const salesTotal = salesAgg._sum.amount || 0;
    const expenseTotal = expenseAgg._sum.amount || 0;

    return NextResponse.json({
      transactions,
      summary: {
        salesTotal,
        expenseTotal,
        net: salesTotal - expenseTotal,
        reviewCount,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    if (!auth?.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await ensureDefaultCategories(auth.storeId);

    const body = await request.json();
    const {
      type,
      date,
      amount,
      categoryId,
      vendor,
      method,
      memo,
      source,
      needsReview,
      imagePath,
      statedTotal,
    } = body;

    if (!type || !date || amount === undefined) {
      return NextResponse.json({ error: 'type, date, amount は必須です' }, { status: 400 });
    }
    if (type !== 'sale' && type !== 'expense') {
      return NextResponse.json({ error: 'type は sale または expense を指定してください' }, { status: 400 });
    }
    const parsedAmount = parseFloat(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
      return NextResponse.json({ error: 'amount は0以上の数値を指定してください' }, { status: 400 });
    }
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: 'date の形式が不正です' }, { status: 400 });
    }

    if (categoryId) {
      const category = await prisma.category.findFirst({ where: { id: categoryId, storeId: auth.storeId } });
      if (!category) {
        return NextResponse.json({ error: '指定された科目が見つかりません' }, { status: 400 });
      }
    }

    const transaction = await prisma.transaction.create({
      data: {
        storeId: auth.storeId,
        type,
        date: parsedDate,
        amount: parsedAmount,
        categoryId: categoryId || null,
        vendor: vendor || null,
        method: method || 'cash',
        memo: memo || null,
        source: source || 'manual',
        needsReview: needsReview ?? false,
        imagePath: imagePath || null,
        statedTotal: statedTotal !== undefined && statedTotal !== null ? parseFloat(statedTotal) : null,
      },
      include: { category: true },
    });
    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}
