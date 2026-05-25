import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth, TRIAL_LIMITS, isPaidPlan } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    if (!auth?.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const storeId = auth.storeId;

    const [ingredientGroups, menuItemCount, menuItemsWithRecipes, tenant] = await Promise.all([
      prisma.ingredient.groupBy({ by: ['type'], where: { storeId }, _count: { id: true } }),
      prisma.menuItem.count({ where: { storeId } }),
      prisma.menuItem.findMany({ where: { storeId }, include: { recipeItems: { include: { ingredient: true } } } }),
      prisma.tenant.findUnique({ where: { id: auth.tenantId }, select: { subscriptionStatus: true } }),
    ]);

    const foodCount = ingredientGroups.find((g) => g.type === 'food')?._count.id ?? 0;
    const seasoningCount = ingredientGroups.find((g) => g.type === 'seasoning')?._count.id ?? 0;

    const itemsWithCost = menuItemsWithRecipes.filter((item) => item.sellingPrice > 0 && item.recipeItems.length > 0);
    let avgCostRate: number | null = null;
    if (itemsWithCost.length > 0) {
      const total = itemsWithCost.reduce((acc, item) => {
        const cost = item.recipeItems.reduce((sum, ri) => sum + ri.ingredient.costPerUnit * ri.quantity, 0);
        return acc + (cost / item.sellingPrice) * 100;
      }, 0);
      avgCostRate = Math.round(total / itemsWithCost.length);
    }

    const isPaid = isPaidPlan(tenant?.subscriptionStatus);
    return NextResponse.json({
      foodCount,
      seasoningCount,
      menuItemCount,
      avgCostRate,
      // トライアル制限情報
      trial: {
        isPaid,
        menuLimit: TRIAL_LIMITS.menuItems,
        ingredientLimit: TRIAL_LIMITS.ingredients,
        menuUsage: menuItemCount,
        ingredientUsage: foodCount + seasoningCount,
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
