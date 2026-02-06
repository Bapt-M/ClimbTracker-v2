import { Hono } from 'hono';
import { analytics, events } from '@climbtracker/analytics';

const app = new Hono();

// POST /api/analytics/track - Track an event from frontend
app.post('/track', async (c) => {
  try {
    const body = await c.req.json();
    const { event, properties } = body;

    if (!event) {
      return c.json({ error: 'Event name required' }, 400);
    }

    // Log in development, send to analytics in production
    await analytics.track(event, properties);

    return c.json({ success: true });
  } catch (error: any) {
    console.error('[analytics] Track error:', error);
    return c.json({ error: 'Failed to track event' }, 500);
  }
});

// POST /api/analytics/identify - Identify a user
app.post('/identify', async (c) => {
  try {
    const body = await c.req.json();
    const { userId, traits } = body;

    if (!userId) {
      return c.json({ error: 'User ID required' }, 400);
    }

    await analytics.identify(userId, traits);

    return c.json({ success: true });
  } catch (error: any) {
    console.error('[analytics] Identify error:', error);
    return c.json({ error: 'Failed to identify user' }, 500);
  }
});

// Helper functions to track server-side events
export const serverEvents = {
  userRegistered: (userId: string, method: string) =>
    events.userRegistered(userId, method as 'email' | 'google' | 'passkey'),

  userLoggedIn: (userId: string, method: string) =>
    events.userLoggedIn(userId, method),

  routeCreated: (routeId: string, difficulty: string, sector: string) =>
    events.routeCreated(routeId, difficulty, sector),

  routeValidated: (routeId: string, userId: string, attempts: number, isFlashed: boolean) =>
    events.routeValidated(routeId, userId, attempts, isFlashed),

  subscriptionStarted: (userId: string, plan: string) =>
    events.subscriptionStarted(userId, plan),

  subscriptionCancelled: (userId: string, plan: string) =>
    events.subscriptionCancelled(userId, plan),
};

export default app;
