import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { getDeliveryDocumentDate } from '@/lib/deliveryAmounts';
import { prisma } from '@/lib/prisma';
import { lockStoreForWrite } from '@/lib/storeWriteLock';

// 納品明細の更新と、条件を満たす場合の食材単価更新を一括で確定する。
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth(request);
  if (!auth?.storeId) return NextResponse.json({ error: 'ログインしてください' }, { status: 401 });
  const storeId = auth.storeId;
  const { id } = await params;
  try {
    const body = await request.json();
    const { quantity, totalPrice, expectedQuantity, expectedTotalPrice } = body;
    if (![quantity, totalPrice, expectedQuantity, expectedTotalPrice].every((value) => typeof value === 'number' && Number.isFinite(value)) ||
        quantity <= 0 || totalPrice < 0 || expectedQuantity <= 0 || expectedTotalPrice < 0 || !Number.isFinite(totalPrice / quantity)) {
      return NextResponse.json({ error: '数量・金額を確認し、画面を再読み込みしてください' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      await lockStoreForWrite(tx, storeId);
      const current = await tx.deliveryItem.findFirst({
        where: { id, deliverySlip: { storeId }, ingredient: { storeId } },
        include: { ingredient: true, deliverySlip: { select: { id: true, createdAt: true, ocrRawData: true } } },
      });
      if (!current) return { kind: 'missing' as const };
      const changed = await tx.deliveryItem.updateMany({
        where: { id, quantity: expectedQuantity, totalPrice: expectedTotalPrice, deliverySlip: { storeId }, ingredient: { storeId } },
        data: { quantity, totalPrice },
      });
      if (changed.count !== 1) return { kind: 'conflict' as const };

      const candidates = await tx.deliveryItem.findMany({
        where: { ingredientId: current.ingredientId, deliverySlip: { storeId } },
        select: { id: true, deliverySlip: { select: { id: true, createdAt: true, ocrRawData: true } } },
      });
      candidates.sort((a, b) => getDeliveryDocumentDate(b.deliverySlip).localeCompare(getDeliveryDocumentDate(a.deliverySlip)) ||
        b.deliverySlip.createdAt.getTime() - a.deliverySlip.createdAt.getTime());
      const latest = candidates[0];
      const latestDate = latest ? getDeliveryDocumentDate(latest.deliverySlip) : null;
      // 同じ日付の別伝票は時刻が分からないため、登録順で新旧を決めない。
      const tied = candidates.filter((item) => getDeliveryDocumentDate(item.deliverySlip) === latestDate);
      const canUpdatePrice = current.ingredient.priceSource === 'delivery' && tied.length === 1 && latest?.id === id;
      const updated = canUpdatePrice ? await tx.ingredient.updateMany({
        where: { id: current.ingredientId, storeId, priceSource: 'delivery', lastUpdated: current.ingredient.lastUpdated },
        data: { costPerUnit: totalPrice / quantity },
      }) : { count: 0 };
      return { kind: 'saved' as const, priceUpdated: updated.count === 1 };
    }, { maxWait: 15000, timeout: 30000 });
    if (result.kind === 'missing') return NextResponse.json({ error: '該当する納品明細が見つかりません' }, { status: 404 });
    if (result.kind === 'conflict') return NextResponse.json({ error: '別の画面で明細が変更されました。再読み込みして確認してください。' }, { status: 409 });
    return NextResponse.json({ success: true, priceUpdated: result.priceUpdated });
  } catch (error) {
    console.error('Error updating delivery item:', error);
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 });
  }
}
