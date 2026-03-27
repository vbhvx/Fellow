import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString =
  process.env.NODE_ENV === 'test'
    ? process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
    : process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('DATABASE_URL is not set. Defaulting to local postgresql://localhost:5432/fellow');
}

export const pool = new Pool({
  connectionString: connectionString || 'postgresql://localhost:5432/fellow',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool, { schema });

export type Database = typeof db;

