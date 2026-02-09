import * as admin from 'firebase-admin';
import type { FCMConfig, NotificationPayload, SendResult } from './types';

let isInitialized = false;

/**
 * Initialize Firebase Admin SDK for FCM
 */
export function initFCM(config: FCMConfig): void {
  // Check if already initialized
  if (admin.apps.length > 0) {
    isInitialized = true;
    console.log('[notifications] Firebase already initialized');
    return;
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: config.projectId,
      clientEmail: config.clientEmail,
      privateKey: config.privateKey.replace(/\\n/g, '\n'),
    }),
  });

  isInitialized = true;
  console.log('[notifications] Firebase Admin initialized');
}

/**
 * Check if FCM is initialized
 */
export function isFCMReady(): boolean {
  return isInitialized;
}

/**
 * Send a push notification via FCM
 */
export async function sendFCM(
  token: string,
  payload: NotificationPayload
): Promise<SendResult> {
  if (!isInitialized) {
    return { success: false, error: 'FCM not initialized' };
  }

  const message: admin.messaging.Message = {
    token,
    notification: {
      title: payload.title,
      body: payload.body,
      imageUrl: payload.image,
    },
    data: {
      link: payload.link || '/',
      ...(payload.data as Record<string, string> || {}),
    },
    android: {
      notification: {
        icon: 'ic_notification',
        color: '#F472B6',
        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        channelId: 'climbtracker_default',
      },
      priority: 'high',
    },
    apns: {
      payload: {
        aps: {
          badge: 1,
          sound: 'default',
          category: 'CLIMBTRACKER_NOTIFICATION',
        },
      },
    },
  };

  try {
    const messageId = await admin.messaging().send(message);
    return { success: true, messageId };
  } catch (error) {
    // Handle specific FCM errors
    if (error instanceof Error) {
      const errorCode = (error as admin.FirebaseError).code;

      // Token is invalid or expired
      if (
        errorCode === 'messaging/invalid-registration-token' ||
        errorCode === 'messaging/registration-token-not-registered'
      ) {
        return {
          success: false,
          error: 'token_expired',
        };
      }
    }

    console.error('[notifications] FCM error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send FCM notification to multiple tokens
 */
export async function sendFCMBatch(
  tokens: string[],
  payload: NotificationPayload
): Promise<SendResult[]> {
  if (!isInitialized) {
    return tokens.map(() => ({ success: false, error: 'FCM not initialized' }));
  }

  if (tokens.length === 0) {
    return [];
  }

  const message: admin.messaging.MulticastMessage = {
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
      imageUrl: payload.image,
    },
    data: {
      link: payload.link || '/',
      ...(payload.data as Record<string, string> || {}),
    },
    android: {
      notification: {
        icon: 'ic_notification',
        color: '#F472B6',
        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        channelId: 'climbtracker_default',
      },
      priority: 'high',
    },
    apns: {
      payload: {
        aps: {
          badge: 1,
          sound: 'default',
          category: 'CLIMBTRACKER_NOTIFICATION',
        },
      },
    },
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);

    return response.responses.map((res, index) => {
      if (res.success) {
        return { success: true, messageId: res.messageId };
      }

      const error = res.error;
      if (
        error?.code === 'messaging/invalid-registration-token' ||
        error?.code === 'messaging/registration-token-not-registered'
      ) {
        return { success: false, error: 'token_expired' };
      }

      return {
        success: false,
        error: error?.message || 'Unknown error',
      };
    });
  } catch (error) {
    console.error('[notifications] FCM batch error:', error);
    return tokens.map(() => ({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }));
  }
}

/**
 * Verify FCM token is valid
 */
export async function verifyFCMToken(token: string): Promise<boolean> {
  if (!isInitialized) {
    return false;
  }

  try {
    // Send a dry run message to verify token
    await admin.messaging().send(
      {
        token,
        notification: {
          title: 'Test',
          body: 'Test',
        },
      },
      true // dry run
    );
    return true;
  } catch {
    return false;
  }
}
