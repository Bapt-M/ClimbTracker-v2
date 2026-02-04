import { Hono } from 'hono';
import { db } from '../lib/auth';
import { friendships, users } from '@climbtracker/database/schema';
import { requireAuth } from '../middleware/auth';
import { eq, and, or, desc, ne } from 'drizzle-orm';

const app = new Hono();

// GET /api/friendships - Get current user's friends
app.get('/', requireAuth, async (c) => {
  const user = c.get('user');

  // Get accepted friendships where user is either requester or addressee
  const userFriendships = await db.query.friendships.findMany({
    where: and(
      eq(friendships.status, 'ACCEPTED'),
      or(
        eq(friendships.requesterId, user.id),
        eq(friendships.addresseeId, user.id)
      )
    ),
    with: {
      requester: {
        columns: { id: true, name: true, image: true },
      },
      addressee: {
        columns: { id: true, name: true, image: true },
      },
    },
  });

  // Extract friend info (the other person in the friendship)
  const friends = userFriendships.map(f => ({
    friendshipId: f.id,
    friend: f.requesterId === user.id ? f.addressee : f.requester,
    acceptedAt: f.acceptedAt,
  }));

  return c.json({ success: true, data: { friends } });
});

// GET /api/friendships/pending - Get pending friend requests
app.get('/pending', requireAuth, async (c) => {
  const user = c.get('user');

  // Requests received (where user is addressee)
  const received = await db.query.friendships.findMany({
    where: and(
      eq(friendships.addresseeId, user.id),
      eq(friendships.status, 'PENDING')
    ),
    with: {
      requester: {
        columns: { id: true, name: true, image: true },
      },
    },
    orderBy: [desc(friendships.createdAt)],
  });

  // Requests sent (where user is requester)
  const sent = await db.query.friendships.findMany({
    where: and(
      eq(friendships.requesterId, user.id),
      eq(friendships.status, 'PENDING')
    ),
    with: {
      addressee: {
        columns: { id: true, name: true, image: true },
      },
    },
    orderBy: [desc(friendships.createdAt)],
  });

  return c.json({
    success: true,
    data: {
      received: received.map(r => ({
        id: r.id,
        user: r.requester,
        createdAt: r.createdAt,
      })),
      sent: sent.map(s => ({
        id: s.id,
        user: s.addressee,
        createdAt: s.createdAt,
      })),
    },
  });
});

// POST /api/friendships - Send friend request
app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const { userId } = await c.req.json();

  if (userId === user.id) {
    return c.json({ success: false, error: 'Cannot send friend request to yourself' }, 400);
  }

  // Check if friendship already exists (in either direction)
  const existing = await db.query.friendships.findFirst({
    where: or(
      and(eq(friendships.requesterId, user.id), eq(friendships.addresseeId, userId)),
      and(eq(friendships.requesterId, userId), eq(friendships.addresseeId, user.id))
    ),
  });

  if (existing) {
    if (existing.status === 'ACCEPTED') {
      return c.json({ success: false, error: 'Already friends' }, 400);
    }
    if (existing.status === 'PENDING') {
      return c.json({ success: false, error: 'Friend request already pending' }, 400);
    }
  }

  const [newFriendship] = await db.insert(friendships).values({
    id: crypto.randomUUID(),
    requesterId: user.id,
    addresseeId: userId,
    status: 'PENDING',
  }).returning();

  return c.json({ success: true, data: { friendship: newFriendship } }, 201);
});

// PUT /api/friendships/:id/accept - Accept friend request
app.put('/:id/accept', requireAuth, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const friendship = await db.query.friendships.findFirst({
    where: and(
      eq(friendships.id, id),
      eq(friendships.addresseeId, user.id),
      eq(friendships.status, 'PENDING')
    ),
  });

  if (!friendship) {
    return c.json({ success: false, error: 'Friend request not found' }, 404);
  }

  const [updated] = await db.update(friendships)
    .set({
      status: 'ACCEPTED',
      acceptedAt: new Date(),
    })
    .where(eq(friendships.id, id))
    .returning();

  return c.json({ success: true, data: { friendship: updated } });
});

// PUT /api/friendships/:id/reject - Reject friend request
app.put('/:id/reject', requireAuth, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const friendship = await db.query.friendships.findFirst({
    where: and(
      eq(friendships.id, id),
      eq(friendships.addresseeId, user.id),
      eq(friendships.status, 'PENDING')
    ),
  });

  if (!friendship) {
    return c.json({ success: false, error: 'Friend request not found' }, 404);
  }

  const [updated] = await db.update(friendships)
    .set({ status: 'REJECTED' })
    .where(eq(friendships.id, id))
    .returning();

  return c.json({ success: true, data: { friendship: updated } });
});

// DELETE /api/friendships/:id - Remove friend or cancel request
app.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const friendship = await db.query.friendships.findFirst({
    where: and(
      eq(friendships.id, id),
      or(
        eq(friendships.requesterId, user.id),
        eq(friendships.addresseeId, user.id)
      )
    ),
  });

  if (!friendship) {
    return c.json({ success: false, error: 'Friendship not found' }, 404);
  }

  await db.delete(friendships).where(eq(friendships.id, id));

  return c.json({ success: true, message: 'Friendship removed' });
});

export default app;
