import { createAuthClient } from 'better-auth/react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const authClient = createAuthClient({
  baseURL: API_URL,
});

// Export hooks for use in components
export const {
  useSession,
  signIn,
  signUp,
  signOut,
} = authClient;

// Custom types for ClimbTracker
export interface ClimbTrackerUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string;
  role: 'CLIMBER' | 'OPENER' | 'ADMIN';
  bio?: string;
  firstName?: string;
  lastName?: string;
  age?: number;
  height?: number;
  wingspan?: number;
  profilePhoto?: string;
  additionalPhotos?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type { Session } from 'better-auth/types';
