import type { Prisma } from '@prisma/client';
import { getDeliveryDocumentDate, getDeliveryPurchaseTotal } from './deliveryAmounts';

// 仕入伝票を保存・修正したら、同じ内容の経費取引（税込合計・伝票日・取引先）を1件だけ持たせる。
// 売上・経費の集計（ダッシュボード・日次集計表）は取引を正とし、仕入は伝票から自動で入る。
// 伝票と経費を手で二重に入れないよう、経費の手入力画面では仕入を入れない運用にする。

export const DELIVERY_EXPENSE_SOURCE = 'delivery_slip_v1';
export const PURCHASE_CATEGORY_NAME = '仕入（食材・酒）';

export function deliveryExpenseId(slipId: string): string {
  return `dx1_${slipId}`;
}

/** 伝票の現在の内容に合わせて、対応する経費取引を作成・更新する（同じトランザクション内で呼ぶ） */
export async function syncDeliveryExpense(tx: Prisma.TransactionClient, storeId: string, slipId: string): Promise<void> {
  const slip = await tx.deliverySlip.findFirst({
    where: { id: slipId, storeId },
    select: { id: true, vendor: true, createdAt: true, ocrRawData: true, deliveryItems: { select: { totalPrice: true } } },
  });
  if (!slip) return;

  const amount = getDeliveryPurchaseTotal(slip);
  // 正午（日本時間）にすると、日本時間・UTCのどちらで日付を読んでも同じ暦日になる
  const date = new Date(`${getDeliveryDocumentDate(slip)}T12:00:00+09:00`);
  const category = await tx.category.findFirst({ where: { storeId, name: PURCHASE_CATEGORY_NAME, kind: 'expense' }, select: { id: true } });
  const id = deliveryExpenseId(slip.id);

  await tx.transaction.upsert({
    where: { id },
    create: {
      id,
      storeId,
      type: 'expense',
      date,
      amount,
      vendor: slip.vendor,
      categoryId: category?.id ?? null,
      // 支払方法は伝票から分からないため「その他」にし、小口現金の残高計算に混ぜない
      method: 'other',
      source: DELIVERY_EXPENSE_SOURCE,
      memo: '仕入伝票から自動作成',
    },
    update: { date, amount, vendor: slip.vendor },
  });
}
