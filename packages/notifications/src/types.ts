// Notification types matching the database enum
export type NotificationType =
  | 'FRIEND_REQUEST'
  | 'FRIEND_ACCEPTED'
  | 'ROUTE_VALIDATED'
  | 'COMMENT_RECEIVED'
  | 'ROUTE_CREATED'
  | 'ACHIEVEMENT_UNLOCKED'
  | 'SYSTEM';

// Platform types for push subscriptions
export type Platform = 'web' | 'ios' | 'android';

// Web Push subscription (from browser)
export interface WebPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// Push subscription stored in database
export interface PushSubscriptionData {
  id: string;
  userId: string;
  endpoint?: string | null;
  p256dh?: string | null;
  auth?: string | null;
  fcmToken?: string | null;
  platform: Platform;
  deviceName?: string | null;
  isActive: boolean;
}

// Notification payload
export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  link?: string;
  data?: Record<string, unknown>;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

// User notification preferences
export interface NotificationPreferences {
  email: {
    friendRequest: boolean;
    friendAccepted: boolean;
    routeValidated: boolean;
    commentReceived: boolean;
    routeCreated: boolean;
    achievementUnlocked: boolean;
    system: boolean;
  };
  push: {
    friendRequest: boolean;
    friendAccepted: boolean;
    routeValidated: boolean;
    commentReceived: boolean;
    routeCreated: boolean;
    achievementUnlocked: boolean;
    system: boolean;
  };
}

// Default notification preferences
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
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

// Notification context for dispatcher
export interface NotificationContext {
  userId: string;
  type: NotificationType;
  payload: NotificationPayload;
  // Optional related data
  relatedUserId?: string;
  relatedRouteId?: string;
}

// Email template data
export interface EmailTemplateData {
  userName: string;
  title: string;
  body: string;
  actionUrl?: string;
  actionText?: string;
}

// SendGrid configuration
export interface SendGridConfig {
  apiKey: string;
  fromEmail: string;
  fromName?: string;
}

// Web Push configuration (VAPID)
export interface WebPushConfig {
  publicKey: string;
  privateKey: string;
  subject: string; // mailto: or https:// URL
}

// Firebase Cloud Messaging configuration
export interface FCMConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

// Result types
export interface SendResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

export interface DispatchResult {
  email?: SendResult;
  webPush?: SendResult[];
  fcm?: SendResult[];
}
