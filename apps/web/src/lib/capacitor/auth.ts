import { Browser } from '@capacitor/browser';
import { App, type URLOpenListenerEvent } from '@capacitor/app';
import { isNative, isIOS, isAndroid } from './platform';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const APP_SCHEME = 'climbtracker';

type DeepLinkHandler = (url: string) => void;
let deepLinkHandler: DeepLinkHandler | null = null;

/**
 * Initialize deep link handling for OAuth callbacks
 */
export function initDeepLinks(handler: DeepLinkHandler): void {
  if (!isNative()) {
    console.log('[auth] Not native platform, skipping deep link init');
    return;
  }

  deepLinkHandler = handler;

  // Listen for app URL open events
  App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
    console.log('[auth] Deep link received:', event.url);

    if (deepLinkHandler) {
      deepLinkHandler(event.url);
    }

    // Handle auth callback
    if (event.url.includes('/auth/callback')) {
      handleAuthCallback(event.url);
    }
  });

  console.log('[auth] Deep link listener initialized');
}

/**
 * Handle OAuth callback from deep link
 */
async function handleAuthCallback(url: string): Promise<void> {
  try {
    // Parse the URL to get query parameters
    const urlObj = new URL(url.replace(`${APP_SCHEME}://`, 'https://'));
    const searchParams = urlObj.searchParams;

    // Check for session token or error
    const sessionToken = searchParams.get('session') || searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      console.error('[auth] OAuth error:', error);
      // Navigate to login with error
      window.location.href = `/login?error=${encodeURIComponent(error)}`;
      return;
    }

    if (sessionToken) {
      // Exchange token for session or store it
      // The backend should have already set the session cookie
      console.log('[auth] OAuth successful');
      window.location.href = '/routes';
    }
  } catch (error) {
    console.error('[auth] Failed to handle auth callback:', error);
  }
}

/**
 * Start OAuth flow in native browser
 */
export async function startOAuth(provider: 'google' | 'apple' | 'facebook'): Promise<void> {
  if (!isNative()) {
    // Web - use regular redirect
    window.location.href = `${API_URL}/api/auth/${provider}`;
    return;
  }

  // Native - open in-app browser
  const callbackUrl = `${APP_SCHEME}://auth/callback`;
  const authUrl = `${API_URL}/api/auth/${provider}?callbackURL=${encodeURIComponent(callbackUrl)}`;

  try {
    await Browser.open({
      url: authUrl,
      presentationStyle: 'popover',
      toolbarColor: '#FDFCF0',
    });

    // Browser will be closed automatically when redirecting to app scheme
  } catch (error) {
    console.error('[auth] Failed to open OAuth browser:', error);
  }
}

/**
 * Close the in-app browser (call after OAuth callback)
 */
export async function closeBrowser(): Promise<void> {
  if (!isNative()) return;

  try {
    await Browser.close();
  } catch {
    // Browser might already be closed
  }
}

/**
 * Open external URL in browser
 */
export async function openExternalUrl(url: string): Promise<void> {
  if (!isNative()) {
    window.open(url, '_blank');
    return;
  }

  try {
    await Browser.open({
      url,
      presentationStyle: 'fullscreen',
    });
  } catch (error) {
    console.error('[auth] Failed to open URL:', error);
    window.open(url, '_blank');
  }
}

/**
 * Get the callback URL for OAuth based on platform
 */
export function getOAuthCallbackUrl(): string {
  if (isNative()) {
    return `${APP_SCHEME}://auth/callback`;
  }
  return `${window.location.origin}/auth/callback`;
}

/**
 * Check if URL is a deep link for this app
 */
export function isAppDeepLink(url: string): boolean {
  return url.startsWith(`${APP_SCHEME}://`);
}

/**
 * Parse deep link URL
 */
export function parseDeepLink(url: string): { path: string; params: Record<string, string> } {
  try {
    // Replace app scheme with https for URL parsing
    const normalizedUrl = url.replace(`${APP_SCHEME}://`, 'https://app.local/');
    const urlObj = new URL(normalizedUrl);

    const params: Record<string, string> = {};
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    return {
      path: urlObj.pathname,
      params,
    };
  } catch {
    return { path: '/', params: {} };
  }
}

/**
 * Remove deep link listener
 */
export async function removeDeepLinkListener(): Promise<void> {
  if (!isNative()) return;

  try {
    await App.removeAllListeners();
    deepLinkHandler = null;
  } catch {
    // Ignore
  }
}
