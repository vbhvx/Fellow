import { processOutboxQueue } from '../../src/server/events/outbox';

async function startWorker() {
  console.log('🚀 Durable Outbox Worker started...');
  let running = true;

  process.on('SIGINT', () => {
    running = false;
  });
  process.on('SIGTERM', () => {
    running = false;
  });

  while (running) {
    try {
      const processed = await processOutboxQueue(50);
      if (processed > 0) {
        console.log(`[Outbox Worker] Published ${processed} pending collaboration events.`);
      }
    } catch (err) {
      console.error('[Outbox Worker] Error polling queue:', err);
    }
    // Poll every 3 seconds
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  console.log('🛑 Durable Outbox Worker stopped.');
}

if (require.main === module || process.argv[1]?.endsWith('worker.ts')) {
  startWorker().catch((err) => {
    console.error('Fatal outbox worker error:', err);
    process.exit(1);
  });
}

