import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import * as dotenv from 'dotenv';
import { logger } from '@/server/observability/logger';

dotenv.config();

export function resolveDatabaseUrl(): string {
  const url =
    process.env.NODE_ENV === 'test'
      ? process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
      : process.env.DATABASE_URL;

  if (url) return url;
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build') {
    throw new Error('DATABASE_URL must be set in production');
  }
  return 'postgresql://localhost:5432/fellow';
}

const globalForDb = globalThis as unknown as { fellowPool?: Pool };

function createPool(): Pool {
  const pool = new Pool({
    connectionString: resolveDatabaseUrl(),
    max: Number(process.env.DATABASE_POOL_MAX) || 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    // Bound runaway queries so a single bad request cannot pin a connection forever.
    statement_timeout: 15_000,
  });

  // Without a listener, an idle client erroring (e.g. Postgres restart) crashes the process.
  pool.on('error', (err) => {
    logger.error('postgres pool idle client error', { err });
  });

  return pool;
}

// Reuse the pool across Next.js dev hot reloads instead of leaking connections.
export const pool = globalForDb.fellowPool ?? createPool();
if (process.env.NODE_ENV !== 'production') globalForDb.fellowPool = pool;

export const db = drizzle(pool, { schema });

export type Database = typeof db;
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
