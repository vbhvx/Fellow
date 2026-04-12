# Real-Time Event Architecture & Publication Strategy

## Transport Selection: Server-Sent Events (SSE)

Fellow uses **Server-Sent Events (SSE)** for real-time delivery because:
1. **Unidirectional stream:** Client updates (task moves, edits, comments) use standard HTTP requests with explicit status codes, transactional database locking, and structured error responses.
2. **Native reconnection & cursor recovery:** Built-in browser event stream reconnection.
3. **Zero firewall/proxy impedance:** Runs over standard HTTPS connections without complex WebSocket handshake upgrades.

## Collaboration Event Envelope

All events emitted to clients follow a standard envelope schema:

```json
{
  "eventId": "evt_d290f1ee-6c54-4b01-90e6-d701748f0851",
  "type": "task.moved",
  "organizationId": "org_56b270a3",
  "projectId": "proj_908f1b1c",
  "resourceId": "task_48b100fa",
  "version": 4,
  "occurredAt": "2026-10-29T16:54:19.000Z",
  "payload": {
    "task": {
      "id": "task_48b100fa",
      "statusId": "status_completed",
      "position": 3500.0,
      "version": 4
    }
  }
}
```

## Durable Outbox Pattern

To prevent "ghost events" (broadcasting updates for database transactions that subsequently rollback) or lost events (database succeeds but process terminates before socket broadcast):

```text
[HTTP Handler]
       │
       ▼
[Begin DB Transaction]
       ├── Update Task Status & Position
       ├── Insert TaskActivity Log
       └── Insert CollaborationEvent into `collaboration_events` Table (Outbox)
[Commit DB Transaction]
       │
       ▼
[Immediate Broadcast to In-Memory Event Broker]
       │
       ▼
[Mark `collaboration_events.published_at = NOW()`]
```

### Publication Recovery Worker
A dedicated background worker (`workers/outbox/worker.ts`) polls `collaboration_events` where `published_at IS NULL`. Any un-published events are broadcast and marked as published with incremented attempt counts.

## Subscription Authorization & Scoping

1. **Authentication:** The `/api/v1/realtime/stream` route inspects session cookies or `Authorization: Bearer` tokens.
2. **Organization Verification:** Caller must be an active member of `organizationId`.
3. **Project Boundary Filtering:** The connection registry caches the set of `authorizedProjectIds` for each connected client. When an event is broadcast:
   - If the event is project-scoped and the recipient does not have access to that project (e.g. private project), the event is silently omitted.
   - Private project activities are never leaked to regular organization members.

## Client Reconnection & Synchronization

When a client loses network connectivity:
1. The connection badge changes from `Connected` to `Disconnected` or `Connecting`.
2. The browser automatically initiates reconnection with the last received event ID.
3. Upon reconnection, the client refetches canonical project tasks and workflow columns (`loadProjectData()`), ensuring any updates missed during the disconnect window are reconciled.

