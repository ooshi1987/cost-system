import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { category, content } = await request.json();

    if (!category || !content?.trim()) {
      return NextResponse.json({ error: '件名と内容は必須です' }, { status: 400 });
    }
    if (content.trim().length > 2000) {
      return NextResponse.json({ error: '内容は2000文字以内で入力してください' }, { status: 400 });
    }

    // ログイン中ならテナント情報を付与
    let email: string | null = null;
    let tenantId: string | null = null;
    let tenantName: string | null = null;
    let plan: string | null = null;

    const auth = await getAuth(request);
    if (auth && auth.tenantId !== '__super__') {
      const tenant = await prisma.tenant.findUnique({
        where: { id: auth.tenantId },
        select: { email: true, name: true, plan: true },
      });
      if (tenant) {
        email = tenant.email;
        tenantId = auth.tenantId;
        tenantName = tenant.name;
        plan = tenant.plan;
      }
    }

    await prisma.contactInquiry.create({
      data: {
        category,
        content: content.trim(),
        email,
        tenantId,
        tenantName,
        plan,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '送信に失敗しました' }, { status: 500 });
  }
}
