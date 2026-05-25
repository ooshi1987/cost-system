import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth || auth.role !== 'tenant_admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const stores = await prisma.store.findMany({
    where: { tenantId: auth.tenantId },
    include: { _count: { select: { storeUsers: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(stores);
}

export async function POST(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth || auth.role !== 'tenant_admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: '店舗名は必須です' }, { status: 400 });

  const store = await prisma.store.create({
    data: { tenantId: auth.tenantId, name: name.trim() },
  });
  return NextResponse.json(store, { status: 201 });
}
