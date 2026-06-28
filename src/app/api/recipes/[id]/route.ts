import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuth(request);
    if (!auth?.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { quantity } = await request.json();
    if (quantity === undefined) return NextResponse.json({ error: 'quantity は必須です' }, { status: 400 });

    const recipeItem = await prisma.recipeItem.findUnique({ where: { id }, include: { menuItem: true } });
    if (!recipeItem || recipeItem.menuItem.storeId !== auth.storeId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const updated = await prisma.recipeItem.update({
      where: { id },
      data: { quantity: parseFloat(quantity) },
      include: {
        ingredient: {
          include: {
            _count: { select: { deliveryItems: true } },
            deliveryItems: {
              orderBy: { deliverySlip: { createdAt: 'desc' } },
              take: 1,
              include: { deliverySlip: { select: { createdAt: true } } },
            },
          },
        },
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update recipe item' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuth(request);
    if (!auth?.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const recipeItem = await prisma.recipeItem.findUnique({ where: { id }, include: { menuItem: true } });
    if (!recipeItem || recipeItem.menuItem.storeId !== auth.storeId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.recipeItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete recipe item' }, { status: 500 });
  }
}
