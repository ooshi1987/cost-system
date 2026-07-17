import { redirect } from 'next/navigation';
import { getServerAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { METHOD_LABELS } from '@/lib/dailyLedger';
import DashboardClient, { type RecentEntry, type TrendMonth, type CategoryItem } from './DashboardClient';

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}`;
}

export default async function DashboardPage() {
  const auth = await getServerAuth();
  if (!auth?.storeId) redirect('/login');

  const storeId = auth.storeId;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const monthWindows: { label: string; start: Date }[] = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthWindows.push({ label: `${start.getMonth() + 1}月`, start });
  }

  const [
    ingredientGroups,
    menuItemCount,
    menuItemsWithRecipes,
    transactions6mo,
    deliverySlips6mo,
    unprocessedSlips,
    user,
    store,
    reviewCount,
  ] = await Promise.all([
    prisma.ingredient.groupBy({ by: ['type'], where: { storeId }, _count: { id: true } }),
    prisma.menuItem.count({ where: { storeId } }),
    prisma.menuItem.findMany({ where: { storeId }, include: { recipeItems: { include: { ingredient: true } } } }),
    prisma.transaction.findMany({
      where: { storeId, date: { gte: sixMonthsAgoStart } },
      select: { id: true, type: true, date: true, amount: true, vendor: true, method: true, categoryId: true, category: { select: { name: true } } },
      orderBy: { date: 'desc' },
    }),
    prisma.deliverySlip.findMany({
      where: { storeId, createdAt: { gte: sixMonthsAgoStart } },
      select: { id: true, vendor: true, createdAt: true, deliveryItems: { select: { totalPrice: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.deliverySlip.count({ where: { storeId, processedAt: null } }),
    prisma.user.findUnique({ where: { id: auth.userId }, select: { name: true } }),
    prisma.store.findUnique({ where: { id: storeId }, select: { name: true } }),
    prisma.transaction.count({ where: { storeId, needsReview: true } }),
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

  // ── 仕入(食材原価)は DeliverySlip 経由のため Transaction には現れない。
  //    月次の実際の支出・純利益は「Transaction経費」と「仕入」を合算して算出する。
  const slipTotals = deliverySlips6mo.map((slip) => ({
    ...slip,
    total: slip.deliveryItems.reduce((sum, item) => sum + item.totalPrice, 0),
  }));

  const salesByMonth = new Map<string, number>();
  const expenseByMonth = new Map<string, number>();
  for (const t of transactions6mo) {
    const key = monthKey(new Date(t.date));
    if (t.type === 'sale') salesByMonth.set(key, (salesByMonth.get(key) ?? 0) + t.amount);
    else if (t.type === 'expense') expenseByMonth.set(key, (expenseByMonth.get(key) ?? 0) + t.amount);
  }
  const purchaseByMonth = new Map<string, number>();
  for (const slip of slipTotals) {
    const key = monthKey(new Date(slip.createdAt));
    purchaseByMonth.set(key, (purchaseByMonth.get(key) ?? 0) + slip.total);
  }

  const trend: TrendMonth[] = monthWindows.map(({ label, start }) => {
    const key = monthKey(start);
    const sales = salesByMonth.get(key) ?? 0;
    const purchase = purchaseByMonth.get(key) ?? 0;
    const expense = expenseByMonth.get(key) ?? 0;
    const totalCost = purchase + expense;
    const profit = sales - totalCost;
    const margin = sales > 0 ? Math.round((profit / sales) * 1000) / 10 : 0;
    return { label, sales, purchase, expense, totalCost, profit, margin };
  });

  const current = trend[trend.length - 1];

  // ── 科目別支出（当月）: 仕入を「食材仕入」として先頭に合成 ──
  const categoryTotals = new Map<string, number>();
  for (const t of transactions6mo) {
    if (t.type !== 'expense') continue;
    if (new Date(t.date) < monthStart) continue;
    const name = t.category?.name ?? '未分類';
    categoryTotals.set(name, (categoryTotals.get(name) ?? 0) + t.amount);
  }
  const categoryBreakdown: CategoryItem[] = [
    { name: '食材仕入', amount: current.purchase },
    ...[...categoryTotals.entries()].map(([name, amount]) => ({ name, amount })),
  ]
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  // ── 取引一覧（Transaction + 仕入伝票を統合） ──
  const txEntries: RecentEntry[] = transactions6mo.slice(0, 40).map((t) => ({
    id: t.id,
    date: new Date(t.date).toISOString(),
    label: t.vendor?.trim() || t.category?.name || (t.type === 'sale' ? '売上' : '経費'),
    category: t.category?.name ?? (t.type === 'sale' ? '売上' : '未分類'),
    method: METHOD_LABELS[t.method] ?? t.method,
    amount: t.amount,
    type: t.type === 'sale' ? 'sale' : 'expense',
  }));
  const purchaseEntries: RecentEntry[] = slipTotals
    .filter((s) => s.total > 0)
    .slice(0, 40)
    .map((slip) => ({
      id: slip.id,
      date: new Date(slip.createdAt).toISOString(),
      label: slip.vendor?.trim() || '仕入',
      category: '食材仕入',
      method: '—',
      amount: slip.total,
      type: 'purchase',
    }));
  const recentEntries: RecentEntry[] = [...txEntries, ...purchaseEntries]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 25);

  return (
    <DashboardClient
      stats={{
        menuItemCount,
        foodCount,
        seasoningCount,
        avgCostRate,
        recipeCount,
        monthlyPurchaseTotal: current.purchase,
        unprocessedSlips,
        topCostItems,
        monthSalesTotal: current.sales,
        monthExpenseTotal: current.expense,
        reviewCount,
      }}
      me={{
        name: user?.name ?? null,
        storeName: store?.name ?? null,
      }}
      trend={trend}
      categoryBreakdown={categoryBreakdown}
      recentEntries={recentEntries}
    />
  );
}
