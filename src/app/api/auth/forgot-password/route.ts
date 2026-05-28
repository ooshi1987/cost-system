import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'メールアドレスを入力してください' }, { status: 400 });

    // ユーザーが存在するか確認（存在しない場合もエラーを出さない：セキュリティ上の配慮）
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // 未使用の既存トークンを無効化
      await prisma.passwordResetToken.updateMany({
        where: { email, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });

      // 新しいトークンを生成（1時間有効）
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.passwordResetToken.create({
        data: { email, token, expiresAt },
      });

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://cost-system.app';
      const resetUrl = `${appUrl}/reset-password?token=${token}`;

      // メール送信
      const resendApiKey = process.env.RESEND_API_KEY;
      if (resendApiKey) {
        const resend = new Resend(resendApiKey);
        await resend.emails.send({
          from: 'Costra <noreply@cost-system.app>',
          to: email,
          subject: 'パスワードのリセット — Costra',
          html: `
            <div style="font-family:'Noto Sans JP',sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;background:#faf7f1;">
              <div style="margin-bottom:32px;">
                <span style="font-size:20px;font-weight:700;color:#1a1815;letter-spacing:-0.02em;">Costra</span>
              </div>
              <h1 style="font-size:22px;font-weight:700;color:#1a1815;margin:0 0 12px;">パスワードのリセット</h1>
              <p style="color:#4a463f;font-size:14px;line-height:1.7;margin:0 0 28px;">
                パスワードリセットのリクエストを受け付けました。<br>
                下のボタンから新しいパスワードを設定してください。<br>
                このリンクは<strong>1時間</strong>で有効期限が切れます。
              </p>
              <a href="${resetUrl}" style="display:inline-block;background:#c84a1f;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:15px;">
                パスワードを再設定する
              </a>
              <p style="color:#8a8378;font-size:12px;margin-top:32px;line-height:1.7;">
                このメールに心当たりがない場合は無視してください。<br>
                パスワードは変更されません。
              </p>
              <hr style="border:none;border-top:1px solid #e6dfd1;margin:32px 0 16px;" />
              <p style="color:#8a8378;font-size:11px;margin:0;">© Costra — 飲食店のための、AI原価管理。</p>
            </div>
          `,
        });
      }
    }

    // ユーザーの有無に関わらず同じレスポンスを返す
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
  }
}
