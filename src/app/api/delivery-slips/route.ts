import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';

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

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    if (!auth?.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { items, vendor } = (await request.json()) as { items: SaveItem[]; vendor?: string | null };
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'アイテムがありません' }, { status: 400 });
    }

    const storeId = auth.storeId;

    const deliverySlip = await prisma.deliverySlip.create({
      data: {
        storeId,
        ocrRawData: JSON.stringify(items),
        vendor: vendor?.trim() || null,
        processedAt: new Date(),
        deliveryItems: {
          create: await Promise.all(
            items.map(async (item) => {
              const itemType = item.type ?? 'food';

              // storeId + name でユニーク検索（新スキーマ）
              let ingredient = await prisma.ingredient.findFirst({
                where: { storeId, name: item.name },
              });

              if (!ingredient) {
                ingredient = await prisma.ingredient.create({
                  data: { storeId, name: item.name, unit: item.unit, costPerUnit: item.totalPrice / item.quantity, type: itemType, priceSource: 'delivery' },
                });
              } else {
                await prisma.ingredient.update({
                  where: { id: ingredient.id },
                  data: { costPerUnit: item.totalPrice / item.quantity, type: itemType, priceSource: 'delivery' },
                });
              }

              return {
                ingredientId: ingredient.id,
                quantity: item.quantity,
                unit: item.unit,
                totalPrice: item.totalPrice,
              };
            })
          ),
        },
      },
    });

    return NextResponse.json({ success: true, deliverySlipId: deliverySlip.id });
  } catch (error) {
    console.error('Save error:', error);
    return NextResponse.json({ error: '保存に失敗しました' }, { status: 500 });
  }
}
