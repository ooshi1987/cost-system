import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuth(request);
    if (!auth?.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { name, sellingPrice, category } = await request.json();
    if (!name || !sellingPrice) return NextResponse.json({ error: '商品名と価格は必須です' }, { status: 400 });

    const existing = await prisma.menuItem.findFirst({ where: { id, storeId: auth.storeId } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const menuItem = await prisma.menuItem.update({
      where: { id },
      data: { name, sellingPrice: parseFloat(sellingPrice), category: category || null },
      include: { recipeItems: true },
    });
    return NextResponse.json(menuItem);
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
    const existing = await prisma.menuItem.findFirst({ where: { id, storeId: auth.storeId } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.menuItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
  }
}
