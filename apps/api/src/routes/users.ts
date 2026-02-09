import { Hono } from 'hono';
import { db } from '../lib/auth';
import { users, validations, routes } from '@climbtracker/database/schema';
import { requireAuth, requireRole } from '../middleware/auth';
import { eq, and, or, desc, sql, ne } from 'drizzle-orm';

const app = new Hono();

// Points de base par couleur de difficulté (échelle exponentielle x1.5)
const DIFFICULTY_POINTS: Record<string, number> = {
  'Vert': 10,
  'Vert clair': 15,
  'Bleu clair': 23,
  'Bleu foncé': 34,
  'Violet': 51,
  'Rose': 75,
  'Rouge': 112,
  'Orange': 169,
  'Jaune': 255,
  'Blanc': 386,
  'Gris': 570,
  'Noir': 855,
};

// Ordre des difficultés (du plus facile au plus difficile)
const DIFFICULTY_ORDER = [
  'Vert', 'Vert clair', 'Bleu clair', 'Bleu foncé', 'Violet',
  'Rose', 'Rouge', 'Orange', 'Jaune', 'Blanc', 'Gris', 'Noir'
];

// Multiplicateur basé sur le nombre d'essais
function getAttemptsMultiplier(attempts: number): number {
  if (attempts === 1) return 1.3;   // Flash
  if (attempts === 2) return 1.2;   // Excellent
  if (attempts === 3) return 1.1;   // Très bien
  if (attempts === 4) return 1.0;   // Bien
  if (attempts === 5) return 0.9;   // Acceptable
  if (attempts === 6) return 0.8;   // Moyen
  return 0.7;                        // Laborieux (7+)
}

// Calculate max validated difficulty for a user (requires 3+ validations at that difficulty)
async function calculateMaxDifficulty(userId: string): Promise<string | null> {
  // Get count of validations per difficulty
  const difficultyStats = await db
    .select({
      difficulty: routes.difficulty,
      count: sql<number>`count(*)`,
    })
    .from(validations)
    .innerJoin(routes, eq(validations.routeId, routes.id))
    .where(and(
      eq(validations.userId, userId),
      eq(validations.status, 'VALIDE')
    ))
    .groupBy(routes.difficulty);

  // Find max difficulty with 3+ validations
  let maxDifficultyIndex = -1;

  for (const stat of difficultyStats) {
    if (Number(stat.count) >= 3) {
      const index = DIFFICULTY_ORDER.indexOf(stat.difficulty);
      if (index > maxDifficultyIndex) {
        maxDifficultyIndex = index;
      }
    }
  }

  return maxDifficultyIndex >= 0 ? DIFFICULTY_ORDER[maxDifficultyIndex] : null;
}

// Calculate total points for a user
async function calculateUserPoints(userId: string): Promise<number> {
  const userValidations = await db.query.validations.findMany({
    where: and(
      eq(validations.userId, userId),
      eq(validations.status, 'VALIDE')
    ),
    with: {
      route: {
        columns: { difficulty: true },
      },
    },
  });

  let totalPoints = 0;
  for (const v of userValidations) {
    const basePoints = DIFFICULTY_POINTS[v.route?.difficulty || 'Vert'] || 10;
    const attemptsMultiplier = getAttemptsMultiplier(v.attempts || 1);
    totalPoints += Math.round(basePoints * attemptsMultiplier);
  }

  return totalPoints;
}

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
      image: body.profilePhoto, // Also update Better Auth's image field for leaderboard
      additionalPhotos: body.additionalPhotos,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))
    .returning();

  return c.json({ success: true, data: { user: updatedUser } });
});

// GET /api/users/me/notification-preferences - Get notification preferences
app.get('/me/notification-preferences', requireAuth, async (c) => {
  const user = c.get('user');

  const fullUser = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: {
      emailNotifications: true,
      pushNotifications: true,
      notificationPreferences: true,
    },
  });

  if (!fullUser) {
    return c.json({ success: false, error: 'User not found' }, 404);
  }

  // Default preferences if not set
  const defaultPreferences = {
    email: {
      friendRequest: true,
      friendAccepted: true,
      routeValidated: false,
      commentReceived: true,
      routeCreated: false,
      achievementUnlocked: true,
      system: true,
    },
    push: {
      friendRequest: true,
      friendAccepted: true,
      routeValidated: true,
      commentReceived: true,
      routeCreated: true,
      achievementUnlocked: true,
      system: true,
    },
  };

  return c.json({
    success: true,
    data: {
      emailNotifications: fullUser.emailNotifications,
      pushNotifications: fullUser.pushNotifications,
      preferences: fullUser.notificationPreferences || defaultPreferences,
    },
  });
});

// PUT /api/users/me/notification-preferences - Update notification preferences
app.put('/me/notification-preferences', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (typeof body.emailNotifications === 'boolean') {
    updateData.emailNotifications = body.emailNotifications;
  }

  if (typeof body.pushNotifications === 'boolean') {
    updateData.pushNotifications = body.pushNotifications;
  }

  if (body.preferences) {
    updateData.notificationPreferences = body.preferences;
  }

  const [updatedUser] = await db.update(users)
    .set(updateData)
    .where(eq(users.id, user.id))
    .returning({
      emailNotifications: users.emailNotifications,
      pushNotifications: users.pushNotifications,
      notificationPreferences: users.notificationPreferences,
    });

  return c.json({
    success: true,
    data: {
      emailNotifications: updatedUser.emailNotifications,
      pushNotifications: updatedUser.pushNotifications,
      preferences: updatedUser.notificationPreferences,
    },
  });
});

// PUT /api/users/:id - Update user profile by ID (users can only update their own profile)
app.put('/:id', requireAuth, async (c) => {
  const id = c.req.param('id');
  const currentUser = c.get('user');
  const body = await c.req.json();

  // Users can only update their own profile (unless admin)
  if (id !== currentUser.id && currentUser.role !== 'ADMIN') {
    return c.json({ success: false, error: 'Unauthorized' }, 403);
  }

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
      image: body.profilePhoto, // Also update Better Auth's image field for leaderboard
      additionalPhotos: body.additionalPhotos,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();

  if (!updatedUser) {
    return c.json({ success: false, error: 'User not found' }, 404);
  }

  return c.json({ success: true, data: { user: updatedUser } });
});

// GET /api/users/:id/kiviat-data - Get user's performance data by route type
app.get('/:id/kiviat-data', requireAuth, async (c) => {
  const id = c.req.param('id');

  // Get validations with route types for this user
  const userValidations = await db.query.validations.findMany({
    where: eq(validations.userId, id),
    with: {
      route: {
        columns: { id: true, routeTypes: true },
      },
    },
  });

  // Group by route type
  const routeTypeStats: Record<string, { totalAttempts: number; completedCount: number }> = {};

  userValidations.forEach((validation) => {
    const routeTypes = validation.route?.routeTypes || ['Unknown'];

    routeTypes.forEach((routeType: string) => {
      if (!routeTypeStats[routeType]) {
        routeTypeStats[routeType] = { totalAttempts: 0, completedCount: 0 };
      }

      routeTypeStats[routeType].totalAttempts += validation.attempts || 1;

      if (validation.status === 'VALIDE') {
        routeTypeStats[routeType].completedCount++;
      }
    });
  });

  // Format response
  const kiviatData = Object.entries(routeTypeStats).map(([routeType, stats]) => ({
    routeType,
    successRate: stats.totalAttempts > 0 ? (stats.completedCount / stats.totalAttempts) * 100 : 0,
    averageGrade: 0, // Could be computed from route difficulty if needed
    totalAttempts: stats.totalAttempts,
    completedCount: stats.completedCount,
  }));

  return c.json(kiviatData);
});

// GET /api/users/:id/stats - Get user's statistics
app.get('/:id/stats', requireAuth, async (c) => {
  const id = c.req.param('id');

  // Calculate real points and max difficulty
  const [totalPoints, maxDifficulty] = await Promise.all([
    calculateUserPoints(id),
    calculateMaxDifficulty(id),
  ]);

  const stats = await db.select({
    totalValidations: sql<number>`count(*) filter (where status = 'VALIDE')`,
    totalComments: sql<number>`0`, // TODO: Add comments count
  }).from(validations).where(eq(validations.userId, id));

  // Get validations by difficulty
  const byDifficulty = await db.select({
    difficulty: routes.difficulty,
    count: sql<number>`count(*)`,
  })
    .from(validations)
    .innerJoin(routes, eq(validations.routeId, routes.id))
    .where(and(eq(validations.userId, id), eq(validations.status, 'VALIDE')))
    .groupBy(routes.difficulty);

  // Get recent validations
  const recentValidations = await db.query.validations.findMany({
    where: and(eq(validations.userId, id), eq(validations.status, 'VALIDE')),
    with: {
      route: {
        columns: { id: true, name: true, difficulty: true, sector: true },
      },
    },
    orderBy: [desc(validations.validatedAt)],
    limit: 5,
  });

  return c.json({
    totalValidations: Number(stats[0]?.totalValidations || 0),
    totalComments: Number(stats[0]?.totalComments || 0),
    totalPoints,
    maxDifficulty,
    validationsByDifficulty: byDifficulty.map(r => ({
      difficulty: r.difficulty,
      count: Number(r.count),
    })),
    recentValidations,
  });
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
