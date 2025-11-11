import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

// Build-safe env guards
function getEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

const connectionString = getEnvVar('DATABASE_URL');

const pool = new Pool({
  connectionString,
});

export const db = drizzle(pool, { schema });

export type Database = typeof db;

