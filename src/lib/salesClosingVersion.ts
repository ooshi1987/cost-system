import { createHash } from 'node:crypto';

interface ClosingRowVersion {
  id: string;
  date: Date;
  amount: number;
  method: string;
  vendor: string | null;
  statedTotal: number | null;
  needsReview: boolean;
  memo: string | null;
  updatedAt: Date;
}

// 比較対象を更新日時だけに頼らず、同一ミリ秒内の競合も検出する。
export function salesClosingVersion(row: ClosingRowVersion): string {
  return createHash('sha256').update(JSON.stringify([
    row.id, row.date.toISOString(), row.amount, row.method, row.vendor, row.statedTotal,
    row.needsReview, row.memo, row.updatedAt.toISOString(),
  ])).digest('hex');
}
