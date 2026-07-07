'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { METHOD_LABELS, type DailyLedger, type DailyLedgerRow } from '@/lib/dailyLedger';

function formatYen(n: number): string {
  return `¥${Math.round(n).toLocaleString('ja-JP')}`;
}

function monthOptions(currentYear: number, currentMonth: number): { year: number; month: number }[] {
  const options: { year: number; month: number }[] = [];
  let y = currentYear;
  let m = currentMonth;
  for (let i = 0; i < 24; i++) {
    options.push({ year: y, month: m });
    m -= 1;
    if (m < 1) { m = 12; y -= 1; }
  }
  return options;
}

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildCsv(ledger: DailyLedger, storeName: string): string {
  const header = [
    '日', '曜',
    ...ledger.methodColumns.map((m) => METHOD_LABELS[m] ?? m),
    '売上合計',
    ...ledger.vendorColumns,
    '支出合計',
    '差引',
  ];

  const rowToCells = (row: DailyLedgerRow | (Omit<DailyLedgerRow, 'date' | 'day' | 'weekday'> & { day?: number; weekday?: string }), label?: string) => [
    label ?? String((row as DailyLedgerRow).day),
    label ? '' : (row as DailyLedgerRow).weekday,
    ...ledger.methodColumns.map((m) => row.salesByMethod[m] ?? 0),
    row.salesTotal,
    ...ledger.vendorColumns.map((v) => row.expenseByVendor[v] ?? 0),
    row.expenseTotal,
    row.net,
  ];

  const lines = [
    header,
    ...ledger.rows.map((row) => rowToCells(row)),
    rowToCells(ledger.monthTotal, '月合計'),
  ].map((cells) => cells.map(csvCell).join(','));

  return `﻿${[`${storeName} ${ledger.year}年${ledger.month}月 日次集計表`, ...lines].join('\n')}`;
}

function downloadCsv(ledger: DailyLedger, storeName: string) {
  const csv = buildCsv(ledger, storeName);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `daily-ledger_${ledger.year}-${String(ledger.month).padStart(2, '0')}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const netColor = (n: number) => (n < 0 ? '#dc2626' : n > 0 ? '#16a34a' : 'var(--ink-2)');

function LedgerRow({
  ledger,
  row,
  isTotal,
}: {
  ledger: DailyLedger;
  row: DailyLedgerRow | Omit<DailyLedgerRow, 'date' | 'day' | 'weekday'>;
  isTotal?: boolean;
}) {
  const day = isTotal ? undefined : (row as DailyLedgerRow).day;
  const weekday = isTotal ? undefined : (row as DailyLedgerRow).weekday;
  const cellClass = isTotal
    ? 'px-3 py-2.5 text-right whitespace-nowrap font-bold text-white'
    : 'px-3 py-2 text-right whitespace-nowrap';
  return (
    <tr className={isTotal ? 'bg-[var(--ink)] sticky bottom-0 z-10' : 'border-b border-gray-100 hover:bg-gray-50'}>
      <td className={isTotal ? 'px-3 py-2.5 font-bold text-white whitespace-nowrap' : 'px-3 py-2 whitespace-nowrap text-gray-700'}>
        {isTotal ? '月合計' : day}
      </td>
      <td className={isTotal ? 'px-3 py-2.5 text-white whitespace-nowrap' : 'px-3 py-2 whitespace-nowrap text-gray-400'}>
        {isTotal ? '' : weekday}
      </td>
      {ledger.methodColumns.map((m) => (
        <td key={m} className={cellClass}>{formatYen(row.salesByMethod[m] ?? 0)}</td>
      ))}
      <td className={isTotal ? cellClass + ' font-extrabold' : cellClass + ' font-semibold text-gray-900'}>
        {formatYen(row.salesTotal)}
      </td>
      {ledger.vendorColumns.map((v) => (
        <td key={v} className={cellClass}>{formatYen(row.expenseByVendor[v] ?? 0)}</td>
      ))}
      <td className={isTotal ? cellClass + ' font-extrabold' : cellClass + ' font-semibold text-gray-900'}>
        {formatYen(row.expenseTotal)}
      </td>
      <td
        className={cellClass + ' font-bold'}
        style={{ color: isTotal ? '#fff' : netColor(row.net) }}
      >
        {formatYen(row.net)}
      </td>
    </tr>
  );
}

export default function DailyLedgerClient({ ledger, storeName }: { ledger: DailyLedger; storeName: string }) {
  const router = useRouter();
  const options = monthOptions(ledger.year, ledger.month);

  const handleMonthChange = (value: string) => {
    const [y, m] = value.split('-').map(Number);
    router.push(`/daily-ledger?year=${y}&month=${m}`);
  };

  const methodCount = ledger.methodColumns.length;
  const vendorCount = ledger.vendorColumns.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1400px] mx-auto p-4 sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/dashboard" className="text-amber-600 hover:text-amber-700 text-sm">← ダッシュボードに戻る</Link>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">日次集計表</h1>
            <p className="text-sm text-gray-500 mt-1">
              {storeName ? `${storeName}・` : ''}今のExcel（損益計算書）と同じ列構成・表示専用
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={`${ledger.year}-${ledger.month}`}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              {options.map(({ year, month }) => (
                <option key={`${year}-${month}`} value={`${year}-${month}`}>
                  {year}年 {month}月
                </option>
              ))}
            </select>
            <button
              onClick={() => downloadCsv(ledger, storeName)}
              className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
            >
              CSV出力
            </button>
          </div>
        </div>

        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 leading-relaxed">
          修正はこの画面ではできません。読み間違いや仕分けの修正は、現場の記録画面（撮影・入力）側で行ってください。
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-auto max-h-[75vh]">
            <table className="text-sm border-collapse">
              <thead className="sticky top-0 z-20">
                <tr>
                  <th className="bg-white" colSpan={2} />
                  <th className="bg-green-50 text-green-600 px-3 py-1.5 text-xs font-bold text-center" colSpan={methodCount + 1}>
                    売上
                  </th>
                  <th className="bg-amber-50 text-amber-600 px-3 py-1.5 text-xs font-bold text-center" colSpan={vendorCount + 1}>
                    仕入先別支出
                  </th>
                  <th className="bg-white" />
                </tr>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 text-left text-gray-500 font-semibold whitespace-nowrap">日</th>
                  <th className="px-3 py-2 text-left text-gray-500 font-semibold whitespace-nowrap">曜</th>
                  {ledger.methodColumns.map((m) => (
                    <th key={m} className="px-3 py-2 text-right text-gray-500 font-semibold whitespace-nowrap">
                      {METHOD_LABELS[m] ?? m}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right text-gray-700 font-bold whitespace-nowrap">売上合計</th>
                  {ledger.vendorColumns.map((v) => (
                    <th key={v} className="px-3 py-2 text-right text-gray-500 font-semibold whitespace-nowrap">
                      {v}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right text-gray-700 font-bold whitespace-nowrap">支出合計</th>
                  <th className="px-3 py-2 text-right text-gray-700 font-bold whitespace-nowrap">差引</th>
                </tr>
              </thead>
              <tbody>
                {ledger.rows.map((row) => (
                  <LedgerRow key={row.date} ledger={ledger} row={row} />
                ))}
              </tbody>
              <tfoot>
                <LedgerRow ledger={ledger} row={ledger.monthTotal} isTotal />
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
