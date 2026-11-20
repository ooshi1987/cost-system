import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';
import { isReservedSettingsKey } from '@/lib/aiUsage';

export async function GET(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth?.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await prisma.settings.findMany({ where: { storeId: auth.storeId } });
  const result: Record<string, unknown> = {};
  for (const row of rows) {
    if (isReservedSettingsKey(row.key)) continue;
    try { result[row.key] = JSON.parse(row.value); }
    catch { result[row.key] = row.value; }
  }
  return NextResponse.json(result);
}

export async function PATCH(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth?.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { key, value } = await request.json();
  if (typeof key !== 'string' || !key || key.length > 100 || isReservedSettingsKey(key)) {
    return NextResponse.json({ error: 'この設定は変更できません' }, { status: 400 });
  }
  await prisma.settings.upsert({
    where: { storeId_key: { storeId: auth.storeId, key } },
    update: { value: JSON.stringify(value) },
    create: { storeId: auth.storeId, key, value: JSON.stringify(value) },
  });
  return NextResponse.json({ ok: true });
}
