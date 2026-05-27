import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';

async function isSuperAdmin(req: NextRequest): Promise<boolean> {
  const auth = await getAuth(req);
  return auth?.tenantId === '__super__';
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isSuperAdmin(request))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const { isRead } = await request.json();

  await prisma.contactInquiry.update({
    where: { id },
    data: { isRead },
  });

  return NextResponse.json({ ok: true });
}
