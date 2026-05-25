import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth || auth.role !== 'tenant_admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const users = await prisma.user.findMany({
    where: { tenantId: auth.tenantId },
    include: { storeUsers: { include: { store: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(users.map(({ passwordHash: _, ...u }) => u));
}

export async function POST(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth || auth.role !== 'tenant_admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { email, name, role, storeId, password } = await request.json();
  if (!email || !password) return NextResponse.json({ error: 'メールとパスワードは必須です' }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: 'パスワードは8文字以上' }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: 'このメールアドレスは既に使用されています' }, { status: 409 });

  // storeId が指定されている場合、そのテナントの店舗か確認
  if (storeId) {
    const store = await prisma.store.findFirst({ where: { id: storeId, tenantId: auth.tenantId } });
    if (!store) return NextResponse.json({ error: '無効な店舗IDです' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      tenantId: auth.tenantId,
      email,
      passwordHash,
      name: name || null,
      role: role === 'tenant_admin' ? 'tenant_admin' : 'store_staff',
      ...(storeId && role !== 'tenant_admin' ? {
        storeUsers: { create: { storeId } },
      } : {}),
    },
    include: { storeUsers: { include: { store: true } } },
  });

  const { passwordHash: _, ...safeUser } = user;
  return NextResponse.json(safeUser, { status: 201 });
}
