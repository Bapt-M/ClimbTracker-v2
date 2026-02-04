import { Hono } from 'hono';
import { db } from '../lib/auth';
import { users, validations, routes, friendships } from '@climbtracker/database/schema';
import { requireAuth, requireRole } from '../middleware/auth';
import { eq, and, or, desc, sql, ne } from 'drizzle-orm';

const app = new Hono();

// GET /api/users/me - Get current user profile
app.get('/me', requireAuth, async (c) => {
  const user = c.get('user');

  const fullUser = await db.query.users.findFirst({
    where: eq(users.id, user.id),
  });

  if (!fullUser) {
    return c.json({ success: false, error: 'User not found' }, 404);
  }

  // Get validation stats
  const stats = await db.select({
    totalValidations: sql<number>`count(*) filter (where status = 'VALIDE')`,
    totalProjects: sql<number>`count(*) filter (where status = 'EN_PROJET')`,
    totalFlashed: sql<number>`count(*) filter (where is_flashed = true)`,
    totalFavorites: sql<number>`count(*) filter (where is_favorite = true)`,
  }).from(validations).where(eq(validations.userId, user.id));

  return c.json({
    success: true,
    data: {
      user: fullUser,
      stats: {
        totalValidations: Number(stats[0]?.totalValidations || 0),
        totalProjects: Number(stats[0]?.totalProjects || 0),
        totalFlashed: Number(stats[0]?.totalFlashed || 0),
        totalFavorites: Number(stats[0]?.totalFavorites || 0),
      },
    },
  });
});

// PUT /api/users/me - Update current user profile
app.put('/me', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();

  const [updatedUser] = await db.update(users)
    .set({
      name: body.name,
      bio: body.bio,
      firstName: body.firstName,
      lastName: body.lastName,
      age: body.age,
      height: body.height,
      wingspan: body.wingspan,
      profilePhoto: body.profilePhoto,
      additionalPhotos: body.additionalPhotos,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))
    .returning();

  return c.json({ success: true, data: { user: updatedUser } });
});

// GET /api/users/:id - Get user profile by ID
app.get('/:id', requireAuth, async (c) => {
  const id = c.req.param('id');
  const currentUser = c.get('user');

  const profile = await db.query.users.findFirst({
    where: eq(users.id, id),
    columns: {
      id: true,
      name: true,
      image: true,
      bio: true,
      createdAt: true,
      // Hide sensitive fields for other users
      email: currentUser.id === id,
      firstName: true,
      lastName: true,
      age: true,
      height: true,
      wingspan: true,
      profilePhoto: true,
    },
  });

  if (!profile) {
    return c.json({ success: false, error: 'User not found' }, 404);
  }

  // Get public stats
  const stats = await db.select({
    totalValidations: sql<number>`count(*) filter (where status = 'VALIDE')`,
  }).from(validations).where(eq(validations.userId, id));

  return c.json({
    success: true,
    data: {
      user: profile,
      stats: {
        totalValidations: Number(stats[0]?.totalValidations || 0),
      },
    },
  });
});

// GET /api/users/:id/validations - Get user's validations
app.get('/:id/validations', requireAuth, async (c) => {
  const id = c.req.param('id');
  const { status, limit = '20', page = '1' } = c.req.query();

  const conditions = [eq(validations.userId, id)];
  if (status) {
    conditions.push(eq(validations.status, status as any));
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  const userValidations = await db.query.validations.findMany({
    where: and(...conditions),
    with: {
      route: {
        columns: { id: true, name: true, difficulty: true, sector: true, mainPhoto: true },
      },
    },
    orderBy: [desc(validations.validatedAt)],
    limit: limitNum,
    offset,
  });

  return c.json({ success: true, data: { validations: userValidations } });
});

// GET /api/users/search - Search users
app.get('/search', requireAuth, async (c) => {
  const { q, limit = '10' } = c.req.query();
  const currentUser = c.get('user');

  if (!q || q.length < 2) {
    return c.json({ success: true, data: { users: [] } });
  }

  const results = await db.query.users.findMany({
    where: and(
      ne(users.id, currentUser.id),
      or(
        sql`${users.name} ILIKE ${'%' + q + '%'}`,
        sql`${users.email} ILIKE ${'%' + q + '%'}`
      )
    ),
    columns: { id: true, name: true, image: true },
    limit: parseInt(limit),
  });

  return c.json({ success: true, data: { users: results } });
});

// Admin routes
// GET /api/users - List all users (ADMIN only)
app.get('/', requireAuth, requireRole('ADMIN'), async (c) => {
  const { page = '1', limit = '20' } = c.req.query();
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  const [usersList, countResult] = await Promise.all([
    db.query.users.findMany({
      orderBy: [desc(users.createdAt)],
      limit: limitNum,
      offset,
    }),
    db.select({ count: sql<number>`count(*)` }).from(users),
  ]);

  return c.json({
    success: true,
    data: {
      users: usersList,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: Number(countResult[0]?.count || 0),
      },
    },
  });
});

// PUT /api/users/:id/role - Update user role (ADMIN only)
app.put('/:id/role', requireAuth, requireRole('ADMIN'), async (c) => {
  const id = c.req.param('id');
  const { role } = await c.req.json();

  if (!['CLIMBER', 'OPENER', 'ADMIN'].includes(role)) {
    return c.json({ success: false, error: 'Invalid role' }, 400);
  }

  const [updated] = await db.update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();

  if (!updated) {
    return c.json({ success: false, error: 'User not found' }, 404);
  }

  return c.json({ success: true, data: { user: updated } });
});

export default app;
