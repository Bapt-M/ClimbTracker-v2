import { Hono } from 'hono';
import { db } from '../lib/auth';
import { users } from '@climbtracker/database/schema';
import { eq } from 'drizzle-orm';

const app = new Hono();

// POST /api/webhooks/stripe - Stripe webhook handler
app.post('/stripe', async (c) => {
  const signature = c.req.header('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return c.json({ error: 'Missing signature or webhook secret' }, 400);
  }

  try {
    // Dynamic import to avoid loading Stripe when not configured
    const { constructWebhookEvent } = await import('@climbtracker/payments');

    const body = await c.req.text();
    const event = constructWebhookEvent(body, signature, webhookSecret);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const customerId = session.customer as string;

        if (userId && customerId) {
          // Update user with Stripe customer ID and premium status
          await db.update(users)
            .set({
              // Note: You'll need to add these fields to the users schema
              // stripeCustomerId: customerId,
              // isPremium: true,
              updatedAt: new Date(),
            })
            .where(eq(users.id, userId));

          console.log(`✅ User ${userId} upgraded to premium`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;

        // Find user by customer ID and remove premium
        // Note: You'll need to add stripeCustomerId to the users schema
        // await db.update(users)
        //   .set({ isPremium: false, updatedAt: new Date() })
        //   .where(eq(users.stripeCustomerId, customerId));

        console.log(`⚠️ Subscription cancelled for customer ${customerId}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer as string;

        console.log(`❌ Payment failed for customer ${customerId}`);
        // You could send an email notification here
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return c.json({ received: true });
  } catch (error: any) {
    console.error('Stripe webhook error:', error.message);
    return c.json({ error: 'Webhook error' }, 400);
  }
});

export default app;
