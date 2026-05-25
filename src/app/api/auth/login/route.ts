import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'メールアドレスとパスワードを入力してください' }, { status: 400 });
    }

    // ── SuperAdmin チェック ──
    const superAdmin = await prisma.superAdmin.findUnique({ where: { email } });
    if (superAdmin) {
      const ok = await bcrypt.compare(password, superAdmin.passwordHash);
      if (!ok) return NextResponse.json({ error: 'メールアドレスまたはパスワードが違います' }, { status: 401 });
      const token = await signToken({ userId: superAdmin.id, tenantId: '__super__', storeId: null, role: 'tenant_admin', email: superAdmin.email });
      const res = NextResponse.json({ ok: true, redirect: '/super-admin' });
      res.cookies.set('auth-token', token, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
      return res;
    }

    // ── 一般ユーザー ──
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        tenant: true,
        storeUsers: { include: { store: true } },
      },
    });
    if (!user) return NextResponse.json({ error: 'メールアドレスまたはパスワードが違います' }, { status: 401 });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return NextResponse.json({ error: 'メールアドレスまたはパスワードが違います' }, { status: 401 });

    // 有効な最初の店舗IDを取得
    // tenant_admin: テナントの最初の店舗（店舗切替はUIで対応）
    // store_staff: 担当の最初の店舗
    let storeId: string | null = null;
    if (user.role === 'tenant_admin') {
      const firstStore = await prisma.store.findFirst({ where: { tenantId: user.tenantId }, orderBy: { createdAt: 'asc' } });
      storeId = firstStore?.id ?? null;
    } else {
      storeId = user.storeUsers[0]?.storeId ?? null;
    }

    const token = await signToken({
      userId: user.id,
      tenantId: user.tenantId,
      storeId,
      role: user.role as 'tenant_admin' | 'store_staff',
      email: user.email,
    });

    const res = NextResponse.json({ ok: true, redirect: '/' });
    res.cookies.set('auth-token', token, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    return res;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
