import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name, unit, costPerUnit, category } = await request.json();

    if (!name || !unit || costPerUnit === undefined) {
      return NextResponse.json({ error: '食材名・単位・単価は必須です' }, { status: 400 });
    }

    const ingredient = await prisma.ingredient.update({
      where: { id },
      data: {
        name,
        unit,
        costPerUnit: parseFloat(costPerUnit),
        category: category || null,
      },
    });

    return NextResponse.json(ingredient);
  } catch (error) {
    console.error('Error updating ingredient:', error);
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.ingredient.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting ingredient:', error);
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
  }
}
