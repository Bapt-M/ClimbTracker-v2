// Frontend Analytics client
// Tracks user events for ClimbTracker

interface EventProperties {
  [key: string]: string | number | boolean | null | undefined;
}

class Analytics {
  private enabled: boolean;
  private userId: string | null = null;

  constructor() {
    this.enabled = import.meta.env.PROD || import.meta.env.VITE_ANALYTICS_ENABLED === 'true';
  }

  // Set user ID after login
  setUser(userId: string | null) {
    this.userId = userId;
    if (userId) {
      this.track('session_start', { userId });
    }
  }

  // Generic track method
  track(event: string, properties: EventProperties = {}) {
    const payload = {
      event,
      properties: {
        ...properties,
        userId: this.userId,
        timestamp: new Date().toISOString(),
        url: window.location.pathname,
        userAgent: navigator.userAgent,
      },
    };

    if (!this.enabled) {
      console.log('[Analytics]', event, payload.properties);
      return;
    }

    // Send to backend analytics endpoint
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    }).catch(err => console.warn('[Analytics] Failed to track:', err));
  }

  // Page view
  pageView(page: string) {
    this.track('page_view', { page });
  }
}

// Singleton instance
export const analytics = new Analytics();

// Pre-defined tracking functions for ClimbTracker
export const trackEvent = {
  // Auth events
  login: (method: 'email' | 'google' | 'passkey') =>
    analytics.track('user_login', { method }),

  logout: () =>
    analytics.track('user_logout'),

  register: (method: 'email' | 'google' | 'passkey') =>
    analytics.track('user_register', { method }),

  // Route events
  viewRoute: (routeId: string, difficulty: string) =>
    analytics.track('route_view', { routeId, difficulty }),

  validateRoute: (routeId: string, difficulty: string, attempts: number, isFlashed: boolean) =>
    analytics.track('route_validate', { routeId, difficulty, attempts, isFlashed }),

  addToProject: (routeId: string, difficulty: string) =>
    analytics.track('route_add_project', { routeId, difficulty }),

  createRoute: (difficulty: string, sector: string) =>
    analytics.track('route_create', { difficulty, sector }),

  // Social events
  sendFriendRequest: (toUserId: string) =>
    analytics.track('friend_request_send', { toUserId }),

  acceptFriendRequest: (fromUserId: string) =>
    analytics.track('friend_request_accept', { fromUserId }),

  postComment: (routeId: string) =>
    analytics.track('comment_post', { routeId }),

  // Profile events
  updateProfile: () =>
    analytics.track('profile_update'),

  uploadPhoto: (type: 'profile' | 'route') =>
    analytics.track('photo_upload', { type }),

  // Premium events
  viewPricing: () =>
    analytics.track('pricing_view'),

  startCheckout: (plan: string) =>
    analytics.track('checkout_start', { plan }),

  completeCheckout: (plan: string) =>
    analytics.track('checkout_complete', { plan }),

  // Navigation events
  openLeaderboard: () =>
    analytics.track('leaderboard_open'),

  searchRoutes: (query: string, filters: Record<string, unknown>) =>
    analytics.track('routes_search', { query, ...filters }),
};
