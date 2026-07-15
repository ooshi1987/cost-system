import { prisma } from './prisma';

export interface MenuCost {
  menuItemId: string;
  name: string;
  sellingPrice: number;
  costPrice: number;
  profit: number;
  profitMargin: number; // %
}

export async function calculateMenuCost(menuItemId: string): Promise<MenuCost | null> {
  const menuItem = await prisma.menuItem.findUnique({
    where: { id: menuItemId },
    include: {
      recipeItems: {
        include: {
          ingredient: true,
        },
      },
    },
  });

  if (!menuItem) return null;

  let totalCost = 0;
  for (const recipeItem of menuItem.recipeItems) {
    const costPerUnit = recipeItem.ingredient.costPerUnit;
    const quantity = recipeItem.quantity;
    totalCost += costPerUnit * quantity;
  }

  const profit = menuItem.sellingPrice - totalCost;
  const profitMargin = (profit / menuItem.sellingPrice) * 100;

  return {
    menuItemId,
    name: menuItem.name,
    sellingPrice: menuItem.sellingPrice,
    costPrice: totalCost,
    profit,
    profitMargin: Math.round(profitMargin * 100) / 100,
  };
}

export async function getAllMenuCosts(): Promise<MenuCost[]> {
  const menuItems = await prisma.menuItem.findMany();
  const costs: MenuCost[] = [];

  for (const item of menuItems) {
    const cost = await calculateMenuCost(item.id);
    if (cost) costs.push(cost);
  }

  return costs.sort((a, b) => a.name.localeCompare(b.name));
}

export interface PettyCashBalance {
  bookBalance: number;
  lastCountedAt: Date | null;
}

/**
 * 小口現金の帳簿上の残高を計算する。
 * 直近の実残高記録（CashCount）を基準に、それ以降の現金取引（売上-経費）を積み上げる。
 * 記録が無ければ基準残高0から全期間の現金取引で計算する。
 */
export async function getPettyCashBalance(storeId: string): Promise<PettyCashBalance> {
  const lastCount = await prisma.cashCount.findFirst({
    where: { storeId },
    orderBy: { countedAt: 'desc' },
  });

  const baseBalance = lastCount?.actualBalance ?? 0;
  const since = lastCount?.countedAt;

  const cashTransactions = await prisma.transaction.findMany({
    where: {
      storeId,
      method: 'cash',
      ...(since ? { createdAt: { gt: since } } : {}),
    },
    select: { type: true, amount: true },
  });

  const net = cashTransactions.reduce(
    (sum, t) => sum + (t.type === 'sale' ? t.amount : -t.amount),
    0
  );

  return {
    bookBalance: baseBalance + net,
    lastCountedAt: lastCount?.countedAt ?? null,
  };
}
