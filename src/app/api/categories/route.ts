import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';
import { ensureDefaultCategories } from '@/lib/categories';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    if (!auth?.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await ensureDefaultCategories(auth.storeId);

    const { searchParams } = new URL(request.url);
    const kind = searchParams.get('kind');

    const categories = await prisma.category.findMany({
      where: { storeId: auth.storeId, ...(kind ? { kind } : {}) },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return NextResponse.json(categories);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    if (!auth?.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, kind, color, autoVendors } = body;
    if (!name || !kind) {
      return NextResponse.json({ error: 'name, kind は必須です' }, { status: 400 });
    }
    if (kind !== 'expense' && kind !== 'income') {
      return NextResponse.json({ error: 'kind は expense または income を指定してください' }, { status: 400 });
    }

    const existing = await prisma.category.findFirst({ where: { storeId: auth.storeId, name } });
    if (existing) {
      return NextResponse.json({ error: '同名の科目があります' }, { status: 409 });
    }

    const category = await prisma.category.create({
      data: {
        storeId: auth.storeId,
        name,
        kind,
        color: color || null,
        autoVendors: autoVendors || null,
      },
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
