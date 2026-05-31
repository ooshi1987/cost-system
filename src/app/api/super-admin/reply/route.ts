import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  // 簡易認証チェック
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.SUPER_ADMIN_SECRET ?? 'super-admin-secret'}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { to, subject, body, inquiryId } = await req.json();

  if (!to || !body) {
    return NextResponse.json({ error: 'to と body は必須です' }, { status: 400 });
  }

  const { data, error } = await resend.emails.send({
    from: 'Costra <info@cost-system.app>',
    to: [to],
    subject: subject || '【Costra】お問い合わせへの回答',
    html: `
      <div style="font-family: 'Hiragino Kaku Gothic ProN', sans-serif; max-width: 600px; margin: 0 auto; color: #1a1815;">
        <div style="background: #faf7f1; padding: 24px 32px; border-radius: 12px 12px 0 0; border-bottom: 2px solid #e6dfd1;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 18px; font-weight: 700;">Costra</span>
          </div>
        </div>
        <div style="background: #ffffff; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e6dfd1; border-top: none;">
          <p style="white-space: pre-wrap; font-size: 15px; line-height: 1.8; color: #1a1815; margin: 0 0 32px;">${body.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
          <hr style="border: none; border-top: 1px solid #e6dfd1; margin: 0 0 24px;" />
          <p style="font-size: 13px; color: #8a8378; margin: 0;">
            Costra サポート<br>
            <a href="mailto:info@cost-system.app" style="color: #c84a1f;">info@cost-system.app</a>
          </p>
        </div>
      </div>
    `,
  });

  if (error) {
    console.error('Resend error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, messageId: data?.id, inquiryId });
}
