import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';
import { getPettyCashBalance } from '@/lib/calculations';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    if (!auth?.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const balance = await getPettyCashBalance(auth.storeId);
    return NextResponse.json(balance);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch petty cash balance' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    if (!auth?.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { actualBalance, memo } = body;
    const parsedActual = parseFloat(actualBalance);
    if (Number.isNaN(parsedActual) || parsedActual < 0) {
      return NextResponse.json({ error: 'actualBalance は0以上の数値を指定してください' }, { status: 400 });
    }

    const { bookBalance } = await getPettyCashBalance(auth.storeId);
    const difference = Math.round((parsedActual - bookBalance) * 100) / 100;

    const cashCount = await prisma.cashCount.create({
      data: {
        storeId: auth.storeId,
        bookBalance,
        actualBalance: parsedActual,
        difference,
        memo: memo?.trim() || null,
      },
    });
    return NextResponse.json(cashCount, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to save cash count' }, { status: 500 });
  }
}
