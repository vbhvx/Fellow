import { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/server/auth/session';
import { broker, canReceive, ClientConnection, CollaborationEnvelope, formatSseFrame } from '@/server/realtime/broker';
import { eventBus } from '@/server/realtime/bus';
import { pool } from '@/db/client';
import { OrganizationService } from '@/server/services/organization.service';
import { ProjectService } from '@/server/services/project.service';
import { logger } from '@/server/observability/logger';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const HEARTBEAT_MS = 15_000;
// Streams are closed after a bounded lifetime; the browser reconnects automatically with
// Last-Event-ID. This re-runs authorization, so revoked project access stops within this window.
const MAX_CONNECTION_MS = 5 * 60_000;
const REPLAY_LIMIT = 500;
// Frames queued but not yet read by the client before we consider it a slow consumer.
const MAX_BUFFERED_FRAMES = 1000;

function jsonError(status: number, code: string, message: string) {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function parseLastEventId(req: NextRequest): number | null {
  const raw = req.headers.get('last-event-id') ?? req.nextUrl.searchParams.get('lastEventId');
  if (!raw || !/^\d+$/.test(raw)) return null;
  return Number(raw);
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return jsonError(401, 'UNAUTHORIZED', 'Authentication required');
  }

  const organizationId = req.nextUrl.searchParams.get('organizationId');
  if (!organizationId) {
    return jsonError(400, 'BAD_REQUEST', 'organizationId is required');
  }

  // Authorize organization access
  let org;
  try {
    org = await OrganizationService.getOrganizationById(session.userId, organizationId);
  } catch {
    return jsonError(403, 'FORBIDDEN', 'Organization access denied');
  }

  try {
    await eventBus.start();
  } catch (err) {
    logger.error('realtime stream unavailable: event bus not connected', { err });
    return jsonError(503, 'UNAVAILABLE', 'Realtime is temporarily unavailable');
  }

  // Get all projects the user is authorized to view
  const accessibleProjects = await ProjectService.getAccessibleProjects(session.userId, organizationId);
  const authorizedProjectIds = new Set(accessibleProjects.map((p) => p.id));
  const isAdminOrOwner = org.role === 'owner' || org.role === 'admin';
  const lastEventId = parseLastEventId(req);

  const connectionId = `conn_${crypto.randomUUID()}`;
  const encoder = new TextEncoder();
  const log = logger.child({ connectionId, userId: session.userId, organizationId });

  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let lifetime: ReturnType<typeof setTimeout> | undefined;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>(
    {
      async start(controller) {
        const cleanup = () => {
          if (closed) return;
          closed = true;
          clearInterval(heartbeat);
          clearTimeout(lifetime);
          broker.unregister(connectionId);
          try {
            controller.close();
          } catch {
            // already closed by the client
          }
        };
        const write = (frame: string) => controller.enqueue(encoder.encode(frame));

        // Live events that arrive while we replay history are held back, then de-duplicated.
        let replaying = lastEventId !== null;
        const held: CollaborationEnvelope[] = [];

        const connection: ClientConnection = {
          connectionId,
          userId: session.userId,
          organizationId,
          authorizedProjectIds,
          isAdminOrOwner,
          deliver: (event, frame) => {
            if (replaying) held.push(event);
            else write(frame);
          },
          hasCapacity: () => (controller.desiredSize ?? 0) > -MAX_BUFFERED_FRAMES,
          close: cleanup,
        };

        broker.register(connection);

        // Tell the browser how long to wait before reconnecting after the stream ends.
        write(`retry: 2000\n\n`);
        write(
          `event: system.connected\ndata: ${JSON.stringify({
            connectionId,
            organizationId,
            authorizedProjectCount: authorizedProjectIds.size,
            resumedFrom: lastEventId,
            timestamp: new Date().toISOString(),
          })}\n\n`
        );

        if (lastEventId !== null) {
          try {
            const { rows } = await pool.query<{ payload: CollaborationEnvelope; seq: string }>(
              `SELECT payload, seq FROM collaboration_events
                WHERE organization_id = $1 AND seq > $2 AND published_at IS NOT NULL
                ORDER BY seq
                LIMIT $3`,
              [organizationId, lastEventId, REPLAY_LIMIT + 1]
            );

            if (rows.length > REPLAY_LIMIT) {
              // Too far behind to replay incrementally: tell the client to refetch its state.
              write(`event: system.resync\ndata: ${JSON.stringify({ reason: 'replay_window_exceeded' })}\n\n`);
            } else {
              for (const row of rows) {
                const event = { ...row.payload, seq: Number(row.seq) };
                if (canReceive(connection, event)) write(formatSseFrame(event));
              }
            }

            const replayed = new Set(rows.map((r) => Number(r.seq)));
            replaying = false;
            for (const event of held) {
              if (!replayed.has(event.seq)) write(formatSseFrame(event));
            }
          } catch (err) {
            log.error('realtime replay failed', { err, lastEventId });
            replaying = false;
            write(`event: system.resync\ndata: ${JSON.stringify({ reason: 'replay_failed' })}\n\n`);
          }
        }

        heartbeat = setInterval(() => {
          try {
            write(': ping\n\n');
          } catch {
            cleanup();
          }
        }, HEARTBEAT_MS);

        // Jitter spreads reconnects so a deploy doesn't produce a thundering herd.
        lifetime = setTimeout(cleanup, MAX_CONNECTION_MS + Math.floor(Math.random() * 30_000));

        req.signal.addEventListener('abort', cleanup);
      },
      cancel() {
        closed = true;
        clearInterval(heartbeat);
        clearTimeout(lifetime);
        broker.unregister(connectionId);
      },
    },
    { highWaterMark: 0 }
  );

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
