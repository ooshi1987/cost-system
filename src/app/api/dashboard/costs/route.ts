import { NextResponse } from 'next/server';
import { getAllMenuCosts } from '@/lib/calculations';

export async function GET() {
  try {
    const costs = await getAllMenuCosts();
    return NextResponse.json(costs);
  } catch (error) {
    console.error('Error fetching menu costs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch menu costs' },
      { status: 500 }
    );
  }
}
