import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    if (!auth?.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const storeId = auth.storeId;
    const now = new Date();

    // 過去6ヶ月分の月ラベルと開始日を生成
    const months: { label: string; year: number; month: number; start: Date; end: Date }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      months.push({
        label: `${d.getMonth() + 1}月`,
        year: d.getFullYear(),
        month: d.getMonth(),
        start,
        end,
      });
    }

    // 月次仕入総額
    const monthlyTotals = await Promise.all(
      months.map(async ({ start, end }) => {
        const items = await prisma.deliveryItem.findMany({
          where: { deliverySlip: { storeId, createdAt: { gte: start, lt: end } } },
          select: { totalPrice: true },
        });
        return items.reduce((sum, i) => sum + i.totalPrice, 0);
      })
    );

    const monthlyData = months.map((m, i) => ({
      label: m.label,
      total: monthlyTotals[i],
    }));

    // メニュー別利益分析
    const menuItems = await prisma.menuItem.findMany({
      where: { storeId },
      include: { recipeItems: { include: { ingredient: true } } },
    });

    const menuProfits = menuItems
      .filter((item) => item.sellingPrice > 0 && item.recipeItems.length > 0)
      .map((item) => {
        const costPrice = item.recipeItems.reduce(
          (sum, ri) => sum + ri.ingredient.costPerUnit * ri.quantity,
          0
        );
        const profit = item.sellingPrice - costPrice;
        const costRate = (costPrice / item.sellingPrice) * 100;
        return {
          id: item.id,
          name: item.name,
          category: item.category ?? 'その他',
          sellingPrice: Math.round(item.sellingPrice),
          costPrice: Math.round(costPrice * 10) / 10,
          profit: Math.round(profit * 10) / 10,
          costRate: Math.round(costRate * 10) / 10,
        };
      })
      .sort((a, b) => b.costRate - a.costRate);

    return NextResponse.json({ monthlyData, menuProfits });
  } catch (error) {
    console.error('Reports error:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}
