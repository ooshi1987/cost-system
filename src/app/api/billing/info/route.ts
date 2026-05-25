import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';
import { getPlan } from '@/lib/stripe';

export async function GET(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth || auth.role !== 'tenant_admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [tenant, storeCount] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: auth.tenantId }, select: { subscriptionStatus: true, plan: true } }),
    prisma.store.count({ where: { tenantId: auth.tenantId } }),
  ]);

  const plan = getPlan(tenant?.plan);

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
    plan: plan.id,
    planName: plan.name,
    storeCount,
    usage: {
      menuItems: { used: menuItemsUsed, limit: plan.menuItems === Infinity ? null : plan.menuItems },
      ingredients: { used: ingredientsUsed, limit: plan.ingredients === Infinity ? null : plan.ingredients },
    },
  });
}
