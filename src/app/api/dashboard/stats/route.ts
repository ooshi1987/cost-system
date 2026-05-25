import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [ingredientGroups, menuItemCount, menuItemsWithRecipes] = await Promise.all([
      prisma.ingredient.groupBy({
        by: ['type'],
        _count: { id: true },
      }),
      prisma.menuItem.count(),
      prisma.menuItem.findMany({
        include: {
          recipeItems: {
            include: { ingredient: true },
          },
        },
      }),
    ]);

    const foodCount = ingredientGroups.find((g) => g.type === 'food')?._count.id ?? 0;
    const seasoningCount = ingredientGroups.find((g) => g.type === 'seasoning')?._count.id ?? 0;

    // レシピが登録されていてかつ販売価格 > 0 のメニューのみで原価率を計算
    const itemsWithCost = menuItemsWithRecipes.filter(
      (item) => item.sellingPrice > 0 && item.recipeItems.length > 0
    );

    let avgCostRate: number | null = null;
    if (itemsWithCost.length > 0) {
      const total = itemsWithCost.reduce((acc, item) => {
        const cost = item.recipeItems.reduce(
          (sum, ri) => sum + ri.ingredient.costPerUnit * ri.quantity,
          0
        );
        return acc + (cost / item.sellingPrice) * 100;
      }, 0);
      avgCostRate = Math.round(total / itemsWithCost.length);
    }

    return NextResponse.json({ foodCount, seasoningCount, menuItemCount, avgCostRate });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
