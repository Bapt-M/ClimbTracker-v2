import { Hono } from 'hono';
import { db } from '../lib/auth';
import { users } from '@climbtracker/database/schema';
import { requireAuth } from '../middleware/auth';
import { eq } from 'drizzle-orm';
import {
  getStripe,
  PLANS,
  createCheckoutSession,
  createPortalSession,
  constructWebhookEvent,
} from '@climbtracker/payments';
import { env } from '../env';
import { serverEvents } from './analytics';

const app = new Hono();

// GET /api/stripe/plans - Get available plans
app.get('/plans', (c) => {
  return c.json({
    success: true,
    data: {
      plans: Object.values(PLANS),
    },
  });
});

// GET /api/stripe/subscription - Get current user's subscription status
app.get('/subscription', requireAuth, async (c) => {
  const user = c.get('user');

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: {
      isPremium: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      stripeCurrentPeriodEnd: true,
    },
  });

  if (!dbUser) {
    return c.json({ success: false, error: 'User not found' }, 404);
  }

  return c.json({
    success: true,
    data: {
      isPremium: dbUser.isPremium,
      hasSubscription: !!dbUser.stripeSubscriptionId,
      currentPeriodEnd: dbUser.stripeCurrentPeriodEnd?.toISOString() || null,
    },
  });
});

// POST /api/stripe/checkout - Create checkout session
app.post('/checkout', requireAuth, async (c) => {
  const user = c.get('user');

  try {
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    // Check if already premium
    if (dbUser.isPremium) {
      return c.json({ success: false, error: 'Already subscribed to Premium' }, 400);
    }

    const session = await createCheckoutSession({
      userId: user.id,
      email: dbUser.email,
      successUrl: `${env.FRONTEND_URL}/settings?success=true`,
      cancelUrl: `${env.FRONTEND_URL}/pricing?canceled=true`,
    });

    // Track checkout start
    serverEvents.subscriptionStarted(user.id, 'premium_checkout_started');

    return c.json({
      success: true,
      data: {
        url: session.url,
      },
    });
  } catch (error: any) {
    console.error('[stripe] Checkout error:', error);
    return c.json({ success: false, error: error.message || 'Failed to create checkout' }, 500);
  }
});

// POST /api/stripe/portal - Create billing portal session
app.post('/portal', requireAuth, async (c) => {
  const user = c.get('user');

  try {
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: {
        stripeCustomerId: true,
      },
    });

    if (!dbUser?.stripeCustomerId) {
      return c.json({ success: false, error: 'No subscription found' }, 400);
    }

    const session = await createPortalSession({
      customerId: dbUser.stripeCustomerId,
      returnUrl: `${env.FRONTEND_URL}/settings`,
    });

    return c.json({
      success: true,
      data: {
        url: session.url,
      },
    });
  } catch (error: any) {
    console.error('[stripe] Portal error:', error);
    return c.json({ success: false, error: error.message || 'Failed to create portal session' }, 500);
  }
});

// POST /api/stripe/webhook - Stripe webhook handler
app.post('/webhook', async (c) => {
  const signature = c.req.header('stripe-signature');

  if (!signature) {
    return c.json({ error: 'Missing signature' }, 400);
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[stripe] Webhook secret not configured');
    return c.json({ error: 'Webhook not configured' }, 500);
  }

  try {
    const body = await c.req.text();
    const event = constructWebhookEvent(body, signature, webhookSecret);

    console.log('[stripe] Webhook event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const userId = session.metadata?.userId;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (userId) {
          await db.update(users)
            .set({
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              isPremium: true,
              updatedAt: new Date(),
            })
            .where(eq(users.id, userId));

          console.log(`[stripe] User ${userId} subscribed to premium`);
          serverEvents.subscriptionStarted(userId, 'premium');
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        const customerId = subscription.customer as string;

        // Find user by customer ID
        const dbUser = await db.query.users.findFirst({
          where: eq(users.stripeCustomerId, customerId),
        });

        if (dbUser) {
          const isPremium = subscription.status === 'active' || subscription.status === 'trialing';
          const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

          await db.update(users)
            .set({
              isPremium,
              stripePriceId: subscription.items.data[0]?.price.id || null,
              stripeCurrentPeriodEnd: currentPeriodEnd,
              updatedAt: new Date(),
            })
            .where(eq(users.id, dbUser.id));

          console.log(`[stripe] Subscription updated for user ${dbUser.id}: isPremium=${isPremium}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const customerId = subscription.customer as string;

        // Find user by customer ID
        const dbUser = await db.query.users.findFirst({
          where: eq(users.stripeCustomerId, customerId),
        });

        if (dbUser) {
          await db.update(users)
            .set({
              isPremium: false,
              stripeSubscriptionId: null,
              stripePriceId: null,
              stripeCurrentPeriodEnd: null,
              updatedAt: new Date(),
            })
            .where(eq(users.id, dbUser.id));

          console.log(`[stripe] Subscription cancelled for user ${dbUser.id}`);
          serverEvents.subscriptionCancelled(dbUser.id, 'premium');
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const customerId = invoice.customer as string;

        console.log(`[stripe] Payment failed for customer ${customerId}`);
        // Could send email notification here
        break;
      }
    }

    return c.json({ received: true });
  } catch (error: any) {
    console.error('[stripe] Webhook error:', error);
    return c.json({ error: error.message }, 400);
  }
});

export default app;
