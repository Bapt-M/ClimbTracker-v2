import { env } from '../env';
import { createAuth } from '@climbtracker/auth';
import { createConnection } from '@climbtracker/database';

// Database connection using env loaded from .env
export const db = createConnection(env.DATABASE_URL);

// Auth configuration
export const auth = createAuth({
  db,
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.FRONTEND_URL],
});

export type Session = typeof auth.$Infer.Session;
