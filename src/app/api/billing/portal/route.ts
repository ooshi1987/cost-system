import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { getAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth || auth.role !== 'tenant_admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenant = await prisma.tenant.findUnique({ where: { id: auth.tenantId } });
  if (!tenant?.stripeCustomerId) return NextResponse.json({ error: 'No billing account' }, { status: 400 });

  const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const session = await stripe.billingPortal.sessions.create({
    customer: tenant.stripeCustomerId,
    return_url: `${origin}/billing`,
  });

  return NextResponse.json({ url: session.url });
}
