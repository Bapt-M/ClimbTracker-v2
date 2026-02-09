import webPush from 'web-push';
import type { WebPushConfig, WebPushSubscription, NotificationPayload, SendResult } from './types';

let isInitialized = false;
let vapidPublicKey = '';

/**
 * Initialize Web Push with VAPID keys
 */
export function initWebPush(config: WebPushConfig): void {
  webPush.setVapidDetails(
    config.subject,
    config.publicKey,
    config.privateKey
  );
  vapidPublicKey = config.publicKey;
  isInitialized = true;
  console.log('[notifications] Web Push initialized');
}

/**
 * Check if Web Push is initialized
 */
export function isWebPushReady(): boolean {
  return isInitialized;
}

/**
 * Get VAPID public key for client subscription
 */
export function getVapidPublicKey(): string {
  return vapidPublicKey;
}

/**
 * Send a web push notification
 */
export async function sendWebPush(
  subscription: WebPushSubscription,
  payload: NotificationPayload
): Promise<SendResult> {
  if (!isInitialized) {
    return { success: false, error: 'Web Push not initialized' };
  }

  const pushPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/icon-192x192.png',
    badge: payload.badge || '/badge-72x72.png',
    image: payload.image,
    data: {
      url: payload.link || '/',
      ...payload.data,
    },
    actions: payload.actions,
  });

  try {
    const result = await webPush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
      pushPayload,
      {
        TTL: 60 * 60 * 24, // 24 hours
        urgency: 'normal',
      }
    );

    return {
      success: true,
      messageId: result.headers?.['x-mid'] as string | undefined,
    };
  } catch (error) {
    // Handle specific web-push errors
    if (error instanceof webPush.WebPushError) {
      const statusCode = error.statusCode;

      // 404 or 410 means subscription is invalid
      if (statusCode === 404 || statusCode === 410) {
        return {
          success: false,
          error: 'subscription_expired',
        };
      }
    }

    console.error('[notifications] Web Push error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send web push to multiple subscriptions
 */
export async function sendWebPushBatch(
  subscriptions: WebPushSubscription[],
  payload: NotificationPayload
): Promise<SendResult[]> {
  const results = await Promise.all(
    subscriptions.map((sub) => sendWebPush(sub, payload))
  );
  return results;
}

/**
 * Generate VAPID keys (utility function for setup)
 */
export function generateVapidKeys(): { publicKey: string; privateKey: string } {
  return webPush.generateVAPIDKeys();
}
