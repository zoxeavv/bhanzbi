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

// Lazy initialization to avoid build-time errors
let _db: ReturnType<typeof drizzle> | null = null;
let _pool: Pool | null = null;

function getDb() {
  if (!_db) {
    const connectionString = getEnvVar('DATABASE_URL');
    _pool = new Pool({
      connectionString,
    });
    _db = drizzle(_pool, { schema });
  }
  return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    return getDb()[prop as keyof ReturnType<typeof drizzle>];
  },
});

export type Database = typeof db;

