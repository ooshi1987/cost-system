import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    if (!auth?.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { items } = await request.json();
    await Promise.all(
      (items as { id: string; sortOrder: number }[]).map(({ id, sortOrder }) =>
        prisma.category.updateMany({
          where: { id, storeId: auth.storeId! },
          data: { sortOrder },
        })
      )
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Reorder error:', error);
    return NextResponse.json({ error: '並び替え保存に失敗しました' }, { status: 500 });
  }
}
