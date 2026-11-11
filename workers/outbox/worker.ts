import { getEnv } from '../../src/server/config/env';
import { processOutboxQueue, pruneDeliveredEvents } from '../../src/server/events/outbox';
import { pruneRateLimits } from '../../src/server/security/rate-limit';
import { pool } from '../../src/db/client';
import { logger } from '../../src/server/observability/logger';

const POLL_INTERVAL_MS = Number(process.env.OUTBOX_POLL_INTERVAL_MS) || 1000;
const BATCH_SIZE = 100;
const MAINTENANCE_INTERVAL_MS = 60 * 60_000;

const log = logger.child({ component: 'outbox-worker', pid: process.pid });

async function runMaintenance() {
  const [events, windows] = await Promise.all([pruneDeliveredEvents(), pruneRateLimits()]);
  if (events || windows) log.info('maintenance complete', { prunedEvents: events, prunedRateLimitWindows: windows });
}

async function startWorker() {
  getEnv();
  log.info('outbox worker started', { pollIntervalMs: POLL_INTERVAL_MS });

  let running = true;
  let wake: (() => void) | undefined;
  const shutdown = (signal: string) => {
    if (!running) return;
    log.info('shutdown requested', { signal });
    running = false;
    wake?.();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  let lastMaintenance = 0;
  while (running) {
    try {
      // Drain: keep pulling full batches back-to-back while there's a backlog.
      let processed: number;
      do {
        processed = await processOutboxQueue(BATCH_SIZE);
        if (processed > 0) log.info('relayed pending events', { count: processed });
      } while (running && processed === BATCH_SIZE);

      if (Date.now() - lastMaintenance > MAINTENANCE_INTERVAL_MS) {
        lastMaintenance = Date.now();
        await runMaintenance();
      }
    } catch (err) {
      log.error('outbox poll failed', { err });
    }

    if (!running) break;
    await new Promise<void>((resolve) => {
      wake = resolve;
      setTimeout(resolve, POLL_INTERVAL_MS);
    });
  }

  // Let the in-flight batch finish (above), then release connections cleanly.
  await pool.end();
  log.info('outbox worker stopped');
}

if (require.main === module || process.argv[1]?.endsWith('worker.ts')) {
  startWorker().catch((err) => {
    log.error('fatal outbox worker error', { err });
    process.exit(1);
  });
}
