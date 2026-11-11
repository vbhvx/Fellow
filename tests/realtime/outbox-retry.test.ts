import { describe, it, expect, vi, beforeAll } from 'vitest';
import { pool } from '@/db/client';
import { MAX_DELIVERY_ATTEMPTS, processOutboxQueue, publishEvent, recordOutboxEvent, retryDelayMs } from '@/server/events/outbox';
import { createWorkspace } from '../helpers/fixtures';

// Simulate the bus being unavailable for every relay attempt in this file.
vi.mock('@/server/realtime/bus', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/server/realtime/bus')>()),
  notifyEvents: vi.fn(async () => {
    throw new Error('bus unavailable');
  }),
}));

describe('Outbox retry and dead-lettering', () => {
  let organizationId: string;

  beforeAll(async () => {
    organizationId = (await createWorkspace('retry')).org.id;
  });

  it('backs off exponentially with a cap', () => {
    expect([1, 2, 3, 4].map(retryDelayMs)).toEqual([1000, 2000, 4000, 8000]);
    expect(retryDelayMs(30)).toBe(5 * 60_000);
  });

  it('never fails the request when the immediate relay fails, and leaves the event pending', async () => {
    const envelope = await recordOutboxEvent({
      organizationId,
      aggregateType: 'task',
      aggregateId: 'retry_pending',
      eventType: 'task.updated',
      payload: {},
    });

    await expect(publishEvent(envelope)).resolves.toBeUndefined();

    const { rows } = await pool.query('SELECT published_at FROM collaboration_events WHERE id = $1', [envelope.eventId]);
    expect(rows[0].published_at).toBeNull();
  });

  it('dead-letters an event after the maximum number of attempts', async () => {
    const envelope = await recordOutboxEvent({
      organizationId,
      aggregateType: 'task',
      aggregateId: 'retry_dead',
      eventType: 'task.updated',
      payload: {},
    });

    for (let i = 0; i < MAX_DELIVERY_ATTEMPTS; i++) {
      // Skip the backoff wait so the test doesn't take minutes.
      await pool.query('UPDATE collaboration_events SET next_attempt_at = NOW() WHERE id = $1', [envelope.eventId]);
      await processOutboxQueue(500);
    }

    const { rows } = await pool.query(
      'SELECT attempt_count, failed_at, last_error, published_at FROM collaboration_events WHERE id = $1',
      [envelope.eventId]
    );
    expect(rows[0]).toMatchObject({ attempt_count: MAX_DELIVERY_ATTEMPTS, last_error: 'bus unavailable', published_at: null });
    expect(rows[0].failed_at).not.toBeNull();

    // Dead-lettered rows are no longer picked up.
    await pool.query('UPDATE collaboration_events SET next_attempt_at = NOW() WHERE id = $1', [envelope.eventId]);
    await processOutboxQueue(500);
    const after = await pool.query('SELECT attempt_count FROM collaboration_events WHERE id = $1', [envelope.eventId]);
    expect(after.rows[0].attempt_count).toBe(MAX_DELIVERY_ATTEMPTS);
  });
});
