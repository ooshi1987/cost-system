import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth, TRIAL_LIMITS, isPaidPlan } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    if (!auth?.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const storeId = auth.storeId;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [ingredientGroups, menuItemCount, menuItemsWithRecipes, tenant, monthlyDeliveryItems, unprocessedSlips] = await Promise.all([
      prisma.ingredient.groupBy({ by: ['type'], where: { storeId }, _count: { id: true } }),
      prisma.menuItem.count({ where: { storeId } }),
      prisma.menuItem.findMany({ where: { storeId }, include: { recipeItems: { include: { ingredient: true } } } }),
      prisma.tenant.findUnique({ where: { id: auth.tenantId }, select: { subscriptionStatus: true } }),
      prisma.deliveryItem.findMany({
        where: { deliverySlip: { storeId, createdAt: { gte: monthStart } } },
        select: { totalPrice: true },
      }),
      prisma.deliverySlip.count({ where: { storeId, processedAt: null } }),
    ]);

    const foodCount = ingredientGroups.find((g) => g.type === 'food')?._count.id ?? 0;
    const seasoningCount = ingredientGroups.find((g) => g.type === 'seasoning')?._count.id ?? 0;

    const itemsWithCost = menuItemsWithRecipes.filter((item) => item.sellingPrice > 0 && item.recipeItems.length > 0);
    let avgCostRate: number | null = null;

    const topCostItems: { name: string; costRate: number }[] = [];

    if (itemsWithCost.length > 0) {
      const itemCosts = itemsWithCost.map((item) => {
        const cost = item.recipeItems.reduce((sum, ri) => sum + ri.ingredient.costPerUnit * ri.quantity, 0);
        const costRate = Math.round((cost / item.sellingPrice) * 1000) / 10;
        return { name: item.name, costRate };
      });

      const totalRate = itemCosts.reduce((acc, i) => acc + i.costRate, 0);
      avgCostRate = Math.round(totalRate / itemCosts.length);

      itemCosts.sort((a, b) => b.costRate - a.costRate);
      topCostItems.push(...itemCosts.slice(0, 5));
    }

    const recipeCount = menuItemsWithRecipes.filter((item) => item.recipeItems.length > 0).length;
    const monthlyPurchaseTotal = monthlyDeliveryItems.reduce((sum, item) => sum + item.totalPrice, 0);

    const isPaid = isPaidPlan(tenant?.subscriptionStatus);
    return NextResponse.json({
      foodCount,
      seasoningCount,
      menuItemCount,
      avgCostRate,
      recipeCount,
      monthlyPurchaseTotal,
      unprocessedSlips,
      topCostItems,
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
