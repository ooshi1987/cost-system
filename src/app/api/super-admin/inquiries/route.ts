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

  const inquiries = await prisma.contactInquiry.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const unreadCount = await prisma.contactInquiry.count({
    where: { isRead: false },
  });

  return NextResponse.json({ inquiries, unreadCount });
}
