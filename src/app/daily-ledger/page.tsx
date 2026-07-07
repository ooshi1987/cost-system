import { redirect } from 'next/navigation';
import { getServerAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getDailyLedger } from '@/lib/dailyLedger';
import DailyLedgerClient from './DailyLedgerClient';

export default async function DailyLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const auth = await getServerAuth();
  if (!auth?.storeId) redirect('/login');

  const params = await searchParams;
  const now = new Date();
  const yearParam = Number(params.year);
  const monthParam = Number(params.month);
  const year = Number.isInteger(yearParam) && yearParam > 0 ? yearParam : now.getFullYear();
  const month = Number.isInteger(monthParam) && monthParam >= 1 && monthParam <= 12 ? monthParam : now.getMonth() + 1;

  const [ledger, store] = await Promise.all([
    getDailyLedger(auth.storeId, year, month),
    prisma.store.findUnique({ where: { id: auth.storeId }, select: { name: true } }),
  ]);

  return <DailyLedgerClient ledger={ledger} storeName={store?.name ?? ''} />;
}
