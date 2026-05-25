import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth, TRIAL_LIMITS } from '@/lib/auth';
import { PRICE_PER_STORE_JPY } from '@/lib/stripe';

export async function GET(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth || auth.role !== 'tenant_admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [tenant, storeCount] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: auth.tenantId }, select: { subscriptionStatus: true } }),
    prisma.store.count({ where: { tenantId: auth.tenantId } }),
  ]);

  // トライアル時: 現在のストアの使用量を返す（storeIdがある場合のみ）
  let menuItemsUsed = 0;
  let ingredientsUsed = 0;
  if (auth.storeId) {
    [menuItemsUsed, ingredientsUsed] = await Promise.all([
      prisma.menuItem.count({ where: { storeId: auth.storeId } }),
      prisma.ingredient.count({ where: { storeId: auth.storeId } }),
    ]);
  }

  return NextResponse.json({
    subscriptionStatus: tenant?.subscriptionStatus ?? null,
    storeCount,
    pricePerStore: PRICE_PER_STORE_JPY,
    monthlyTotal: PRICE_PER_STORE_JPY * storeCount,
    trialUsage: {
      menuItems: { used: menuItemsUsed, limit: TRIAL_LIMITS.menuItems },
      ingredients: { used: ingredientsUsed, limit: TRIAL_LIMITS.ingredients },
    },
  });
}
