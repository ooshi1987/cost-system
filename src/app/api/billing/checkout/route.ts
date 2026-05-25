import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripe, PLANS, type PlanId } from '@/lib/stripe';
import { getAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth || auth.role !== 'tenant_admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { planId } = (await request.json()) as { planId?: PlanId };
  const targetPlan = planId === 'pro' ? PLANS.pro : PLANS.basic;

  const tenant = await prisma.tenant.findUnique({ where: { id: auth.tenantId } });
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

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
        product_data: {
          name: `原価管理システム ${targetPlan.name}`,
          description: targetPlan.id === 'basic' ? '品目数無制限・1店舗' : '品目数無制限・店舗数無制限',
        },
        unit_amount: targetPlan.price,
        recurring: { interval: 'month' },
      },
      quantity: 1,
    }],
    metadata: { tenantId: auth.tenantId, planId: targetPlan.id },
    success_url: `${origin}/billing?success=1`,
    cancel_url: `${origin}/billing`,
    locale: 'ja',
  });

  return NextResponse.json({ url: session.url });
}
