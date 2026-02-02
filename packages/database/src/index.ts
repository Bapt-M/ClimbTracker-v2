import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';
import * as schema from './schema';

export * from './schema';

// Create a Drizzle connection (for queries)
export function createConnection(connectionString: string) {
  const client = postgres(connectionString);
  return drizzle(client, { schema });
}

// Create a Supabase client (for auth, realtime, storage)
export function createSupabaseClient(supabaseUrl: string, supabaseKey: string) {
  return createClient(supabaseUrl, supabaseKey);
}

// Type for the database instance
export type Database = ReturnType<typeof createConnection>;
export type SupabaseClient = ReturnType<typeof createSupabaseClient>;
