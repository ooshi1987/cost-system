import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (auth.role !== 'tenant_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // テナントの全店舗を取得
    const stores = await prisma.store.findMany({
      where: { tenantId: auth.tenantId },
      orderBy: { createdAt: 'asc' },
    });

    // 各店舗のKPIを並列取得
    const storeStats = await Promise.all(
      stores.map(async (store) => {
        const [menuItems, ingredientGroups, deliveryCount] = await Promise.all([
          prisma.menuItem.findMany({
            where: { storeId: store.id },
            include: { recipeItems: { include: { ingredient: true } } },
          }),
          prisma.ingredient.groupBy({
            by: ['type'],
            where: { storeId: store.id },
            _count: { id: true },
          }),
          prisma.deliverySlip.count({ where: { storeId: store.id } }),
        ]);

        const foodCount      = ingredientGroups.find(g => g.type === 'food')?._count.id ?? 0;
        const seasoningCount = ingredientGroups.find(g => g.type === 'seasoning')?._count.id ?? 0;

        // 平均原価率
        const itemsWithCost = menuItems.filter(
          item => item.sellingPrice > 0 && item.recipeItems.length > 0
        );
        let avgCostRate: number | null = null;
        if (itemsWithCost.length > 0) {
          const total = itemsWithCost.reduce((acc, item) => {
            const cost = item.recipeItems.reduce(
              (sum, ri) => sum + ri.ingredient.costPerUnit * ri.quantity, 0
            );
            return acc + (cost / item.sellingPrice) * 100;
          }, 0);
          avgCostRate = Math.round(total / itemsWithCost.length);
        }

        // 原価率が高いメニューTOP3
        const highCostMenus = itemsWithCost
          .map(item => {
            const cost = item.recipeItems.reduce(
              (sum, ri) => sum + ri.ingredient.costPerUnit * ri.quantity, 0
            );
            return { name: item.name, costRate: Math.round((cost / item.sellingPrice) * 100) };
          })
          .filter(m => m.costRate > 30)
          .sort((a, b) => b.costRate - a.costRate)
          .slice(0, 3);

        return {
          id: store.id,
          name: store.name,
          menuCount: menuItems.length,
          ingredientCount: foodCount + seasoningCount,
          avgCostRate,
          deliveryCount,
          highCostMenus,
          alert: avgCostRate !== null && avgCostRate > 40,
          warning: avgCostRate !== null && avgCostRate > 30 && avgCostRate <= 40,
        };
      })
    );

    // テナント全体の集計
    const storesWithRate = storeStats.filter(s => s.avgCostRate !== null);
    const overallAvgCostRate = storesWithRate.length > 0
      ? Math.round(storesWithRate.reduce((sum, s) => sum + (s.avgCostRate ?? 0), 0) / storesWithRate.length)
      : null;

    return NextResponse.json({
      stores: storeStats,
      summary: {
        totalStores: storeStats.length,
        totalMenuItems: storeStats.reduce((sum, s) => sum + s.menuCount, 0),
        totalIngredients: storeStats.reduce((sum, s) => sum + s.ingredientCount, 0),
        totalDeliveryScans: storeStats.reduce((sum, s) => sum + s.deliveryCount, 0),
        overallAvgCostRate,
        alertCount: storeStats.filter(s => s.alert).length,
        warningCount: storeStats.filter(s => s.warning).length,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch store overview' }, { status: 500 });
  }
}
