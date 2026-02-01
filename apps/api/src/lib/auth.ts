import { createAuth } from '@climbtracker/auth';
import { createConnection } from '@climbtracker/database';

// Database connection
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://climbtracker:climbtracker@localhost:5433/climbtracker';
export const db = createConnection(DATABASE_URL);

// Auth configuration
export const auth = createAuth({
  db,
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  secret: process.env.BETTER_AUTH_SECRET || 'development-secret-change-in-production',
  trustedOrigins: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
  ],
});

export type Session = typeof auth.$Infer.Session;
