import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    await prisma.ingredient.deleteMany(type ? { where: { type } } : undefined);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // "food" | "seasoning" | null (全件)

    const ingredients = await prisma.ingredient.findMany({
      where: type ? { type } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json(ingredients);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch ingredients' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, unit, costPerUnit, type, category, sortOrder } = body;

    if (!name || !unit || costPerUnit === undefined) {
      return NextResponse.json(
        { error: 'name, unit, and costPerUnit are required' },
        { status: 400 }
      );
    }

    const ingredient = await prisma.ingredient.create({
      data: {
        name,
        unit,
        costPerUnit: parseFloat(costPerUnit),
        type: type || 'food',
        category: category || null,
        sortOrder: sortOrder != null ? parseInt(sortOrder) : null,
      },
    });

    return NextResponse.json(ingredient, { status: 201 });
  } catch (error) {
    console.error('Error creating ingredient:', error);
    return NextResponse.json(
      { error: 'Failed to create ingredient' },
      { status: 500 }
    );
  }
}
