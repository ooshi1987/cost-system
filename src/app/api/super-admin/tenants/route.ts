import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
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
          select: { id: true, email: true, name: true, role: true },
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
        users: t.users,
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

/** パスワードリセット */
export async function PUT(request: NextRequest) {
  if (!(await isSuperAdmin(request))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const { userId, newPassword } = await request.json();
    if (!userId || !newPassword || newPassword.length < 4) {
      return NextResponse.json({ error: 'userId と newPassword（4文字以上）は必須です' }, { status: 400 });
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}

/** isInternal フラグのトグル、テナント名変更、店舗名変更 */
export async function PATCH(request: NextRequest) {
  if (!(await isSuperAdmin(request))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const body = await request.json();

    // 店舗名変更
    if (body.storeId && body.storeName !== undefined) {
      const updated = await prisma.store.update({
        where: { id: body.storeId },
        data: { name: body.storeName.trim() },
      });
      return NextResponse.json({ id: updated.id, name: updated.name });
    }

    // テナント名変更
    if (body.tenantId && body.tenantName !== undefined) {
      const updated = await prisma.tenant.update({
        where: { id: body.tenantId },
        data: { name: body.tenantName.trim() },
      });
      return NextResponse.json({ id: updated.id, name: updated.name });
    }

    // isInternal フラグをトグル
    if (body.tenantId && typeof body.isInternal === 'boolean') {
      const updated = await prisma.tenant.update({
        where: { id: body.tenantId },
        data: { isInternal: body.isInternal },
      });
      return NextResponse.json({ id: updated.id, isInternal: updated.isInternal });
    }

    return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
