// ブラウザとサーバーで共用する。DB・環境変数にはアクセスしない。
export type ReceiptTaxBasis = 'exclusive' | 'inclusive' | 'mixed' | 'unknown';

export interface ReceiptMetadata {
  statedTotal: number;
  externalTax: number;
  taxBasis: ReceiptTaxBasis;
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
    const { statedTotal, externalTax, taxBasis } = data.receipt;
    if (!isNonNegativeAmount(statedTotal) || !isNonNegativeAmount(externalTax) || !isReceiptTaxBasis(taxBasis)) return null;
    return { statedTotal, externalTax, taxBasis };
  } catch {
    return null;
  }
}

export function getDeliveryPurchaseTotal(slip: {
  ocrRawData?: string | null;
  deliveryItems: readonly { totalPrice: number }[];
}): number {
  const receipt = readReceiptMetadata(slip.ocrRawData);
  return receipt?.statedTotal ?? calculateReceiptAmounts(slip.deliveryItems, null, null).itemsTotal;
}
