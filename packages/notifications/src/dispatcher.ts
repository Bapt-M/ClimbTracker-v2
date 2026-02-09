import { sendEmail, isSendGridReady } from './sendgrid';
import { sendWebPush, isWebPushReady } from './web-push';
import { sendFCM, isFCMReady } from './fcm';
import type {
  NotificationType,
  NotificationPayload,
  NotificationPreferences,
  PushSubscriptionData,
  DispatchResult,
  SendResult,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from './types';

// User data needed for notifications
export interface NotificationUser {
  id: string;
  email: string;
  name: string;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  notificationPreferences?: NotificationPreferences | null;
}

// Database operations interface (to be provided by consumer)
export interface NotificationDatabase {
  getUserById(userId: string): Promise<NotificationUser | null>;
  getPushSubscriptions(userId: string): Promise<PushSubscriptionData[]>;
  deactivatePushSubscription(subscriptionId: string): Promise<void>;
  createInAppNotification(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    relatedUserId?: string;
    relatedRouteId?: string;
  }): Promise<void>;
}

let database: NotificationDatabase | null = null;
let appUrl = 'https://climbtracker.app';

/**
 * Initialize dispatcher with database operations
 */
export function initDispatcher(db: NotificationDatabase, url?: string): void {
  database = db;
  if (url) appUrl = url;
  console.log('[notifications] Dispatcher initialized');
}

/**
 * Map notification type to preference key
 */
function getPreferenceKey(type: NotificationType): keyof NotificationPreferences['email'] {
  const mapping: Record<NotificationType, keyof NotificationPreferences['email']> = {
    FRIEND_REQUEST: 'friendRequest',
    FRIEND_ACCEPTED: 'friendAccepted',
    ROUTE_VALIDATED: 'routeValidated',
    COMMENT_RECEIVED: 'commentReceived',
    ROUTE_CREATED: 'routeCreated',
    ACHIEVEMENT_UNLOCKED: 'achievementUnlocked',
    SYSTEM: 'system',
  };
  return mapping[type];
}

/**
 * Check if user wants this notification type via email
 */
function shouldSendEmail(
  user: NotificationUser,
  type: NotificationType,
  defaultPrefs: NotificationPreferences
): boolean {
  if (user.emailNotifications === false) return false;

  const prefs = user.notificationPreferences || defaultPrefs;
  const key = getPreferenceKey(type);
  return prefs.email[key] ?? defaultPrefs.email[key];
}

/**
 * Check if user wants this notification type via push
 */
function shouldSendPush(
  user: NotificationUser,
  type: NotificationType,
  defaultPrefs: NotificationPreferences
): boolean {
  if (user.pushNotifications === false) return false;

  const prefs = user.notificationPreferences || defaultPrefs;
  const key = getPreferenceKey(type);
  return prefs.push[key] ?? defaultPrefs.push[key];
}

/**
 * Send notification to a user through all enabled channels
 */
export async function notify(
  userId: string,
  type: NotificationType,
  payload: NotificationPayload,
  options?: {
    relatedUserId?: string;
    relatedRouteId?: string;
  }
): Promise<DispatchResult> {
  if (!database) {
    console.error('[notifications] Dispatcher not initialized');
    return {};
  }

  const result: DispatchResult = {};

  // Get user data
  const user = await database.getUserById(userId);
  if (!user) {
    console.warn(`[notifications] User ${userId} not found`);
    return result;
  }

  // Import default preferences
  const { DEFAULT_NOTIFICATION_PREFERENCES: defaultPrefs } = await import('./types');

  // Always create in-app notification
  try {
    await database.createInAppNotification({
      userId,
      type,
      title: payload.title,
      message: payload.body,
      link: payload.link,
      relatedUserId: options?.relatedUserId,
      relatedRouteId: options?.relatedRouteId,
    });
  } catch (error) {
    console.error('[notifications] Failed to create in-app notification:', error);
  }

  // Send email if enabled
  if (isSendGridReady() && shouldSendEmail(user, type, defaultPrefs)) {
    try {
      result.email = await sendEmail(user.email, {
        userName: user.name,
        title: payload.title,
        body: payload.body,
        actionUrl: payload.link ? `${appUrl}${payload.link}` : undefined,
        actionText: payload.link ? 'Voir sur ClimbTracker' : undefined,
      });
    } catch (error) {
      console.error('[notifications] Email send error:', error);
      result.email = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Send push notifications if enabled
  if (shouldSendPush(user, type, defaultPrefs)) {
    const subscriptions = await database.getPushSubscriptions(userId);

    // Separate web push and FCM subscriptions
    const webPushSubs = subscriptions.filter(
      (s) => s.platform === 'web' && s.endpoint && s.p256dh && s.auth && s.isActive
    );
    const fcmSubs = subscriptions.filter(
      (s) => (s.platform === 'ios' || s.platform === 'android') && s.fcmToken && s.isActive
    );

    // Send web push notifications
    if (isWebPushReady() && webPushSubs.length > 0) {
      const webPushResults: SendResult[] = [];

      for (const sub of webPushSubs) {
        const pushResult = await sendWebPush(
          {
            endpoint: sub.endpoint!,
            keys: { p256dh: sub.p256dh!, auth: sub.auth! },
          },
          payload
        );

        webPushResults.push(pushResult);

        // Deactivate expired subscriptions
        if (!pushResult.success && pushResult.error === 'subscription_expired') {
          await database.deactivatePushSubscription(sub.id);
        }
      }

      result.webPush = webPushResults;
    }

    // Send FCM notifications
    if (isFCMReady() && fcmSubs.length > 0) {
      const fcmResults: SendResult[] = [];

      for (const sub of fcmSubs) {
        const fcmResult = await sendFCM(sub.fcmToken!, payload);
        fcmResults.push(fcmResult);

        // Deactivate expired tokens
        if (!fcmResult.success && fcmResult.error === 'token_expired') {
          await database.deactivatePushSubscription(sub.id);
        }
      }

      result.fcm = fcmResults;
    }
  }

  return result;
}

/**
 * Send notification to multiple users
 */
export async function notifyMany(
  userIds: string[],
  type: NotificationType,
  payload: NotificationPayload,
  options?: {
    relatedUserId?: string;
    relatedRouteId?: string;
  }
): Promise<Map<string, DispatchResult>> {
  const results = new Map<string, DispatchResult>();

  // Process in parallel with concurrency limit
  const batchSize = 10;
  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((userId) => notify(userId, type, payload, options))
    );
    batch.forEach((userId, index) => {
      results.set(userId, batchResults[index]);
    });
  }

  return results;
}

/**
 * Send test notification to a user
 */
export async function sendTestNotification(
  userId: string,
  channel: 'email' | 'push' | 'all' = 'all'
): Promise<DispatchResult> {
  const payload: NotificationPayload = {
    title: 'Test de notification',
    body: 'Si tu vois ce message, les notifications fonctionnent correctement !',
    link: '/settings/notifications',
    icon: '/icon-192x192.png',
  };

  // For test, we bypass preferences
  if (!database) {
    return {};
  }

  const result: DispatchResult = {};
  const user = await database.getUserById(userId);
  if (!user) return result;

  // Send email test
  if ((channel === 'email' || channel === 'all') && isSendGridReady()) {
    result.email = await sendEmail(user.email, {
      userName: user.name,
      title: payload.title,
      body: payload.body,
      actionUrl: `${appUrl}/settings/notifications`,
      actionText: 'Voir les parametres',
    });
  }

  // Send push test
  if (channel === 'push' || channel === 'all') {
    const subscriptions = await database.getPushSubscriptions(userId);

    const webPushSubs = subscriptions.filter(
      (s) => s.platform === 'web' && s.endpoint && s.p256dh && s.auth && s.isActive
    );
    const fcmSubs = subscriptions.filter(
      (s) => (s.platform === 'ios' || s.platform === 'android') && s.fcmToken && s.isActive
    );

    if (isWebPushReady() && webPushSubs.length > 0) {
      result.webPush = await Promise.all(
        webPushSubs.map((sub) =>
          sendWebPush(
            {
              endpoint: sub.endpoint!,
              keys: { p256dh: sub.p256dh!, auth: sub.auth! },
            },
            payload
          )
        )
      );
    }

    if (isFCMReady() && fcmSubs.length > 0) {
      result.fcm = await Promise.all(
        fcmSubs.map((sub) => sendFCM(sub.fcmToken!, payload))
      );
    }
  }

  return result;
}
