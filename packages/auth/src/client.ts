import { createAuthClient } from 'better-auth/react';

export interface AuthClientConfig {
  baseURL: string;
}

export function createClimbTrackerAuthClient(config: AuthClientConfig) {
  return createAuthClient({
    baseURL: config.baseURL,
  });
}

// Type exports for use in React components
export type AuthClient = ReturnType<typeof createClimbTrackerAuthClient>;

// Re-export useful types from better-auth
export type { Session, User } from 'better-auth/types';
