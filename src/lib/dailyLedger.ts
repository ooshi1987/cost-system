import { prisma } from '@/lib/prisma';

// 経費の取引先/科目のうち月間金額が多い順に採用する件数（残りは「その他」に集約）
const VENDOR_TOP_N = 5;
const OTHER_KEY = 'その他';
const UNCLASSIFIED_KEY = '未分類';

export const METHOD_LABELS: Record<string, string> = {
  cash: '現金',
  cashless: 'クレジット',
  transfer: 'オンライン',
  other: 'その他',
};
const METHOD_ORDER = ['cash', 'cashless', 'transfer', 'other'];

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

export interface DailyLedgerRow {
  date: string; // "2026-01-15"
  day: number;
  weekday: string; // "水"
  salesByMethod: Record<string, number>;
  salesTotal: number;
  expenseByVendor: Record<string, number>; // 動的キー（上位N社名）＋ "その他"
  expenseTotal: number;
  net: number; // salesTotal - expenseTotal
}

export interface DailyLedger {
  year: number;
  month: number;
  vendorColumns: string[]; // 上位N社名（当月分、降順）＋ "その他"
  methodColumns: string[]; // 実際に使われている入金チャネル
  rows: DailyLedgerRow[];
  monthTotal: Omit<DailyLedgerRow, 'date' | 'day' | 'weekday'>;
}

// 取引日は時刻不問のため、日付の比較はローカルの年月日で行う（時刻成分のズレを吸収する）
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function emptyTotals(methodColumns: string[], vendorColumns: string[]) {
  return {
    salesByMethod: Object.fromEntries(methodColumns.map((m) => [m, 0])),
    salesTotal: 0,
    expenseByVendor: Object.fromEntries(vendorColumns.map((v) => [v, 0])),
    expenseTotal: 0,
    net: 0,
  };
}

export async function getDailyLedger(storeId: string, year: number, month: number): Promise<DailyLedger> {
  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 1);
  const daysInMonth = new Date(year, month, 0).getDate();

  const [salesTx, expenseTx] = await Promise.all([
    prisma.transaction.findMany({
      where: { storeId, type: 'sale', date: { gte: from, lt: to } },
      select: { date: true, amount: true, method: true },
    }),
    prisma.transaction.findMany({
      where: { storeId, type: 'expense', date: { gte: from, lt: to } },
      select: { date: true, amount: true, vendor: true, category: { select: { name: true } } },
    }),
  ]);

  // 入金チャネル列（当月に使用実績のあるものだけを既定の並び順で表示。無い月は既定4種を表示）
  const usedMethods = new Set(salesTx.map((t) => t.method));
  const orderedUsed = METHOD_ORDER.filter((m) => usedMethods.has(m));
  const unknownUsed = [...usedMethods].filter((m) => !METHOD_ORDER.includes(m));
  const methodColumns = orderedUsed.length > 0 || unknownUsed.length > 0
    ? [...orderedUsed, ...unknownUsed]
    : METHOD_ORDER;

  // 取引先/科目ごとの月間合計 → 上位N件を列として採用、残りは「その他」に集約
  const vendorTotals = new Map<string, number>();
  for (const t of expenseTx) {
    const key = t.vendor?.trim() || t.category?.name || UNCLASSIFIED_KEY;
    vendorTotals.set(key, (vendorTotals.get(key) ?? 0) + t.amount);
  }
  const topVendors = [...vendorTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, VENDOR_TOP_N)
    .map(([name]) => name);
  const vendorColumns = [...topVendors, OTHER_KEY];

  const rowsMap = new Map<string, DailyLedgerRow>();
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day);
    const key = dayKey(d);
    rowsMap.set(key, {
      date: key,
      day,
      weekday: WEEKDAY_LABELS[d.getDay()],
      ...emptyTotals(methodColumns, vendorColumns),
    });
  }

  for (const t of salesTx) {
    const row = rowsMap.get(dayKey(t.date));
    if (!row) continue;
    if (!(t.method in row.salesByMethod)) row.salesByMethod[t.method] = 0;
    row.salesByMethod[t.method] += t.amount;
    row.salesTotal += t.amount;
  }

  for (const t of expenseTx) {
    const row = rowsMap.get(dayKey(t.date));
    if (!row) continue;
    const rawKey = t.vendor?.trim() || t.category?.name || UNCLASSIFIED_KEY;
    const vendorKey = topVendors.includes(rawKey) ? rawKey : OTHER_KEY;
    row.expenseByVendor[vendorKey] += t.amount;
    row.expenseTotal += t.amount;
  }

  const rows = [...rowsMap.values()];
  for (const row of rows) row.net = row.salesTotal - row.expenseTotal;

  const monthTotal = emptyTotals(methodColumns, vendorColumns);
  for (const row of rows) {
    for (const m of methodColumns) monthTotal.salesByMethod[m] += row.salesByMethod[m] ?? 0;
    for (const v of vendorColumns) monthTotal.expenseByVendor[v] += row.expenseByVendor[v] ?? 0;
    monthTotal.salesTotal += row.salesTotal;
    monthTotal.expenseTotal += row.expenseTotal;
  }
  monthTotal.net = monthTotal.salesTotal - monthTotal.expenseTotal;

  return { year, month, vendorColumns, methodColumns, rows, monthTotal };
}
