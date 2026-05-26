import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';

/** SuperAdminのみアクセス可 */
async function isSuperAdmin(req: NextRequest): Promise<boolean> {
  const auth = await getAuth(req);
  return auth?.tenantId === '__super__';
}

export async function GET(request: NextRequest) {
  if (!(await isSuperAdmin(request))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        stores: {
          select: { id: true, name: true },
        },
        users: {
          select: { id: true, role: true },
        },
      },
    });

    const result = tenants.map((t) => {
      const storeCount = t.stores.length;
      const userCount = t.users.length;
      const pricePerStore = t.pricePerStore ?? 0;
      const mrr = pricePerStore * storeCount;

      return {
        id: t.id,
        name: t.name,
        email: t.email,
        subscriptionStatus: t.subscriptionStatus,
        stripeCustomerId: t.stripeCustomerId,
        isInternal: t.isInternal,
        pricePerStore,
        storeCount,
        userCount,
        mrr,
        stores: t.stores,
        createdAt: t.createdAt,
      };
    });

    // サマリ
    const totalMrr = result.reduce((sum, t) => sum + t.mrr, 0);
    const activePaid = result.filter((t) => t.subscriptionStatus === 'active').length;
    const trialing = result.filter((t) => t.subscriptionStatus === 'trialing').length;

    return NextResponse.json({
      tenants: result,
      summary: {
        totalTenants: result.length,
        activePaid,
        trialing,
        totalMrr,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch tenants' }, { status: 500 });
  }
}

/** isInternal フラグをトグル */
export async function PATCH(request: NextRequest) {
  if (!(await isSuperAdmin(request))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const { tenantId, isInternal } = await request.json();
    if (!tenantId || typeof isInternal !== 'boolean') {
      return NextResponse.json({ error: 'tenantId と isInternal は必須です' }, { status: 400 });
    }
    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: { isInternal },
    });
    return NextResponse.json({ id: updated.id, isInternal: updated.isInternal });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update tenant' }, { status: 500 });
  }
}
