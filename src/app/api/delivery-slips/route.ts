import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const deliverySlips = await prisma.deliverySlip.findMany({
      include: {
        deliveryItems: {
          include: { ingredient: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(deliverySlips);
  } catch (error) {
    console.error('Error fetching delivery slips:', error);
    return NextResponse.json({ error: 'Failed to fetch delivery slips' }, { status: 500 });
  }
}

interface SaveItem {
  name: string;
  quantity: number;
  unit: string;
  totalPrice: number;
}

export async function POST(request: NextRequest) {
  try {
    const { items } = (await request.json()) as { items: SaveItem[] };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'アイテムがありません' }, { status: 400 });
    }

    const deliverySlip = await prisma.deliverySlip.create({
      data: {
        ocrRawData: JSON.stringify(items),
        processedAt: new Date(),
        deliveryItems: {
          create: await Promise.all(
            items.map(async (item) => {
              // 食材を検索 or 新規作成
              let ingredient = await prisma.ingredient.findUnique({
                where: { name: item.name },
              });

              if (!ingredient) {
                ingredient = await prisma.ingredient.create({
                  data: {
                    name: item.name,
                    unit: item.unit,
                    costPerUnit: item.totalPrice / item.quantity,
                  },
                });
              } else {
                await prisma.ingredient.update({
                  where: { id: ingredient.id },
                  data: {
                    costPerUnit: item.totalPrice / item.quantity,
                    lastUpdated: new Date(),
                  },
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
