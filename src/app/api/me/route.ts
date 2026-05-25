import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let storeName: string | null = null;
  if (auth.storeId) {
    const store = await prisma.store.findUnique({ where: { id: auth.storeId }, select: { name: true } });
    storeName = store?.name ?? null;
  }

  return NextResponse.json({
    userId: auth.userId,
    tenantId: auth.tenantId,
    storeId: auth.storeId,
    storeName,
    role: auth.role,
    email: auth.email,
  });
}
