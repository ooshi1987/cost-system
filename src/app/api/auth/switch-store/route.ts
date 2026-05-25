import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth, signToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth || auth.role !== 'tenant_admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { storeId } = await request.json();
  const store = await prisma.store.findFirst({ where: { id: storeId, tenantId: auth.tenantId } });
  if (!store) return NextResponse.json({ error: '無効な店舗です' }, { status: 400 });

  const token = await signToken({ ...auth, storeId });
  const res = NextResponse.json({ ok: true });
  res.cookies.set('auth-token', token, {
    httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
  });
  return res;
}
