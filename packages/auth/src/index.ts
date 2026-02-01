import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import type { Database } from '@climbtracker/database';
import * as schema from '@climbtracker/database/schema';

export type AuthDatabase = Database;

export interface AuthConfig {
  db: Database;
  baseURL: string;
  secret: string;
  trustedOrigins?: string[];
}

export function createAuth(config: AuthConfig) {
  return betterAuth({
    database: drizzleAdapter(config.db, {
      provider: 'pg',
      schema: {
        // Map Better Auth table names to our schema
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
      },
    }),
    baseURL: config.baseURL,
    secret: config.secret,
    trustedOrigins: config.trustedOrigins || [],

    // Email and password authentication
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      minPasswordLength: 8,
    },

    // Session configuration
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // Update session every 24 hours
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5, // 5 minutes
      },
    },

    // User configuration with custom fields
    user: {
      additionalFields: {
        role: {
          type: 'string',
          required: false,
          defaultValue: 'CLIMBER',
          input: false, // Not settable by user during signup
        },
        bio: {
          type: 'string',
          required: false,
        },
        firstName: {
          type: 'string',
          required: false,
          fieldName: 'first_name',
        },
        lastName: {
          type: 'string',
          required: false,
          fieldName: 'last_name',
        },
        age: {
          type: 'number',
          required: false,
        },
        height: {
          type: 'number',
          required: false,
        },
        wingspan: {
          type: 'number',
          required: false,
        },
        profilePhoto: {
          type: 'string',
          required: false,
          fieldName: 'profile_photo',
        },
        additionalPhotos: {
          type: 'string[]',
          required: false,
          fieldName: 'additional_photos',
        },
      },
    },

  });
}

export type Auth = ReturnType<typeof createAuth>;
