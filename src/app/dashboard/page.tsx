import { redirect } from 'next/navigation';
import { getServerAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateReceiptAmounts, getDeliveryDocumentDate, getDeliveryPurchaseTotal, getJapanMonthWindows, japanDateKey, readReceiptMetadata } from '@/lib/deliveryAmounts';
import DashboardClient from './DashboardClient';
import type { OwnerDashboardData } from './DesktopAdminPanel';

export default async function DashboardPage() {
  const auth = await getServerAuth();
  if (!auth?.storeId) redirect('/login');

  const storeId = auth.storeId;
  const now = new Date();
  const todayKey = japanDateKey(now);
  const monthWindows = getJapanMonthWindows(now, 2);
  const monthKey = todayKey.slice(0, 7);
  // 要確認一覧の既定期間と揃える。
  const reviewFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const reviewTo = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [transactions, deliverySlips, store, reviewCount] = await Promise.all([
    prisma.transaction.findMany({
      where: { storeId, date: { gte: monthWindows[0].start } },
      select: { type: true, date: true, amount: true, needsReview: true },
    }),
    prisma.deliverySlip.findMany({
      where: { storeId },
      select: { createdAt: true, ocrRawData: true, deliveryItems: { select: { totalPrice: true } } },
    }),
    prisma.store.findUnique({ where: { id: storeId }, select: { name: true } }),
    prisma.transaction.count({ where: { storeId, needsReview: true, date: { gte: reviewFrom, lt: reviewTo } } }),
  ]);

  const slips = deliverySlips.map((slip) => ({
    ...slip,
    documentDate: getDeliveryDocumentDate(slip),
    total: getDeliveryPurchaseTotal(slip),
  }));
  const monthTransactions = transactions.filter((transaction) => japanDateKey(transaction.date).slice(0, 7) === monthKey);
  const monthlySales = monthTransactions.filter((transaction) => transaction.type === 'sale').reduce((sum, transaction) => sum + transaction.amount, 0);
  const monthlyExpense = monthTransactions.filter((transaction) => transaction.type === 'expense').reduce((sum, transaction) => sum + transaction.amount, 0);
  const monthSlips = slips.filter((slip) => slip.documentDate.slice(0, 7) === monthKey);
  const monthlyPurchase = monthSlips.reduce((sum, slip) => sum + slip.total, 0);
  const receiptDifferences = monthSlips.filter((slip) => {
    const receipt = readReceiptMetadata(slip.ocrRawData);
    return receipt && calculateReceiptAmounts(slip.deliveryItems, receipt.statedTotal, receipt.externalTax).difference !== 0;
  }).length;

  const dailyRecords: OwnerDashboardData['dailyRecords'] = Array.from({ length: 7 }, (_, index) => {
    const key = japanDateKey(new Date(now.getTime() - index * 24 * 60 * 60 * 1000));
    const sales = transactions.filter((transaction) => transaction.type === 'sale' && japanDateKey(transaction.date) === key);
    return {
      date: key,
      salesTotal: sales.reduce((sum, transaction) => sum + transaction.amount, 0),
      hasSales: sales.length > 0,
      needsReview: sales.some((transaction) => transaction.needsReview),
    };
  });
  const dateLabel = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', month: 'long', day: 'numeric', weekday: 'long' }).format(now);

  return (
    <DashboardClient
      storeName={store?.name ?? null}
      today={{ dateLabel, hasSales: dailyRecords[0].hasSales, slipCount: slips.filter((slip) => slip.documentDate === todayKey).length }}
      owner={{ dateLabel, monthlySales, monthlyExpense, monthlyPurchase, reviewCount, receiptDifferences, dailyRecords }}
    />
  );
}
