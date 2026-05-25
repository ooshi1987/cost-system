import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth, TRIAL_LIMITS, isPaidPlan } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    if (!auth?.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const ingredients = await prisma.ingredient.findMany({
      where: { storeId: auth.storeId, ...(type ? { type } : {}) },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return NextResponse.json(ingredients);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch ingredients' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    if (!auth?.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, unit, costPerUnit, type, category, sortOrder } = body;
    if (!name || !unit || costPerUnit === undefined) {
      return NextResponse.json({ error: 'name, unit, costPerUnit は必須です' }, { status: 400 });
    }

    // ── トライアル制限チェック ──
    const tenant = await prisma.tenant.findUnique({ where: { id: auth.tenantId }, select: { subscriptionStatus: true } });
    if (!isPaidPlan(tenant?.subscriptionStatus)) {
      const count = await prisma.ingredient.count({ where: { storeId: auth.storeId } });
      if (count >= TRIAL_LIMITS.ingredients) {
        return NextResponse.json({
          error: 'TRIAL_LIMIT',
          message: `無料プランでは食材・調味料は${TRIAL_LIMITS.ingredients}種まで登録できます。`,
          limit: TRIAL_LIMITS.ingredients,
        }, { status: 403 });
      }
    }

    const ingredient = await prisma.ingredient.create({
      data: {
        storeId: auth.storeId,
        name,
        unit,
        costPerUnit: parseFloat(costPerUnit),
        type: type || 'food',
        category: category || null,
        sortOrder: sortOrder != null ? parseInt(sortOrder) : null,
      },
    });
    return NextResponse.json(ingredient, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create ingredient' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    if (!auth?.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    await prisma.ingredient.deleteMany({
      where: { storeId: auth.storeId, ...(type ? { type } : {}) },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
  }
}
