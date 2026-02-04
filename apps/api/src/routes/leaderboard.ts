import { Hono } from 'hono';
import { db } from '../lib/auth';
import { validations, users, routes, friendships } from '@climbtracker/database/schema';
import { requireAuth } from '../middleware/auth';
import { eq, and, or, desc, sql, gte } from 'drizzle-orm';

const app = new Hono();

// GET /api/leaderboard - Get global leaderboard
app.get('/', requireAuth, async (c) => {
  const { period = 'all', limit = '20' } = c.req.query();
  const user = c.get('user');

  let dateFilter;
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
    default:
      dateFilter = null;
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

  // Get current user's rank
  const userRankQuery = await db
    .select({
      totalValidations: sql<number>`count(*) filter (where ${validations.status} = 'VALIDE')`,
    })
    .from(validations)
    .where(and(
      eq(validations.userId, user.id),
      dateFilter ? gte(validations.validatedAt, dateFilter) : undefined
    ));

  const userValidations = Number(userRankQuery[0]?.totalValidations || 0);

  // Calculate user's rank
  const higherRankedCount = await db
    .select({
      count: sql<number>`count(distinct ${validations.userId})`,
    })
    .from(validations)
    .where(dateFilter ? gte(validations.validatedAt, dateFilter) : undefined)
    .having(sql`count(*) filter (where ${validations.status} = 'VALIDE') > ${userValidations}`);

  const userRank = Number(higherRankedCount[0]?.count || 0) + 1;

  return c.json({
    success: true,
    data: {
      leaderboard: leaderboard.map((entry, index) => ({
        rank: index + 1,
        userId: entry.userId,
        name: entry.userName,
        image: entry.userImage,
        totalValidations: Number(entry.totalValidations),
        totalFlashed: Number(entry.totalFlashed),
      })),
      currentUser: {
        rank: userRank,
        totalValidations: userValidations,
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
      data: { leaderboard: [], currentUser: { rank: 1, totalValidations: 0 } },
    });
  }

  let dateFilter;
  const now = new Date();

  switch (period) {
    case 'week':
      dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      dateFilter = null;
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
      sql`${validations.userId} = ANY(${allUserIds})`,
      dateFilter ? gte(validations.validatedAt, dateFilter) : undefined
    ))
    .groupBy(validations.userId, users.name, users.image)
    .orderBy(desc(sql`count(*) filter (where ${validations.status} = 'VALIDE')`));

  const userEntry = leaderboard.find(e => e.userId === user.id);
  const userRank = leaderboard.findIndex(e => e.userId === user.id) + 1;

  return c.json({
    success: true,
    data: {
      leaderboard: leaderboard.map((entry, index) => ({
        rank: index + 1,
        userId: entry.userId,
        name: entry.userName,
        image: entry.userImage,
        totalValidations: Number(entry.totalValidations),
        totalFlashed: Number(entry.totalFlashed),
        isCurrentUser: entry.userId === user.id,
      })),
      currentUser: {
        rank: userRank || leaderboard.length + 1,
        totalValidations: Number(userEntry?.totalValidations || 0),
      },
    },
  });
});

export default app;
