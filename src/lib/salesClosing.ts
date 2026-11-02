import { isDocumentDate, japanDateKey } from './deliveryAmounts';

export const SALES_METHODS = ['cash', 'cashless', 'transfer', 'other'] as const;
export type SalesMethod = (typeof SALES_METHODS)[number];
export interface SalesClosingItem {
  method: SalesMethod;
  label: string;
  amount: number;
  needsReview: boolean;
}
export interface SalesClosing {
  businessDate: string;
  statedTotal: number;
  customerCount: number | null;
  confirmed: true;
  items: SalesClosingItem[];
}

export function isSalesAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1_000_000_000 &&
    Math.abs(Math.round(value * 100) - value * 100) < 0.000001;
}

export function salesDifference(statedTotal: number, items: readonly SalesClosingItem[]): number {
  const statedCents = Math.round(statedTotal * 100);
  const itemCents = items.reduce((sum, item) => sum + Math.round(item.amount * 100), 0);
  return (statedCents - itemCents) / 100;
}

export function closingMemo(data: SalesClosing): string | null {
  const difference = salesDifference(data.statedTotal, data.items);
  const parts = [
    data.customerCount === null ? null : `客数 ${data.customerCount}名`,
    difference === 0 ? null : `売上合計と決済内訳の差額 ${difference > 0 ? '+' : ''}${difference}円（原本確認済み・要確認）`,
  ].filter(Boolean);
  return parts.length ? parts.join(' / ') : null;
}

export function parseSalesClosing(value: unknown, now = new Date()): { data: SalesClosing } | { error: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { error: '入力内容を確認してください' };
  const input = value as Record<string, unknown>;
  if (!isDocumentDate(input.businessDate) || input.businessDate > japanDateKey(now)) return { error: '過去または今日の正しい営業日を入力してください' };
  if (!isSalesAmount(input.statedTotal)) return { error: '原本の売上合計を入力してください' };
  if (input.confirmed !== true) return { error: '原本と照合したことを確認してください' };
  if (input.customerCount !== null && (!Number.isInteger(input.customerCount) || (input.customerCount as number) < 0 || (input.customerCount as number) > 1_000_000)) return { error: '客数を確認してください' };
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 100) return { error: '決済内訳を1件以上入力してください' };
  const items: SalesClosingItem[] = [];
  for (const raw of input.items) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { error: '決済内訳を確認してください' };
    const item = raw as Record<string, unknown>;
    if (typeof item.label !== 'string' || !item.label.trim() || item.label.trim().length > 100 ||
      typeof item.method !== 'string' || !SALES_METHODS.includes(item.method as SalesMethod) ||
      !isSalesAmount(item.amount) || typeof item.needsReview !== 'boolean') return { error: '決済内訳の名前・方法・金額を確認してください' };
    items.push({ label: item.label.trim(), method: item.method as SalesMethod, amount: item.amount, needsReview: item.needsReview });
  }
  return { data: { businessDate: input.businessDate, statedTotal: input.statedTotal, customerCount: input.customerCount as number | null, confirmed: true, items } };
}
