import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const deliverySlips = await prisma.deliverySlip.findMany({
      include: {
        deliveryItems: {
          include: {
            ingredient: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(deliverySlips);
  } catch (error) {
    console.error('Error fetching delivery slips:', error);
    return NextResponse.json(
      { error: 'Failed to fetch delivery slips' },
      { status: 500 }
    );
  }
}
