import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';
import { getEffectivePlan } from '@/lib/stripe';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    if (!auth?.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const menuItems = await prisma.menuItem.findMany({
      where: { storeId: auth.storeId },
      include: {
        recipeItems: {
          include: {
            ingredient: {
              include: { _count: { select: { deliveryItems: true } } },
            },
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return NextResponse.json(menuItems);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch menu items' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    if (!auth?.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, sellingPrice, category, sortOrder } = body;
    if (!name || !sellingPrice) {
      return NextResponse.json({ error: 'name と sellingPrice は必須です' }, { status: 400 });
    }

    // ── プラン制限チェック ──
    const tenant = await prisma.tenant.findUnique({ where: { id: auth.tenantId }, select: { plan: true, isInternal: true } });
    const plan = getEffectivePlan(tenant?.plan, tenant?.isInternal);
    if (plan.menuItems !== Infinity) {
      const count = await prisma.menuItem.count({ where: { storeId: auth.storeId } });
      if (count >= plan.menuItems) {
        return NextResponse.json({
          error: 'TRIAL_LIMIT',
          message: `${plan.name}プランではメニューは${plan.menuItems}品まで登録できます。`,
          limit: plan.menuItems,
        }, { status: 403 });
      }
    }

    const menuItem = await prisma.menuItem.create({
      data: {
        storeId: auth.storeId,
        name,
        sellingPrice: parseFloat(sellingPrice),
        category: category || null,
        sortOrder: sortOrder != null ? parseInt(sortOrder) : null,
      },
    });
    return NextResponse.json(menuItem, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create menu item' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    if (!auth?.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await prisma.menuItem.deleteMany({ where: { storeId: auth.storeId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
  }
}
