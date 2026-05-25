import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2026-04-22.dahlia',
});

// ─────────────────────────────────────────
// プラン定義
// ─────────────────────────────────────────
export type PlanId = 'free' | 'basic' | 'pro';

export const PLANS = {
  free: {
    id: 'free'  as PlanId,
    name: '無料',
    price: 0,
    menuItems: 10,
    ingredients: 20,
    stores: 1,
  },
  basic: {
    id: 'basic' as PlanId,
    name: 'Basic',
    price: 1980,
    menuItems: Infinity,
    ingredients: Infinity,
    stores: 1,
  },
  pro: {
    id: 'pro'   as PlanId,
    name: 'Pro',
    price: 4980,
    menuItems: Infinity,
    ingredients: Infinity,
    stores: Infinity,
  },
} as const;

export function getPlan(planId: string | null | undefined): typeof PLANS[PlanId] {
  if (planId === 'basic') return PLANS.basic;
  if (planId === 'pro')   return PLANS.pro;
  return PLANS.free;
}
