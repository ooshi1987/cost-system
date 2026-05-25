import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuth(request);
    if (!auth?.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { name, unit, costPerUnit, category } = await request.json();
    if (!name || !unit || costPerUnit === undefined) {
      return NextResponse.json({ error: '食材名・単位・単価は必須です' }, { status: 400 });
    }

    // storeId所有チェック
    const existing = await prisma.ingredient.findFirst({ where: { id, storeId: auth.storeId } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const ingredient = await prisma.ingredient.update({
      where: { id },
      data: { name, unit, costPerUnit: parseFloat(costPerUnit), category: category || null },
    });
    return NextResponse.json(ingredient);
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
    const existing = await prisma.ingredient.findFirst({ where: { id, storeId: auth.storeId } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.ingredient.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
  }
}
