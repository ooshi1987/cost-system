import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { menuItemId, ingredientId, quantity } = body;

    if (!menuItemId || !ingredientId || quantity === undefined) {
      return NextResponse.json(
        { error: 'menuItemId, ingredientId, and quantity are required' },
        { status: 400 }
      );
    }

    const recipeItem = await prisma.recipeItem.create({
      data: {
        menuItemId,
        ingredientId,
        quantity: parseFloat(quantity),
      },
      include: {
        ingredient: true,
        menuItem: true,
      },
    });

    return NextResponse.json(recipeItem, { status: 201 });
  } catch (error) {
    console.error('Error creating recipe item:', error);
    return NextResponse.json(
      { error: 'Failed to create recipe item' },
      { status: 500 }
    );
  }
}
