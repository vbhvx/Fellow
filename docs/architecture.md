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
In-Memory Event Broker         Background Outbox Worker        Database-Backed Notifications
       │                              │                              │
       ▼                              ▼                              ▼
Authorized SSE Subscribers     Retry / Publication Recovery   Filtered by current permissions
```

## Architectural Layers

### 1. Presentation & Optimistic UI Layer
- Built with React, Next.js App Router, Tailwind CSS, and `@hello-pangea/dnd`.
- Captures user intent (e.g. task reordering, status movement, inline edits).
- Optimistically updates UI state for immediate responsiveness.
- Reconciles state when canonical response arrives; safely rolls back and triggers state refresh if a concurrency conflict (409) or authorization error occurs.

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
- An in-process event broker immediately broadcasts the committed event to active authorized SSE connections.
- A background worker (`workers/outbox/worker.ts`) continuously monitors for un-published events (e.g. if a process crashed before socket broadcast) and ensures reliable delivery.

### 5. Real-Time Transport (Server-Sent Events)
- Authenticated SSE endpoint: `/api/v1/realtime/stream?organizationId=...`.
- Validates that the subscriber is an active member of that organization.
- Resolves all projects the subscriber is authorized to access (including private project memberships).
- Filters every outbound event: private project events are never dispatched to organization members who lack project permissions.
- Heartbeat ping comments (`: ping\n\n`) are sent every 15 seconds to prevent browser and reverse-proxy timeouts.

