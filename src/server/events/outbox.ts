import { PoolClient } from 'pg';
import { db, pool, Transaction } from '@/db/client';
import { collaborationEvents } from '@/db/schema';
import { CollaborationEnvelope } from '@/server/realtime/broker';
import { notifyEvents } from '@/server/realtime/bus';
import { logger } from '@/server/observability/logger';
import crypto from 'crypto';

/**
 * Transactional outbox.
 *
 *   1. `recordOutboxEvent` inserts the event in the same transaction as the domain change, so an
 *      event exists if and only if the change committed.
 *   2. `publishEvent` relays it right after commit for low latency.
 *   3. `processOutboxQueue` (the worker) sweeps anything the request path failed to relay,
 *      e.g. because the process crashed or the function was frozen between commit and relay.
 *
 * Relaying claims rows with a conditional UPDATE / `FOR UPDATE SKIP LOCKED` and emits NOTIFY in
 * the same transaction, so any number of workers and request handlers can run concurrently
 * without double-publishing, and a failed NOTIFY leaves the row pending for retry.
 */

export const MAX_DELIVERY_ATTEMPTS = 8;

export interface EmitEventParams {
  organizationId: string;
  projectId?: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  version?: number;
  payload: Record<string, unknown>;
}

export async function recordOutboxEvent(
  params: EmitEventParams,
  tx?: Transaction
): Promise<CollaborationEnvelope> {
  const eventId = `evt_${crypto.randomUUID()}`;
  const occurredAt = new Date().toISOString();

  const envelope: Omit<CollaborationEnvelope, 'seq'> = {
    eventId,
    type: params.eventType,
    organizationId: params.organizationId,
    projectId: params.projectId,
    resourceId: params.aggregateId,
    version: params.version,
    occurredAt,
    payload: params.payload,
  };

  const client = tx || db;

  const [row] = await client
    .insert(collaborationEvents)
    .values({
      id: eventId,
      organizationId: params.organizationId,
      aggregateType: params.aggregateType,
      aggregateId: params.aggregateId,
      eventType: params.eventType,
      payload: envelope as unknown as Record<string, unknown>,
      attemptCount: 0,
      publishedAt: null,
    })
    .returning({ seq: collaborationEvents.seq });

  return { ...envelope, seq: row.seq };
}

interface OutboxRow {
  id: string;
  seq: string;
  payload: CollaborationEnvelope;
  attempt_count: number;
}

function toEnvelope(row: OutboxRow): CollaborationEnvelope {
  // seq is assigned by the database at insert time, after the payload JSON was built.
  return { ...row.payload, seq: Number(row.seq) };
}

async function withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

/**
 * Relays committed events immediately. Never throws: the domain change already committed, so a
 * relay failure must not surface as a request failure. The worker will retry.
 */
export async function publishEvent(envelope: CollaborationEnvelope | CollaborationEnvelope[]) {
  const ids = (Array.isArray(envelope) ? envelope : [envelope]).map((e) => e.eventId);
  try {
    await withClient(async (client) => {
      await client.query('BEGIN');
      try {
        // Rows already claimed by a worker are skipped rather than waited on.
        const { rows } = await client.query<OutboxRow>(
          `UPDATE collaboration_events e
              SET published_at = NOW(), attempt_count = e.attempt_count + 1
             FROM (SELECT id FROM collaboration_events
                    WHERE id = ANY($1) AND published_at IS NULL
                    FOR UPDATE SKIP LOCKED) claimed
            WHERE e.id = claimed.id
        RETURNING e.id, e.seq, e.payload, e.attempt_count`,
          [ids]
        );
        await notifyEvents(client, rows.map(toEnvelope));
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    });
  } catch (err) {
    logger.warn('immediate outbox relay failed; worker will retry', { err, eventIds: ids });
  }
}

export function retryDelayMs(attempt: number): number {
  // 1s, 2s, 4s ... capped at 5 minutes
  return Math.min(1000 * 2 ** Math.max(attempt - 1, 0), 5 * 60_000);
}

/**
 * Relays pending events in seq order. Safe to run from many worker processes at once.
 * Returns the number of events published.
 */
export async function processOutboxQueue(limit = 50): Promise<number> {
  return withClient(async (client) => {
    await client.query('BEGIN');
    try {
      const { rows } = await client.query<OutboxRow>(
        `SELECT id, seq, payload, attempt_count
           FROM collaboration_events
          WHERE published_at IS NULL AND failed_at IS NULL AND next_attempt_at <= NOW()
          ORDER BY seq
          LIMIT $1
          FOR UPDATE SKIP LOCKED`,
        [limit]
      );

      let published = 0;
      for (const row of rows) {
        // A savepoint per row isolates one poison event from the rest of the batch.
        await client.query('SAVEPOINT relay_row');
        try {
          await notifyEvents(client, [toEnvelope(row)]);
          await client.query(
            'UPDATE collaboration_events SET published_at = NOW(), attempt_count = attempt_count + 1 WHERE id = $1',
            [row.id]
          );
          await client.query('RELEASE SAVEPOINT relay_row');
          published++;
        } catch (err) {
          await client.query('ROLLBACK TO SAVEPOINT relay_row');
          const attempts = row.attempt_count + 1;
          const deadLetter = attempts >= MAX_DELIVERY_ATTEMPTS;
          await client.query(
            `UPDATE collaboration_events
                SET attempt_count = $2,
                    last_error = $3,
                    next_attempt_at = NOW() + ($4 || ' milliseconds')::interval,
                    failed_at = CASE WHEN $5 THEN NOW() ELSE NULL END
              WHERE id = $1`,
            [row.id, attempts, (err as Error).message.slice(0, 1000), retryDelayMs(attempts), deadLetter]
          );
          logger.error(deadLetter ? 'outbox event dead-lettered' : 'outbox relay attempt failed', {
            err,
            eventId: row.id,
            attempts,
          });
        }
      }

      await client.query('COMMIT');
      return published;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  });
}

/** Deletes delivered events past the replay window so the table stays bounded. */
export async function pruneDeliveredEvents(olderThanDays = 7): Promise<number> {
  const { rowCount } = await pool.query(
    `DELETE FROM collaboration_events
      WHERE published_at IS NOT NULL AND published_at < NOW() - ($1 || ' days')::interval`,
    [olderThanDays]
  );
  return rowCount ?? 0;
}

export async function getOutboxStats() {
  const { rows } = await pool.query<{ pending: string; dead_lettered: string; oldest_pending_seconds: string | null }>(
    `SELECT
       COUNT(*) FILTER (WHERE published_at IS NULL AND failed_at IS NULL) AS pending,
       COUNT(*) FILTER (WHERE failed_at IS NOT NULL) AS dead_lettered,
       EXTRACT(EPOCH FROM NOW() - MIN(created_at) FILTER (WHERE published_at IS NULL AND failed_at IS NULL)) AS oldest_pending_seconds
     FROM collaboration_events`
  );
  const r = rows[0];
  return {
    pending: Number(r.pending),
    deadLettered: Number(r.dead_lettered),
    oldestPendingSeconds: r.oldest_pending_seconds === null ? null : Number(r.oldest_pending_seconds),
  };
}
