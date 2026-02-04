// Analytics client for tracking user events
// Supports Datafast or any analytics provider with HTTP API

interface AnalyticsConfig {
  apiKey?: string;
  projectId?: string;
  endpoint?: string;
  enabled?: boolean;
}

interface EventProperties {
  [key: string]: string | number | boolean | null | undefined;
}

class Analytics {
  private config: AnalyticsConfig;
  private queue: Array<{ event: string; properties: EventProperties; timestamp: Date }> = [];

  constructor(config: AnalyticsConfig = {}) {
    this.config = {
      apiKey: process.env.DATAFAST_API_KEY || config.apiKey,
      projectId: process.env.DATAFAST_PROJECT_ID || config.projectId,
      endpoint: config.endpoint || 'https://api.datafast.io/v1/events',
      enabled: process.env.NODE_ENV === 'production' || config.enabled,
    };
  }

  // Track a custom event
  async track(event: string, properties: EventProperties = {}): Promise<void> {
    if (!this.config.enabled) {
      console.log(`[Analytics] (dev) ${event}`, properties);
      return;
    }

    if (!this.config.apiKey) {
      console.warn('[Analytics] API key not configured, skipping event:', event);
      return;
    }

    try {
      const payload = {
        event,
        properties,
        timestamp: new Date().toISOString(),
        projectId: this.config.projectId,
      };

      await fetch(this.config.endpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('[Analytics] Failed to track event:', event, error);
      // Queue failed events for retry
      this.queue.push({ event, properties, timestamp: new Date() });
    }
  }

  // Identify a user
  async identify(userId: string, traits: EventProperties = {}): Promise<void> {
    await this.track('$identify', { userId, ...traits });
  }

  // Track page view
  async pageView(page: string, properties: EventProperties = {}): Promise<void> {
    await this.track('$pageview', { page, ...properties });
  }
}

// Singleton instance
export const analytics = new Analytics();

// Pre-defined events for ClimbTracker
export const events = {
  // User events
  userRegistered: (userId: string, method: 'email' | 'google' | 'passkey') =>
    analytics.track('user_registered', { userId, method }),

  userLoggedIn: (userId: string, method: string) =>
    analytics.track('user_logged_in', { userId, method }),

  profileUpdated: (userId: string) =>
    analytics.track('profile_updated', { userId }),

  // Route events
  routeCreated: (routeId: string, difficulty: string, sector: string) =>
    analytics.track('route_created', { routeId, difficulty, sector }),

  routeViewed: (routeId: string, userId: string) =>
    analytics.track('route_viewed', { routeId, userId }),

  routeValidated: (routeId: string, userId: string, attempts: number, isFlashed: boolean) =>
    analytics.track('route_validated', { routeId, userId, attempts, isFlashed }),

  routeAddedToProject: (routeId: string, userId: string) =>
    analytics.track('route_added_to_project', { routeId, userId }),

  // Social events
  friendRequestSent: (fromUserId: string, toUserId: string) =>
    analytics.track('friend_request_sent', { fromUserId, toUserId }),

  friendRequestAccepted: (fromUserId: string, toUserId: string) =>
    analytics.track('friend_request_accepted', { fromUserId, toUserId }),

  commentPosted: (routeId: string, userId: string) =>
    analytics.track('comment_posted', { routeId, userId }),

  // Premium events
  subscriptionStarted: (userId: string, plan: string) =>
    analytics.track('subscription_started', { userId, plan }),

  subscriptionCancelled: (userId: string, plan: string) =>
    analytics.track('subscription_cancelled', { userId, plan }),

  checkoutStarted: (userId: string) =>
    analytics.track('checkout_started', { userId }),
};

export { Analytics };
export type { AnalyticsConfig, EventProperties };
