import { Hono } from 'hono';
import { db } from '../lib/auth';
import { comments } from '@climbtracker/database/schema';
import { requireAuth } from '../middleware/auth';
import { eq, and, desc } from 'drizzle-orm';

const app = new Hono();

// GET /api/comments/route/:routeId - Get comments for a route
app.get('/route/:routeId', requireAuth, async (c) => {
  const routeId = c.req.param('routeId');
  const { limit = '20', page = '1' } = c.req.query();

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  const routeComments = await db.query.comments.findMany({
    where: eq(comments.routeId, routeId),
    with: {
      user: {
        columns: { id: true, name: true, image: true },
      },
    },
    orderBy: [desc(comments.createdAt)],
    limit: limitNum,
    offset,
  });

  return c.json({ success: true, data: { comments: routeComments } });
});

// POST /api/comments - Create comment
app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();

  const [newComment] = await db.insert(comments).values({
    id: crypto.randomUUID(),
    content: body.content,
    routeId: body.routeId,
    userId: user.id,
    mediaUrl: body.mediaUrl,
    mediaType: body.mediaType,
  }).returning();

  // Fetch with user info
  const commentWithUser = await db.query.comments.findFirst({
    where: eq(comments.id, newComment.id),
    with: {
      user: {
        columns: { id: true, name: true, image: true },
      },
    },
  });

  return c.json({ success: true, data: { comment: commentWithUser } }, 201);
});

// PUT /api/comments/:id - Update comment
app.put('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const body = await c.req.json();

  // Verify ownership
  const existing = await db.query.comments.findFirst({
    where: and(eq(comments.id, id), eq(comments.userId, user.id)),
  });

  if (!existing) {
    return c.json({ success: false, error: 'Comment not found' }, 404);
  }

  const [updated] = await db.update(comments)
    .set({
      content: body.content,
      mediaUrl: body.mediaUrl,
      mediaType: body.mediaType,
    })
    .where(eq(comments.id, id))
    .returning();

  return c.json({ success: true, data: { comment: updated } });
});

// DELETE /api/comments/:id - Delete comment
app.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  // Verify ownership (or admin)
  const existing = await db.query.comments.findFirst({
    where: eq(comments.id, id),
  });

  if (!existing) {
    return c.json({ success: false, error: 'Comment not found' }, 404);
  }

  if (existing.userId !== user.id && user.role !== 'ADMIN') {
    return c.json({ success: false, error: 'Forbidden' }, 403);
  }

  await db.delete(comments).where(eq(comments.id, id));

  return c.json({ success: true, message: 'Comment deleted' });
});

export default app;
