import { describe, it, expect, afterAll } from 'vitest';
import { pool } from '@/db/client';
import { LISTENER_APPLICATION_NAME, eventBus } from '@/server/realtime/bus';
import { sleep, waitFor } from '../helpers/fixtures';

// Only this test process's listener: other apps on the same database (a dev server) are left alone.
const listenerCount = async () =>
  Number(
    (await pool.query<{ n: string }>(`SELECT COUNT(*) AS n FROM pg_stat_activity WHERE application_name = $1`, [LISTENER_APPLICATION_NAME]))
      .rows[0].n
  );

describe('event bus listener lifecycle', () => {
  afterAll(() => eventBus.stop());

  it('does not leave a listener running when stopped while connecting', async () => {
    await eventBus.stop();
    const before = await listenerCount();
    const starting = eventBus.start();
    await eventBus.stop();
    await starting;
    await sleep(200);
    expect(eventBus.isConnected()).toBe(false);
    expect(await listenerCount()).toBe(before);
  });

  it('keeps retrying after a failed reconnect until the database is back', async () => {
    await eventBus.start();
    expect(eventBus.isConnected()).toBe(true);

    // Database "outage": reconnects go to a closed port, and the live connection is cut.
    const env = { ...process.env };
    process.env.TEST_DATABASE_URL = 'postgresql://localhost:1/unreachable';
    process.env.DATABASE_URL = 'postgresql://localhost:1/unreachable';
    await pool.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE application_name = $1`, [LISTENER_APPLICATION_NAME]);
    await waitFor(() => !eventBus.isConnected());

    // Let the first retry (after ~500ms) fail, then bring the database back.
    await sleep(900);
    expect(eventBus.isConnected()).toBe(false);
    process.env.TEST_DATABASE_URL = env.TEST_DATABASE_URL;
    process.env.DATABASE_URL = env.DATABASE_URL;

    // The next attempts (backoff 1s, then 2s) must still happen and succeed.
    await waitFor(() => eventBus.isConnected(), 6000);
  }, 15000);
});
