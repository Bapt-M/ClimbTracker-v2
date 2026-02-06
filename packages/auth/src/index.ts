import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import type { Database } from '@climbtracker/database';
import * as schema from '@climbtracker/database/schema';

export type AuthDatabase = Database;

export interface SocialProviderConfig {
  clientId: string;
  clientSecret: string;
}

export interface AuthConfig {
  db: Database;
  baseURL: string;
  secret: string;
  trustedOrigins?: string[];
  // OAuth providers (optional)
  google?: SocialProviderConfig;
  apple?: SocialProviderConfig & { teamId?: string; keyId?: string; privateKey?: string };
  facebook?: SocialProviderConfig;
}

export function createAuth(config: AuthConfig) {
  // Build social providers configuration
  const socialProviders: Record<string, any> = {};

  if (config.google?.clientId && config.google?.clientSecret) {
    socialProviders.google = {
      clientId: config.google.clientId,
      clientSecret: config.google.clientSecret,
    };
  }

  if (config.apple?.clientId && config.apple?.clientSecret) {
    socialProviders.apple = {
      clientId: config.apple.clientId,
      clientSecret: config.apple.clientSecret,
      ...(config.apple.teamId && { teamId: config.apple.teamId }),
      ...(config.apple.keyId && { keyId: config.apple.keyId }),
      ...(config.apple.privateKey && { privateKey: config.apple.privateKey }),
    };
  }

  if (config.facebook?.clientId && config.facebook?.clientSecret) {
    socialProviders.facebook = {
      clientId: config.facebook.clientId,
      clientSecret: config.facebook.clientSecret,
    };
  }

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

    // Social providers
    socialProviders,

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
        isPremium: {
          type: 'boolean',
          required: false,
          defaultValue: false,
          fieldName: 'is_premium',
        },
        stripeCustomerId: {
          type: 'string',
          required: false,
          fieldName: 'stripe_customer_id',
        },
      },
    },

  });
}

export type Auth = ReturnType<typeof createAuth>;
