import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth?.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await prisma.settings.findMany({ where: { storeId: auth.storeId } });
  const result: Record<string, unknown> = {};
  for (const row of rows) {
    try { result[row.key] = JSON.parse(row.value); }
    catch { result[row.key] = row.value; }
  }
  return NextResponse.json(result);
}

export async function PATCH(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth?.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { key, value } = await request.json();
  await prisma.settings.upsert({
    where: { storeId_key: { storeId: auth.storeId, key } },
    update: { value: JSON.stringify(value) },
    create: { storeId: auth.storeId, key, value: JSON.stringify(value) },
  });
  return NextResponse.json({ ok: true });
}
