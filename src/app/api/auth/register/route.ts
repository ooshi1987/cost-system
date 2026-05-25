import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { companyName, email, password } = await request.json();

    if (!companyName || !email || !password) {
      return NextResponse.json({ error: '全ての項目を入力してください' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'パスワードは8文字以上で設定してください' }, { status: 400 });
    }

    // メール重複チェック
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'このメールアドレスは既に登録されています' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // テナント → 管理者ユーザー → デフォルト店舗 を一括作成
    const tenant = await prisma.tenant.create({
      data: {
        name: companyName,
        email,
        users: {
          create: {
            email,
            passwordHash,
            name: companyName,
            role: 'tenant_admin',
          },
        },
        stores: {
          create: {
            name: '本店',
          },
        },
      },
      include: {
        users: true,
        stores: true,
      },
    });

    const user = tenant.users[0];
    const store = tenant.stores[0];

    // tenant_admin は全店舗アクセス可なので storeId=null
    const token = await signToken({
      userId: user.id,
      tenantId: tenant.id,
      storeId: null,
      role: 'tenant_admin',
      email: user.email,
    });

    const res = NextResponse.json({ ok: true, storeId: store.id });
    res.cookies.set('auth-token', token, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    return res;
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
