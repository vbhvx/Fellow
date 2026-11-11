import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { pool } from './client';

const MIGRATIONS_DIR = path.join(process.cwd(), 'src', 'db', 'migrations');

// Arbitrary constant; every instance that boots concurrently contends on the same lock,
// so only one of them applies migrations and the rest wait, then see nothing to do.
const MIGRATION_LOCK_ID = 7_240_118;

interface MigrationFile {
  version: string;
  name: string;
  sql: string;
  checksum: string;
}

export function loadMigrationFiles(dir = MIGRATIONS_DIR): MigrationFile[] {
  return fs
    .readdirSync(dir)
    .filter((f) => /^\d{4}_.+\.sql$/.test(f))
    .sort()
    .map((file) => {
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      return {
        version: file.slice(0, 4),
        name: file,
        sql,
        checksum: crypto.createHash('sha256').update(sql).digest('hex'),
      };
    });
}

export async function runMigrations(): Promise<string[]> {
  const client = await pool.connect();
  const applied: string[] = [];
  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(16) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        checksum CHAR(64) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const { rows } = await client.query<{ version: string; checksum: string }>(
      'SELECT version, checksum FROM schema_migrations'
    );
    const done = new Map(rows.map((r) => [r.version, r.checksum]));

    for (const migration of loadMigrationFiles()) {
      const previous = done.get(migration.version);
      if (previous) {
        if (previous !== migration.checksum) {
          throw new Error(
            `Migration ${migration.name} was modified after being applied. Add a new migration instead.`
          );
        }
        continue;
      }

      await client.query('BEGIN');
      try {
        await client.query(migration.sql);
        await client.query(
          'INSERT INTO schema_migrations (version, name, checksum) VALUES ($1, $2, $3)',
          [migration.version, migration.name, migration.checksum]
        );
        await client.query('COMMIT');
        applied.push(migration.name);
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${migration.name} failed: ${(error as Error).message}`);
      }
    }

    return applied;
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]).catch(() => {});
    client.release();
  }
}

if (require.main === module || process.argv[1]?.endsWith('migrate.ts')) {
  runMigrations()
    .then(async (applied) => {
      console.log(applied.length ? `Applied: ${applied.join(', ')}` : 'Database is up to date.');
      await pool.end();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error(error);
      await pool.end();
      process.exit(1);
    });
}
