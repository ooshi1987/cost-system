import type { Prisma } from '@prisma/client';

// 同じ店舗の売上・伝票更新を直列化し、同時保存による重複や単価の巻き戻りを防ぐ。
export async function lockStoreForWrite(tx: Prisma.TransactionClient, storeId: string): Promise<void> {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Store" WHERE "id" = ${storeId} FOR UPDATE`;
  if (rows.length !== 1) throw new Error('Store not found');
}
