import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';

async function isSuperAdmin(req: NextRequest): Promise<boolean> {
  const auth = await getAuth(req);
  return auth?.tenantId === '__super__';
}

export async function GET(request: NextRequest) {
  if (!(await isSuperAdmin(request))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const now = new Date();

    // ── 基本集計 ──
    const [tenants, users, stores, menuItems, ingredients, deliverySlips] = await Promise.all([
      prisma.tenant.findMany({
        select: { id: true, plan: true, subscriptionStatus: true, pricePerStore: true, isInternal: true, createdAt: true },
      }),
      prisma.user.count(),
      prisma.store.count(),
      prisma.menuItem.count(),
      prisma.ingredient.count(),
      prisma.deliverySlip.count(),
    ]);

    // ── プラン内訳 ──
    const planBreakdown = {
      free:  tenants.filter(t => t.plan === 'free').length,
      basic: tenants.filter(t => t.plan === 'basic').length,
      pro:   tenants.filter(t => t.plan === 'pro').length,
    };

    // ── MRR ──
    const paidTenants = tenants.filter(t => t.subscriptionStatus === 'active' && !t.isInternal);
    const mrr = paidTenants.reduce((sum, t) => sum + (t.pricePerStore ?? 0), 0);

    // ── 直近30日のアクティブテナント（納品書スキャンを行ったテナント） ──
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentSlips = await prisma.deliverySlip.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { storeId: true },
      distinct: ['storeId'],
    });
    const activeStores30d = recentSlips.length;

    // ── 月別テナント登録数（直近6ヶ月） ──
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const monthlySignups: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end   = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const count = tenants.filter(t => {
        const d = new Date(t.createdAt);
        return d >= start && d < end;
      }).length;
      monthlySignups.push({
        month: start.toLocaleDateString('ja-JP', { month: 'short', year: '2-digit' }),
        count,
      });
    }

    // ── 直近の新規登録テナント（5件） ──
    const recentTenants = await prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, email: true, plan: true, isInternal: true, createdAt: true },
    });

    return NextResponse.json({
      summary: {
        totalTenants: tenants.length,
        totalUsers: users,
        totalStores: stores,
        totalMenuItems: menuItems,
        totalIngredients: ingredients,
        totalDeliveryScans: deliverySlips,
        mrr,
        activeStores30d,
        paidCount: paidTenants.length,
        internalCount: tenants.filter(t => t.isInternal).length,
      },
      planBreakdown,
      monthlySignups,
      recentTenants,
      _ : { sixMonthsAgo },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
