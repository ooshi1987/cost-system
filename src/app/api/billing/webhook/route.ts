import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const updateTenant = async (customerId: string, data: { stripeSubscriptionId?: string; subscriptionStatus?: string }) => {
    await prisma.tenant.updateMany({ where: { stripeCustomerId: customerId }, data });
  };

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.subscription && session.customer) {
        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        await updateTenant(session.customer as string, {
          stripeSubscriptionId: sub.id,
          subscriptionStatus: sub.status,
        });
      }
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await updateTenant(sub.customer as string, { subscriptionStatus: sub.status });
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      await updateTenant(invoice.customer as string, { subscriptionStatus: 'past_due' });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
