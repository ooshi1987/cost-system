import { prisma } from './prisma';

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
