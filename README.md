# Fellow: Secure Multi-Tenant Project & Task Collaboration Platform

Fellow is an enterprise-grade collaborative SaaS application built with **TypeScript**, **Next.js**, and **PostgreSQL**. It delivers organization-level data isolation, fine-grained role-based authorization, configurable Kanban workflow boards, stable fractional task reordering, near-real-time synchronization via a durable outbox with Server-Sent Events (SSE), and comprehensive audit history.

---

## Key Features

1. **Strict Multi-Tenant Isolation:** Complete organization-level data boundaries. Cross-tenant reads and mutations are rejected at the application and query levels.
2. **Fine-Grained RBAC & Visibility:**
   - Organization Roles: `Owner`, `Admin`, `Member`, `Viewer`, `Guest`.
   - Project Visibility: `Organization-visible`, `Private`, and `Guest-accessible`.
   - Administrative oversight allows Org Owners/Admins to govern private projects within their tenant without cross-tenant leakage.
3. **Interactive Kanban Boards & Reliable Reordering:**
   - Configurable workflow columns (Backlog, To Do, In Progress, In Review, Done).
   - Drag-and-drop reordering with optimistic UI updates.
   - Deterministic fractional indexing ($1000.0$ step, midpoint calculation) with automatic column rebalancing when precision threshold ($< 0.0001$) is reached.
   - Keyboard accessibility fallback for task movement.
4. **Optimistic Concurrency Control:**
   - Tasks maintain an integer `version` counter.
   - Stale concurrent updates or moves are detected and rejected with `409 Conflict`, accompanied by UI conflict recovery banners.
5. **Real-Time Collaboration & Durable Outbox:**
   - Server-Sent Events (SSE) stream (`/api/v1/realtime/stream`) delivering live board updates.
   - Durable outbox pattern (`collaboration_events`) ensures updates are committed atomically with mutations and published reliably.
   - Channel scoping ensures private project events are never dispatched to unauthorized members.
6. **Task Context & Audit History:**
   - Chronological audit timeline recording all status changes, reassignments, due-date adjustments, and reordering.
   - Task comments with author tracking and real-time broadcast.
7. **Scoped Search & In-App Notifications:**
   - Global search queries only projects and tasks the caller is authorized to view.
   - Notification links re-verify permissions before rendering to respect permission revocations.
8. **Documented REST API & OpenAPI 3.0:**
   - Standardized `/api/v1` routes with consistent error envelopes.
   - Interactive OpenAPI documentation explorer available at `/docs` and raw spec at `/api/v1/openapi.json`.

---

## Architecture

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

---

## Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript |
| **Styling** | Tailwind CSS |
| **Drag & Drop** | `@hello-pangea/dnd` |
| **Backend & API** | Next.js App Router Route Handlers |
| **Database** | PostgreSQL 16 (Native relational database) |
| **ORM / Data Access**| Drizzle ORM with `pg` connection pool |
| **Validation** | Zod runtime schema validation |
| **Authentication** | Cryptographic session cookies & JWT via `jose` and `bcryptjs` |
| **Real-time Transport** | Server-Sent Events (SSE) with durable outbox broker |
| **API Documentation** | OpenAPI 3.0.3 specification (`docs/openapi.yaml`) |
| **Testing** | Vitest (Unit, Integration, Security, and Concurrency suites) |

---

## Prerequisites

- **Node.js:** v18+ (verified on Node.js v26.12.1)
- **PostgreSQL:** v14+ (running locally on port 5432)

---

## Local Installation & Setup

### 1. Clone & Install Dependencies
```bash
git clone <repository_url> fellow
cd fellow
npm install
```

### 2. Environment Configuration
Create `.env` using `.env.example`:
```bash
cp .env.example .env
```
Ensure your database credentials match your local PostgreSQL server:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/fellow
TEST_DATABASE_URL=postgresql://user:password@localhost:5432/fellow_test
JWT_SECRET=super_secret_production_ready_fellow_platform_signing_key_2026
PORT=3000
NODE_ENV=development
```

### 3. Run Database Migrations
Create databases and apply migrations:
```bash
# Create databases (if not already existing)
createdb fellow
createdb fellow_test

# Apply migrations
npm run db:migrate
```

### 4. Seed Initial Data
Seed organizations, projects, tasks, workflow columns, and test accounts:
```bash
npm run db:seed
```

#### Default Seed Accounts (Password: `password123` for all)
- **Acme Owner:** `alice@acme.com`
- **Acme Admin:** `bob@acme.com`
- **Acme Member:** `charlie@acme.com`
- **Starlight Media Owner:** `david@starlight.com`

---

## Running the Application

### Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Background Outbox Worker (Optional / Production)
Runs the durable outbox publisher worker to poll and publish any pending events:
```bash
npm run worker:outbox
```

### Production Build & Run
```bash
npm run build
npm run start
```

---

## Testing Strategy & Verification

The test suite covers unit policies, deterministic ordering, multi-tenant isolation, version concurrency conflicts, and full REST API integration.

```bash
# Run all test suites
npm test

# Run security isolation tests specifically
npm run test:security

# Run concurrency and conflict tests
npm run test:concurrency
```

### Test Coverage Highlights
- **Unit (`tests/unit/permissions.test.ts`):** Complete RBAC matrix across Owner, Admin, Member, Viewer, Guest; project visibility rules; creator deletion rights.
- **Unit (`tests/unit/ordering.test.ts`):** Fractional indexing, top/bottom column insertions, midpoint generation, compression threshold detection ($< 0.0001$), full rebalancing.
- **Security (`tests/security/tenant-isolation.test.ts`):**
  - Cross-tenant data isolation: User from Org A cannot read Org B projects or tasks.
  - Resource ID tampering rejection: 404 response on cross-tenant ID queries.
  - Cross-tenant task assignment prevention.
  - Private project access restriction: Org members without explicit project membership cannot access private projects.
  - Search scoping: Inaccessible tasks are never revealed in search.
  - Immediate membership revocation.
- **Concurrency (`tests/concurrency/concurrency.test.ts`):**
  - Optimistic locking version mismatch detection (`409 Conflict`).
  - Concurrent move conflict detection.
  - Durable outbox persistence and worker publication.
- **Integration (`tests/integration/api.test.ts`):** Full end-to-end API lifecycle across auth, orgs, projects, tasks, moves, comments, search, and statuses.

---

## Detailed Documentation Directory

For in-depth architectural and design documentation, see:
- [System Architecture](file:///docs/architecture.md)
- [Authorization & RBAC Matrix](file:///docs/authorization-matrix.md)
- [Multi-Tenant Data Isolation](file:///docs/tenant-isolation.md)
- [Fractional Ordering Strategy](file:///docs/ordering-strategy.md)
- [Real-Time Events & Durable Outbox](file:///docs/realtime-events.md)
- [OpenAPI 3.0 Specification](file:///docs/openapi.yaml)

---

## License

MIT

