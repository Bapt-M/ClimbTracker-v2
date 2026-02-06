import { env } from '../env';
import { createAuth } from '@climbtracker/auth';
import { createConnection } from '@climbtracker/database';

// Database connection using env loaded from .env
export const db = createConnection(env.DATABASE_URL);

// Auth configuration with OAuth providers
export const auth = createAuth({
  db,
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.FRONTEND_URL],

  // Google OAuth
  google: env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  } : undefined,

  // Apple OAuth
  apple: env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET ? {
    clientId: env.APPLE_CLIENT_ID,
    clientSecret: env.APPLE_CLIENT_SECRET,
    teamId: env.APPLE_TEAM_ID,
    keyId: env.APPLE_KEY_ID,
    privateKey: env.APPLE_PRIVATE_KEY,
  } : undefined,

  // Facebook OAuth
  facebook: env.FACEBOOK_CLIENT_ID && env.FACEBOOK_CLIENT_SECRET ? {
    clientId: env.FACEBOOK_CLIENT_ID,
    clientSecret: env.FACEBOOK_CLIENT_SECRET,
  } : undefined,
});

export type Session = typeof auth.$Infer.Session;
