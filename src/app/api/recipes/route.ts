import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    if (!auth?.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { menuItemId, ingredientId, quantity } = await request.json();
    if (!menuItemId || !ingredientId || quantity === undefined) {
      return NextResponse.json({ error: 'menuItemId, ingredientId, quantity は必須です' }, { status: 400 });
    }

    // 所有権チェック
    const [menuItem, ingredient] = await Promise.all([
      prisma.menuItem.findFirst({ where: { id: menuItemId, storeId: auth.storeId } }),
      prisma.ingredient.findFirst({ where: { id: ingredientId, storeId: auth.storeId } }),
    ]);
    if (!menuItem || !ingredient) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const recipeItem = await prisma.recipeItem.create({
      data: { menuItemId, ingredientId, quantity: parseFloat(quantity) },
      include: { ingredient: true, menuItem: true },
    });
    return NextResponse.json(recipeItem, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create recipe item' }, { status: 500 });
  }
}
