import { NextResponse } from 'next/server';
import { pool } from '@/db/client';
import { getOutboxStats } from '@/server/events/outbox';
import { eventBus } from '@/server/realtime/bus';
import { logger } from '@/server/observability/logger';

export const dynamic = 'force-dynamic';

// Outbox events older than this mean the relay worker is down or falling behind.
const OUTBOX_LAG_WARN_SECONDS = 60;

// Readiness: can this instance serve traffic right now?
export async function GET() {
  const started = Date.now();
  try {
    await pool.query('SELECT 1');
    const databaseLatencyMs = Date.now() - started;
    const outbox = await getOutboxStats();
    const outboxHealthy =
      outbox.deadLettered === 0 &&
      (outbox.oldestPendingSeconds === null || outbox.oldestPendingSeconds < OUTBOX_LAG_WARN_SECONDS);

    return NextResponse.json({
      status: outboxHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? process.env.APP_VERSION ?? 'dev',
      services: {
        database: { status: 'up', latencyMs: databaseLatencyMs },
        // The bus connects lazily on the first realtime subscriber.
        realtimeBus: { status: eventBus.isConnected() ? 'listening' : 'idle' },
        outbox: { status: outboxHealthy ? 'ok' : 'lagging', ...outbox },
      },
    });
  } catch (err) {
    logger.error('readiness check failed', { err });
    return NextResponse.json(
      { status: 'unhealthy', timestamp: new Date().toISOString(), services: { database: { status: 'down' } } },
      { status: 503 }
    );
  }
}
