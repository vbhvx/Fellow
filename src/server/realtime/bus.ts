import { Client, PoolClient } from 'pg';
import { pool, resolveDatabaseUrl } from '@/db/client';
import { logger } from '@/server/observability/logger';
import { broker, CollaborationEnvelope } from './broker';

/**
 * Cross-instance event bus built on Postgres LISTEN/NOTIFY.
 *
 * Producers call `notifyEvents` inside the transaction that marks outbox rows published, so a
 * notification is emitted if and only if that transaction commits. Every app instance keeps one
 * dedicated LISTEN connection and forwards what it hears into its local SSE broker.
 */
export const EVENT_CHANNEL = 'fellow_events';

// Postgres rejects NOTIFY payloads of 8000 bytes or more. Larger envelopes are sent by
// reference and loaded from the outbox table by each listener.
const MAX_INLINE_PAYLOAD_BYTES = 7500;

type BusMessage = { envelope: CollaborationEnvelope } | { ref: number };

export function encodeBusMessage(envelope: CollaborationEnvelope): string {
  const inline = JSON.stringify({ envelope } satisfies BusMessage);
  if (Buffer.byteLength(inline, 'utf8') < MAX_INLINE_PAYLOAD_BYTES) return inline;
  return JSON.stringify({ ref: envelope.seq } satisfies BusMessage);
}

export async function notifyEvents(client: PoolClient, envelopes: CollaborationEnvelope[]) {
  for (const envelope of envelopes) {
    await client.query('SELECT pg_notify($1, $2)', [EVENT_CHANNEL, encodeBusMessage(envelope)]);
  }
}

async function loadEnvelope(seq: number): Promise<CollaborationEnvelope | null> {
  const { rows } = await pool.query<{ payload: CollaborationEnvelope; seq: string }>(
    'SELECT payload, seq FROM collaboration_events WHERE seq = $1',
    [seq]
  );
  return rows[0] ? { ...rows[0].payload, seq: Number(rows[0].seq) } : null;
}

type Handler = (envelope: CollaborationEnvelope) => void;

class EventBusListener {
  private client: Client | null = null;
  private connecting: Promise<void> | null = null;
  private stopped = false;
  private retryDelayMs = 500;
  private handlers = new Set<Handler>();

  constructor() {
    this.handlers.add((envelope) => broker.broadcast(envelope));
  }

  subscribe(handler: Handler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  isConnected(): boolean {
    return this.client !== null;
  }

  /** Idempotent; resolves once LISTEN is active. */
  start(): Promise<void> {
    this.stopped = false;
    if (this.client) return Promise.resolve();
    if (!this.connecting) {
      this.connecting = this.connect().finally(() => {
        this.connecting = null;
      });
    }
    return this.connecting;
  }

  async stop() {
    this.stopped = true;
    const client = this.client;
    this.client = null;
    await client?.end().catch(() => {});
  }

  private async connect() {
    const client = new Client({ connectionString: resolveDatabaseUrl() });
    client.on('notification', (msg) => {
      if (msg.channel === EVENT_CHANNEL && msg.payload) void this.dispatch(msg.payload);
    });
    client.on('error', (err) => {
      logger.warn('event bus connection error', { err });
      this.handleDisconnect(client);
    });
    client.on('end', () => this.handleDisconnect(client));

    await client.connect();
    await client.query(`LISTEN ${EVENT_CHANNEL}`);
    this.client = client;
    this.retryDelayMs = 500;
    logger.info('event bus listening', { channel: EVENT_CHANNEL });
  }

  private handleDisconnect(client: Client) {
    if (this.client !== client) return;
    this.client = null;
    if (this.stopped) return;

    // Events committed while we were disconnected are not lost: SSE clients reconnect with
    // Last-Event-ID and the stream route replays them from the outbox table.
    const delay = this.retryDelayMs;
    this.retryDelayMs = Math.min(this.retryDelayMs * 2, 30_000);
    setTimeout(() => {
      this.start().catch((err) => logger.error('event bus reconnect failed', { err }));
    }, delay).unref?.();
  }

  private async dispatch(raw: string) {
    try {
      const message = JSON.parse(raw) as BusMessage;
      const envelope = 'envelope' in message ? message.envelope : await loadEnvelope(message.ref);
      if (!envelope) return;
      for (const handler of Array.from(this.handlers)) handler(envelope);
    } catch (err) {
      logger.error('failed to dispatch bus message', { err });
    }
  }
}

const globalForBus = globalThis as unknown as { fellowEventBus?: EventBusListener };
export const eventBus = globalForBus.fellowEventBus ?? new EventBusListener();
globalForBus.fellowEventBus = eventBus;
