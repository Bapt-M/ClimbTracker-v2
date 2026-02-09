import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface PushSubscriptionState {
  isSupported: boolean;
  permission: NotificationPermission | 'unsupported';
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
}

export function usePushNotifications() {
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState<PushSubscriptionState>({
    isSupported: false,
    permission: 'unsupported',
    isSubscribed: false,
    isLoading: true,
    error: null,
  });

  // Check if push notifications are supported
  const checkSupport = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }, []);

  // Get current permission status
  const getPermission = useCallback((): NotificationPermission | 'unsupported' => {
    if (!checkSupport()) return 'unsupported';
    return Notification.permission;
  }, [checkSupport]);

  // Check if already subscribed
  const checkSubscription = useCallback(async (): Promise<boolean> => {
    if (!checkSupport()) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      return !!subscription;
    } catch {
      return false;
    }
  }, [checkSupport]);

  // Get VAPID public key from server
  const getVapidKey = async (): Promise<string | null> => {
    try {
      const response = await fetch(`${API_URL}/api/push-subscriptions/vapid-key`);
      const data = await response.json();
      return data.success ? data.data.vapidPublicKey : null;
    } catch {
      return null;
    }
  };

  // Convert VAPID key to Uint8Array
  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Request permission and subscribe
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!checkSupport()) {
      setState((s) => ({ ...s, error: 'Push notifications non supportees' }));
      return false;
    }

    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      // Request permission
      const permission = await Notification.requestPermission();
      setState((s) => ({ ...s, permission }));

      if (permission !== 'granted') {
        setState((s) => ({
          ...s,
          isLoading: false,
          error: 'Permission refusee',
        }));
        return false;
      }

      // Get VAPID key
      const vapidKey = await getVapidKey();
      if (!vapidKey) {
        setState((s) => ({
          ...s,
          isLoading: false,
          error: 'Service push non configure',
        }));
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      // Send subscription to server
      const response = await fetch(`${API_URL}/api/push-subscriptions`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: btoa(
              String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))
            ),
            auth: btoa(
              String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!))
            ),
          },
          platform: 'web',
          deviceName: getDeviceName(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }

      setState((s) => ({
        ...s,
        isSubscribed: true,
        isLoading: false,
        error: null,
      }));

      return true;
    } catch (error) {
      console.error('[push] Subscribe error:', error);
      setState((s) => ({
        ...s,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      }));
      return false;
    }
  }, [checkSupport]);

  // Unsubscribe
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!checkSupport()) return false;

    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      // Also tell server to remove subscription
      // Note: We don't have the subscription ID here, server should handle by endpoint

      setState((s) => ({
        ...s,
        isSubscribed: false,
        isLoading: false,
        error: null,
      }));

      return true;
    } catch (error) {
      console.error('[push] Unsubscribe error:', error);
      setState((s) => ({
        ...s,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      }));
      return false;
    }
  }, [checkSupport]);

  // Send test notification
  const sendTest = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/api/push-subscriptions/test`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: 'push' }),
      });

      return response.ok;
    } catch {
      return false;
    }
  }, []);

  // Get device name for subscription
  const getDeviceName = (): string => {
    const ua = navigator.userAgent;
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    return 'Navigateur Web';
  };

  // Initialize state on mount
  useEffect(() => {
    const init = async () => {
      const isSupported = checkSupport();
      const permission = getPermission();
      const isSubscribed = await checkSubscription();

      setState({
        isSupported,
        permission,
        isSubscribed,
        isLoading: false,
        error: null,
      });
    };

    if (isAuthenticated) {
      init();
    } else {
      setState({
        isSupported: checkSupport(),
        permission: getPermission(),
        isSubscribed: false,
        isLoading: false,
        error: null,
      });
    }
  }, [isAuthenticated, checkSupport, getPermission, checkSubscription]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    sendTest,
  };
}
