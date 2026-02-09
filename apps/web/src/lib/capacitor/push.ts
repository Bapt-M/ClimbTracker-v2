import { PushNotifications, type Token, type PushNotificationSchema, type ActionPerformed } from '@capacitor/push-notifications';
import { isNative, getPlatform } from './platform';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type NotificationHandler = (notification: PushNotificationSchema) => void;
type TokenHandler = (token: string) => void;

let onNotificationReceived: NotificationHandler | null = null;
let onNotificationTapped: NotificationHandler | null = null;
let onTokenReceived: TokenHandler | null = null;

/**
 * Initialize push notifications for native platforms
 */
export async function initPushNotifications(): Promise<boolean> {
  if (!isNative()) {
    console.log('[push] Not a native platform, skipping FCM init');
    return false;
  }

  try {
    // Check current permission status
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      // Request permission
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.log('[push] Permission not granted');
      return false;
    }

    // Register with FCM
    await PushNotifications.register();

    // Set up listeners
    setupListeners();

    console.log('[push] FCM initialized successfully');
    return true;
  } catch (error) {
    console.error('[push] Failed to initialize:', error);
    return false;
  }
}

/**
 * Set up push notification event listeners
 */
function setupListeners(): void {
  // Registration success - got FCM token
  PushNotifications.addListener('registration', async (token: Token) => {
    console.log('[push] FCM Token:', token.value);

    // Send token to backend
    await registerTokenWithBackend(token.value);

    if (onTokenReceived) {
      onTokenReceived(token.value);
    }
  });

  // Registration error
  PushNotifications.addListener('registrationError', (error) => {
    console.error('[push] Registration error:', error);
  });

  // Notification received while app is in foreground
  PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
    console.log('[push] Notification received:', notification);

    if (onNotificationReceived) {
      onNotificationReceived(notification);
    }
  });

  // User tapped on notification
  PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
    console.log('[push] Notification tapped:', action);

    if (onNotificationTapped) {
      onNotificationTapped(action.notification);
    }

    // Handle navigation based on notification data
    const data = action.notification.data;
    if (data?.url || data?.link) {
      const url = data.url || data.link;
      // Navigate to the URL (handled by the app)
      window.location.href = url;
    }
  });
}

/**
 * Register FCM token with backend
 */
async function registerTokenWithBackend(token: string): Promise<void> {
  try {
    const platform = getPlatform();
    const deviceName = platform === 'ios' ? 'iPhone' : 'Android';

    const response = await fetch(`${API_URL}/api/push-subscriptions`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fcmToken: token,
        platform,
        deviceName,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to register token');
    }

    console.log('[push] Token registered with backend');
  } catch (error) {
    console.error('[push] Failed to register token with backend:', error);
  }
}

/**
 * Get list of delivered notifications (iOS only)
 */
export async function getDeliveredNotifications(): Promise<PushNotificationSchema[]> {
  if (!isNative()) return [];

  try {
    const result = await PushNotifications.getDeliveredNotifications();
    return result.notifications;
  } catch {
    return [];
  }
}

/**
 * Remove all delivered notifications
 */
export async function removeAllDeliveredNotifications(): Promise<void> {
  if (!isNative()) return;

  try {
    await PushNotifications.removeAllDeliveredNotifications();
  } catch (error) {
    console.error('[push] Failed to remove notifications:', error);
  }
}

/**
 * Set handler for when notification is received in foreground
 */
export function setOnNotificationReceived(handler: NotificationHandler): void {
  onNotificationReceived = handler;
}

/**
 * Set handler for when notification is tapped
 */
export function setOnNotificationTapped(handler: NotificationHandler): void {
  onNotificationTapped = handler;
}

/**
 * Set handler for when FCM token is received
 */
export function setOnTokenReceived(handler: TokenHandler): void {
  onTokenReceived = handler;
}

/**
 * Unregister from push notifications
 */
export async function unregisterPush(): Promise<void> {
  if (!isNative()) return;

  try {
    await PushNotifications.removeAllListeners();
    console.log('[push] Unregistered from push notifications');
  } catch (error) {
    console.error('[push] Failed to unregister:', error);
  }
}
