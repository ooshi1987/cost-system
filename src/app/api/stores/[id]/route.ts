import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth(request);
  if (!auth || auth.role !== 'tenant_admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { name } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: '店舗名は必須です' }, { status: 400 });

  const existing = await prisma.store.findFirst({ where: { id, tenantId: auth.tenantId } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const store = await prisma.store.update({ where: { id }, data: { name: name.trim() } });
  return NextResponse.json(store);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth(request);
  if (!auth || auth.role !== 'tenant_admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const stores = await prisma.store.findMany({ where: { tenantId: auth.tenantId } });
  if (stores.length <= 1) return NextResponse.json({ error: '最後の店舗は削除できません' }, { status: 400 });

  const existing = stores.find((s) => s.id === id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.store.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
