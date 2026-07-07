import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuth(request);
    if (!auth?.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { name, kind, color, autoVendors } = await request.json();
    if (!name || !kind) {
      return NextResponse.json({ error: 'name, kind は必須です' }, { status: 400 });
    }
    if (kind !== 'expense' && kind !== 'income') {
      return NextResponse.json({ error: 'kind は expense または income を指定してください' }, { status: 400 });
    }

    const existing = await prisma.category.findFirst({ where: { id, storeId: auth.storeId } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const duplicate = await prisma.category.findFirst({
      where: { storeId: auth.storeId, name, id: { not: id } },
    });
    if (duplicate) {
      return NextResponse.json({ error: '同名の科目があります' }, { status: 409 });
    }

    const category = await prisma.category.update({
      where: { id },
      data: { name, kind, color: color || null, autoVendors: autoVendors || null },
    });
    return NextResponse.json(category);
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
    const existing = await prisma.category.findFirst({
      where: { id, storeId: auth.storeId },
      include: { _count: { select: { transactions: true } } },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ success: true, usedByTransactions: existing._count.transactions });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
  }
}
