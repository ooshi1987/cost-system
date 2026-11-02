import { redirect } from 'next/navigation';
import { getServerAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getDailyLedger } from '@/lib/dailyLedger';
import DailyLedgerClient from './DailyLedgerClient';
import { japanDateKey } from '@/lib/deliveryAmounts';

export default async function DailyLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const auth = await getServerAuth();
  if (!auth?.storeId) redirect('/login');

  const params = await searchParams;
  const today = japanDateKey();
  const yearParam = Number(params.year);
  const monthParam = Number(params.month);
  const year = Number.isInteger(yearParam) && yearParam > 0 ? yearParam : Number(today.slice(0, 4));
  const month = Number.isInteger(monthParam) && monthParam >= 1 && monthParam <= 12 ? monthParam : Number(today.slice(5, 7));

  const [ledger, store] = await Promise.all([
    getDailyLedger(auth.storeId, year, month),
    prisma.store.findUnique({ where: { id: auth.storeId }, select: { name: true } }),
  ]);

  return <DailyLedgerClient ledger={ledger} storeName={store?.name ?? ''} />;
}
