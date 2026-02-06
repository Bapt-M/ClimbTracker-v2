import { Hono } from 'hono';
import { db } from '../lib/auth';
import { validations } from '@climbtracker/database/schema';
import { requireAuth } from '../middleware/auth';
import { eq, and, desc } from 'drizzle-orm';

const app = new Hono();

// GET /api/validations - Get current user's validations
app.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const { routeId, status } = c.req.query();

  const conditions = [eq(validations.userId, user.id)];

  if (routeId) {
    conditions.push(eq(validations.routeId, routeId));
  }

  if (status) {
    conditions.push(eq(validations.status, status as any));
  }

  const userValidations = await db.query.validations.findMany({
    where: and(...conditions),
    with: {
      route: {
        columns: { id: true, name: true, difficulty: true, sector: true, mainPhoto: true, status: true },
      },
    },
    orderBy: [desc(validations.validatedAt)],
  });

  return c.json({ success: true, data: { validations: userValidations } });
});

// GET /api/validations/user - Alias for getting current user's validations (flat array response)
app.get('/user', requireAuth, async (c) => {
  const user = c.get('user');

  const userValidations = await db.query.validations.findMany({
    where: eq(validations.userId, user.id),
    with: {
      route: {
        columns: { id: true, name: true, difficulty: true, sector: true, mainPhoto: true, status: true },
      },
    },
    orderBy: [desc(validations.validatedAt)],
  });

  // Return flat array for frontend compatibility
  return c.json(userValidations);
});

// GET /api/validations/route/:routeId - Get all validations for a route
app.get('/route/:routeId', requireAuth, async (c) => {
  const routeId = c.req.param('routeId');

  const routeValidations = await db.query.validations.findMany({
    where: eq(validations.routeId, routeId),
    with: {
      user: {
        columns: { id: true, name: true, image: true },
      },
    },
    orderBy: [desc(validations.validatedAt)],
  });

  return c.json({ success: true, data: { validations: routeValidations } });
});

// POST /api/validations - Create or update validation
app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();

  // Check if validation exists
  const existing = await db.query.validations.findFirst({
    where: and(
      eq(validations.routeId, body.routeId),
      eq(validations.userId, user.id)
    ),
  });

  let validation;

  if (existing) {
    // Update existing validation
    const [updated] = await db.update(validations)
      .set({
        status: body.status,
        attempts: body.attempts ?? existing.attempts,
        isFlashed: body.isFlashed ?? existing.isFlashed,
        isFavorite: body.isFavorite ?? existing.isFavorite,
        personalNote: body.personalNote ?? existing.personalNote,
        validatedAt: body.status === 'VALIDE' ? new Date() : existing.validatedAt,
      })
      .where(eq(validations.id, existing.id))
      .returning();
    validation = updated;
  } else {
    // Create new validation
    const [created] = await db.insert(validations).values({
      id: crypto.randomUUID(),
      routeId: body.routeId,
      userId: user.id,
      status: body.status || 'EN_PROJET',
      attempts: body.attempts || 1,
      isFlashed: body.isFlashed || false,
      isFavorite: body.isFavorite || false,
      personalNote: body.personalNote,
      validatedAt: body.status === 'VALIDE' ? new Date() : new Date(),
    }).returning();
    validation = created;
  }

  return c.json({ success: true, data: { validation } }, existing ? 200 : 201);
});

// PUT /api/validations/:id - Update validation
app.put('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const body = await c.req.json();

  // Verify ownership
  const existing = await db.query.validations.findFirst({
    where: and(eq(validations.id, id), eq(validations.userId, user.id)),
  });

  if (!existing) {
    return c.json({ success: false, error: 'Validation not found' }, 404);
  }

  const [updated] = await db.update(validations)
    .set({
      status: body.status,
      attempts: body.attempts,
      isFlashed: body.isFlashed,
      isFavorite: body.isFavorite,
      personalNote: body.personalNote,
      validatedAt: body.status === 'VALIDE' ? new Date() : existing.validatedAt,
    })
    .where(eq(validations.id, id))
    .returning();

  return c.json({ success: true, data: { validation: updated } });
});

// DELETE /api/validations/:id - Delete validation
app.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  // Verify ownership
  const existing = await db.query.validations.findFirst({
    where: and(eq(validations.id, id), eq(validations.userId, user.id)),
  });

  if (!existing) {
    return c.json({ success: false, error: 'Validation not found' }, 404);
  }

  await db.delete(validations).where(eq(validations.id, id));

  return c.json({ success: true, message: 'Validation deleted' });
});

// POST /api/validations/:id/favorite - Toggle favorite
app.post('/:id/favorite', requireAuth, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const existing = await db.query.validations.findFirst({
    where: and(eq(validations.id, id), eq(validations.userId, user.id)),
  });

  if (!existing) {
    return c.json({ success: false, error: 'Validation not found' }, 404);
  }

  const [updated] = await db.update(validations)
    .set({ isFavorite: !existing.isFavorite })
    .where(eq(validations.id, id))
    .returning();

  return c.json({ success: true, data: { validation: updated } });
});

export default app;
