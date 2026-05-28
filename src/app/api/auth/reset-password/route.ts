import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();
    if (!token || !password) {
      return NextResponse.json({ error: 'トークンとパスワードが必要です' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'パスワードは8文字以上で入力してください' }, { status: 400 });
    }

    // トークン検索
    const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });

    if (!resetToken) {
      return NextResponse.json({ error: 'リンクが無効です。再度リセットをお試しください' }, { status: 400 });
    }
    if (resetToken.usedAt) {
      return NextResponse.json({ error: 'このリンクは既に使用済みです' }, { status: 400 });
    }
    if (resetToken.expiresAt < new Date()) {
      return NextResponse.json({ error: 'リンクの有効期限が切れています。再度リセットをお試しください' }, { status: 400 });
    }

    // パスワード更新
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { email: resetToken.email },
      data: { passwordHash },
    });

    // トークンを使用済みに
    await prisma.passwordResetToken.update({
      where: { token },
      data: { usedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
  }
}
