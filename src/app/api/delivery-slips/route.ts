import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';
import { calculateReceiptAmounts, isNonNegativeAmount, isReceiptTaxBasis, isDocumentDate, type ReceiptMetadata } from '@/lib/deliveryAmounts';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    if (!auth?.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const deliverySlips = await prisma.deliverySlip.findMany({
      where: { storeId: auth.storeId },
      include: { deliveryItems: { include: { ingredient: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(deliverySlips);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch delivery slips' }, { status: 500 });
  }
}

interface SaveItem {
  name: string;
  quantity: number;
  unit: string;
  totalPrice: number;
  type?: 'food' | 'seasoning';
}

class DeliverySaveError extends Error {}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    if (!auth?.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { items, vendor, receipt } = (await request.json()) as {
      items: SaveItem[];
      vendor?: string | null;
      receipt?: ReceiptMetadata;
    };
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'アイテムがありません' }, { status: 400 });
    }
    if ((vendor != null && typeof vendor !== 'string') || items.some((item) => (
      !item || typeof item.name !== 'string' || !item.name.trim() ||
      typeof item.unit !== 'string' || !item.unit.trim() ||
      !isNonNegativeAmount(item.quantity) || item.quantity === 0 ||
      !isNonNegativeAmount(item.totalPrice) ||
      !Number.isFinite(item.totalPrice / item.quantity) ||
      (item.type !== undefined && item.type !== 'food' && item.type !== 'seasoning')
    ))) {
      return NextResponse.json({ error: '品名・数量・単位・金額を確認してください' }, { status: 400 });
    }

    if (receipt !== undefined) {
      if (receipt && receipt.documentDate !== undefined && !isDocumentDate(receipt.documentDate)) {
        return NextResponse.json({ error: '伝票の日付を正しい年月日で指定してください' }, { status: 400 });
      }
      if (!receipt || !isNonNegativeAmount(receipt.statedTotal) || !isNonNegativeAmount(receipt.externalTax) ||
        !isReceiptTaxBasis(receipt.taxBasis) || receipt.taxBasis === 'unknown' ||
        (receipt.taxBasis === 'inclusive' && receipt.externalTax !== 0)) {
        return NextResponse.json({ error: '税込合計・外税・明細の税区分を確認してください' }, { status: 400 });
      }
      if (calculateReceiptAmounts(items, receipt.statedTotal, receipt.externalTax).difference !== 0) {
        return NextResponse.json({ error: '明細合計＋外税が税込合計と一致しません' }, { status: 400 });
      }
    }

    const storeId = auth.storeId;

    // 食材更新だけが残らないよう、伝票保存と同じトランザクションにする。
    const deliverySlip = await prisma.$transaction(async (tx) => {
      const deliveryItems = [];
      for (const item of items) {
        const name = item.name.trim();
        const unit = item.unit.trim();
        const existing = await tx.ingredient.findUnique({ where: { storeId_name: { storeId, name } } });
        if (existing && existing.unit !== unit) {
          throw new DeliverySaveError(`「${name}」の単位は登録済みの「${existing.unit}」に揃えてください`);
        }
        const data = { costPerUnit: item.totalPrice / item.quantity, type: item.type ?? 'food', priceSource: 'delivery' };
        const ingredient = existing
          ? await tx.ingredient.update({ where: { id: existing.id }, data })
          : await tx.ingredient.create({ data: { storeId, name, unit, ...data } });
        deliveryItems.push({ ingredientId: ingredient.id, quantity: item.quantity, unit, totalPrice: item.totalPrice });
      }
      return tx.deliverySlip.create({
        data: {
          storeId,
          ocrRawData: JSON.stringify(receipt ? { version: 2, items, receipt } : items),
          vendor: vendor?.trim() || null,
          processedAt: new Date(),
          deliveryItems: { create: deliveryItems },
        },
      });
    }, { maxWait: 15000, timeout: 30000 });

    return NextResponse.json({ success: true, deliverySlipId: deliverySlip.id });
  } catch (error) {
    if (error instanceof DeliverySaveError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Save error:', error);
    return NextResponse.json({ error: '保存に失敗しました' }, { status: 500 });
  }
}
