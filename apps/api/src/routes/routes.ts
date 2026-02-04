import { Hono } from 'hono';
import { db } from '../lib/auth';
import { routes, validations, comments, users } from '@climbtracker/database/schema';
import { requireAuth, requireRole } from '../middleware/auth';
import { eq, and, or, like, desc, asc, gte, lte, inArray, sql } from 'drizzle-orm';

const app = new Hono();

// GET /api/routes - List routes with filters
app.get('/', requireAuth, async (c) => {
  const {
    difficulty,
    holdColorCategory,
    sector,
    status,
    search,
    page = '1',
    limit = '12',
    sortField = 'createdAt',
    sortOrder = 'DESC',
    openedAtFrom,
    openedAtTo
  } = c.req.query();

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  // Build where conditions
  const conditions = [];

  if (difficulty) {
    const difficulties = Array.isArray(difficulty) ? difficulty : [difficulty];
    conditions.push(inArray(routes.difficulty, difficulties as any));
  }

  if (holdColorCategory) {
    const categories = Array.isArray(holdColorCategory) ? holdColorCategory : [holdColorCategory];
    conditions.push(inArray(routes.holdColorCategory, categories as any));
  }

  if (sector) {
    const sectors = Array.isArray(sector) ? sector : [sector];
    conditions.push(inArray(routes.sector, sectors));
  }

  if (status) {
    const statuses = Array.isArray(status) ? status : [status];
    conditions.push(inArray(routes.status, statuses as any));
  } else {
    // Default to ACTIVE routes only
    conditions.push(eq(routes.status, 'ACTIVE'));
  }

  if (search) {
    conditions.push(
      or(
        like(routes.name, `%${search}%`),
        like(routes.description, `%${search}%`)
      )
    );
  }

  if (openedAtFrom) {
    conditions.push(gte(routes.openedAt, new Date(openedAtFrom)));
  }

  if (openedAtTo) {
    conditions.push(lte(routes.openedAt, new Date(openedAtTo)));
  }

  // Build order by
  const orderField = sortField === 'openedAt' ? routes.openedAt
    : sortField === 'name' ? routes.name
    : sortField === 'difficulty' ? routes.difficulty
    : routes.createdAt;

  const orderDir = sortOrder === 'ASC' ? asc(orderField) : desc(orderField);

  // Execute query
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [routesList, countResult] = await Promise.all([
    db.query.routes.findMany({
      where: whereClause,
      with: {
        opener: {
          columns: { id: true, name: true, image: true },
        },
      },
      orderBy: [orderDir],
      limit: limitNum,
      offset,
    }),
    db.select({ count: sql<number>`count(*)` }).from(routes).where(whereClause),
  ]);

  const total = Number(countResult[0]?.count || 0);

  return c.json({
    success: true,
    data: {
      routes: routesList,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    },
  });
});

// GET /api/routes/stats - Get route statistics
app.get('/stats', requireAuth, async (c) => {
  const [
    totalResult,
    byDifficultyResult,
    bySectorResult,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(routes).where(eq(routes.status, 'ACTIVE')),
    db.select({
      difficulty: routes.difficulty,
      count: sql<number>`count(*)`
    }).from(routes).where(eq(routes.status, 'ACTIVE')).groupBy(routes.difficulty),
    db.select({
      sector: routes.sector,
      count: sql<number>`count(*)`
    }).from(routes).where(eq(routes.status, 'ACTIVE')).groupBy(routes.sector),
  ]);

  return c.json({
    success: true,
    data: {
      stats: {
        total: Number(totalResult[0]?.count || 0),
        byDifficulty: byDifficultyResult.map(r => ({ difficulty: r.difficulty, count: Number(r.count) })),
        bySector: bySectorResult.map(r => ({ sector: r.sector, count: Number(r.count) })),
      },
    },
  });
});

// GET /api/routes/:id - Get single route
app.get('/:id', requireAuth, async (c) => {
  const id = c.req.param('id');

  const route = await db.query.routes.findFirst({
    where: eq(routes.id, id),
    with: {
      opener: {
        columns: { id: true, name: true, image: true },
      },
      validations: {
        with: {
          user: {
            columns: { id: true, name: true, image: true },
          },
        },
        orderBy: [desc(validations.validatedAt)],
        limit: 10,
      },
      comments: {
        with: {
          user: {
            columns: { id: true, name: true, image: true },
          },
        },
        orderBy: [desc(comments.createdAt)],
        limit: 10,
      },
    },
  });

  if (!route) {
    return c.json({ success: false, error: 'Route not found' }, 404);
  }

  return c.json({ success: true, data: { route } });
});

// POST /api/routes - Create route (OPENER+ only)
app.post('/', requireAuth, requireRole('OPENER', 'ADMIN'), async (c) => {
  const user = c.get('user');
  const body = await c.req.json();

  const [newRoute] = await db.insert(routes).values({
    id: crypto.randomUUID(),
    name: body.name,
    difficulty: body.difficulty,
    holdColorHex: body.holdColorHex,
    holdColorCategory: body.holdColorCategory,
    sector: body.sector,
    routeTypes: body.routeTypes,
    description: body.description,
    tips: body.tips,
    openerId: user.id,
    mainPhoto: body.mainPhoto,
    openingVideo: body.openingVideo,
    status: 'PENDING',
    openedAt: body.openedAt ? new Date(body.openedAt) : new Date(),
    holdMapping: body.holdMapping,
  }).returning();

  return c.json({ success: true, data: { route: newRoute } }, 201);
});

// PUT /api/routes/:id - Update route (owner or ADMIN)
app.put('/:id', requireAuth, requireRole('OPENER', 'ADMIN'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const body = await c.req.json();

  // Check ownership
  const existingRoute = await db.query.routes.findFirst({
    where: eq(routes.id, id),
  });

  if (!existingRoute) {
    return c.json({ success: false, error: 'Route not found' }, 404);
  }

  if (existingRoute.openerId !== user.id && user.role !== 'ADMIN') {
    return c.json({ success: false, error: 'Forbidden' }, 403);
  }

  const [updatedRoute] = await db.update(routes)
    .set({
      name: body.name,
      difficulty: body.difficulty,
      holdColorHex: body.holdColorHex,
      holdColorCategory: body.holdColorCategory,
      sector: body.sector,
      routeTypes: body.routeTypes,
      description: body.description,
      tips: body.tips,
      mainPhoto: body.mainPhoto,
      openingVideo: body.openingVideo,
      openedAt: body.openedAt ? new Date(body.openedAt) : undefined,
      holdMapping: body.holdMapping,
      updatedAt: new Date(),
    })
    .where(eq(routes.id, id))
    .returning();

  return c.json({ success: true, data: { route: updatedRoute } });
});

// PUT /api/routes/:id/status - Update status (ADMIN only)
app.put('/:id/status', requireAuth, requireRole('ADMIN'), async (c) => {
  const id = c.req.param('id');
  const { status } = await c.req.json();

  const [updatedRoute] = await db.update(routes)
    .set({
      status,
      closedAt: status === 'ARCHIVED' ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(routes.id, id))
    .returning();

  if (!updatedRoute) {
    return c.json({ success: false, error: 'Route not found' }, 404);
  }

  return c.json({ success: true, data: { route: updatedRoute } });
});

// DELETE /api/routes/:id - Delete route (ADMIN only)
app.delete('/:id', requireAuth, requireRole('ADMIN'), async (c) => {
  const id = c.req.param('id');

  const [deletedRoute] = await db.delete(routes)
    .where(eq(routes.id, id))
    .returning();

  if (!deletedRoute) {
    return c.json({ success: false, error: 'Route not found' }, 404);
  }

  return c.json({ success: true, message: 'Route deleted' });
});

export default app;
