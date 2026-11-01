// ブラウザとサーバーで共用する。DB・環境変数にはアクセスしない。
export type ReceiptTaxBasis = 'exclusive' | 'inclusive' | 'mixed' | 'unknown';

export interface ReceiptMetadata {
  statedTotal: number;
  externalTax: number;
  taxBasis: ReceiptTaxBasis;
  documentDate?: string;
}

export function isDocumentDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// 店舗の暦日は日本時間で統一。サーバー・端末のタイムゾーンに依存させない。
export function japanDateKey(value: Date | string = new Date()): string {
  return new Date(new Date(value).getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function getJapanMonthWindows(now = new Date(), count = 6) {
  const today = japanDateKey(now);
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  return Array.from({ length: count }, (_, i) => {
    const day = new Date(Date.UTC(year, month - count + i, 1)).toISOString().slice(0, 10);
    const next = new Date(Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)), 1)).toISOString().slice(0, 10);
    return {
      key: day.slice(0, 7),
      label: `${Number(day.slice(5, 7))}月`,
      start: new Date(`${day}T00:00:00+09:00`),
      end: new Date(`${next}T00:00:00+09:00`),
    };
  });
}

export const TAX_BASIS_LABELS: Record<ReceiptTaxBasis, string> = {
  exclusive: '税抜明細',
  inclusive: '税込明細',
  mixed: '税抜・税込混在',
  unknown: '税区分未確認',
};

export function isNonNegativeAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function isReceiptTaxBasis(value: unknown): value is ReceiptTaxBasis {
  return value === 'exclusive' || value === 'inclusive' || value === 'mixed' || value === 'unknown';
}

export function calculateReceiptAmounts(
  items: readonly { totalPrice: number }[],
  statedTotal: number | null,
  externalTax: number | null,
) {
  const itemsTotal = Math.round(items.reduce((sum, item) => sum + item.totalPrice, 0) * 100) / 100;
  const calculatedTotal = externalTax === null ? null : Math.round((itemsTotal + externalTax) * 100) / 100;
  const difference = statedTotal === null || calculatedTotal === null
    ? null : Math.round((statedTotal - calculatedTotal) * 100) / 100;
  return { itemsTotal, calculatedTotal, difference };
}

export function readReceiptMetadata(rawData: string | null | undefined): ReceiptMetadata | null {
  if (!rawData) return null;
  try {
    const data = JSON.parse(rawData);
    // 旧形式（明細配列）はそのまま利用し、過去の税額・税込合計は推測しない。
    if (!data || data.version !== 2 || !data.receipt) return null;
    const { statedTotal, externalTax, taxBasis, documentDate } = data.receipt;
    if (!isNonNegativeAmount(statedTotal) || !isNonNegativeAmount(externalTax) || !isReceiptTaxBasis(taxBasis)) return null;
    return { statedTotal, externalTax, taxBasis, ...(isDocumentDate(documentDate) ? { documentDate } : {}) };
  } catch {
    return null;
  }
}

export function getDeliveryDocumentDate(slip: { ocrRawData?: string | null; createdAt: Date | string }): string {
  // 未記録の過去分は登録日の日本時間で扱い、原本の日付を推測しない。
  return readReceiptMetadata(slip.ocrRawData)?.documentDate ?? japanDateKey(slip.createdAt);
}

export function getDeliveryPurchaseTotal(slip: {
  ocrRawData?: string | null;
  deliveryItems: readonly { totalPrice: number }[];
}): number {
  const receipt = readReceiptMetadata(slip.ocrRawData);
  return receipt?.statedTotal ?? calculateReceiptAmounts(slip.deliveryItems, null, null).itemsTotal;
}
