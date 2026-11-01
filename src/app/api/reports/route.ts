import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';
import { getDeliveryPurchaseTotal, getDeliveryDocumentDate, getJapanMonthWindows } from '@/lib/deliveryAmounts';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    if (!auth?.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const storeId = auth.storeId;
    const now = new Date();

    const months = getJapanMonthWindows(now);
    // 登録月で絞ると後日入力した伝票を取りこぼすため、伝票日で集計する。
    const slips = await prisma.deliverySlip.findMany({
      where: { storeId },
      select: { createdAt: true, ocrRawData: true, deliveryItems: { select: { totalPrice: true } } },
    });
    const totals = new Map<string, number>();
    for (const slip of slips) {
      const key = getDeliveryDocumentDate(slip).slice(0, 7);
      totals.set(key, (totals.get(key) ?? 0) + getDeliveryPurchaseTotal(slip));
    }
    const monthlyData = months.map((m) => ({
      label: m.label,
      total: totals.get(m.key) ?? 0,
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
