# Real-Time Event Architecture

## Goals

1. **No ghost events.** Clients never see a change whose transaction rolled back.
2. **No lost events.** A committed change reaches every authorized subscriber, even if the process that made the change crashes right after commit, or the subscriber's connection drops.
3. **Horizontal scale.** Any number of web instances and relay workers; an SSE client connected to instance A sees writes made through instance B.
4. **Tenant isolation.** Live delivery and replay apply the same project-level authorization.

## Pipeline

```text
 request on instance B                               every instance (A, B, ...)
 ─────────────────────                               ──────────────────────────
 BEGIN
   UPDATE tasks ...                                   dedicated pg connection:
   INSERT task_activities ...                           LISTEN fellow_events
   INSERT collaboration_events (seq = 1042)                    │
 COMMIT                                                        ▼
   │                                                  local broker ── canReceive()? ──▶ SSE clients
   ▼  relay (immediately, in the request)                                               (id: 1042)
 BEGIN
   UPDATE collaboration_events SET published_at = NOW()
     WHERE id = $1 AND published_at IS NULL  (FOR UPDATE SKIP LOCKED)
   SELECT pg_notify('fellow_events', <envelope>)  ── delivered on COMMIT ──▶ all listeners
 COMMIT

 outbox worker(s): same relay for anything the request path didn't get to
```

### 1. Transactional outbox (`src/server/events/outbox.ts`)

The event row is inserted in the same transaction as the domain change, so it exists if and only if the change committed. Each row gets a global `seq` (`BIGSERIAL`), which is the SSE event id.

### 2. Relay

Relaying claims the row and emits `pg_notify` **in one transaction**:

- NOTIFY is only delivered on commit, so marking an event published and broadcasting it are atomic. If the notify fails, the row stays pending.
- `FOR UPDATE SKIP LOCKED` lets the request path and any number of workers race for the same row without double-publishing. `tests/realtime/event-delivery.test.ts` races two request-path relays against three workers for the same event and asserts that exactly one notification arrives.

The request path relays immediately after commit, which gives low latency. The worker (`workers/outbox/worker.ts`) sweeps whatever is left: the process crashed, the serverless function was frozen, or the database blipped. The worker:

- processes pending rows in `seq` order, with a savepoint per row so one poison event can't block a batch;
- retries with exponential backoff (1s, 2s, 4s, … capped at 5 min) via `next_attempt_at`;
- **dead-letters** after 8 attempts (`failed_at`, `last_error`). Dead-lettered rows are excluded from the partial index and surfaced by `/api/v1/health`;
- prunes delivered events older than 7 days, which is the replay window.

### 3. Cross-instance fan-out (`src/server/realtime/bus.ts`)

Each web instance opens one dedicated `LISTEN fellow_events` connection the first time a client subscribes, and forwards notifications into its in-process broker. Postgres caps NOTIFY payloads at 8000 bytes, so larger envelopes (for example, a task with a long description) are sent as `{ ref: seq }` and loaded from the outbox by each listener.

If the listener connection drops, it reconnects with exponential backoff. Anything it missed is recovered by client replay (below).

Previously, the broker was an in-memory singleton fed directly by the process that made the change. The worker ran as a separate process, so its "recovery" broadcasts went into an empty broker and reached nobody. A second web instance had the same problem.

### 4. Delivery to clients (`src/app/api/v1/realtime/stream/route.ts`)

| Concern | Mechanism |
|---|---|
| Authentication | Session cookie or `Authorization: Bearer` |
| Org membership | Must be a member of `organizationId`, otherwise 403 |
| Project visibility | `canReceive()` in `broker.ts`, one function used for both live delivery and replay |
| Resume after disconnect | Browser sends `Last-Event-ID`; server replays `seq > id` from the outbox (up to 500 events) |
| Replay/live overlap | Live events are held during replay, then de-duplicated by `seq` |
| Too far behind | Server sends `system.resync`; client refetches the board |
| Access revoked mid-stream | Streams close after ~5 min (with jitter) and reconnect, which re-runs authorization |
| Slow consumers | Dropped once more than 1000 frames are queued; they reconnect and replay |
| Proxies | 15s heartbeat comments, `X-Accel-Buffering: no`, `retry: 2000` |

### 5. Client (`src/lib/use-realtime.ts`)

- De-duplicates by `seq` (bounded set), because replay and live delivery may overlap.
- On `system.resync`, refetches canonical state.
- The board applies `task.updated` / `task.moved` only if the event's `version` is at least the local version, so a late event can never roll a card back.

## Delivery semantics

**At-least-once** from the outbox to each listening instance, and **effectively-once** per client, because the client de-duplicates by `seq`. Ordering is by `seq`, which is commit-ordered for any single aggregate; the board relies on `version` rather than arrival order anyway.

## Envelope

```json
{
  "eventId": "evt_d290f1ee-6c54-4b01-90e6-d701748f0851",
  "seq": 1042,
  "type": "task.moved",
  "organizationId": "org_56b270a3",
  "projectId": "proj_908f1b1c",
  "resourceId": "task_48b100fa",
  "version": 4,
  "occurredAt": "2026-10-29T16:54:19.000Z",
  "payload": { "task": { "id": "task_48b100fa", "statusId": "status_done", "position": 3500, "version": 4 } }
}
```

## When to replace Postgres NOTIFY

NOTIFY works well up to thousands of events per second and needs no extra infrastructure. Every listener receives every event and filters locally, so at very high fan-out you would swap `bus.ts` for Redis Streams, NATS, or Kafka, partitioned by organization. The outbox, relay, replay, and client contract stay the same; only `notifyEvents` and `EventBusListener` change.
