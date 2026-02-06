import { Hono } from 'hono';
import { db } from '../lib/auth';
import { notifications, users } from '@climbtracker/database/schema';
import { requireAuth } from '../middleware/auth';
import { eq, desc, and, sql } from 'drizzle-orm';

const app = new Hono();

// GET /api/notifications - Get current user's notifications
app.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const { limit = '20', unreadOnly = 'false' } = c.req.query();

  const conditions = [eq(notifications.userId, user.id)];
  if (unreadOnly === 'true') {
    conditions.push(eq(notifications.read, false));
  }

  const userNotifications = await db.query.notifications.findMany({
    where: and(...conditions),
    with: {
      relatedUser: {
        columns: { id: true, name: true, image: true },
      },
    },
    orderBy: [desc(notifications.createdAt)],
    limit: parseInt(limit),
  });

  return c.json({
    success: true,
    data: {
      notifications: userNotifications,
    },
  });
});

// GET /api/notifications/unread-count - Get unread count
app.get('/unread-count', requireAuth, async (c) => {
  const user = c.get('user');

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(
      eq(notifications.userId, user.id),
      eq(notifications.read, false)
    ));

  return c.json({
    success: true,
    data: {
      count: Number(result[0]?.count || 0),
    },
  });
});

// PUT /api/notifications/:id/read - Mark notification as read
app.put('/:id/read', requireAuth, async (c) => {
  const user = c.get('user');
  const notificationId = c.req.param('id');

  const [updated] = await db.update(notifications)
    .set({ read: true })
    .where(and(
      eq(notifications.id, notificationId),
      eq(notifications.userId, user.id)
    ))
    .returning();

  if (!updated) {
    return c.json({ success: false, error: 'Notification not found' }, 404);
  }

  return c.json({ success: true, data: { notification: updated } });
});

// PUT /api/notifications/read-all - Mark all notifications as read
app.put('/read-all', requireAuth, async (c) => {
  const user = c.get('user');

  await db.update(notifications)
    .set({ read: true })
    .where(eq(notifications.userId, user.id));

  return c.json({ success: true });
});

// DELETE /api/notifications/:id - Delete a notification
app.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const notificationId = c.req.param('id');

  await db.delete(notifications)
    .where(and(
      eq(notifications.id, notificationId),
      eq(notifications.userId, user.id)
    ));

  return c.json({ success: true });
});

// Helper function to create notifications (used by other routes)
export async function createNotification(data: {
  userId: string;
  type: 'FRIEND_REQUEST' | 'FRIEND_ACCEPTED' | 'ROUTE_VALIDATED' | 'COMMENT_RECEIVED' | 'ROUTE_CREATED' | 'ACHIEVEMENT_UNLOCKED' | 'SYSTEM';
  title: string;
  message: string;
  link?: string;
  relatedUserId?: string;
  relatedRouteId?: string;
}) {
  try {
    const [notification] = await db.insert(notifications)
      .values({
        id: crypto.randomUUID(),
        ...data,
      })
      .returning();
    return notification;
  } catch (error) {
    console.error('[notifications] Failed to create notification:', error);
    return null;
  }
}

// Pre-defined notification creators
export const notify = {
  friendRequest: (toUserId: string, fromUser: { id: string; name: string }) =>
    createNotification({
      userId: toUserId,
      type: 'FRIEND_REQUEST',
      title: 'Nouvelle demande d\'ami',
      message: `${fromUser.name} veut devenir votre ami`,
      link: '/friends',
      relatedUserId: fromUser.id,
    }),

  friendAccepted: (toUserId: string, byUser: { id: string; name: string }) =>
    createNotification({
      userId: toUserId,
      type: 'FRIEND_ACCEPTED',
      title: 'Demande acceptee',
      message: `${byUser.name} a accepte votre demande d'ami`,
      link: `/users/${byUser.id}`,
      relatedUserId: byUser.id,
    }),

  routeValidated: (toUserId: string, route: { id: string; name: string }, byUser: { id: string; name: string }) =>
    createNotification({
      userId: toUserId,
      type: 'ROUTE_VALIDATED',
      title: 'Voie validee',
      message: `${byUser.name} a valide ${route.name}`,
      link: `/routes/${route.id}`,
      relatedUserId: byUser.id,
      relatedRouteId: route.id,
    }),

  commentReceived: (toUserId: string, route: { id: string; name: string }, fromUser: { id: string; name: string }) =>
    createNotification({
      userId: toUserId,
      type: 'COMMENT_RECEIVED',
      title: 'Nouveau commentaire',
      message: `${fromUser.name} a commente sur ${route.name}`,
      link: `/routes/${route.id}`,
      relatedUserId: fromUser.id,
      relatedRouteId: route.id,
    }),

  routeCreated: (toUserId: string, route: { id: string; name: string; difficulty: string }) =>
    createNotification({
      userId: toUserId,
      type: 'ROUTE_CREATED',
      title: 'Nouvelle voie',
      message: `Une nouvelle voie ${route.difficulty} a ete ouverte: ${route.name}`,
      link: `/routes/${route.id}`,
      relatedRouteId: route.id,
    }),

  achievement: (toUserId: string, achievement: string, description: string) =>
    createNotification({
      userId: toUserId,
      type: 'ACHIEVEMENT_UNLOCKED',
      title: 'Succes debloque!',
      message: `${achievement}: ${description}`,
      link: '/profile',
    }),

  system: (toUserId: string, title: string, message: string, link?: string) =>
    createNotification({
      userId: toUserId,
      type: 'SYSTEM',
      title,
      message,
      link,
    }),
};

export default app;
