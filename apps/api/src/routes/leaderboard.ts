import { Hono } from 'hono';
import { db } from '../lib/auth';
import { validations, users, friendships, routes } from '@climbtracker/database/schema';
import { requireAuth } from '../middleware/auth';
import { eq, and, or, desc, sql, gte, inArray } from 'drizzle-orm';

const app = new Hono();

// Points de base par couleur de difficulté (échelle exponentielle x1.5 - système v1)
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

// Calculate max validated difficulty for users (requires 3+ validations at that difficulty)
async function calculateMaxDifficulty(userIds: string[], dateFilter: Date | null): Promise<Map<string, string>> {
  const maxDifficultyMap = new Map<string, string>();

  // Get count of validations per user per difficulty
  const difficultyStats = await db
    .select({
      userId: validations.userId,
      difficulty: routes.difficulty,
      count: sql<number>`count(*)`,
    })
    .from(validations)
    .innerJoin(routes, eq(validations.routeId, routes.id))
    .where(and(
      inArray(validations.userId, userIds),
      eq(validations.status, 'VALIDE'),
      dateFilter ? gte(validations.validatedAt, dateFilter) : undefined
    ))
    .groupBy(validations.userId, routes.difficulty);

  // Group by user and find max difficulty with 3+ validations
  const userDifficulties = new Map<string, Map<string, number>>();

  for (const stat of difficultyStats) {
    if (!userDifficulties.has(stat.userId)) {
      userDifficulties.set(stat.userId, new Map());
    }
    userDifficulties.get(stat.userId)!.set(stat.difficulty, Number(stat.count));
  }

  // Find max difficulty for each user
  for (const [userId, difficulties] of userDifficulties) {
    let maxDifficultyIndex = -1;

    for (const [difficulty, count] of difficulties) {
      if (count >= 3) {
        const index = DIFFICULTY_ORDER.indexOf(difficulty);
        if (index > maxDifficultyIndex) {
          maxDifficultyIndex = index;
        }
      }
    }

    if (maxDifficultyIndex >= 0) {
      maxDifficultyMap.set(userId, DIFFICULTY_ORDER[maxDifficultyIndex]);
    }
  }

  return maxDifficultyMap;
}

// Calculate points for a list of user IDs
async function calculateUserPoints(userIds: string[], dateFilter: Date | null): Promise<Map<string, number>> {
  const pointsMap = new Map<string, number>();

  // Get all validations with routes for the users
  const allValidations = await db.query.validations.findMany({
    where: and(
      inArray(validations.userId, userIds),
      eq(validations.status, 'VALIDE'),
      dateFilter ? gte(validations.validatedAt, dateFilter) : undefined
    ),
    with: {
      route: {
        columns: { difficulty: true },
      },
    },
  });

  // Calculate points per user
  for (const v of allValidations) {
    const basePoints = DIFFICULTY_POINTS[v.route?.difficulty || 'Vert'] || 10;
    const attemptsMultiplier = getAttemptsMultiplier(v.attempts || 1);
    const points = Math.round(basePoints * attemptsMultiplier);

    const currentPoints = pointsMap.get(v.userId) || 0;
    pointsMap.set(v.userId, currentPoints + points);
  }

  return pointsMap;
}

// GET /api/leaderboard - Get global leaderboard
app.get('/', requireAuth, async (c) => {
  const { period = 'all', limit = '20' } = c.req.query();
  const user = c.get('user');

  let dateFilter: Date | null = null;
  const now = new Date();

  switch (period) {
    case 'week':
      dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      dateFilter = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
  }

  // Build the leaderboard query
  const leaderboardQuery = db
    .select({
      userId: validations.userId,
      userName: users.name,
      userImage: users.image,
      totalValidations: sql<number>`count(*) filter (where ${validations.status} = 'VALIDE')`,
      totalFlashed: sql<number>`count(*) filter (where ${validations.isFlashed} = true)`,
    })
    .from(validations)
    .innerJoin(users, eq(validations.userId, users.id))
    .where(dateFilter ? gte(validations.validatedAt, dateFilter) : undefined)
    .groupBy(validations.userId, users.name, users.image)
    .orderBy(desc(sql`count(*) filter (where ${validations.status} = 'VALIDE')`))
    .limit(parseInt(limit));

  const leaderboard = await leaderboardQuery;

  // Calculate real points and max difficulty for all users in leaderboard
  const userIds = leaderboard.map(e => e.userId);
  if (!userIds.includes(user.id)) {
    userIds.push(user.id);
  }
  const [pointsMap, maxDifficultyMap] = await Promise.all([
    calculateUserPoints(userIds, dateFilter),
    calculateMaxDifficulty(userIds, dateFilter),
  ]);

  // Sort by points and assign ranks
  const leaderboardWithPoints = leaderboard.map(entry => ({
    ...entry,
    totalPoints: pointsMap.get(entry.userId) || 0,
    maxDifficulty: maxDifficultyMap.get(entry.userId) || null,
  })).sort((a, b) => b.totalPoints - a.totalPoints);

  // Get current user's points and rank
  const currentUserPoints = pointsMap.get(user.id) || 0;
  const currentUserValidations = leaderboardWithPoints.find(e => e.userId === user.id)?.totalValidations || 0;
  const currentUserMaxDifficulty = maxDifficultyMap.get(user.id) || null;

  // Calculate rank based on points
  const allUserPoints = Array.from(pointsMap.values()).sort((a, b) => b - a);
  const userRank = allUserPoints.findIndex(p => p <= currentUserPoints) + 1 || allUserPoints.length + 1;

  return c.json({
    success: true,
    data: {
      leaderboard: leaderboardWithPoints.map((entry, index) => ({
        rank: index + 1,
        userId: entry.userId,
        name: entry.userName,
        image: entry.userImage,
        totalValidations: Number(entry.totalValidations),
        totalFlashed: Number(entry.totalFlashed),
        totalPoints: entry.totalPoints,
        maxDifficulty: entry.maxDifficulty,
      })),
      currentUser: {
        rank: userRank,
        totalValidations: Number(currentUserValidations),
        totalPoints: currentUserPoints,
        maxDifficulty: currentUserMaxDifficulty,
      },
    },
  });
});

// GET /api/leaderboard/friends - Get friends leaderboard
app.get('/friends', requireAuth, async (c) => {
  const user = c.get('user');
  const { period = 'all' } = c.req.query();

  // Get user's friends
  const userFriendships = await db.query.friendships.findMany({
    where: and(
      eq(friendships.status, 'ACCEPTED'),
      or(
        eq(friendships.requesterId, user.id),
        eq(friendships.addresseeId, user.id)
      )
    ),
  });

  const friendIds = userFriendships.map(f =>
    f.requesterId === user.id ? f.addresseeId : f.requesterId
  );

  // Include current user in the leaderboard
  const allUserIds = [user.id, ...friendIds];

  if (allUserIds.length === 0) {
    return c.json({
      success: true,
      data: { leaderboard: [], currentUser: { rank: 1, totalValidations: 0, totalPoints: 0, maxDifficulty: null } },
    });
  }

  let dateFilter: Date | null = null;
  const now = new Date();

  switch (period) {
    case 'week':
      dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
  }

  const leaderboard = await db
    .select({
      userId: validations.userId,
      userName: users.name,
      userImage: users.image,
      totalValidations: sql<number>`count(*) filter (where ${validations.status} = 'VALIDE')`,
      totalFlashed: sql<number>`count(*) filter (where ${validations.isFlashed} = true)`,
    })
    .from(validations)
    .innerJoin(users, eq(validations.userId, users.id))
    .where(and(
      inArray(validations.userId, allUserIds),
      dateFilter ? gte(validations.validatedAt, dateFilter) : undefined
    ))
    .groupBy(validations.userId, users.name, users.image)
    .orderBy(desc(sql`count(*) filter (where ${validations.status} = 'VALIDE')`));

  // Calculate real points and max difficulty for all users
  const [pointsMap, maxDifficultyMap] = await Promise.all([
    calculateUserPoints(allUserIds, dateFilter),
    calculateMaxDifficulty(allUserIds, dateFilter),
  ]);

  // Sort by points
  const leaderboardWithPoints = leaderboard.map(entry => ({
    ...entry,
    totalPoints: pointsMap.get(entry.userId) || 0,
    maxDifficulty: maxDifficultyMap.get(entry.userId) || null,
  })).sort((a, b) => b.totalPoints - a.totalPoints);

  const userEntry = leaderboardWithPoints.find(e => e.userId === user.id);
  const userRank = leaderboardWithPoints.findIndex(e => e.userId === user.id) + 1;

  return c.json({
    success: true,
    data: {
      leaderboard: leaderboardWithPoints.map((entry, index) => ({
        rank: index + 1,
        userId: entry.userId,
        name: entry.userName,
        image: entry.userImage,
        totalValidations: Number(entry.totalValidations),
        totalFlashed: Number(entry.totalFlashed),
        totalPoints: entry.totalPoints,
        maxDifficulty: entry.maxDifficulty,
        isCurrentUser: entry.userId === user.id,
      })),
      currentUser: {
        rank: userRank || leaderboardWithPoints.length + 1,
        totalValidations: Number(userEntry?.totalValidations || 0),
        totalPoints: pointsMap.get(user.id) || 0,
        maxDifficulty: maxDifficultyMap.get(user.id) || null,
      },
    },
  });
});

// Calcule le facteur de difficulté d'une voie basé sur les stats communautaires
async function getRouteDifficultyFactors(): Promise<Map<string, number>> {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // Requête agrégée pour toutes les stats des voies
  const stats = await db
    .select({
      routeId: validations.routeId,
      validationCount: sql<number>`count(*)`,
      avgAttempts: sql<number>`avg(${validations.attempts})`,
      flashRate: sql<number>`sum(case when ${validations.isFlashed} = true then 1 else 0 end)::float / count(*)`,
    })
    .from(validations)
    .where(and(
      eq(validations.status, 'VALIDE'),
      gte(validations.validatedAt, sixMonthsAgo)
    ))
    .groupBy(validations.routeId);

  const factorsMap = new Map<string, number>();

  for (const stat of stats) {
    const validationCount = Number(stat.validationCount);
    const avgAttempts = Number(stat.avgAttempts);
    const flashRate = Number(stat.flashRate);

    // Si moins de 3 validations, facteur neutre
    if (validationCount < 3) {
      factorsMap.set(stat.routeId, 1.0);
      continue;
    }

    let difficultyFactor = 1.0;

    // Facteur basé sur le nombre de réussites (0.9 à 1.4)
    if (validationCount <= 2) {
      difficultyFactor *= 1.4;
    } else if (validationCount <= 5) {
      difficultyFactor *= 1.3;
    } else if (validationCount <= 10) {
      difficultyFactor *= 1.2;
    } else if (validationCount <= 20) {
      difficultyFactor *= 1.1;
    } else if (validationCount <= 30) {
      difficultyFactor *= 1.0;
    } else if (validationCount <= 50) {
      difficultyFactor *= 0.95;
    } else {
      difficultyFactor *= 0.9;
    }

    // Facteur basé sur le nombre moyen d'essais (0.95 à 1.3)
    if (avgAttempts >= 6) {
      difficultyFactor *= 1.3;
    } else if (avgAttempts >= 5) {
      difficultyFactor *= 1.2;
    } else if (avgAttempts >= 4) {
      difficultyFactor *= 1.1;
    } else if (avgAttempts >= 3) {
      difficultyFactor *= 1.0;
    } else {
      difficultyFactor *= 0.95;
    }

    // Facteur basé sur le taux de flash (0.9 à 1.2)
    if (flashRate <= 0.05) {
      difficultyFactor *= 1.2;
    } else if (flashRate <= 0.1) {
      difficultyFactor *= 1.15;
    } else if (flashRate <= 0.2) {
      difficultyFactor *= 1.1;
    } else if (flashRate <= 0.3) {
      difficultyFactor *= 1.0;
    } else if (flashRate <= 0.5) {
      difficultyFactor *= 0.95;
    } else {
      difficultyFactor *= 0.9;
    }

    // Limiter entre 0.8 et 2.0
    factorsMap.set(stat.routeId, Math.max(0.8, Math.min(2.0, difficultyFactor)));
  }

  return factorsMap;
}

// GET /api/leaderboard/user/:userId/details - Get user's validation details for points calculation
app.get('/user/:userId/details', requireAuth, async (c) => {
  const userId = c.req.param('userId');
  console.log('[leaderboard] GET /user/:userId/details - userId:', userId);

  // Get validations from last 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const userValidations = await db.query.validations.findMany({
    where: and(
      eq(validations.userId, userId),
      eq(validations.status, 'VALIDE'),
      gte(validations.validatedAt, sixMonthsAgo)
    ),
    with: {
      route: {
        columns: { id: true, name: true, difficulty: true, sector: true },
      },
    },
    orderBy: [desc(validations.validatedAt)],
  });

  // Get route difficulty factors
  const difficultyFactors = await getRouteDifficultyFactors();

  const validationDetails = userValidations.map((v) => {
    const basePoints = DIFFICULTY_POINTS[v.route?.difficulty || 'Vert'] || 10;
    const routeDifficultyFactor = difficultyFactors.get(v.routeId) || 1.0;
    const attemptsMultiplier = getAttemptsMultiplier(v.attempts || 1);
    const totalPoints = Math.round(basePoints * routeDifficultyFactor * attemptsMultiplier);

    return {
      routeId: v.routeId,
      routeName: v.route?.name || 'Unknown',
      difficulty: v.route?.difficulty || '?',
      sector: v.route?.sector || '?',
      attempts: v.attempts || 1,
      isFlashed: v.isFlashed || false,
      validatedAt: v.validatedAt?.toISOString() || new Date().toISOString(),
      basePoints,
      routeDifficultyFactor: Math.round(routeDifficultyFactor * 100) / 100,
      attemptsMultiplier: Math.round(attemptsMultiplier * 100) / 100,
      totalPoints,
    };
  });

  const totalPoints = validationDetails.reduce((sum, v) => sum + v.totalPoints, 0);

  return c.json({
    success: true,
    data: {
      totalPoints,
      validations: validationDetails,
    },
  });
});

export default app;
