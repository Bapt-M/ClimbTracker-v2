import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export * from './schema';

// Create a postgres.js connection
export function createConnection(connectionString: string) {
  const client = postgres(connectionString);
  return drizzle(client, { schema });
}

// Type for the database instance
export type Database = ReturnType<typeof createConnection>;
