import { env } from '../env';
import { db } from './auth';
import { users, notifications, pushSubscriptions } from '@climbtracker/database/schema';
import { eq } from 'drizzle-orm';
import {
  initSendGrid,
  initWebPush,
  initFCM,
  initDispatcher,
  notify,
  notifyMany,
  type NotificationDatabase,
  type NotificationType,
  type NotificationPayload,
} from '@climbtracker/notifications';

/**
 * Initialize all notification services
 */
export function initializeNotifications(): void {
  // Initialize SendGrid if configured
  if (env.SENDGRID_API_KEY) {
    initSendGrid({
      apiKey: env.SENDGRID_API_KEY,
      fromEmail: env.SENDGRID_FROM_EMAIL,
      fromName: 'ClimbTracker',
    });
  } else {
    console.log('[notifications] SendGrid not configured - email notifications disabled');
  }

  // Initialize Web Push if configured
  if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
    initWebPush({
      publicKey: env.VAPID_PUBLIC_KEY,
      privateKey: env.VAPID_PRIVATE_KEY,
      subject: env.VAPID_SUBJECT,
    });
  } else {
    console.log('[notifications] VAPID keys not configured - web push disabled');
  }

  // Initialize FCM if configured
  if (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
    initFCM({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY,
    });
  } else {
    console.log('[notifications] Firebase not configured - FCM push disabled');
  }

  // Initialize dispatcher with database operations
  const database: NotificationDatabase = {
    async getUserById(userId) {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          id: true,
          email: true,
          name: true,
          emailNotifications: true,
          pushNotifications: true,
          notificationPreferences: true,
        },
      });

      if (!user) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        emailNotifications: user.emailNotifications,
        pushNotifications: user.pushNotifications,
        notificationPreferences: user.notificationPreferences as any,
      };
    },

    async getPushSubscriptions(userId) {
      const subs = await db.query.pushSubscriptions.findMany({
        where: eq(pushSubscriptions.userId, userId),
      });

      return subs.map((s) => ({
        id: s.id,
        userId: s.userId,
        endpoint: s.endpoint,
        p256dh: s.p256dh,
        auth: s.auth,
        fcmToken: s.fcmToken,
        platform: s.platform,
        deviceName: s.deviceName,
        isActive: s.isActive,
      }));
    },

    async deactivatePushSubscription(subscriptionId) {
      await db
        .update(pushSubscriptions)
        .set({ isActive: false })
        .where(eq(pushSubscriptions.id, subscriptionId));
    },

    async createInAppNotification(data) {
      await db.insert(notifications).values({
        id: crypto.randomUUID(),
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link,
        relatedUserId: data.relatedUserId,
        relatedRouteId: data.relatedRouteId,
        read: false,
      });
    },
  };

  initDispatcher(database, env.FRONTEND_URL);
}

// Re-export for use in routes
export { notify, notifyMany };
export type { NotificationType, NotificationPayload };
