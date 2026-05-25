import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH: 複数メニューのsortOrderを一括更新
// body: { items: [{ id: string, sortOrder: number }] }
export async function PATCH(request: NextRequest) {
  try {
    const { items } = await request.json();
    await Promise.all(
      (items as { id: string; sortOrder: number; category?: string }[]).map(({ id, sortOrder, category }) =>
        prisma.menuItem.update({
          where: { id },
          data: { sortOrder, ...(category !== undefined ? { category } : {}) },
        })
      )
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Reorder error:', error);
    return NextResponse.json({ error: '並び替え保存に失敗しました' }, { status: 500 });
  }
}
