import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripe, PRICE_PER_STORE_JPY } from '@/lib/stripe';
import { getAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth || auth.role !== 'tenant_admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenant = await prisma.tenant.findUnique({ where: { id: auth.tenantId } });
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  const storeCount = await prisma.store.count({ where: { tenantId: auth.tenantId } });
  const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  // Stripe Customer がなければ作成
  let customerId = tenant.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: tenant.email, name: tenant.name });
    customerId = customer.id;
    await prisma.tenant.update({ where: { id: auth.tenantId }, data: { stripeCustomerId: customerId } });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{
      price_data: {
        currency: 'jpy',
        product_data: { name: '原価管理システム', description: '1店舗あたり月額料金' },
        unit_amount: PRICE_PER_STORE_JPY,
        recurring: { interval: 'month' },
      },
      quantity: storeCount,
    }],
    metadata: { tenantId: auth.tenantId },
    success_url: `${origin}/billing?success=1`,
    cancel_url: `${origin}/billing`,
    locale: 'ja',
  });

  return NextResponse.json({ url: session.url });
}
