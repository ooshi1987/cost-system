import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name, sellingPrice, category } = await request.json();

    if (!name || !sellingPrice) {
      return NextResponse.json({ error: '商品名と価格は必須です' }, { status: 400 });
    }

    const menuItem = await prisma.menuItem.update({
      where: { id },
      data: {
        name,
        sellingPrice: parseFloat(sellingPrice),
        category: category || null,
      },
      include: { recipeItems: true },
    });

    return NextResponse.json(menuItem);
  } catch (error) {
    console.error('Error updating menu item:', error);
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.menuItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
  }
}
