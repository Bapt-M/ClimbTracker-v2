import { Hono } from 'hono';
import { db } from '../lib/auth';
import { pushSubscriptions } from '@climbtracker/database/schema';
import { requireAuth } from '../middleware/auth';
import { eq, and, desc } from 'drizzle-orm';
import { env } from '../env';
import { getVapidPublicKey, sendTestNotification } from '@climbtracker/notifications';

const app = new Hono();

// GET /api/push-subscriptions/vapid-key - Get VAPID public key for web push
app.get('/vapid-key', async (c) => {
  const vapidKey = env.VAPID_PUBLIC_KEY || getVapidPublicKey();

  if (!vapidKey) {
    return c.json({ success: false, error: 'Web Push not configured' }, 503);
  }

  return c.json({ success: true, data: { vapidPublicKey: vapidKey } });
});

// GET /api/push-subscriptions - List user's push subscriptions
app.get('/', requireAuth, async (c) => {
  const user = c.get('user');

  const subscriptions = await db.query.pushSubscriptions.findMany({
    where: and(
      eq(pushSubscriptions.userId, user.id),
      eq(pushSubscriptions.isActive, true)
    ),
    columns: {
      id: true,
      platform: true,
      deviceName: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [desc(pushSubscriptions.createdAt)],
  });

  return c.json({ success: true, data: { subscriptions } });
});

// POST /api/push-subscriptions - Subscribe to push notifications
app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();

  const {
    // Web Push fields
    endpoint,
    keys,
    // FCM field
    fcmToken,
    // Common fields
    platform,
    deviceName,
  } = body;

  // Validate required fields based on platform
  if (!platform || !['web', 'ios', 'android'].includes(platform)) {
    return c.json({ success: false, error: 'Invalid platform' }, 400);
  }

  if (platform === 'web') {
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return c.json({ success: false, error: 'Missing web push subscription data' }, 400);
    }

    // Check for existing subscription with same endpoint
    const existing = await db.query.pushSubscriptions.findFirst({
      where: and(
        eq(pushSubscriptions.userId, user.id),
        eq(pushSubscriptions.endpoint, endpoint)
      ),
    });

    if (existing) {
      // Update existing subscription
      const [updated] = await db.update(pushSubscriptions)
        .set({
          p256dh: keys.p256dh,
          auth: keys.auth,
          deviceName: deviceName || existing.deviceName,
          isActive: true,
        })
        .where(eq(pushSubscriptions.id, existing.id))
        .returning();

      return c.json({ success: true, data: { subscription: updated } });
    }

    // Create new subscription
    const [subscription] = await db.insert(pushSubscriptions).values({
      id: crypto.randomUUID(),
      userId: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      platform: 'web',
      deviceName: deviceName || 'Navigateur Web',
      isActive: true,
    }).returning();

    return c.json({ success: true, data: { subscription } }, 201);
  }

  // iOS or Android (FCM)
  if (!fcmToken) {
    return c.json({ success: false, error: 'Missing FCM token' }, 400);
  }

  // Check for existing subscription with same FCM token
  const existing = await db.query.pushSubscriptions.findFirst({
    where: and(
      eq(pushSubscriptions.userId, user.id),
      eq(pushSubscriptions.fcmToken, fcmToken)
    ),
  });

  if (existing) {
    // Update existing subscription
    const [updated] = await db.update(pushSubscriptions)
      .set({
        deviceName: deviceName || existing.deviceName,
        isActive: true,
      })
      .where(eq(pushSubscriptions.id, existing.id))
      .returning();

    return c.json({ success: true, data: { subscription: updated } });
  }

  // Create new subscription
  const [subscription] = await db.insert(pushSubscriptions).values({
    id: crypto.randomUUID(),
    userId: user.id,
    fcmToken,
    platform: platform as 'ios' | 'android',
    deviceName: deviceName || (platform === 'ios' ? 'iPhone' : 'Android'),
    isActive: true,
  }).returning();

  return c.json({ success: true, data: { subscription } }, 201);
});

// DELETE /api/push-subscriptions/:id - Unsubscribe from push notifications
app.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const subscription = await db.query.pushSubscriptions.findFirst({
    where: and(
      eq(pushSubscriptions.id, id),
      eq(pushSubscriptions.userId, user.id)
    ),
  });

  if (!subscription) {
    return c.json({ success: false, error: 'Subscription not found' }, 404);
  }

  // Soft delete by marking as inactive
  await db.update(pushSubscriptions)
    .set({ isActive: false })
    .where(eq(pushSubscriptions.id, id));

  return c.json({ success: true, message: 'Unsubscribed successfully' });
});

// POST /api/push-subscriptions/test - Send a test notification
app.post('/test', requireAuth, async (c) => {
  const user = c.get('user');
  const { channel } = await c.req.json().catch(() => ({ channel: 'all' }));

  try {
    const result = await sendTestNotification(user.id, channel || 'all');

    // Check if any notifications were sent
    const emailSent = result.email?.success;
    const webPushSent = result.webPush?.some(r => r.success);
    const fcmSent = result.fcm?.some(r => r.success);

    if (!emailSent && !webPushSent && !fcmSent) {
      return c.json({
        success: false,
        error: 'No notifications sent. Check your subscriptions and preferences.',
        details: result,
      }, 400);
    }

    return c.json({
      success: true,
      message: 'Test notification sent',
      data: { result },
    });
  } catch (error) {
    console.error('[push-subscriptions] Test notification error:', error);
    return c.json({
      success: false,
      error: 'Failed to send test notification',
    }, 500);
  }
});

export default app;
