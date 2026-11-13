# System Architecture

## Overview

Fellow is a secure, multi-tenant collaboration platform designed with PostgreSQL as the authoritative source of truth, Next.js for server-rendered and client-side experiences, and a transactional durable outbox with Server-Sent Events (SSE) for near-real-time synchronization.

```text
Browser / Client (Kanban, Dashboard, Modals)
       │
       ▼
Next.js Frontend & Optimistic UI State
       │ (REST / SSE)
       ▼
Authenticated API Layer (/api/v1/*)
       │
       ▼
Authentication & Identity Verification (JWT / Session Cookie)
       │
       ▼
Centralized Multi-Tenant Authorization Policy (RBAC + Project Visibility)
       │
       ▼
Zod Input Validation & Domain Business Logic
       │
       ▼
PostgreSQL Transaction
       ├── Authoritative State Mutation (Tasks, Projects, Statuses, Comments)
       ├── Chronological Task Activity Logging (Audit Trail)
       └── Durable Outbox Event (`collaboration_events`)
       │
       ▼
Commit Transaction
       │
       ├──────────────────────────────┬──────────────────────────────┐
       ▼                              ▼                              ▼
Immediate relay (request)      Outbox worker(s): retry,        Database-Backed Notifications
claim row + pg_notify          backoff, dead-letter            Filtered by current permissions
       └──────────────┬───────────────┘
                      ▼
      Postgres LISTEN on every web instance
                      ▼
      Per-instance broker → authorized SSE subscribers (Last-Event-ID replay on reconnect)
```

## Architectural Layers

### 1. Presentation & Optimistic UI Layer
- Built with React, Next.js App Router, Tailwind CSS, and `@hello-pangea/dnd`.
- Captures user intent (e.g. task reordering, status movement, inline edits).
- Optimistically updates UI state for immediate responsiveness, using the same fractional-ordering rule as the server (`src/shared/fractional-index.ts`).
- Reconciles state when the canonical response arrives; rolls back on a concurrency conflict (409) or any other failure.

### 2. Authorization & Tenant Security Boundary
- Every API endpoint invokes centralized policies (`canViewOrganization`, `canViewProject`, `canEditTask`, `canReorderTask`, etc.).
- Resource IDs supplied by clients are never trusted as proof of access.
- Every query is explicitly scoped to the caller's organization ID and permitted project IDs.
- If a user lacks permission to view a resource, the API returns a consistent `404 Not Found` to prevent leaking resource existence.

### 3. Authoritative Relational Database (PostgreSQL)
- Strong relational integrity: composite foreign keys, cascading deletes, unique indexes (e.g. `(organization_id, user_id)` and `(project_id, key)`).
- Tasks maintain an integer `version` counter for optimistic concurrency control.
- Tasks maintain a `position` double precision float for fractional ordering.

### 4. Transactional Durable Outbox
- Whenever a task, status, or comment is created, updated, or moved, the corresponding `collaboration_event` is written within the exact same database transaction.
- If the database mutation succeeds, the event is guaranteed to exist.
- Right after commit, the request relays the event: it claims the row and emits `pg_notify` in a single transaction. Every web instance `LISTEN`s and fans the event out to its own SSE connections, so realtime works across any number of instances.
- Outbox workers (`workers/outbox/worker.ts`) relay anything the request path missed, for example after a crash or a frozen serverless function. They use `FOR UPDATE SKIP LOCKED`, exponential backoff, and a dead-letter state. Several workers can run safely at once.
- See [realtime-events.md](./realtime-events.md) for the full delivery guarantees.

### 5. Real-Time Transport (Server-Sent Events)
- Authenticated SSE endpoint: `/api/v1/realtime/stream?organizationId=...`.
- Validates that the subscriber is an active member of that organization.
- Resolves all projects the subscriber is authorized to access (including private project memberships).
- Filters every outbound event: private project events are never dispatched to organization members who lack project permissions.
- Heartbeat ping comments (`: ping\n\n`) are sent every 15 seconds to prevent browser and reverse-proxy timeouts.

## Code organization

```text
src/
  app/                    Next.js routes: pages, and the REST API under app/api/v1
    api/v1/**/route.ts    HTTP only: auth, validation, one service call, the response
    error.tsx, not-found.tsx, global-error.tsx   error UI
  features/board/         the Kanban board: components, useProjectBoard, pure board-state
  components/             UI shared by several pages (Navbar, Modal, ErrorAlert)
  lib/
    api/                  browser API layer: client (fetch + ApiError), endpoints, types
    use-realtime.ts       SSE subscription with seq de-duplication and resync
  shared/                 code with no server or browser dependency, used by both
  server/
    http/route.ts         route() error boundary, parseBody / parseQuery
    auth/                 sessions (JWT cookie or bearer), requireUser
    authorization/        the permission policy, one function per decision
    services/             business rules and data access, one class per resource
    validation/schemas.ts every request schema, and the types derived from them
    events/, realtime/    transactional outbox, NOTIFY bus, SSE broker
    errors/, security/, config/, observability/
  db/                     Drizzle schema, pool, versioned SQL migrations, seed
workers/outbox/           the relay worker (a separate process)
tests/                    Vitest against a real PostgreSQL
```

Dependencies point one way: `app` → `features`/`components` → `lib` → `shared` on the client, and
`app/api` → `server/http` → `server/services` → `db` on the server. Nothing under `src/server` is
imported by client code except types (`import type`), which are erased at build time.

### The request path

```ts
export const PATCH = route<{ taskId: string }>(async (req, { params }) => {
  const session = await requireUser(req);                        // 401 without a session
  const input = await parseBody(req, updateTaskSchema, 'Invalid update input'); // 400 / 422
  const task = await TaskService.updateTask(session.userId, params.taskId, input);
  return NextResponse.json({ task });
});
```

- **Handlers** hold no logic and no try/catch. `route()` turns anything thrown into the standard
  error body (below).
- **Services** check permissions through `permissions.*`, run queries, and write the change, its
  activity row, notifications and the outbox event in one transaction. Data access stays in the
  services rather than a separate repository layer: the outbox guarantee depends on the domain
  write and the event sharing a transaction, and the concurrency tests pin that behavior.
- **Schemas** live in `server/validation/schemas.ts`; service input types come from them.

### Errors

| Where | How |
|---|---|
| API | Services throw `AppError` subclasses (`NotFoundError`, `ConflictError`, ...). `route()` returns `{ error: { code, message, requestId, details? } }` with the matching status; a malformed JSON body is 400, a schema mismatch 422 with per-field `details`, anything unexpected a logged 500 that reveals nothing internal. Every response carries `x-request-id`. |
| Browser API layer | Non-2xx responses become `ApiError` (status, code, message). `errorMessage(err)` gives the text to show, `isConflict(err)` detects a 409. |
| Pages | Load failures render an `ErrorAlert` with the API's message; failed optimistic moves roll back. Fire-and-forget calls (notifications, the org list) fall back to an empty state instead of rejecting unhandled. |
| Rendering bugs | `app/error.tsx` catches them per route, `global-error.tsx` if the root layout fails. |

### State

| Kind | Where it lives |
|---|---|
| Server state (projects, cards, members) | Fetched per page through `lib/api/endpoints`; the board's lives in `useProjectBoard`, kept current by realtime events. |
| Realtime | `useRealtime` de-duplicates by `seq`; `applyRealtimeEvent` / `upsertCard` merge events and responses by `version`, so neither a duplicate nor a stale update can win. |
| URL state | The active organization (`/dashboard?org=`), the open task (`?task=`), route params. |
| Local view state | Filters, open dialogs, form fields: `useState` in the page. |

No global store: no state is shared across pages except what the URL and the session already carry.

### Configuration

`src/server/config/env.ts` validates every variable with Zod; `instrumentation.ts` checks it at
boot and exits in production when it is invalid. `.env.example` lists each variable; tests set
their own in `vitest.config.mts`.

### Commands

| Command | Does |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run db:migrate` / `npm run db:seed` | apply migrations / load demo data |
| `npm run worker:outbox` | run the outbox relay worker |
| `npm test` | all tests (needs PostgreSQL, see `.env.example`) |
| `npm run lint`, `npm run typecheck` | ESLint, and TypeScript with unused-code checks |
| `npm run verify` | lint, typecheck and tests, as CI runs them |
| `npm run build` | production build |

