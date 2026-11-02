import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';
import { calculateReceiptAmounts, getDeliveryDocumentDate, japanDateKey, isNonNegativeAmount, isReceiptTaxBasis, isDocumentDate, type ReceiptMetadata } from '@/lib/deliveryAmounts';
import { lockStoreForWrite } from '@/lib/storeWriteLock';

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

function itemSignature(items: SaveItem[]): string {
  return JSON.stringify(items.map((item) => JSON.stringify([item.name.trim(), item.unit.trim(), item.quantity, item.totalPrice])).sort());
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    if (!auth?.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { items, vendor, receipt, submissionId, allowDuplicate } = (await request.json()) as {
      items: SaveItem[];
      vendor?: string | null;
      receipt?: ReceiptMetadata;
      submissionId?: string;
      allowDuplicate?: boolean;
    };
    if (allowDuplicate !== undefined && typeof allowDuplicate !== 'boolean') return NextResponse.json({ error: '重複確認を確認してください' }, { status: 400 });
    if (submissionId !== undefined && (typeof submissionId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submissionId))) {
      return NextResponse.json({ error: '保存番号を確認してください' }, { status: 400 });
    }
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
    if (new Set(items.map((item) => item.name.trim())).size !== items.length) {
      return NextResponse.json({ error: '同じ食材が複数あります。数量と金額をまとめてから保存してください。' }, { status: 400 });
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
    const receiptId = submissionId ? `dr1_${createHash('sha256').update(JSON.stringify([storeId, submissionId])).digest('hex')}` : undefined;
    const storedRaw = JSON.stringify(receipt ? { version: 2, items, receipt } : items);
    const storedVendor = vendor?.trim() || null;

    // 食材更新だけが残らないよう、伝票保存と同じトランザクションにする。
    const result = await prisma.$transaction(async (tx) => {
      await lockStoreForWrite(tx, storeId);
      if (receiptId) {
        const existingSlip = await tx.deliverySlip.findFirst({ where: { id: receiptId, storeId }, select: { id: true, vendor: true, ocrRawData: true } });
        if (existingSlip) {
          if (existingSlip.vendor !== storedVendor || existingSlip.ocrRawData !== storedRaw) throw new DeliverySaveError('この伝票は保存済みの可能性があります。納品履歴を確認してください。');
          return { deliverySlip: existingSlip, priceNotUpdated: [], alreadySaved: true };
        }
      }
      if (receipt && !allowDuplicate) {
        const candidates = await tx.deliverySlip.findMany({
          where: { storeId, vendor: storedVendor },
          select: {
            ocrRawData: true, createdAt: true,
            deliveryItems: { select: { quantity: true, unit: true, totalPrice: true, ingredient: { select: { name: true } } } },
          },
        });
        const signature = itemSignature(items);
        const possiblyDuplicate = candidates.some((slip) => {
          try {
            const saved = JSON.parse(slip.ocrRawData ?? 'null');
            return saved?.version === 2 && Array.isArray(saved.items) && saved.receipt &&
              getDeliveryDocumentDate(slip) === (receipt.documentDate ?? japanDateKey()) &&
              saved.receipt.statedTotal === receipt.statedTotal && saved.receipt.externalTax === receipt.externalTax &&
              saved.receipt.taxBasis === receipt.taxBasis && itemSignature(slip.deliveryItems.map((item) => ({
                name: item.ingredient.name, unit: item.unit, quantity: item.quantity, totalPrice: item.totalPrice,
              }))) === signature;
          } catch { return false; }
        });
        if (possiblyDuplicate) return { deliverySlip: null, priceNotUpdated: [], alreadySaved: false, duplicate: true };
      }
      const deliveryItems = [];
      const priceNotUpdated: string[] = [];
      const documentDate = receipt?.documentDate ?? japanDateKey();
      for (const item of items) {
        const name = item.name.trim();
        const unit = item.unit.trim();
        const existing = await tx.ingredient.findUnique({ where: { storeId_name: { storeId, name } } });
        if (existing && existing.unit !== unit) {
          throw new DeliverySaveError(`「${name}」の単位は登録済みの「${existing.unit}」に揃えてください`);
        }
        const history = existing ? await tx.deliveryItem.findMany({
          where: { ingredientId: existing.id, deliverySlip: { storeId } },
          select: { deliverySlip: { select: { createdAt: true, ocrRawData: true } } },
        }) : [];
        // 同日の伝票は実際の前後関係を判定できないため、既存単価を優先する。
        const isOlder = history.some((entry) => getDeliveryDocumentDate(entry.deliverySlip) >= documentDate) ||
          (existing?.priceSource === 'manual' && japanDateKey(existing.lastUpdated) >= documentDate);
        const data = { costPerUnit: item.totalPrice / item.quantity, type: item.type ?? 'food', priceSource: 'delivery' };
        let ingredientId: string;
        if (existing) {
          ingredientId = existing.id;
          if (isOlder) {
            priceNotUpdated.push(name);
          } else {
            const updated = await tx.ingredient.updateMany({
              where: { id: existing.id, storeId, lastUpdated: existing.lastUpdated, priceSource: existing.priceSource },
              data,
            });
            if (updated.count === 0) priceNotUpdated.push(name);
          }
        } else {
          const ingredient = await tx.ingredient.create({ data: { storeId, name, unit, ...data } });
          ingredientId = ingredient.id;
        }
        deliveryItems.push({ ingredientId, quantity: item.quantity, unit, totalPrice: item.totalPrice });
      }
      const deliverySlip = await tx.deliverySlip.create({
        data: {
          storeId,
          ...(receiptId ? { id: receiptId } : {}),
          ocrRawData: storedRaw,
          vendor: storedVendor,
          processedAt: new Date(),
          deliveryItems: { create: deliveryItems },
        },
      });
      return { deliverySlip, priceNotUpdated, alreadySaved: false, duplicate: false };
    }, { maxWait: 15000, timeout: 30000 });

    if ('duplicate' in result && result.duplicate) return NextResponse.json({ code: 'POSSIBLE_DUPLICATE', error: '同じ内容の伝票が登録されています。納品履歴で別の伝票か確認してください。' }, { status: 409 });
    if (!result.deliverySlip) return NextResponse.json({ error: '伝票を確認できませんでした' }, { status: 500 });
    return NextResponse.json({ success: true, deliverySlipId: result.deliverySlip.id, priceNotUpdated: result.priceNotUpdated, alreadySaved: result.alreadySaved });
  } catch (error) {
    if (error instanceof DeliverySaveError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Save error:', error);
    return NextResponse.json({ error: '保存に失敗しました' }, { status: 500 });
  }
}
