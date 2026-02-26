import { Hono } from 'hono';
import { db } from '../lib/auth';
import { routes } from '@climbtracker/database/schema';
import { requireAuth, requireRole } from '../middleware/auth';
import { eq } from 'drizzle-orm';

const app = new Hono();

// GET /api/routes/:id/hold-map
app.get('/:id/hold-map', requireAuth, async (c) => {
  const id = c.req.param('id');

  const route = await db.query.routes.findFirst({
    where: eq(routes.id, id),
    columns: { holdMapping: true },
  });

  if (!route) {
    return c.json({ success: false, error: 'Route not found' }, 404);
  }

  return c.json({
    success: true,
    data: { holdMapping: route.holdMapping ?? null },
  });
});

// PUT /api/routes/:id/hold-map
app.put('/:id/hold-map', requireAuth, requireRole('OPENER', 'ADMIN'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const body = await c.req.json();

  const existingRoute = await db.query.routes.findFirst({
    where: eq(routes.id, id),
    columns: { id: true, openerId: true },
  });

  if (!existingRoute) {
    return c.json({ success: false, error: 'Route not found' }, 404);
  }

  if (existingRoute.openerId !== user.id && user.role !== 'ADMIN') {
    return c.json({ success: false, error: 'Forbidden' }, 403);
  }

  const holdMapping = body.holdMapping;
  if (!Array.isArray(holdMapping)) {
    return c.json({ success: false, error: 'holdMapping must be an array' }, 400);
  }

  const [updated] = await db.update(routes)
    .set({ holdMapping, updatedAt: new Date() })
    .where(eq(routes.id, id))
    .returning({ id: routes.id, holdMapping: routes.holdMapping });

  return c.json({ success: true, data: { holdMapping: updated.holdMapping } });
});

export default app;
