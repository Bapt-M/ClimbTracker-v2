import Stripe from 'stripe';

// Initialize Stripe with optional secret key
let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    });
  }
  return stripeInstance;
}

// Plans configuration
export const PLANS = {
  FREE: {
    id: 'free',
    name: 'Gratuit',
    price: 0,
    features: [
      "C'est gratuit",
    ],
  },
  PREMIUM: {
    id: 'premium',
    name: 'Premium',
    priceId: process.env.STRIPE_PRICE_ID || '',
    price: 4.99,
    features: [
      'Analytics avancées',
      'Export de données',
      'Badge Premium',
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;

// Create checkout session for premium subscription
export async function createCheckoutSession(options: {
  userId: string;
  email: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    customer_email: options.email,
    line_items: [
      {
        price: PLANS.PREMIUM.priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: options.successUrl,
    cancel_url: options.cancelUrl,
    metadata: {
      userId: options.userId,
    },
    subscription_data: {
      metadata: {
        userId: options.userId,
      },
    },
  });

  return session;
}

// Create billing portal session
export async function createPortalSession(options: {
  customerId: string;
  returnUrl: string;
}): Promise<Stripe.BillingPortal.Session> {
  const stripe = getStripe();

  const session = await stripe.billingPortal.sessions.create({
    customer: options.customerId,
    return_url: options.returnUrl,
  });

  return session;
}

// Get customer by ID
export async function getCustomer(customerId: string): Promise<Stripe.Customer | Stripe.DeletedCustomer> {
  const stripe = getStripe();
  return stripe.customers.retrieve(customerId);
}

// Get subscription by ID
export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  const stripe = getStripe();
  return stripe.subscriptions.retrieve(subscriptionId);
}

// Cancel subscription
export async function cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  const stripe = getStripe();
  return stripe.subscriptions.cancel(subscriptionId);
}

// Webhook event verification
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  const stripe = getStripe();
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

// Re-export Stripe types
export type { Stripe };
