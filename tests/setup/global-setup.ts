// Applies migrations once before any test file runs, so suites don't race each other to do it.
export default async function setup() {
  (process.env as Record<string, string>).NODE_ENV = 'test';
  const { runMigrations } = await import('../../src/db/migrate');
  const { pool } = await import('../../src/db/client');
  await runMigrations();
  await pool.end();
}
