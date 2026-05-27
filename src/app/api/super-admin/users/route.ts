import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';

async function isSuperAdmin(req: NextRequest): Promise<boolean> {
  const auth = await getAuth(req);
  return auth?.tenantId === '__super__';
}

/** スーパー管理者が任意テナントにスタッフアカウントを作成 */
export async function POST(request: NextRequest) {
  if (!(await isSuperAdmin(request))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { tenantId, storeId, email, password, name } = await request.json();

    if (!tenantId || !storeId || !email || !password) {
      return NextResponse.json({ error: 'tenantId, storeId, email, password は必須です' }, { status: 400 });
    }
    if (password.length < 4) {
      return NextResponse.json({ error: 'パスワードは4文字以上にしてください' }, { status: 400 });
    }

    // メール重複チェック
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'このメールアドレスはすでに使用されています' }, { status: 409 });
    }

    // 店舗がそのテナントに属するか確認
    const store = await prisma.store.findFirst({ where: { id: storeId, tenantId } });
    if (!store) {
      return NextResponse.json({ error: '無効な店舗IDです' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        tenantId,
        email,
        passwordHash,
        name: name || store.name,
        role: 'store_staff',
        storeUsers: { create: { storeId } },
      },
      select: { id: true, email: true, name: true, role: true },
    });

    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
