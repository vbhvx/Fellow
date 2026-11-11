import { describe, it, expect } from 'vitest';
import { is } from 'drizzle-orm';
import { getTableConfig, PgTable } from 'drizzle-orm/pg-core';
import { pool } from '@/db/client';
import * as schema from '@/db/schema';

// The SQL migrations are the source of truth for the database; the Drizzle schema is what the
// code is typed against. This fails CI the moment the two disagree.
describe('Drizzle schema matches migrated database', () => {
  const tables = Object.values(schema).filter((v) => is(v, PgTable)) as unknown as PgTable[];

  it.each(tables.map((t) => [getTableConfig(t).name, t] as const))('%s', async (name, table) => {
    const config = getTableConfig(table);
    const { rows } = await pool.query<{ column_name: string; is_nullable: 'YES' | 'NO' }>(
      `SELECT column_name, is_nullable FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1`,
      [name]
    );
    expect(rows.length, `table ${name} is missing from the database`).toBeGreaterThan(0);

    const dbColumns = Object.fromEntries(rows.map((r) => [r.column_name, r.is_nullable === 'NO']));
    const codeColumns = Object.fromEntries(config.columns.map((c) => [c.name, c.notNull]));
    expect(codeColumns).toEqual(dbColumns);
  });

  it('declares every unique constraint the database enforces', async () => {
    const { rows } = await pool.query<{ conname: string }>(
      `SELECT conname FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace
        WHERE n.nspname = 'public' AND contype = 'u' AND array_length(conkey, 1) > 1`
    );
    const declared = tables.flatMap((t) => getTableConfig(t).uniqueConstraints.map((u) => u.name));
    expect(declared.sort()).toEqual(rows.map((r) => r.conname).sort());
  });
});
