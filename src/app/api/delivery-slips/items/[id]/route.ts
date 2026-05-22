import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 納品明細の数量・金額を修正し、食材の単価も再計算する
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { quantity, totalPrice } = body;

    if (quantity == null || totalPrice == null) {
      return NextResponse.json(
        { error: '数量と合計金額は必須です' },
        { status: 400 }
      );
    }

    if (quantity <= 0 || totalPrice < 0) {
      return NextResponse.json(
        { error: '数量は1以上、金額は0以上を入力してください' },
        { status: 400 }
      );
    }

    // 現在の明細を取得
    const currentItem = await prisma.deliveryItem.findUnique({
      where: { id },
      include: { ingredient: true },
    });

    if (!currentItem) {
      return NextResponse.json(
        { error: '該当する納品明細が見つかりません' },
        { status: 404 }
      );
    }

    // 納品明細を更新
    const updatedItem = await prisma.deliveryItem.update({
      where: { id },
      data: {
        quantity: parseFloat(quantity),
        totalPrice: parseFloat(totalPrice),
      },
      include: {
        ingredient: true,
      },
    });

    // 食材の単価を再計算（合計金額 ÷ 数量）
    const newCostPerUnit = parseFloat(totalPrice) / parseFloat(quantity);
    await prisma.ingredient.update({
      where: { id: currentItem.ingredientId },
      data: { costPerUnit: newCostPerUnit },
    });

    return NextResponse.json({
      ...updatedItem,
      newCostPerUnit,
    });
  } catch (error) {
    console.error('Error updating delivery item:', error);
    return NextResponse.json(
      { error: '更新に失敗しました' },
      { status: 500 }
    );
  }
}
