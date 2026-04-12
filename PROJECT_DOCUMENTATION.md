# Complete System Architecture & Technical Documentation — Fellow Collaboration Platform

> **System Identifier:** `fellow-collaboration-platform`  
> **Repository Root:** `/Users/vaibhavsaini/Desktop/Projects/Shipped/Fellow`  
> **Specification Version:** 1.0.0  
> **Document Status:** Authoritative Technical Reference  
> **Last Verified & Audited:** October 31, 2026  

---

## Table of Contents

1. [Executive Summary & System Scope](#1-executive-summary-system-scope)
2. [Complete Codebase Analysis](#2-complete-codebase-analysis)
   - [2.1 Purpose & Domain Scope](#21-purpose-domain-scope)
   - [2.2 Technology Stack & Dependency Matrix](#22-technology-stack-dependency-matrix)
   - [2.3 Repository File Tree & Directory Breakdown](#23-repository-file-tree-directory-breakdown)
   - [2.4 Module Responsibilities & System Boundaries](#24-module-responsibilities-system-boundaries)
   - [2.5 Module Dependency Graph](#25-module-dependency-graph)
   - [2.6 Application Lifecycle & Execution Entry Points](#26-application-lifecycle-execution-entry-points)
   - [2.7 Implementation Status: Complete, Partial, and Missing Features](#27-implementation-status-complete-partial-and-missing-features)
3. [Complete API and Endpoint Inventory](#3-complete-api-and-endpoint-inventory)
   - [3.1 API Overview & Global Standards](#31-api-overview-global-standards)
   - [3.2 Authentication & Session Endpoints](#32-authentication-session-endpoints)
   - [3.3 Identity & System Health Endpoints](#33-identity-system-health-endpoints)
   - [3.4 Organization Management Endpoints](#34-organization-management-endpoints)
   - [3.5 Project Management Endpoints](#35-project-management-endpoints)
   - [3.6 Workflow Status Configuration Endpoints](#36-workflow-status-configuration-endpoints)
   - [3.7 Task Management & Fractional Reordering Endpoints](#37-task-management-fractional-reordering-endpoints)
   - [3.8 Task Comments Endpoints](#38-task-comments-endpoints)
   - [3.9 Notification Endpoints](#39-notification-endpoints)
   - [3.10 Scoped Search Endpoints](#310-scoped-search-endpoints)
   - [3.11 Real-Time Server-Sent Events (SSE) Stream](#311-real-time-server-sent-events-sse-stream)
   - [3.12 OpenAPI Specification Endpoint](#312-openapi-specification-endpoint)
4. [Frontend Architecture & User Workflows](#4-frontend-architecture-user-workflows)
   - [4.1 Architecture Overview & UI Patterns](#41-architecture-overview-ui-patterns)
   - [4.2 Page Routes & Navigation Structure](#42-page-routes-navigation-structure)
   - [4.3 Component Hierarchy & Design System](#43-component-hierarchy-design-system)
   - [4.4 State Management & Data Fetching](#44-state-management-data-fetching)
   - [4.5 Drag-and-Drop Reordering & Optimistic Updates](#45-drag-and-drop-reordering-optimistic-updates)
   - [4.6 Real-Time Collaboration & SSE Event Handling](#46-real-time-collaboration-sse-event-handling)
   - [4.7 Form Validation & Error Recovery Banners](#47-form-validation-error-recovery-banners)
   - [4.8 UI/Backend Consistency Analysis](#48-uibackend-consistency-analysis)
5. [Backend Architecture & Business Logic](#5-backend-architecture-business-logic)
   - [5.1 Layered Architecture Pattern](#51-layered-architecture-pattern)
   - [5.2 Authentication Guard & Session Resolution](#52-authentication-guard-session-resolution)
   - [5.3 Centralized Multi-Tenant Authorization Policy](#53-centralized-multi-tenant-authorization-policy)
   - [5.4 Fractional Indexing & Automatic Column Rebalancing Algorithm](#54-fractional-indexing-automatic-column-rebalancing-algorithm)
   - [5.5 Optimistic Concurrency Control (OCC)](#55-optimistic-concurrency-control-occ)
   - [5.6 Transactional Durable Outbox Pattern](#56-transactional-durable-outbox-pattern)
   - [5.7 In-Memory Real-Time Event Broker](#57-in-memory-real-time-event-broker)
   - [5.8 Asynchronous Background Outbox Worker](#58-asynchronous-background-outbox-worker)
   - [5.9 Audit Trail & Activity Logging](#59-audit-trail-activity-logging)
   - [5.10 Error Handling & Standardized Response Formatting](#510-error-handling-standardized-response-formatting)
6. [Database & Data Model Documentation](#6-database-data-model-documentation)
   - [6.1 Database Engine & Data Access Architecture](#61-database-engine-data-access-architecture)
   - [6.2 Entity-Relationship Diagram (Mermaid ERD)](#62-entity-relationship-diagram-mermaid-erd)
   - [6.3 Complete Table Schemas & Column Dictionaries](#63-complete-table-schemas-column-dictionaries)
   - [6.4 Constraints, Foreign Keys & Cascading Semantics](#64-constraints-foreign-keys-cascading-semantics)
   - [6.5 Indexes & Query Optimization](#65-indexes-query-optimization)
   - [6.6 Data Lifecycle, Soft Deletes & Archival Policies](#66-data-lifecycle-soft-deletes-archival-policies)
   - [6.7 Database Migrations & Seeding Strategy](#67-database-migrations-seeding-strategy)
7. [End-to-End Data Flow & Execution Traces](#7-end-to-end-data-flow-execution-traces)
   - [7.1 Workflow 1: User Registration & Session Establishment](#71-workflow-1-user-registration-session-establishment)
   - [7.2 Workflow 2: Organization Creation & Default Owner Provisioning](#72-workflow-2-organization-creation-default-owner-provisioning)
   - [7.3 Workflow 3: Project Creation with Default Workflow Column Initialization](#73-workflow-3-project-creation-with-default-workflow-column-initialization)
   - [7.4 Workflow 4: Task Creation, Outbox Commitment & Live Broadcast](#74-workflow-4-task-creation-outbox-commitment-live-broadcast)
   - [7.5 Workflow 5: Drag-and-Drop Task Reordering with Automatic Column Rebalancing](#75-workflow-5-drag-and-drop-task-reordering-with-automatic-column-rebalancing)
   - [7.6 Workflow 6: Concurrent Task Edit/Move Conflict Detection (`409 Conflict`)](#76-workflow-6-concurrent-task-editmove-conflict-detection-409-conflict)
   - [7.7 Workflow 7: Real-Time SSE Subscription & Channel Boundary Filtering](#77-workflow-7-real-time-sse-subscription-channel-boundary-filtering)
   - [7.8 Workflow 8: Cross-Tenant Resource Isolation & Existence Concealment (`404 Not Found`)](#78-workflow-8-cross-tenant-resource-isolation-existence-concealment-404-not-found)
8. [Edge Cases, Failure Scenarios, and Error Handling](#8-edge-cases-failure-scenarios-and-error-handling)
   - [8.1 Comprehensive Edge Case Matrix](#81-comprehensive-edge-case-matrix)
   - [8.2 Tenant Boundary Violations & Resource Tampering](#82-tenant-boundary-violations-resource-tampering)
   - [8.3 Concurrency Race Conditions & Conflict Resolution](#83-concurrency-race-conditions-conflict-resolution)
   - [8.4 Floating-Point Gap Compression & Boundary Collisions](#84-floating-point-gap-compression-boundary-collisions)
   - [8.5 Network Disconnections & SSE Auto-Reconnection](#85-network-disconnections-sse-auto-reconnection)
   - [8.6 Outbox Broker Fault Tolerance & Worker Recovery](#86-outbox-broker-fault-tolerance-worker-recovery)
9. [Authentication, Security, and Configuration](#9-authentication-security-and-configuration)
   - [9.1 Cryptographic Session Tokens (JWT via `jose`)](#91-cryptographic-session-tokens-jwt-via-jose)
   - [9.2 Password Hashing & Salt Rounds (Bcrypt)](#92-password-hashing-salt-rounds-bcrypt)
   - [9.3 Centralized Role-Based Access Control (RBAC) Matrix](#93-centralized-role-based-access-control-rbac-matrix)
   - [9.4 Project Visibility Isolation Model](#94-project-visibility-isolation-model)
   - [9.5 Invitation Security & One-Way Cryptographic Token Hashing](#95-invitation-security-one-way-cryptographic-token-hashing)
   - [9.6 Environment Variables & Configuration Dictionary](#96-environment-variables-configuration-dictionary)
10. [External Integrations and Dependencies](#10-external-integrations-and-dependencies)
    - [10.1 Production Runtime Dependencies](#101-production-runtime-dependencies)
    - [10.2 Development & Build Tooling Dependencies](#102-development-build-tooling-dependencies)
11. [Build, Runtime, Testing, and Deployment](#11-build-runtime-testing-and-deployment)
    - [11.1 Runtime Prerequisites & Environment Setup](#111-runtime-prerequisites-environment-setup)
    - [11.2 Installation & Database Migration Commands](#112-installation-database-migration-commands)
    - [11.3 Development Server & Background Worker Execution](#113-development-server-background-worker-execution)
    - [11.4 Production Build Verification & Results](#114-production-build-verification-results)
    - [11.5 Automated Test Suite Execution & Verified Results](#115-automated-test-suite-execution-verified-results)
    - [11.6 Production Deployment & Reverse Proxy Requirements](#116-production-deployment-reverse-proxy-requirements)
12. [Technical Debt, Risk Analysis, and Improvement Roadmap](#12-technical-debt-risk-analysis-and-improvement-roadmap)
    - [12.1 High Severity Findings & Vulnerabilities](#121-high-severity-findings-vulnerabilities)
    - [12.2 Medium Severity Findings & Inconsistencies](#122-medium-severity-findings-inconsistencies)
    - [12.3 Low Severity Findings & Architectural Cleanups](#123-low-severity-findings-architectural-cleanups)
    - [12.4 Dead Code & Empty Directory Inventory](#124-dead-code-empty-directory-inventory)
    - [12.5 Prioritized Remediation Roadmap](#125-prioritized-remediation-roadmap)

---

## 1. Executive Summary & System Scope

**Fellow** is an enterprise-grade multi-tenant collaborative project management and task workflow platform. It is engineered to provide strict tenant boundary isolation, fine-grained role-based authorization, configurable Kanban workflow boards, deterministic fractional task reordering, near-real-time synchronization via a transactional durable outbox with Server-Sent Events (SSE), and audit-grade historical activity tracking.

### Core Architectural Invariants:
1. **Multi-Tenant Boundary Guarantee:** Every project, task, status, comment, activity entry, and collaboration event belongs to a strictly defined organization boundary (`organization_id`). Cross-tenant reads and mutations are denied at the authorization and database query levels.
2. **Existence Concealment:** When a caller attempts to read or mutate a resource that does not exist or belongs to another organization/confidential project, the system returns `404 Not Found` rather than `403 Forbidden` to prevent resource existence enumeration.
3. **Deterministic Fractional Indexing:** Task order within a column is calculated using a floating-point midpoint algorithm ($step = 1000.0$). If insertions compress the gap between neighboring items below $0.0001$, the column is automatically rebalanced inside the atomic move transaction.
4. **Optimistic Concurrency Control (OCC):** Tasks maintain an integer `version` counter. Concurrent mutations or drag-and-drop operations with stale versions are rejected with `409 Conflict`.
5. **Transactional Durable Outbox:** State mutations, audit activity records, and real-time collaboration events are committed within the exact same PostgreSQL transaction. Committed events are dispatched to an in-memory event broker and backed by a background recovery worker (`workers/outbox/worker.ts`).
6. **Scoped SSE Distribution:** Server-Sent Events streams verify both organization membership and explicit project visibility. Events originating in private projects are never dispatched to unauthorized members.

---

## 2. Complete Codebase Analysis

### 2.1 Purpose & Domain Scope

Fellow is designed for organizations requiring structured task collaboration with strict privacy controls. The application supports multiple isolated organizations (tenants), customizable multi-column workflow boards per project, project-level visibility settings (`organization`, `private`, `guest`), task assignments, due dates, priority tags, markdown descriptions, task-level comments, chronologically ordered audit logs, in-app notifications, and instant full-text search scoped to authorized resources.

### 2.2 Technology Stack & Dependency Matrix

The application is implemented as a full-stack TypeScript application using Next.js App Router and PostgreSQL.

#### Runtime & Platform Dependencies:
- **Node.js:** v18.0.0+ (Tested on Node.js v26.6.6 / Darwin arm64)
- **Database Engine:** PostgreSQL 14+ (Tested against native PostgreSQL 16 relational server)

#### Production Dependencies (`package.json`):
| Package | Version | Purpose | Location in Codebase |
|---|---|---|---|
| `next` | `^14.2.35` | App Router full-stack web framework & API handlers | All `src/app/**` pages and route handlers |
| `react` | `^18.3.1` | Core declarative UI component library | All client components |
| `react-dom` | `^18.3.1` | React DOM rendering bindings | Layouts and pages |
| `drizzle-orm` | `^0.45.4` | TypeScript-first Object-Relational Mapping & query builder | `src/db/schema/index.ts`, `src/db/client.ts`, services |
| `pg` | `^8.23.1` | Native PostgreSQL connection client & connection pool (`pg.Pool`) | `src/db/client.ts`, `src/db/migrate.ts` |
| `jose` | `^6.2.14` | JSON Web Token (JWT) creation (`SignJWT`) and verification (`jwtVerify`) | `src/server/auth/session.ts` |
| `bcryptjs` | `^3.0.3` | Password hashing and salt verification (`hash`, `compare`, `genSalt`) | `src/server/auth/session.ts` |
| `zod` | `^4.6.7` | Runtime type validation for HTTP payloads and query parameters | `src/server/validation/schemas.ts` |
| `@hello-pangea/dnd` | `^18.0.1` | Accessible drag-and-drop toolkit for Kanban boards | `src/app/projects/[projectId]/page.tsx` |
| `lucide-react` | `^1.64.0` | SVG icons for platform navigation and UI indicators | `src/components/*`, pages |
| `tailwind-merge` | `^3.7.0` | Utility class merging | Frontend styling |
| `clsx` | `^2.1.1` | Conditional class composition | Frontend styling |
| `cookie` | `^2.0.1` | HTTP cookie serialization/deserialization | Cookie header parsing |
| `date-fns` | `^4.4.0` | Date manipulation and formatting | Date display formatting |
| `dotenv` | `^18.0.9` | Environment variable loader from `.env` | `src/db/client.ts` |
| `yaml` | `^2.9.1` | YAML specification parser for OpenAPI route | `src/app/api/v1/openapi.json/route.ts` |

#### Development & Testing Dependencies:
| Package | Version | Purpose |
|---|---|---|
| `typescript` | `^5.6.3` | Static typing and compiler |
| `tsx` | `^4.23.15` | Native TypeScript script executor for migrations, seeds, and workers |
| `vitest` | `^5.0.5` | Fast unit, security, integration, and concurrency test runner |
| `drizzle-kit` | `^0.31.11` | Drizzle ORM schema generator and migration toolkit |
| `tailwindcss` | `^3.4.17` | Utility-first CSS framework |
| `postcss` | `^8.5.32` | CSS post-processing pipeline |
| `autoprefixer` | `^10.6.2` | CSS vendor prefixing |
| `@types/node` | `^26.6.6` | TypeScript type declarations for Node.js runtime |
| `@types/pg` | `^8.23.1` | Type definitions for `pg` pool and client |
| `@types/bcryptjs` | `^2.4.6` | Type definitions for `bcryptjs` |
| `@types/cookie` | `^0.6.0` | Type definitions for cookie library |
| `@types/react` | `^18.3.12` | React 18 component typing |
| `@types/react-dom` | `^18.3.1` | React DOM typing |

---

### 2.3 Repository File Tree & Directory Breakdown

```text
Fellow/
├── .env                              # Local active environment configuration
├── .env.example                      # Environment variables template
├── .gitignore                        # Git exclusion rules
├── package.json                      # Project metadata, dependencies, scripts
├── package-lock.json                 # Pinned dependency tree
├── tsconfig.json                     # TypeScript compiler configuration (target es2022, bundler)
├── next.config.mjs                   # Next.js configuration (external server packages: pg, bcryptjs)
├── tailwind.config.js                # Tailwind CSS styling configuration
├── postcss.config.js                 # PostCSS plugin definitions
├── vitest.config.ts                  # Vitest test framework configuration
├── README.md                         # Project overview and quickstart instructions
├── next-env.d.ts                     # Next.js TypeScript declarations
│
├── docs/                             # Architectural Specifications & OpenAPI Spec
│   ├── architecture.md               # System overview and high-level architectural layers
│   ├── authorization-matrix.md       # RBAC permission matrix and governance override policy
│   ├── tenant-isolation.md           # Multi-tenant data scoping and security guidelines
│   ├── ordering-strategy.md          # Fractional indexing and rebalancing mathematics
│   ├── realtime-events.md            # Outbox pattern, SSE protocol, event schemas
│   └── openapi.yaml                  # OpenAPI 3.0.3 REST specification
│
├── workers/                          # Background Process Workers
│   ├── outbox/
│   │   └── worker.ts                 # Durable Outbox background recovery and polling worker
│   └── notifications/                # [EMPTY DIRECTORY] Planned notification dispatcher worker
│
├── scripts/                          # [EMPTY DIRECTORY] Deployment/utility script placeholder
│
├── tests/                            # Automated Vitest Test Suites
│   ├── unit/
│   │   ├── permissions.test.ts       # Centralized RBAC policy matrix unit tests (9 tests)
│   │   └── ordering.test.ts          # Fractional indexing & rebalance unit tests (7 tests)
│   ├── security/
│   │   └── tenant-isolation.test.ts  # Cross-tenant data isolation & tampering rejection (7 tests)
│   ├── concurrency/
│   │   └── concurrency.test.ts       # OCC version conflict & outbox persistence tests (3 tests)
│   ├── integration/
│   │   └── api.test.ts               # End-to-end HTTP API lifecycle integration tests (7 tests)
│   └── e2e/                          # [EMPTY DIRECTORY] End-to-end test placeholder
│
└── src/
    ├── types/
    │   └── global.d.ts               # Global CSS module declarations
    │
    ├── db/                           # Relational Persistence Layer
    │   ├── client.ts                 # PostgreSQL connection pool (`pg.Pool`) & Drizzle client
    │   ├── migrate.ts                # DDL migration script with idempotency (`CREATE TABLE IF NOT EXISTS`)
    │   ├── seed.ts                   # Database seed populating demo accounts, orgs, projects, tasks
    │   └── schema/
    │       └── index.ts              # 12 Drizzle ORM pgTable schemas and relation definitions
    │
    ├── server/                       # Backend Domain & Application Services
    │   ├── auth/
    │   │   ├── session.ts            # Password hashing, JWT signing/verification, cookie extraction
    │   │   └── guard.ts              # `requireUser()` route guard helper
    │   ├── authorization/
    │   │   └── permissions.ts        # Centralized RBAC policies (`permissions.can*`)
    │   ├── ordering/
    │   │   └── fractional-index.ts   # `computePosition()` and `rebalancePositions()`
    │   ├── realtime/
    │   │   └── broker.ts             # `RealtimeBroker` in-memory SSE connection registry & broadcaster
    │   ├── events/
    │   │   └── outbox.ts             # Transactional outbox emitter, immediate publish, batch worker
    │   ├── errors/
    │   │   └── app-error.ts          # `AppError` subclasses & `formatErrorResponse()`
    │   ├── validation/
    │   │   └── schemas.ts            # Zod validation schemas for all requests
    │   ├── repositories/             # [EMPTY DIRECTORY] Repository layer abstraction placeholder
    │   └── services/
    │       ├── auth.service.ts       # User registration, login, user lookups
    │       ├── organization.service.ts# Org creation, membership, invitations, role management
    │       ├── project.service.ts    # Project CRUD, member management, project context resolution
    │       ├── task.service.ts       # Task CRUD, fractional move, OCC locking, audit trail
    │       ├── comment.service.ts    # Comment creation, author edit, lead/admin deletion
    │       ├── workflow.service.ts   # Workflow status configuration and column ordering
    │       ├── notification.service.ts# In-app notifications with permission re-validation
    │       └── search.service.ts     # Multi-project full-text search scoped to authorized projects
    │
    ├── features/                     # [EMPTY DIRECTORIES] Feature-sliced architecture placeholders
    │   ├── activity/                 # Empty
    │   ├── boards/                   # Empty
    │   ├── comments/                 # Empty
    │   ├── membership/               # Empty
    │   ├── notifications/            # Empty
    │   ├── organizations/            # Empty
    │   ├── projects/                 # Empty
    │   └── tasks/                    # Empty
    │
    ├── lib/                          # Client-Side Utilities
    │   ├── api-client.ts             # `apiRequest()` wrapper handling credentials, JSON, `ApiError`
    │   └── use-realtime.ts           # `useRealtime()` React hook for SSE subscription
    │
    ├── components/                   # Reusable React UI Components
    │   ├── Navbar.tsx                # Navigation header, org switcher, notification bell, global search
    │   ├── TaskCard.tsx              # Kanban card component with keyboard movement selector
    │   └── TaskModal.tsx             # Modal for task details, edits, comments, and audit timeline
    │
    └── app/                          # Next.js App Router Pages and API Handlers
        ├── globals.css               # Global Tailwind CSS definitions
        ├── layout.tsx                # Root HTML layout with metadata
        ├── page.tsx                  # Root redirection page (routes to `/dashboard` or `/login`)
        ├── login/page.tsx            # Login form page
        ├── register/page.tsx         # Account registration page
        ├── dashboard/page.tsx        # Organization dashboard, project list, assigned task summaries
        ├── docs/page.tsx             # Interactive OpenAPI 3.0 visual explorer
        ├── organizations/
        │   ├── new/page.tsx          # Organization onboarding and creation form
        │   └── [organizationId]/settings/page.tsx # Org settings, member invitations, role management
        ├── projects/
        │   └── [projectId]/page.tsx  # Interactive Kanban board with drag-and-drop & live SSE
        │
        └── api/v1/                   # RESTful API Route Handlers
            ├── auth/
            │   ├── register/route.ts # POST /api/v1/auth/register
            │   ├── login/route.ts    # POST /api/v1/auth/login
            │   └── logout/route.ts   # POST /api/v1/auth/logout
            ├── me/route.ts           # GET /api/v1/me
            ├── health/route.ts       # GET /api/v1/health
            ├── organizations/
            │   ├── route.ts          # GET, POST /api/v1/organizations
            │   ├── [organizationId]/
            │   │   ├── route.ts      # GET, PATCH /api/v1/organizations/:id
            │   │   ├── projects/route.ts # GET, POST /api/v1/organizations/:id/projects
            │   │   ├── members/
            │   │   │   ├── route.ts  # GET /api/v1/organizations/:id/members
            │   │   │   └── [userId]/route.ts # DELETE /api/v1/organizations/:id/members/:userId
            │   │   └── invitations/route.ts # POST /api/v1/organizations/:id/invitations
            │   └── invitations/accept/route.ts # POST /api/v1/organizations/invitations/accept
            ├── projects/
            │   └── [projectId]/
            │       ├── route.ts      # GET, PATCH, DELETE /api/v1/projects/:id
            │       ├── tasks/route.ts# GET, POST /api/v1/projects/:id/tasks
            │       ├── members/
            │       │   ├── route.ts  # GET /api/v1/projects/:id/members
            │       │   └── [userId]/route.ts # PUT, DELETE /api/v1/projects/:id/members/:userId
            │       └── statuses/route.ts # GET, POST /api/v1/projects/:id/statuses
            ├── tasks/
            │   └── [taskId]/
            │       ├── route.ts      # GET, PATCH, DELETE /api/v1/tasks/:id
            │       ├── move/route.ts # POST /api/v1/tasks/:id/move
            │       ├── comments/route.ts # GET, POST /api/v1/tasks/:id/comments
            │       └── activity/route.ts # GET /api/v1/tasks/:id/activity
            ├── comments/
            │   └── [commentId]/route.ts # PATCH, DELETE /api/v1/comments/:id
            ├── notifications/
            │   ├── route.ts          # GET /api/v1/notifications
            │   ├── read-all/route.ts # POST /api/v1/notifications/read-all
            │   └── [notificationId]/route.ts # PATCH /api/v1/notifications/:id
            ├── search/route.ts       # GET /api/v1/search
            ├── realtime/stream/route.ts # GET /api/v1/realtime/stream (SSE)
            └── openapi.json/route.ts # GET /api/v1/openapi.json
```

---

### 2.4 Module Responsibilities & System Boundaries

| Subsystem | Primary Files | Architectural Responsibility |
|---|---|---|
| **Persistence & Schema** | `src/db/schema/index.ts`, `src/db/client.ts`, `src/db/migrate.ts` | Defines 12 relational database tables, foreign keys, cascade rules, indexes, and maintains a connection pool via `pg.Pool`. |
| **Authentication & Identity** | `src/server/auth/session.ts`, `src/server/auth/guard.ts`, `src/server/services/auth.service.ts` | Issues and verifies HS256 JWT tokens stored in HTTP-only cookies or Bearer headers. Hashes passwords using bcrypt with 10 salt rounds. |
| **Authorization Policy** | `src/server/authorization/permissions.ts` | Single point of truth for RBAC and project visibility. Evaluates permissions based on organization role, project visibility, and project membership. |
| **Reordering Engine** | `src/server/ordering/fractional-index.ts` | Deterministic floating-point midpoint positioning ($1000.0$ step). Detects gap compression ($< 0.0001$) and computes evenly distributed rebalanced positions. |
| **Transactional Outbox** | `src/server/events/outbox.ts`, `workers/outbox/worker.ts` | Persists domain events into `collaboration_events` within active database transactions. Dispatches immediately to local broker and recovers un-published events via background worker polling. |
| **Real-Time Event Broker** | `src/server/realtime/broker.ts`, `src/app/api/v1/realtime/stream/route.ts` | Maintains active HTTP `ReadableStream` SSE client connections. Filters broadcast events by organization ID and authorized project IDs before serialization. |
| **Application Services** | `src/server/services/*.ts` | Implements business logic, validation enforcement, atomic transactions, audit activity logging, and notification creation. |
| **API Layer** | `src/app/api/v1/**/route.ts` | Next.js App Router route handlers. Validates incoming input against Zod schemas, extracts authentication context, calls domain services, and formats error envelopes. |
| **Client UI & State** | `src/app/**/page.tsx`, `src/components/*`, `src/lib/*` | React 18 client-side interface featuring optimistic drag-and-drop Kanban updates, automatic rollback on 409 Conflict, real-time SSE listener, and modal editors. |

---

### 2.5 Module Dependency Graph

```mermaid
graph TD
    UI["Frontend Client: Next.js Pages & Components"] --> API["Authenticated API Layer: /api/v1/*"]
    API --> GUARD["Session Guard: requireUser / getSessionFromRequest"]
    GUARD --> AUTH_SVC["Auth Service: bcryptjs / jose JWT"]
    API --> VAL["Zod Request Validation: schemas.ts"]
    API --> SVC["Domain Services: Task, Project, Org, Comment, Workflow, Notification, Search"]
    SVC --> PERM["Centralized Policy: permissions.ts"]
    SVC --> ORDER["Fractional Indexing: fractional-index.ts"]
    SVC --> DB_TX["PostgreSQL Transaction: db.transaction"]
    DB_TX --> TABLES[("PostgreSQL Tables: tasks, projects, orgs, comments, activities")]
    DB_TX --> OUTBOX_TABLE[("Outbox Table: collaboration_events")]
    SVC --> OUTBOX_PUB["Outbox Publisher: recordOutboxEvent / publishEvent"]
    OUTBOX_PUB --> BROKER["In-Memory RealtimeBroker: broker.ts"]
    BROKER --> SSE_STREAM["SSE Endpoint: /api/v1/realtime/stream"]
    SSE_STREAM -.->|"Server-Sent Events"| UI
    WORKER["Background Worker: workers/outbox/worker.ts"] -->|"Polls unpublished events"| OUTBOX_TABLE
    WORKER --> BROKER
```

---

### 2.6 Application Lifecycle & Execution Entry Points

1. **HTTP Server Initialization:** Next.js initializes the Node.js server process. Dynamic API route handlers (`force-dynamic`) are registered under `/api/v1/*`.
2. **Database Initialization:** `src/db/client.ts` creates a singleton `pg.Pool` with a maximum of 20 connections, an idle timeout of 30,000 ms, and a connection timeout of 2,000 ms.
3. **Database Migration:** Executed via `npm run db:migrate` (`tsx src/db/migrate.ts`). Runs atomic transactional DDL queries (`CREATE TABLE IF NOT EXISTS`, unique indexes, and composite indexes).
4. **Database Seeding:** Executed via `npm run db:seed` (`tsx src/db/seed.ts`). Applies migrations, registers demo accounts (`alice@acme.com`, `bob@acme.com`, `charlie@acme.com`, `david@starlight.com`), provisions organizations, projects, workflow statuses, and sample tasks.
5. **Background Outbox Worker:** Executed via `npm run worker:outbox` (`tsx workers/outbox/worker.ts`). Starts an infinite loop polling `collaboration_events WHERE published_at IS NULL` every 3,000 ms, broadcasting pending events to the broker.
6. **Request Lifecycle:** Incoming HTTP requests pass through the Next.js router, extract credentials from the `fellow_session` cookie or `Authorization: Bearer` header, validate payloads via Zod, verify permissions via `permissions.ts`, execute queries within PostgreSQL transactions, record outbox events, and return standardized JSON responses.

---

### 2.7 Implementation Status: Complete, Partial, and Missing Features

| Functional Domain | Feature | Status | Implementation Evidence |
|---|---|---|---|
| **Authentication** | User Registration & Login | **Complete** | `src/app/api/v1/auth/register`, `login`, `logout`, `session.ts` |
| **Authentication** | Cryptographic Session Cookies & Bearer Fallback | **Complete** | `src/server/auth/session.ts` (checks Bearer header, then cookie) |
| **Multi-Tenancy** | Organization Isolation | **Complete** | Every table has `organization_id`; queries enforce `WHERE organization_id = :id` |
| **Multi-Tenancy** | Existence Concealment (404 instead of 403) | **Complete** | `ProjectService.getProjectContext` throws `NotFoundError` on unpermitted access |
| **RBAC** | Org Roles (Owner, Admin, Member, Viewer, Guest) | **Complete** | `src/server/authorization/permissions.ts` |
| **RBAC** | Project Roles (Lead, Member, Viewer) | **Complete** | `src/server/authorization/permissions.ts` |
| **RBAC** | Project Visibility (Organization, Private, Guest) | **Complete** | `permissions.canViewProject` enforces visibility rules |
| **Kanban Board** | Configurable Workflow Columns | **Complete** | `src/app/api/v1/projects/[projectId]/statuses`, `src/db/schema` |
| **Kanban Board** | Drag-and-Drop Task Reordering | **Complete** | `@hello-pangea/dnd` in `src/app/projects/[projectId]/page.tsx` |
| **Kanban Board** | Keyboard Accessible Task Movement | **Complete** | Move selector dropdown in `src/components/TaskCard.tsx` |
| **Reordering** | Deterministic Fractional Indexing | **Complete** | `src/server/ordering/fractional-index.ts` |
| **Reordering** | Automatic Column Rebalancing ($< 0.0001$) | **Complete** | `computePosition` triggers `needsRebalance` in `task.service.ts` |
| **Concurrency** | Optimistic Concurrency Control (OCC) | **Complete** | `version` check in `TaskService.updateTask` and `TaskService.moveTask` |
| **Real-Time** | Server-Sent Events (SSE) Stream | **Complete** | `src/app/api/v1/realtime/stream/route.ts` with ping heartbeat |
| **Real-Time** | Durable Outbox Pattern | **Complete** | `collaboration_events` table, `outbox.ts`, `workers/outbox/worker.ts` |
| **Real-Time** | Channel Boundary Isolation | **Complete** | `RealtimeBroker.broadcast` validates `authorizedProjectIds` per connection |
| **Audit Trail** | Chronological Task Activity Logging | **Complete** | `task_activities` table, `TaskService.getTaskActivity`, TaskModal UI |
| **Comments** | Task Comments & Author Permissions | **Complete** | `src/app/api/v1/tasks/[taskId]/comments`, `src/app/api/v1/comments/[commentId]` |
| **Search** | Scoped Resource Search | **Complete** | `src/app/api/v1/search/route.ts` filtered by `accessibleProjectIds` |
| **Notifications** | In-App Notifications with Access Verification | **Complete** | `NotificationService.getUserNotifications` re-checks current project access |
| **Documentation** | Interactive OpenAPI 3.0 Explorer | **Complete** | `src/app/docs/page.tsx` rendering `docs/openapi.yaml` via `/openapi.json` |
| **Background Jobs**| Asynchronous Notification Dispatcher | **Partially Implemented** | `workers/notifications/` directory is empty; notifications are created synchronously in DB during mutations |
| **Architecture** | Feature Slices (`src/features/*`) | **Missing / Dead Code** | 8 feature subdirectories exist under `src/features/` but are completely empty |
| **Architecture** | Repository Layer (`src/server/repositories`) | **Missing / Dead Code** | Directory is empty; services query Drizzle directly |
| **E2E Testing** | Playwright End-to-End Tests | **Missing** | `tests/e2e/` is empty; `npm run test:e2e` fails because Playwright is unconfigured |

---

## 3. Complete API and Endpoint Inventory

### 3.1 API Overview & Global Standards

All platform API endpoints are exposed under the `/api/v1` namespace.
- **Content-Type:** `application/json` (except `/api/v1/realtime/stream`, which produces `text/event-stream`).
- **Standard Success Response Format:** Returns a top-level JSON object wrapping the mutated or queried entity (e.g. `{ "task": { ... } }`, `{ "projects": [ ... ] }`).
- **Standard Error Response Format:**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found",
    "requestId": "req_8x29a0f1",
    "details": {}
  }
}
```

---

### 3.2 Authentication & Session Endpoints

#### 1. `POST /api/v1/auth/register`
- **File Location:** `src/app/api/v1/auth/register/route.ts`
- **Purpose:** Registers a new user account, creates a password hash using bcrypt, signs a 7-day HS256 JWT, and sets an HTTP-only session cookie.
- **Authentication:** Public (None).
- **Request Body:**
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "securepassword123"
  }
  ```
- **Validation Rules:** `name` (1-255 chars), `email` (valid email, max 255 chars), `password` (6-100 chars).
- **Response `201 Created`:**
  ```json
  {
    "user": {
      "id": "usr_94b1c2ee-...",
      "email": "jane@example.com",
      "name": "Jane Doe",
      "createdAt": "2026-10-31T15:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
- **Response Headers:** `Set-Cookie: fellow_session=<token>; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`
- **Errors:** `400 Bad Request` (Email already in use), `422 Unprocessable Entity` (Validation failed).

#### 2. `POST /api/v1/auth/login`
- **File Location:** `src/app/api/v1/auth/login/route.ts`
- **Purpose:** Authenticates user credentials via bcrypt verification and establishes a session.
- **Authentication:** Public (None).
- **Request Body:**
  ```json
  {
    "email": "alice@acme.com",
    "password": "password123"
  }
  ```
- **Response `200 OK`:** Returns `{ "user": { ... }, "token": "..." }` and sets the session cookie.
- **Errors:** `401 Unauthorized` (Invalid email or password), `422 Unprocessable Entity` (Validation failed).

#### 3. `POST /api/v1/auth/logout`
- **File Location:** `src/app/api/v1/auth/logout/route.ts`
- **Purpose:** Clears the `fellow_session` cookie on the client.
- **Authentication:** Public / Authenticated.
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```

---

### 3.3 Identity & System Health Endpoints

#### 4. `GET /api/v1/me`
- **File Location:** `src/app/api/v1/me/route.ts`
- **Purpose:** Returns profile details for the currently authenticated caller.
- **Authentication:** Required (`fellow_session` cookie or `Authorization: Bearer <token>`).
- **Response `200 OK`:**
  ```json
  {
    "user": {
      "id": "usr_94b1c2ee-...",
      "email": "alice@acme.com",
      "name": "Alice Henderson",
      "createdAt": "2026-10-29T10:00:00.000Z"
    }
  }
  ```
- **Errors:** `401 Unauthorized` (Session missing or invalid), `404 Not Found` (User no longer exists).

#### 5. `GET /api/v1/health`
- **File Location:** `src/app/api/v1/health/route.ts`
- **Purpose:** Verifies operational readiness by querying PostgreSQL (`SELECT 1`).
- **Authentication:** Public (None).
- **Response `200 OK`:**
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-10-31T15:05:00.000Z",
    "services": {
      "database": "connected",
      "realtime": "ready"
    }
  }
  ```
- **Response `503 Service Unavailable`:** If database connection fails, returns `{ "status": "unhealthy", "error": "..." }`.

---

### 3.4 Organization Management Endpoints

#### 6. `GET /api/v1/organizations`
- **File Location:** `src/app/api/v1/organizations/route.ts`
- **Purpose:** Lists all organizations where the caller has active membership, including their assigned role.
- **Authentication:** Required.
- **Response `200 OK`:**
  ```json
  {
    "organizations": [
      {
        "id": "org_56b270a3-...",
        "name": "Acme Software Inc.",
        "slug": "acme-corp",
        "createdBy": "usr_alice",
        "createdAt": "2026-10-29T10:00:00.000Z",
        "updatedAt": "2026-10-29T10:00:00.000Z",
        "role": "owner",
        "joinedAt": "2026-10-29T10:00:00.000Z"
      }
    ]
  }
  ```

#### 7. `POST /api/v1/organizations`
- **File Location:** `src/app/api/v1/organizations/route.ts`
- **Purpose:** Creates an isolated organization tenant and automatically assigns the creator as `owner`.
- **Authentication:** Required.
- **Request Body:**
  ```json
  {
    "name": "Starlight Ventures",
    "slug": "starlight-ventures"
  }
  ```
- **Validation:** `name` (1-255 chars), `slug` (optional, 2-50 lowercase alphanumeric + hyphens).
- **Response `201 Created`:** Returns created organization with `role: "owner"`.

#### 8. `GET /api/v1/organizations/:organizationId`
- **File Location:** `src/app/api/v1/organizations/[organizationId]/route.ts`
- **Purpose:** Retrieves organization metadata and caller's role within that organization.
- **Authentication:** Required (User must be an active member of `:organizationId`).
- **Errors:** `404 Not Found` (If caller does not belong to organization or org does not exist).

#### 9. `PATCH /api/v1/organizations/:organizationId`
- **File Location:** `src/app/api/v1/organizations/[organizationId]/route.ts`
- **Purpose:** Updates organization name or slug.
- **Authentication:** Required (`owner` or `admin` role required).
- **Errors:** `403 Forbidden` (Insufficient permission), `400 Bad Request` (Slug already taken).

#### 10. `GET /api/v1/organizations/:organizationId/members`
- **File Location:** `src/app/api/v1/organizations/[organizationId]/members/route.ts`
- **Purpose:** Lists all users belonging to the organization with their roles.
- **Authentication:** Required (Any organization member).
- **Response `200 OK`:** Array of `{ id, userId, name, email, role, joinedAt }`.

#### 11. `DELETE /api/v1/organizations/:organizationId/members/:userId`
- **File Location:** `src/app/api/v1/organizations/[organizationId]/members/[userId]/route.ts`
- **Purpose:** Removes a user from the organization.
- **Authentication:** Required (`owner` or `admin` role required).
- **Business Invariant:** Cannot remove the last remaining `owner` of an organization. Throws `400 Bad Request`.

#### 12. `POST /api/v1/organizations/:organizationId/invitations`
- **File Location:** `src/app/api/v1/organizations/[organizationId]/invitations/route.ts`
- **Purpose:** Generates a secure membership invitation. Calculates SHA-256 hash of random token for database storage and returns plaintext token for sharing.
- **Authentication:** Required (`owner` or `admin` role required).
- **Request Body:**
  ```json
  {
    "email": "colleague@example.com",
    "role": "member"
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "invitation": {
      "id": "inv_81a0e1-...",
      "email": "colleague@example.com",
      "role": "member",
      "expiresAt": "2026-11-07T15:00:00.000Z",
      "createdAt": "2026-10-31T15:00:00.000Z"
    },
    "token": "4f9b8c2a10e782..."
  }
  ```

#### 13. `POST /api/v1/organizations/invitations/accept`
- **File Location:** `src/app/api/v1/organizations/invitations/accept/route.ts`
- **Purpose:** Accepts an invitation using plaintext token, creating an `organization_memberships` record.
- **Authentication:** Required.
- **Request Body:** `{ "token": "4f9b8c2a10e782..." }`
- **Errors:** `404 Not Found` (Invalid token), `400 Bad Request` (Already accepted, revoked, expired, or user already a member).

---

### 3.5 Project Management Endpoints

#### 14. `GET /api/v1/organizations/:organizationId/projects`
- **File Location:** `src/app/api/v1/organizations/[organizationId]/projects/route.ts`
- **Purpose:** Lists all non-archived projects in the organization that the caller is authorized to view.
- **Authentication:** Required.
- **Visibility Filtering:** Owners and Admins view all projects; Members view `organization` and permitted `private` projects; Guests view only explicitly assigned projects.

#### 15. `POST /api/v1/organizations/:organizationId/projects`
- **File Location:** `src/app/api/v1/organizations/[organizationId]/projects/route.ts`
- **Purpose:** Creates a new project, designates creator as `lead`, and seeds 5 default workflow columns (Backlog, To Do, In Progress, In Review, Done).
- **Authentication:** Required (`owner`, `admin`, or `member` role required).
- **Request Body:**
  ```json
  {
    "name": "Core Platform 2.0",
    "description": "Platform infrastructure modernization",
    "visibility": "organization"
  }
  ```
- **Response `201 Created`:** Returns created project.

#### 16. `GET /api/v1/projects/:projectId`
- **File Location:** `src/app/api/v1/projects/[projectId]/route.ts`
- **Purpose:** Retrieves project details along with caller's resolved role (`myRole`).
- **Errors:** `404 Not Found` (Resource does not exist or caller lacks visibility).

#### 17. `PATCH /api/v1/projects/:projectId`
- **File Location:** `src/app/api/v1/projects/[projectId]/route.ts`
- **Purpose:** Updates project name, description, visibility mode, or archival status.
- **Authentication:** Required (Org `owner`, Org `admin`, or Project `lead`).

#### 18. `DELETE /api/v1/projects/:projectId`
- **File Location:** `src/app/api/v1/projects/[projectId]/route.ts`
- **Purpose:** Soft-deletes (archives) the project by setting `archived_at = NOW()`.
- **Authentication:** Required (Org `owner`, Org `admin`, or Project `lead`).
- **Response `200 OK`:** `{ "success": true, "message": "Project archived successfully" }`

#### 19. `GET /api/v1/projects/:projectId/members`
- **File Location:** `src/app/api/v1/projects/[projectId]/members/route.ts`
- **Purpose:** Lists explicit members assigned to the project.
- **Authentication:** Required (Must have project view access).

#### 20. `PUT /api/v1/projects/:projectId/members/:userId`
- **File Location:** `src/app/api/v1/projects/[projectId]/members/[userId]/route.ts`
- **Purpose:** Adds or updates a project member's role (`lead`, `member`, `viewer`).
- **Tenant Isolation Check:** Enforces that `:userId` already belongs to the project's owning organization (`400 Bad Request` if cross-tenant).

#### 21. `DELETE /api/v1/projects/:projectId/members/:userId`
- **File Location:** `src/app/api/v1/projects/[projectId]/members/[userId]/route.ts`
- **Purpose:** Removes explicit project membership for a user.

---

### 3.6 Workflow Status Configuration Endpoints

#### 22. `GET /api/v1/projects/:projectId/statuses`
- **File Location:** `src/app/api/v1/projects/[projectId]/statuses/route.ts`
- **Purpose:** Retrieves all workflow status columns ordered by `position ASC`.
- **Response `200 OK`:**
  ```json
  {
    "statuses": [
      {
        "id": "status_1",
        "name": "Backlog",
        "key": "backlog",
        "category": "backlog",
        "position": 1000.0,
        "isDefault": false
      },
      {
        "id": "status_2",
        "name": "To Do",
        "key": "todo",
        "category": "unstarted",
        "position": 2000.0,
        "isDefault": true
      }
    ]
  }
  ```

#### 23. `POST /api/v1/projects/:projectId/statuses`
- **File Location:** `src/app/api/v1/projects/[projectId]/statuses/route.ts`
- **Purpose:** Adds a custom workflow column to the project.
- **Authentication:** Required (Org `owner`, Org `admin`, or Project `lead`).
- **Validation:** `key` must be alphanumeric with underscores (e.g. `qa_testing`).

---

### 3.7 Task Management & Fractional Reordering Endpoints

#### 24. `GET /api/v1/projects/:projectId/tasks`
- **File Location:** `src/app/api/v1/projects/[projectId]/tasks/route.ts`
- **Purpose:** Lists non-deleted tasks for the project ordered by `position ASC`.
- **Query Parameters:** `statusId` (optional), `assigneeId` (optional), `priority` (optional).

#### 25. `POST /api/v1/projects/:projectId/tasks`
- **File Location:** `src/app/api/v1/projects/[projectId]/tasks/route.ts`
- **Purpose:** Creates a task, appends it to the target column ($pos = max + 1000.0$), writes an audit log entry, records an outbox event, and publishes via broker.
- **Authentication:** Required (`canCreateTask`).
- **Request Body:**
  ```json
  {
    "title": "Enforce Multi-Tenant Query Scoping",
    "description": "Add organization_id filter to all queries",
    "statusId": "status_2",
    "priority": "urgent",
    "assigneeId": "usr_bob",
    "dueAt": "2026-11-15T00:00:00.000Z"
  }
  ```
- **Side Effects:** If assigned to another user, creates an in-app notification in `notifications`. Emits `task.created` collaboration event.
- **Response `201 Created`:** Returns created task.

#### 26. `GET /api/v1/tasks/:taskId`
- **File Location:** `src/app/api/v1/tasks/[taskId]/route.ts`
- **Purpose:** Retrieves full task details, including status, creator, and assignee objects.
- **Errors:** `404 Not Found` (Task deleted or caller lacks project access).

#### 27. `PATCH /api/v1/tasks/:taskId`
- **File Location:** `src/app/api/v1/tasks/[taskId]/route.ts`
- **Purpose:** Updates task attributes with Optimistic Concurrency Control (OCC).
- **Concurrency Check:** If client provides `version`, server verifies `task.version === version`. On mismatch, throws `409 Conflict`.
- **Auto Status Mapping:** If new status category is `completed`, sets `completed_at = NOW()`; otherwise clears `completed_at`.
- **Side Effects:** Increments `version`, logs status/assignee changes in `task_activities`, records outbox event `task.updated`, broadcasts to SSE.

#### 28. `POST /api/v1/tasks/:taskId/move`
- **File Location:** `src/app/api/v1/tasks/[taskId]/move/route.ts`
- **Purpose:** Atomically reorders or transfers a task across workflow columns.
- **Request Body:**
  ```json
  {
    "statusId": "status_completed",
    "prevTaskId": "task_prev_id",
    "nextTaskId": "task_next_id",
    "destinationProjectId": null,
    "expectedVersion": 2
  }
  ```
- **Concurrency & Rebalance Logic:**
  1. Verifies `task.version === expectedVersion` (rejects with `409 Conflict` on mismatch).
  2. Calculates fractional midpoint position between `prevTaskId` and `nextTaskId`.
  3. If gap $< 0.0001$, flags `needsRebalance = true`, locks column, and reindexes all tasks evenly: $pos_i = (i + 1) \times 1000.0$.
  4. Increments task `version`.
  5. Commits move, activity log, and outbox event `task.moved` atomically.
- **Response `200 OK`:** Returns `{ "task": { ...updatedTask } }`.

#### 29. `DELETE /api/v1/tasks/:taskId`
- **File Location:** `src/app/api/v1/tasks/[taskId]/route.ts`
- **Purpose:** Soft-deletes the task (`deleted_at = NOW()`).
- **Authorization:** Only Org Owner/Admin, Project Lead, or Task Creator can delete.
- **Response `200 OK`:** `{ "success": true, "message": "Task deleted successfully" }`

#### 30. `GET /api/v1/tasks/:taskId/activity`
- **File Location:** `src/app/api/v1/tasks/[taskId]/activity/route.ts`
- **Purpose:** Returns the chronological audit trail for the task, joined with actor names and emails.

---

### 3.8 Task Comments Endpoints

#### 31. `GET /api/v1/tasks/:taskId/comments`
- **File Location:** `src/app/api/v1/tasks/[taskId]/comments/route.ts`
- **Purpose:** Returns non-deleted comments on the task, ordered by `created_at ASC`.

#### 32. `POST /api/v1/tasks/:taskId/comments`
- **File Location:** `src/app/api/v1/tasks/[taskId]/comments/route.ts`
- **Purpose:** Posts a comment, logs `comment_added` activity, notifies task assignee, and emits `comment.created` outbox event.
- **Authorization:** Any project member except `viewer`.

#### 33. `PATCH /api/v1/comments/:commentId`
- **File Location:** `src/app/api/v1/comments/[commentId]/route.ts`
- **Purpose:** Edits comment text.
- **Authorization:** Strictly limited to the original author (`403 Forbidden` otherwise).

#### 34. `DELETE /api/v1/comments/:commentId`
- **File Location:** `src/app/api/v1/comments/[commentId]/route.ts`
- **Purpose:** Soft-deletes a comment (`deleted_at = NOW()`).
- **Authorization:** Comment author, Project Lead, or Org Owner/Admin.

---

### 3.9 Notification Endpoints

#### 35. `GET /api/v1/notifications`
- **File Location:** `src/app/api/v1/notifications/route.ts`
- **Purpose:** Lists recent notifications for the caller.
- **Dynamic Access Verification:** Re-verifies that caller still retains active access to the project referenced by each notification before rendering. If membership was revoked, the notification is suppressed.

#### 36. `PATCH /api/v1/notifications/:notificationId`
- **File Location:** `src/app/api/v1/notifications/[notificationId]/route.ts`
- **Purpose:** Marks an individual notification as read (`read_at = NOW()`).

#### 37. `POST /api/v1/notifications/read-all`
- **File Location:** `src/app/api/v1/notifications/read-all/route.ts`
- **Purpose:** Marks all unread notifications in the organization as read.

---

### 3.10 Scoped Search Endpoints

#### 38. `GET /api/v1/search`
- **File Location:** `src/app/api/v1/search/route.ts`
- **Purpose:** Executes scoped search across projects and tasks.
- **Required Query Parameters:** `organizationId` and `q`.
- **Query Scoping:** Resolves all projects accessible to the caller and executes `tasks.project_id IN (:authorizedProjectIds)`. Confidential tasks are never queried or leaked.

---

### 3.11 Real-Time Server-Sent Events (SSE) Stream

#### 39. `GET /api/v1/realtime/stream`
- **File Location:** `src/app/api/v1/realtime/stream/route.ts`
- **Transport:** Server-Sent Events (`text/event-stream`).
- **Headers:** `Cache-Control: no-cache, no-transform`, `Connection: keep-alive`, `X-Accel-Buffering: no`.
- **Required Query Parameter:** `organizationId`.
- **Heartbeat:** Sends `: ping\n\n` comment every 15,000 ms to prevent gateway timeouts.
- **Connection Handshake Event:** Emits `system.connected` containing `connectionId` and `authorizedProjectCount`.
- **Event Filtering:** Broker verifies `organizationId` and validates that `conn.authorizedProjectIds` contains `event.projectId` before transmission.

---

### 3.12 OpenAPI Specification Endpoint

#### 40. `GET /api/v1/openapi.json`
- **File Location:** `src/app/api/v1/openapi.json/route.ts`
- **Purpose:** Parses `docs/openapi.yaml` at runtime and serves raw JSON OpenAPI 3.0 specification.

---

## 4. Frontend Architecture & User Workflows

### 4.1 Architecture Overview & UI Patterns

The frontend is constructed using the Next.js 14 App Router, React 18 client components (`'use client'`), Tailwind CSS for styling, and Lucide React icons.

```mermaid
graph TD
    LAYOUT["Root Layout: src/app/layout.tsx"] --> NAV["Navbar: src/components/Navbar.tsx"]
    NAV --> ORG_SWITCH["Organization Switcher Dropdown"]
    NAV --> NOTIF_DRAWER["In-App Notifications Bell"]
    NAV --> SEARCH_MODAL["Global Scoped Search Modal"]
    NAV --> USER_PROFILE["User Profile & Logout"]
    LAYOUT --> PAGES["App Router Pages"]
    PAGES --> DASHBOARD["Dashboard: /dashboard"]
    PAGES --> BOARD["Kanban Board: /projects/:projectId"]
    PAGES --> SETTINGS["Org Settings: /organizations/:id/settings"]
    PAGES --> DOCS["Interactive API Docs: /docs"]
    BOARD --> DND_CONTEXT["DragDropContext: @hello-pangea/dnd"]
    DND_CONTEXT --> DROPPABLE["Droppable Status Columns"]
    DROPPABLE --> DRAGGABLE["Draggable TaskCard: src/components/TaskCard.tsx"]
    BOARD --> TASK_MODAL["Task Modal: src/components/TaskModal.tsx"]
    BOARD --> SSE_HOOK["Real-Time Hook: src/lib/use-realtime.ts"]
```

---

### 4.2 Page Routes & Navigation Structure

| Path | File | Rendering Strategy | Description |
|---|---|---|---|
| `/` | `src/app/page.tsx` | Server Component (`dynamic`) | Inspects `fellow_session` cookie; redirects to `/dashboard` if authenticated, `/login` otherwise. |
| `/login` | `src/app/login/page.tsx` | Client Component | User login form; submits credentials to `/api/v1/auth/login`. |
| `/register` | `src/app/register/page.tsx` | Client Component | Account registration form; submits to `/api/v1/auth/register`. |
| `/dashboard` | `src/app/dashboard/page.tsx` | Client Component (`Suspense`) | Organization overview, accessible projects grid, assigned tasks list, create project modal. |
| `/organizations/new` | `src/app/organizations/new/page.tsx` | Client Component | Form to provision a new organization workspace and auto-generate slug. |
| `/organizations/[organizationId]/settings` | `src/app/organizations/[organizationId]/settings/page.tsx` | Client Component | Workspace settings, member list, role badges, member removal, invitation link generator. |
| `/projects/[projectId]` | `src/app/projects/[projectId]/page.tsx` | Client Component (`Suspense`) | Core Kanban board with drag-and-drop columns, task filtering, real-time SSE listener, task modal. |
| `/docs` | `src/app/docs/page.tsx` | Client Component | OpenAPI 3.0 specification visual explorer with method tags, parameters, and schemas. |

---

### 4.3 Component Hierarchy & Design System

1. **`Navbar` (`src/components/Navbar.tsx`):**
   - Displays organization switcher dropdown allowing quick context switching between multi-tenant memberships.
   - Real-time connection badge (green Wifi for `connected`, amber Wifi for `connecting`, red WifiOff for `disconnected`).
   - Notification bell with unread badge counter and popover drawer supporting "Mark All as Read".
   - Global search icon opening a search dialog querying `/api/v1/search`.
2. **`TaskCard` (`src/components/TaskCard.tsx`):**
   - Renders task title, priority badge (`urgent`, `high`, `medium`, `low`), assignee avatar, and due date with overdue highlighting.
   - Contains a keyboard-accessible `<select>` dropdown (`Move to...`) allowing users without mouse drag capability to move tasks across workflow columns.
3. **`TaskModal` (`src/components/TaskModal.tsx`):**
   - Full task management dialog supporting editing of title, description, status, priority, assignee, and due date.
   - Optimistic Concurrency recovery: If a `409 Conflict` occurs, renders an amber conflict banner prompting the user to refresh and reload latest changes.
   - Two tabs: **Details & Comments** (post, edit, delete comments) and **Activity History** (audit log timeline).

---

### 4.4 State Management & Data Fetching

- **State Management:** Local React state (`useState`, `useCallback`, `useRef`) paired with optimistic UI updates.
- **HTTP Client (`src/lib/api-client.ts`):** `apiRequest<T>()` wraps standard `fetch()`, automatically includes credentials (`credentials: 'include'`), sets JSON headers, and converts non-OK HTTP responses into structured `ApiError` instances containing `code`, `statusCode`, and `details`.

---

### 4.5 Drag-and-Drop Reordering & Optimistic Updates

1. User drags a `TaskCard` across columns or reorders within the same column via `@hello-pangea/dnd`.
2. On `onDragEnd`:
   - Frontend snapshots current tasks: `const originalTasks = [...tasks];`
   - Calculates estimated visual midpoint position immediately.
   - Updates React state optimistically for instantaneous visual response.
   - Dispatches `POST /api/v1/tasks/:taskId/move` with `statusId`, `prevTaskId`, `nextTaskId`, and `expectedVersion: taskBeingMoved.version`.
3. If server responds `200 OK`: Replaces optimistic task with canonical server task (updated `position` and incremented `version`).
4. If server responds `409 Conflict` or network error: Catches error, displays error toast/banner, and immediately rolls back to `originalTasks`.

---

### 4.6 Real-Time Collaboration & SSE Event Handling

- Handled by `useRealtime` hook (`src/lib/use-realtime.ts`).
- Subscribes to `/api/v1/realtime/stream?organizationId=:orgId` using native browser `EventSource`.
- Listens for specific event types: `task.created`, `task.updated`, `task.moved`, `task.deleted`, `comment.created`, `status.created`.
- On receiving events matching current project:
  - `task.created`: Appends new task to board state.
  - `task.updated` / `task.moved`: Updates task fields in place.
  - `task.deleted`: Removes task from state.
- On SSE disconnection, browser auto-reconnects, and client can trigger fresh fetch of canonical board data (`loadProjectData()`).

---

### 4.7 Form Validation & Error Recovery Banners

- Client forms catch `ApiError` exceptions.
- Validation errors (`422 Unprocessable Entity`) highlight invalid fields.
- Optimistic locking conflicts (`409 Conflict`) render high-visibility recovery banners in the task modal and board header:
  `"Move failed: Concurrency conflict: Task has been modified by another user. Reconciling board state."`

---

### 4.8 UI/Backend Consistency Analysis

- **Task Versioning:** Frontend correctly passes `expectedVersion` in `POST /move` and `version` in `PATCH /tasks/:taskId`.
- **Project Visibility UI:** Dashboard and Settings pages correctly display visibility badges (`organization`, `private`, `guest`) and enforce restrictions.
- **Search Scoping:** Navbar search dialog passes active `organizationId`, preventing cross-tenant leakage.

---

## 5. Backend Architecture & Business Logic

### 5.1 Layered Architecture Pattern

```text
HTTP Request (Client)
      │
      ▼
Next.js App Router Route Handler (src/app/api/v1/**/route.ts)
      │
      ├── Authentication Guard (src/server/auth/guard.ts -> session.ts)
      │      └── Extracts & verifies JWT token from Cookie or Bearer header
      │
      ├── Input Validation (src/server/validation/schemas.ts)
      │      └── Zod safeParse(); throws ValidationError (422) on failure
      │
      └── Service Layer (src/server/services/*.service.ts)
             │
             ├── Authorization Policy (src/server/authorization/permissions.ts)
             │      └── Evaluates org roles, project visibility, project memberships
             │
             ├── Domain Calculations (src/server/ordering/fractional-index.ts)
             │      └── Computes midpoint positions, detects gap compression
             │
             └── PostgreSQL Atomic Transaction (src/db/client.ts)
                    ├── Mutates authoritative relational tables (tasks, projects, etc.)
                    ├── Inserts audit records (task_activities)
                    └── Inserts outbox record (collaboration_events)
```

---

### 5.2 Authentication Guard & Session Resolution

- `requireUser(request: NextRequest)` in `src/server/auth/guard.ts`:
  1. Inspects `Authorization: Bearer <token>` header.
  2. If missing, inspects `fellow_session` cookie via `request.cookies.get('fellow_session')`.
  3. Verifies token using `jose.jwtVerify()` with `JWT_SECRET`.
  4. Returns `SessionPayload` (`{ userId, email, name }`).
  5. Throws `UnauthorizedError('Authentication required')` (HTTP 401) if invalid or expired.

---

### 5.3 Centralized Multi-Tenant Authorization Policy

`src/server/authorization/permissions.ts` defines all access control logic across organizations, projects, and tasks:

```mermaid
flowchart TD
    REQ["API Request for Resource"] --> CHK_ORG{"Active Organization Member?"}
    CHK_ORG -- No --> DENY_404["Return 404 Not Found"]
    CHK_ORG -- Yes --> IS_ADMIN{"Org Role == Owner or Admin?"}
    IS_ADMIN -- Yes --> PERMIT_ADMIN["Grant Access: Governance Override"]
    IS_ADMIN -- No --> CHK_VIS{"Project Visibility Mode?"}
    CHK_VIS -- "organization" --> PERMIT_MEM["Grant View Access to Org Members"]
    CHK_VIS -- "guest" --> CHK_GUEST_MEM{"Explicit Project Member?"}
    CHK_VIS -- "private" --> CHK_PRIV_MEM{"Explicit Project Member?"}
    CHK_PRIV_MEM -- Yes --> PERMIT_PRIV["Grant Access"]
    CHK_PRIV_MEM -- No --> DENY_404
    CHK_GUEST_MEM -- Yes --> PERMIT_GUEST["Grant Access"]
    CHK_GUEST_MEM -- No --> DENY_404
```

#### Governance Override Policy:
Organization `owner` and `admin` roles possess administrative oversight across all projects within their organization (including private projects) for compliance and governance. However, they **cannot** access resources belonging to another organization under any circumstance.

---

### 5.4 Fractional Indexing & Automatic Column Rebalancing Algorithm

Tasks maintain a double precision floating-point `position` column.

#### Mathematical Midpoint Formulation:
$$\text{position} = \frac{\text{prevPosition} + \text{nextPosition}}{2.0}$$

#### Boundary Conditions:
1. **Empty Column:** $\text{position} = 1000.0$
2. **Top of Column (before first item):**
   - If $\text{nextPosition} > 1.0$: $\text{position} = \max(\text{nextPosition} - 1000.0, \frac{\text{nextPosition}}{2.0})$
   - If $\text{nextPosition} \le 1.0$: $\text{position} = \frac{\text{nextPosition}}{2.0}$
3. **Bottom of Column (after last item):** $\text{position} = \text{prevPosition} + 1000.0$
4. **Compression Trigger:**
   $$\text{gap} = |\text{nextPosition} - \text{prevPosition}| < 0.0001$$
   When gap $< 0.0001$, `needsRebalance` is set to `true`.

#### Column Rebalance Execution:
```typescript
export function rebalancePositions(taskIds: string[]): Array<{ id: string; position: number }> {
  return taskIds.map((id, index) => ({
    id,
    position: (index + 1) * 1000.0,
  }));
}
```
Inside the move transaction, all column tasks are queried ordered by position, the moved task is inserted into the sequence, and every task is updated with an evenly spaced position $(i + 1) \times 1000.0$.

---

### 5.5 Optimistic Concurrency Control (OCC)

To prevent race conditions during concurrent task modifications:
1. The `tasks` table includes an integer `version` field (defaulting to 1).
2. Updates and moves accept an optional `expectedVersion` parameter.
3. The database update query includes `WHERE id = :taskId AND version = :expectedVersion`.
4. If another user committed a change in the interim, the query updates 0 rows.
5. The service detects 0 affected rows and throws `ConflictError` (HTTP 409).

---

### 5.6 Transactional Durable Outbox Pattern

To prevent ghost events (publishing events for rolled-back transactions) or missing events (database commit succeeds but broker fails):

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant Handler as API Route Handler
    participant Service as Task Service
    participant DB as PostgreSQL Transaction
    participant Outbox as collaboration_events Table
    participant Broker as RealtimeBroker
    participant Worker as Background Worker

    Client->>Handler: POST /api/v1/tasks/:id/move
    Handler->>Service: moveTask(userId, taskId, data)
    Service->>DB: BEGIN Transaction
    DB->>DB: UPDATE tasks SET status_id, position, version = version + 1
    DB->>DB: INSERT INTO task_activities (audit log)
    DB->>Outbox: INSERT INTO collaboration_events (published_at = NULL)
    Service->>DB: COMMIT Transaction
    Service->>Broker: publishEvent(envelope)
    Broker-->>Client: SSE Live Broadcast
    Service->>Outbox: UPDATE collaboration_events SET published_at = NOW()
    
    Note over Worker,Outbox: If broker fails or server crashes:
    loop Every 3000ms
        Worker->>Outbox: SELECT WHERE published_at IS NULL
        Worker->>Broker: broadcast(envelope)
        Worker->>Outbox: UPDATE SET published_at = NOW()
    end
```

---

### 5.7 In-Memory Real-Time Event Broker

- Implemented in `src/server/realtime/broker.ts` as a global singleton (`globalForBroker.realtimeBroker`).
- Holds a map of active connections: `Map<string, ClientConnection>`.
- Each connection stores: `userId`, `organizationId`, `authorizedProjectIds` (Set of string IDs), `isAdminOrOwner`, and the `ReadableStreamDefaultController`.
- When `broadcast(event)` is called:
  - Iterates over active connections.
  - Skips connections where `conn.organizationId !== event.organizationId`.
  - For project-scoped events: Skips connection if `!conn.isAdminOrOwner && !conn.authorizedProjectIds.has(event.projectId)`.
  - Enqueues UTF-8 encoded SSE data chunk: `id: ...\nevent: ...\ndata: ...\n\n`.

---

### 5.8 Asynchronous Background Outbox Worker

- Location: `workers/outbox/worker.ts`.
- Execution: `npm run worker:outbox` (`tsx workers/outbox/worker.ts`).
- Functionality: Polls batches of up to 50 unpublished events via `processOutboxQueue(50)`, broadcasts them, and marks them published. Handles graceful shutdown on `SIGINT` and `SIGTERM`.

---

### 5.9 Audit Trail & Activity Logging

Every meaningful task mutation generates an immutable record in `task_activities`:
- `task_created`: Initial task title and status ID.
- `status_changed`: Previous status ID and new status ID.
- `reassigned`: Previous assignee ID and new assignee ID.
- `task_moved`: Previous position/status and new position/status.
- `comment_added`: First 100 characters of comment.
- `task_deleted`: Soft-delete timestamp.

---

### 5.10 Error Handling & Standardized Response Formatting

`src/server/errors/app-error.ts` provides a structured error hierarchy:

| Class | Error Code | HTTP Status | Description |
|---|---|---|---|
| `BadRequestError` | `BAD_REQUEST` | 400 | Malformed input or invalid business operation |
| `UnauthorizedError`| `UNAUTHORIZED` | 401 | Missing or invalid authentication token |
| `ForbiddenError` | `FORBIDDEN` | 403 | Insufficient permission for operation |
| `NotFoundError` | `NOT_FOUND` | 404 | Resource does not exist or caller lacks access |
| `ConflictError` | `CONFLICT` | 409 | Optimistic concurrency version mismatch |
| `ValidationError` | `VALIDATION_ERROR` | 422 | Zod schema validation failed (returns `details`) |
| Unhandled `Error` | `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error (generates `requestId`) |

---

## 6. Database & Data Model Documentation

### 6.1 Database Engine & Data Access Architecture

- **Engine:** PostgreSQL (Native relational database server).
- **Driver:** `pg` (Node-Postgres) with connection pooling (`pg.Pool`).
- **ORM:** `drizzle-orm` (TypeScript query builder).

---

### 6.2 Entity-Relationship Diagram (Mermaid ERD)

```mermaid
erDiagram
    users ||--o{ organization_memberships : "has"
    users ||--o{ organization_invitations : "creates"
    users ||--o{ project_memberships : "has"
    users ||--o{ tasks : "creates / assigned"
    users ||--o{ task_comments : "authors"
    users ||--o{ task_activities : "acts"
    users ||--o{ notifications : "receives"
    
    organizations ||--o{ organization_memberships : "contains"
    organizations ||--o{ organization_invitations : "contains"
    organizations ||--o{ projects : "owns"
    organizations ||--o{ workflow_statuses : "scopes"
    organizations ||--o{ tasks : "scopes"
    organizations ||--o{ task_comments : "scopes"
    organizations ||--o{ task_activities : "scopes"
    organizations ||--o{ notifications : "scopes"
    organizations ||--o{ collaboration_events : "scopes"

    projects ||--o{ project_memberships : "has"
    projects ||--o{ workflow_statuses : "defines"
    projects ||--o{ tasks : "contains"
    projects ||--o{ task_comments : "contains"
    projects ||--o{ task_activities : "contains"

    workflow_statuses ||--o{ tasks : "categorizes"

    tasks ||--o{ task_comments : "has"
    tasks ||--o{ task_activities : "generates"
    tasks ||--o{ notifications : "triggers"

    users {
        varchar id PK
        varchar email UK
        varchar name
        varchar password_hash
        timestamptz created_at
        timestamptz updated_at
    }

    organizations {
        varchar id PK
        varchar name
        varchar slug UK
        varchar created_by FK
        timestamptz created_at
        timestamptz updated_at
        timestamptz archived_at
    }

    organization_memberships {
        varchar id PK
        varchar organization_id FK
        varchar user_id FK
        varchar role
        timestamptz joined_at
        timestamptz created_at
        timestamptz updated_at
    }

    organization_invitations {
        varchar id PK
        varchar organization_id FK
        varchar email
        varchar role
        varchar token_hash UK
        timestamptz expires_at
        timestamptz accepted_at
        timestamptz revoked_at
        varchar created_by FK
        timestamptz created_at
    }

    projects {
        varchar id PK
        varchar organization_id FK
        varchar name
        text description
        varchar visibility
        varchar created_by FK
        timestamptz created_at
        timestamptz updated_at
        timestamptz archived_at
    }

    project_memberships {
        varchar id PK
        varchar organization_id FK
        varchar project_id FK
        varchar user_id FK
        varchar role
        timestamptz joined_at
        timestamptz created_at
    }

    workflow_statuses {
        varchar id PK
        varchar organization_id FK
        varchar project_id FK
        varchar name
        varchar key
        varchar category
        float position
        boolean is_default
        timestamptz created_at
        timestamptz updated_at
    }

    tasks {
        varchar id PK
        varchar organization_id FK
        varchar project_id FK
        varchar status_id FK
        varchar title
        text description
        varchar priority
        varchar created_by FK
        varchar assignee_id FK
        varchar parent_task_id
        timestamptz due_at
        float position
        integer version
        timestamptz created_at
        timestamptz updated_at
        timestamptz completed_at
        timestamptz deleted_at
    }

    task_comments {
        varchar id PK
        varchar organization_id FK
        varchar project_id FK
        varchar task_id FK
        varchar author_id FK
        text content
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    task_activities {
        varchar id PK
        varchar organization_id FK
        varchar project_id FK
        varchar task_id FK
        varchar actor_id FK
        varchar event_type
        text previous_value
        text new_value
        jsonb metadata
        timestamptz created_at
    }

    notifications {
        varchar id PK
        varchar organization_id FK
        varchar recipient_id FK
        varchar event_id
        varchar type
        varchar resource_type
        varchar resource_id
        varchar title
        text message
        timestamptz read_at
        timestamptz created_at
    }

    collaboration_events {
        varchar id PK
        varchar organization_id
        varchar aggregate_type
        varchar aggregate_id
        varchar event_type
        jsonb payload
        timestamptz created_at
        timestamptz published_at
        integer attempt_count
    }
```

---

### 6.3 Complete Table Schemas & Column Dictionaries

#### 1. `users`
| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `VARCHAR(64)` | No | None | Primary Key (`usr_<uuid>`) |
| `email` | `VARCHAR(255)` | No | None | Unique user email address |
| `name` | `VARCHAR(255)` | No | None | Full display name |
| `password_hash` | `VARCHAR(255)` | No | None | Bcrypt hashed password |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Registration timestamp |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | Last profile update timestamp |

#### 2. `organizations`
| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `VARCHAR(64)` | No | None | Primary Key (`org_<uuid>`) |
| `name` | `VARCHAR(255)` | No | None | Organization display name |
| `slug` | `VARCHAR(255)` | No | None | Unique URL identifier |
| `created_by` | `VARCHAR(64)` | No | None | FK -> `users.id` |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Provisioning timestamp |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | Last update timestamp |
| `archived_at` | `TIMESTAMPTZ` | Yes | `NULL` | Archival timestamp |

#### 3. `organization_memberships`
| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `VARCHAR(64)` | No | None | Primary Key (`mem_<uuid>`) |
| `organization_id` | `VARCHAR(64)` | No | None | FK -> `organizations.id` (ON DELETE CASCADE) |
| `user_id` | `VARCHAR(64)` | No | None | FK -> `users.id` (ON DELETE CASCADE) |
| `role` | `VARCHAR(32)` | No | None | `owner` \| `admin` \| `member` \| `viewer` \| `guest` |
| `joinedAt` | `TIMESTAMPTZ` | No | `NOW()` | Membership establishment timestamp |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Record creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | Last update timestamp |

#### 4. `organization_invitations`
| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `VARCHAR(64)` | No | None | Primary Key (`inv_<uuid>`) |
| `organization_id` | `VARCHAR(64)` | No | None | FK -> `organizations.id` (ON DELETE CASCADE) |
| `email` | `VARCHAR(255)` | No | None | Invited user email address |
| `role` | `VARCHAR(32)` | No | None | Assigned role upon acceptance |
| `token_hash` | `VARCHAR(255)` | No | None | Unique SHA-256 hash of secret invitation token |
| `expires_at` | `TIMESTAMPTZ` | No | None | Expiration timestamp (+7 days) |
| `accepted_at` | `TIMESTAMPTZ` | Yes | `NULL` | Acceptance timestamp |
| `revoked_at` | `TIMESTAMPTZ` | Yes | `NULL` | Revocation timestamp |
| `created_by` | `VARCHAR(64)` | No | None | FK -> `users.id` (Inviter) |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Invitation creation timestamp |

#### 5. `projects`
| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `VARCHAR(64)` | No | None | Primary Key (`proj_<uuid>`) |
| `organization_id` | `VARCHAR(64)` | No | None | FK -> `organizations.id` (ON DELETE CASCADE) |
| `name` | `VARCHAR(255)` | No | None | Project display name |
| `description` | `TEXT` | Yes | `NULL` | Detailed description |
| `visibility` | `VARCHAR(32)` | No | `'organization'`| `organization` \| `private` \| `guest` |
| `created_by` | `VARCHAR(64)` | No | None | FK -> `users.id` |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | Last update timestamp |
| `archived_at` | `TIMESTAMPTZ` | Yes | `NULL` | Soft delete/archival timestamp |

#### 6. `project_memberships`
| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `VARCHAR(64)` | No | None | Primary Key (`pm_<uuid>`) |
| `organization_id` | `VARCHAR(64)` | No | None | FK -> `organizations.id` (ON DELETE CASCADE) |
| `project_id` | `VARCHAR(64)` | No | None | FK -> `projects.id` (ON DELETE CASCADE) |
| `user_id` | `VARCHAR(64)` | No | None | FK -> `users.id` (ON DELETE CASCADE) |
| `role` | `VARCHAR(32)` | No | `'member'` | `lead` \| `member` \| `viewer` |
| `joined_at` | `TIMESTAMPTZ` | No | `NOW()` | Assignment timestamp |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Creation timestamp |

#### 7. `workflow_statuses`
| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `VARCHAR(64)` | No | None | Primary Key (`status_<uuid>`) |
| `organization_id` | `VARCHAR(64)` | No | None | FK -> `organizations.id` (ON DELETE CASCADE) |
| `project_id` | `VARCHAR(64)` | No | None | FK -> `projects.id` (ON DELETE CASCADE) |
| `name` | `VARCHAR(255)` | No | None | Column display title (e.g. "In Progress") |
| `key` | `VARCHAR(64)` | No | None | Unique project key (e.g. "in_progress") |
| `category` | `VARCHAR(32)` | No | `'unstarted'` | `backlog` \| `unstarted` \| `started` \| `completed` \| `cancelled` |
| `position` | `DOUBLE PRECISION`| No | None | Fractional column display position |
| `is_default` | `BOOLEAN` | No | `FALSE` | Flag indicating default status for new tasks |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | Last update timestamp |

#### 8. `tasks`
| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `VARCHAR(64)` | No | None | Primary Key (`task_<uuid>`) |
| `organization_id` | `VARCHAR(64)` | No | None | FK -> `organizations.id` (ON DELETE CASCADE) |
| `project_id` | `VARCHAR(64)` | No | None | FK -> `projects.id` (ON DELETE CASCADE) |
| `status_id` | `VARCHAR(64)` | No | None | FK -> `workflow_statuses.id` |
| `title` | `VARCHAR(255)` | No | None | Task title |
| `description` | `TEXT` | Yes | `NULL` | Task markdown content |
| `priority` | `VARCHAR(32)` | No | `'medium'` | `urgent` \| `high` \| `medium` \| `low` \| `none` |
| `created_by` | `VARCHAR(64)` | No | None | FK -> `users.id` |
| `assignee_id` | `VARCHAR(64)` | Yes | `NULL` | FK -> `users.id` (ON DELETE SET NULL) |
| `parent_task_id`| `VARCHAR(64)` | Yes | `NULL` | Self-reference for subtasks |
| `due_at` | `TIMESTAMPTZ` | Yes | `NULL` | Task due date |
| `position` | `DOUBLE PRECISION`| No | None | Fractional position within column |
| `version` | `INTEGER` | No | `1` | Optimistic Concurrency Control counter |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | Last update timestamp |
| `completed_at` | `TIMESTAMPTZ` | Yes | `NULL` | Timestamp when moved to completed category |
| `deleted_at` | `TIMESTAMPTZ` | Yes | `NULL` | Soft delete timestamp |

#### 9. `task_comments`
| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `VARCHAR(64)` | No | None | Primary Key (`comment_<uuid>`) |
| `organization_id` | `VARCHAR(64)` | No | None | FK -> `organizations.id` (ON DELETE CASCADE) |
| `project_id` | `VARCHAR(64)` | No | None | FK -> `projects.id` (ON DELETE CASCADE) |
| `task_id` | `VARCHAR(64)` | No | None | FK -> `tasks.id` (ON DELETE CASCADE) |
| `author_id` | `VARCHAR(64)` | No | None | FK -> `users.id` |
| `content` | `TEXT` | No | None | Comment body |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | Last update timestamp |
| `deleted_at` | `TIMESTAMPTZ` | Yes | `NULL` | Soft delete timestamp |

#### 10. `task_activities`
| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `VARCHAR(64)` | No | None | Primary Key (`act_<uuid>`) |
| `organization_id` | `VARCHAR(64)` | No | None | FK -> `organizations.id` (ON DELETE CASCADE) |
| `project_id` | `VARCHAR(64)` | No | None | FK -> `projects.id` (ON DELETE CASCADE) |
| `task_id` | `VARCHAR(64)` | No | None | FK -> `tasks.id` (ON DELETE CASCADE) |
| `actor_id` | `VARCHAR(64)` | Yes | `NULL` | FK -> `users.id` |
| `event_type` | `VARCHAR(64)` | No | None | Event name (`task_created`, `status_changed`, etc.) |
| `previous_value`| `TEXT` | Yes | `NULL` | Snapshot of value before change |
| `new_value` | `TEXT` | Yes | `NULL` | Snapshot of value after change |
| `metadata` | `JSONB` | No | `'{}'::jsonb`| Additional contextual JSON data |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Log creation timestamp |

#### 11. `notifications`
| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `VARCHAR(64)` | No | None | Primary Key (`notif_<uuid>`) |
| `organization_id` | `VARCHAR(64)` | No | None | FK -> `organizations.id` (ON DELETE CASCADE) |
| `recipient_id` | `VARCHAR(64)` | No | None | FK -> `users.id` (ON DELETE CASCADE) |
| `event_id` | `VARCHAR(64)` | Yes | `NULL` | Originating event ID |
| `type` | `VARCHAR(64)` | No | None | `task_assigned` \| `comment_added` \| `invited` |
| `resource_type` | `VARCHAR(32)` | No | None | `task` \| `project` |
| `resource_id` | `VARCHAR(64)` | No | None | Referenced resource ID |
| `title` | `VARCHAR(255)` | No | None | Notification title |
| `message` | `TEXT` | No | None | Notification message text |
| `read_at` | `TIMESTAMPTZ` | Yes | `NULL` | Timestamp when user marked as read |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Creation timestamp |

#### 12. `collaboration_events` (Durable Outbox)
| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `VARCHAR(64)` | No | None | Primary Key (`evt_<uuid>`) |
| `organization_id` | `VARCHAR(64)` | No | None | Owning organization ID |
| `aggregate_type` | `VARCHAR(32)` | No | None | `task` \| `project` \| `comment` |
| `aggregate_id` | `VARCHAR(64)` | No | None | Mutated resource ID |
| `event_type` | `VARCHAR(64)` | No | None | Event name (`task.moved`, `task.updated`, etc.) |
| `payload` | `JSONB` | No | None | Full event payload and envelope |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Event creation timestamp |
| `published_at` | `TIMESTAMPTZ` | Yes | `NULL` | Timestamp when successfully broadcast |
| `attempt_count` | `INTEGER` | No | `0` | Number of broadcast attempts |

---

### 6.4 Constraints, Foreign Keys & Cascading Semantics

1. **Composite Uniqueness:**
   - `organization_memberships(organization_id, user_id)`: Prevents duplicate user memberships in the same organization.
   - `project_memberships(project_id, user_id)`: Prevents duplicate project assignments.
   - `workflow_statuses(project_id, key)`: Guarantees unique status column keys within a project.
2. **Cascade Behavior:**
   - Deleting an organization cascades to all memberships, invitations, projects, workflow statuses, tasks, comments, activities, and notifications.
   - Deleting a project cascades to its project memberships, workflow statuses, tasks, comments, and activities.
   - Deleting a task cascades to its comments and activities.
   - Assignee deletion sets `assignee_id = NULL` (`ON DELETE SET NULL`), preserving the task and its history.

---

### 6.5 Indexes & Query Optimization

| Table | Index Name | Columns | Purpose |
|---|---|---|---|
| `organization_memberships` | `user_org_idx` | `(user_id, organization_id)` | Fast lookup of user organizations |
| `organization_invitations` | `org_invitation_email_idx` | `(organization_id, email)` | Duplicate invite check |
| `projects` | `project_org_idx` | `(organization_id, created_at)` | Fast project listing per organization |
| `project_memberships` | `org_user_proj_idx` | `(organization_id, user_id)` | Fast resolution of accessible projects |
| `workflow_statuses` | `proj_status_pos_idx` | `(project_id, position)` | Column order retrieval |
| `tasks` | `task_org_proj_idx` | `(organization_id, project_id)` | Multi-tenant project task scoping |
| `tasks` | `task_proj_status_pos_idx` | `(project_id, status_id, position)`| High-frequency Kanban column ordering |
| `tasks` | `task_org_assignee_idx` | `(organization_id, assignee_id, status_id)` | Assigned task lookups & dashboards |
| `tasks` | `task_deleted_idx` | `(project_id, deleted_at)` | Soft-delete filtering |
| `task_comments` | `task_comment_idx` | `(task_id, created_at)` | Task comment thread chronological order |
| `task_activities` | `task_activity_idx` | `(task_id, created_at)` | Task audit trail chronological order |
| `notifications` | `user_notification_idx` | `(recipient_id, read_at, created_at)` | Unread notification retrieval |
| `collaboration_events` | `outbox_publish_idx` | `(published_at, created_at)` | Worker polling of unpublished events |
| `collaboration_events` | `outbox_org_idx` | `(organization_id, created_at)` | Organization-scoped event queries |

---

### 6.6 Data Lifecycle, Soft Deletes & Archival Policies

- **Tasks:** Soft-deleted via `deleted_at = NOW()`. All read queries include `WHERE deleted_at IS NULL`.
- **Projects:** Soft-deleted / archived via `archived_at = NOW()`. Listing queries filter `WHERE archived_at IS NULL`.
- **Organizations:** Soft-deleted via `archived_at = NOW()`.
- **Comments:** Soft-deleted via `deleted_at = NOW()`.
- **Outbox Events:** Retained permanently for audit recovery; marked with `published_at = NOW()`.

---

### 6.7 Database Migrations & Seeding Strategy

- **Migrations (`src/db/migrate.ts`):** Wrapped in `BEGIN ... COMMIT` with automatic rollback on error. Employs DDL with `IF NOT EXISTS` and explicit type conversions.
- **Seeding (`src/db/seed.ts`):** Creates demo users (`alice@acme.com`, `bob@acme.com`, `charlie@acme.com`, `david@starlight.com`), organizations ("Acme Software Inc." and "Starlight Media"), projects ("Core Platform 2.0", "Q4 Board Strategy (Confidential)", "Mobile Streaming App"), default workflow statuses, sample tasks across columns, and comments.

---

## 7. End-to-End Data Flow & Execution Traces

### 7.1 Workflow 1: User Registration & Session Establishment

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Browser as Browser Client (/register)
    participant API as POST /api/v1/auth/register
    participant AuthService as AuthService.register()
    participant Bcrypt as bcryptjs (10 rounds)
    participant Jose as jose (SignJWT)
    participant DB as PostgreSQL (users table)

    User->>Browser: Enters Name, Email, Password & clicks "Create Account"
    Browser->>API: HTTP POST { name, email, password }
    API->>API: registerSchema.safeParse(body)
    API->>AuthService: register({ name, email, password })
    AuthService->>DB: SELECT FROM users WHERE email = :email
    DB-->>AuthService: Empty result (Email unique)
    AuthService->>Bcrypt: hash(password, salt)
    Bcrypt-->>AuthService: passwordHash ($2a$10$...)
    AuthService->>DB: INSERT INTO users VALUES (...) RETURNING *
    DB-->>AuthService: user row created
    AuthService->>Jose: SignJWT({ userId, email, name }).setExpirationTime('7d')
    Jose-->>AuthService: Signed HS256 JWT
    AuthService-->>API: { user, token }
    API-->>Browser: HTTP 201 Created + Set-Cookie: fellow_session=<token>
    Browser->>Browser: Redirects to /dashboard
```

---

### 7.2 Workflow 2: Organization Creation & Default Owner Provisioning

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Browser as Dashboard (/organizations/new)
    participant API as POST /api/v1/organizations
    participant Guard as requireUser()
    participant OrgService as OrganizationService.createOrganization()
    participant DB as PostgreSQL Transaction

    User->>Browser: Submits organization name "Acme Software"
    Browser->>API: HTTP POST { name: "Acme Software", slug: "acme-corp" }
    API->>Guard: Authenticate session token
    Guard-->>API: Session valid (userId: "usr_alice")
    API->>OrgService: createOrganization("usr_alice", { name, slug })
    OrgService->>DB: BEGIN Transaction
    OrgService->>DB: INSERT INTO organizations (id, name, slug, created_by) VALUES (...)
    OrgService->>DB: INSERT INTO organization_memberships (org_id, user_id, role = 'owner')
    OrgService->>DB: COMMIT Transaction
    DB-->>OrgService: Organization created & Owner assigned
    OrgService-->>API: { organization: { ..., role: 'owner' } }
    API-->>Browser: HTTP 201 Created
    Browser->>Browser: Redirects to /dashboard?org=org_id
```

---

### 7.3 Workflow 3: Project Creation with Default Workflow Column Initialization

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Browser as Dashboard (/dashboard)
    participant API as POST /api/v1/organizations/:id/projects
    participant ProjService as ProjectService.createProject()
    participant DB as PostgreSQL Transaction

    User->>Browser: Fills project modal (Name: "Platform 2.0", Visibility: "organization")
    Browser->>API: HTTP POST { name, description, visibility }
    API->>ProjService: createProject(userId, orgId, data)
    ProjService->>DB: SELECT role FROM organization_memberships WHERE orgId & userId
    DB-->>ProjService: role = 'owner' (canCreateProject == true)
    ProjService->>DB: BEGIN Transaction
    ProjService->>DB: INSERT INTO projects VALUES (...)
    ProjService->>DB: INSERT INTO project_memberships (role = 'lead')
    ProjService->>DB: Batch INSERT 5 workflow_statuses (Backlog, To Do, In Progress, In Review, Done)
    ProjService->>DB: COMMIT Transaction
    DB-->>ProjService: Project & 5 columns committed
    ProjService-->>API: Project object
    API-->>Browser: HTTP 201 Created
```

---

### 7.4 Workflow 4: Task Creation, Outbox Commitment & Live Broadcast

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Browser as Kanban Board (/projects/:id)
    participant API as POST /api/v1/projects/:id/tasks
    participant TaskService as TaskService.createTask()
    participant DB as PostgreSQL Transaction
    participant Broker as RealtimeBroker
    participant OtherClient as Collaborator Browser (SSE)

    User->>Browser: Clicks "+ Add Task", fills title & priority
    Browser->>API: HTTP POST { title, statusId, priority, assigneeId }
    API->>TaskService: createTask(userId, projectId, data)
    TaskService->>DB: Verify project access & statusId validity
    TaskService->>DB: BEGIN Transaction
    TaskService->>DB: Calculate position (max + 1000.0)
    TaskService->>DB: INSERT INTO tasks (version = 1, ...) RETURNING *
    TaskService->>DB: INSERT INTO task_activities (eventType: 'task_created')
    opt Assignee is someone else
        TaskService->>DB: INSERT INTO notifications (type: 'task_assigned')
    end
    TaskService->>DB: INSERT INTO collaboration_events (published_at = NULL)
    TaskService->>DB: COMMIT Transaction
    TaskService->>Broker: publishEvent(envelope)
    Broker->>Broker: Filter active connections by orgId & projectId access
    Broker-->>OtherClient: SSE message event: task.created
    TaskService->>DB: UPDATE collaboration_events SET published_at = NOW()
    TaskService-->>API: Created task object
    API-->>Browser: HTTP 201 Created
```

---

### 7.5 Workflow 5: Drag-and-Drop Task Reordering with Automatic Column Rebalancing

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Kanban as Kanban Board (@hello-pangea/dnd)
    participant API as POST /api/v1/tasks/:id/move
    participant TaskService as TaskService.moveTask()
    participant Reorder as fractional-index.ts
    participant DB as PostgreSQL Transaction

    User->>Kanban: Drags task between prevTask and nextTask
    Kanban->>Kanban: Optimistically updates local UI state
    Kanban->>API: HTTP POST { statusId, prevTaskId, nextTaskId, expectedVersion: 3 }
    API->>TaskService: moveTask(userId, taskId, moveData)
    TaskService->>DB: SELECT version, statusId, position FROM tasks WHERE id = :id
    DB-->>TaskService: current version = 3 (Matches expectedVersion!)
    TaskService->>DB: Fetch prevTask.position & nextTask.position
    TaskService->>Reorder: computePosition(prevPos, nextPos)
    alt Gap >= 0.0001
        Reorder-->>TaskService: { position: 1500.0, needsRebalance: false }
    else Gap < 0.0001 (Compressed Gap!)
        Reorder-->>TaskService: { position: ..., needsRebalance: true }
        TaskService->>DB: SELECT id FROM tasks WHERE statusId = destStatus ORDER BY position
        TaskService->>Reorder: rebalancePositions(orderedIds)
        Reorder-->>TaskService: Rebalanced array [(id, 1000.0), (id, 2000.0), ...]
        TaskService->>DB: Batch UPDATE tasks SET position = rb.position
    end
    TaskService->>DB: BEGIN Transaction
    TaskService->>DB: UPDATE tasks SET statusId, position, version = version + 1
    TaskService->>DB: INSERT INTO task_activities (eventType: 'task_moved')
    TaskService->>DB: INSERT INTO collaboration_events (eventType: 'task.moved')
    TaskService->>DB: COMMIT Transaction
    TaskService-->>API: Canonical updated task
    API-->>Kanban: HTTP 200 OK { task: { version: 4, position: ... } }
    Kanban->>Kanban: Replaces optimistic task with canonical task
```

---

### 7.6 Workflow 6: Concurrent Task Edit/Move Conflict Detection (`409 Conflict`)

```mermaid
sequenceDiagram
    autonumber
    actor Alice
    actor Bob
    participant API as Task API
    participant TaskService as TaskService
    participant DB as PostgreSQL

    Note over Alice,Bob: Both Alice and Bob view Task A at Version 1
    Alice->>API: POST /tasks/A/move { statusId: "done", expectedVersion: 1 }
    API->>TaskService: moveTask(Alice, TaskA, expectedVersion: 1)
    TaskService->>DB: UPDATE tasks SET version = 2 WHERE id = A AND version = 1
    DB-->>TaskService: 1 row updated (Success!)
    TaskService-->>API: Move succeeded (Task A is now Version 2)
    API-->>Alice: HTTP 200 OK

    Bob->>API: POST /tasks/A/move { statusId: "in_progress", expectedVersion: 1 }
    API->>TaskService: moveTask(Bob, TaskA, expectedVersion: 1)
    TaskService->>DB: SELECT version FROM tasks WHERE id = A
    DB-->>TaskService: version = 2
    TaskService->>TaskService: Check expectedVersion (1) !== current version (2)
    TaskService-->>API: Throws ConflictError("Move conflict: Task was modified concurrently")
    API-->>Bob: HTTP 409 Conflict { error: { code: "CONFLICT", message: "..." } }
    Bob->>Bob: Catches 409 Conflict, rolls back optimistic drag, shows recovery banner
```

---

### 7.7 Workflow 7: Real-Time SSE Subscription & Channel Boundary Filtering

```mermaid
sequenceDiagram
    autonumber
    actor GuestUser as Guest Collaborator
    participant Browser as Guest Browser
    participant SSE as GET /api/v1/realtime/stream?organizationId=orgA
    participant Broker as RealtimeBroker
    actor AdminUser as Org Admin
    participant MutationAPI as Task Mutation API

    Browser->>SSE: Establishes EventSource connection
    SSE->>SSE: Resolves accessible projects for Guest (Only Project Public)
    SSE->>Broker: register({ userId: Guest, authorizedProjectIds: ["proj_public"] })
    SSE-->>Browser: event: system.connected { authorizedProjectCount: 1 }

    Note over AdminUser,MutationAPI: Admin creates Task in Private Project "proj_private"
    AdminUser->>MutationAPI: POST /projects/proj_private/tasks
    MutationAPI->>Broker: broadcast(event: task.created, projectId: "proj_private")
    Broker->>Broker: Evaluates Guest connection:
    Broker->>Broker: Check "proj_private" in authorizedProjectIds? -> FALSE!
    Broker->>Broker: SILENTLY SUPPRESS EVENT for Guest!
    Note over Browser: Guest receives ZERO leaked data from private project
```

---

### 7.8 Workflow 8: Cross-Tenant Resource Isolation & Existence Concealment (`404 Not Found`)

```mermaid
sequenceDiagram
    autonumber
    actor Attacker as User in Org B
    participant API as GET /api/v1/projects/:projectId (from Org A)
    participant ProjService as ProjectService.getProjectContext()
    participant DB as PostgreSQL

    Attacker->>API: GET /api/v1/projects/proj_orgA_123
    API->>ProjService: getProjectContext(UserB, "proj_orgA_123")
    ProjService->>DB: SELECT * FROM projects WHERE id = "proj_orgA_123"
    DB-->>ProjService: Project found (organizationId: "orgA")
    ProjService->>DB: SELECT role FROM organization_memberships WHERE orgId = "orgA" AND userId = UserB
    DB-->>ProjService: Empty result (User B is NOT a member of Org A)
    ProjService-->>API: Throws NotFoundError("Project not found")
    Note over API: Emits 404 NOT FOUND instead of 403 FORBIDDEN
    API-->>Attacker: HTTP 404 Not Found { error: { code: "NOT_FOUND" } }
    Note over Attacker: Attacker cannot determine if resource ID exists
```

---

## 8. Edge Cases, Failure Scenarios, and Error Handling

### 8.1 Comprehensive Edge Case Matrix

| Scenario / Edge Case | System Component | Handling Behavior | Status |
|---|---|---|---|
| **Missing required JSON body fields** | API Route Handlers / Zod | Returns `422 Unprocessable Entity` with field-level error dictionary | **Handled Correctly** |
| **Invalid email format or short password** | Auth API / Zod | Returns `422 Unprocessable Entity` with validation message | **Handled Correctly** |
| **Duplicate registration email** | `AuthService.register` | Throws `BadRequestError('A user with this email address already exists')` (400) | **Handled Correctly** |
| **Access non-existent resource ID** | Domain Services | Throws `NotFoundError('Resource not found')` (404) | **Handled Correctly** |
| **Cross-tenant resource query** | Domain Services / `permissions.ts` | Throws `NotFoundError` to conceal resource existence (404) | **Handled Correctly** |
| **Assigning user from another organization to task** | `TaskService.createTask` / `updateTask` | Verifies assignee in `organization_memberships`; throws `BadRequestError` (400) | **Handled Correctly** |
| **Removing last remaining organization owner** | `OrganizationService.removeMember` | Counts remaining owners; if $\le 1$, throws `BadRequestError` (400) | **Handled Correctly** |
| **Concurrent task edits (version mismatch)** | `TaskService.updateTask` | Detects `data.version !== existing.version`; throws `ConflictError` (409) | **Handled Correctly** |
| **Concurrent drag-and-drop moves** | `TaskService.moveTask` | Compares `expectedVersion`; throws `ConflictError` (409) | **Handled Correctly** |
| **Fractional position compression ($< 0.0001$)** | `fractional-index.ts` | Sets `needsRebalance = true`; automatically rebalances column positions to $1000, 2000, \dots$ | **Handled Correctly** |
| **Placing task first in column** | `computePosition` | If $pos > 1.0$, subtracts 1000.0; if $\le 1.0$, divides by 2.0 | **Handled Correctly** |
| **Unordered or identical neighbor positions** | `computePosition` | Detects $prev \ge next$; triggers `needsRebalance = true` | **Handled Correctly** |
| **Non-author editing comment** | `CommentService.updateComment`| Verifies `comment.authorId === userId`; throws `ForbiddenError` (403) | **Handled Correctly** |
| **Deleting comment** | `CommentService.deleteComment`| Allows author, project lead, or org admin/owner; throws `ForbiddenError` otherwise | **Handled Correctly** |
| **Private project access by regular member** | `permissions.canViewProject`| Denies access unless explicit `project_memberships` record exists (404) | **Handled Correctly** |
| **Guest user accessing unauthorized project** | `permissions.canViewProject`| Guests restricted exclusively to explicitly assigned projects (404) | **Handled Correctly** |
| **SSE event delivery for private projects** | `RealtimeBroker.broadcast` | Checks connection's `authorizedProjectIds`; skips unauthorized subscribers | **Handled Correctly** |
| **Revoked member viewing old notifications** | `NotificationService.getUserNotifications`| Re-checks active project permissions before returning; suppresses inaccessible notifications | **Handled Correctly** |
| **Database connection pool exhaustion** | `pg.Pool` (`src/db/client.ts`) | Pool maximum 20 clients; timeout 2000ms; throws error caught by `formatErrorResponse` (500) | **Handled Correctly** |
| **Process crash before broker broadcast** | `collaboration_events` / Worker| Outbox worker polls `published_at IS NULL` every 3s and recovers unsent events | **Handled Correctly** |
| **Client network drop during SSE** | Browser `EventSource` | Built-in browser retry; client refetches canonical board on reconnect | **Handled Correctly** |
| **High concurrency rebalance race condition** | `TaskService.moveTask` | Column tasks rebalanced without `SELECT FOR UPDATE`; potential concurrent overwrite | **Partially Handled (Risk)** |
| **Multi-instance horizontal scaling for SSE** | `RealtimeBroker` | In-memory `Map` is local to single Node process; does not sync across instances without Redis Pub/Sub | **Partially Handled (Limitation)**|

---

### 8.2 Tenant Boundary Violations & Resource Tampering

If an attacker belonging to Organization A attempts to fetch or mutate a task belonging to Organization B using its known UUID (`task_abc`), `TaskService.getTaskById` calls `ProjectService.getProjectContext`, which queries `organization_memberships` for Organization B. Finding no membership for the caller, the service throws `NotFoundError('Project not found')`. The client receives `404 Not Found` with zero indication of whether the ID is valid.

### 8.3 Concurrency Race Conditions & Conflict Resolution

When two team members drag the same task simultaneously:
1. Client 1 sends `expectedVersion: 4`. The server commits the move and sets `version: 5`.
2. Client 2 sends `expectedVersion: 4`. The server detects `task.version (5) !== expectedVersion (4)`.
3. The server immediately returns `409 Conflict`.
4. Client 2 catches the 409 status in `apiRequest()`, rolls back the task position to its previous coordinates, and triggers `loadProjectData()` to refresh the board.

### 8.4 Floating-Point Gap Compression & Boundary Collisions

When tasks are repeatedly inserted between the same two neighbors, the gap between positions halves on each operation:
- Step 0: $gap = 1000.0$
- Step 10: $gap \approx 0.976$
- Step 24: $gap \approx 0.000059 (< 0.0001)$
The `computePosition()` algorithm detects that $gap < 0.0001$, flags `needsRebalance = true`, and re-indexes all tasks in that column with clean increments of $1000.0$, resetting the precision budget without losing task order.

### 8.5 Network Disconnections & SSE Auto-Reconnection

When a client loses internet connectivity:
- The browser triggers `es.onerror`, updating the UI indicator to red `Disconnected`.
- The native browser `EventSource` engine automatically initiates reconnection attempts.
- Upon reconnection, the navbar connection badge transitions back to green `Connected`.
- The project board component refetches canonical tasks and statuses via `loadProjectData()`, ensuring that any mutations that occurred during the offline window are reconciled.

### 8.6 Outbox Broker Fault Tolerance & Worker Recovery

If the Node.js server process crashes or is killed by an orchestrator between the database transaction commit and the broker memory broadcast:
- The database transaction already succeeded and committed the event row into `collaboration_events` with `published_at = NULL`.
- When the process restarts (or on a dedicated worker instance), `workers/outbox/worker.ts` polls `SELECT * FROM collaboration_events WHERE published_at IS NULL LIMIT 50`.
- The worker broadcasts the event to active broker listeners and executes `UPDATE collaboration_events SET published_at = NOW(), attempt_count = attempt_count + 1 WHERE id = :id`.

---

## 9. Authentication, Security, and Configuration

### 9.1 Cryptographic Session Tokens (JWT via `jose`)

- **Algorithm:** HMAC using SHA-256 (`HS256`).
- **Secret Key:** `JWT_SECRET` environment variable (minimum 32 characters), encoded via `TextEncoder`.
- **Expiration:** 7 days (`setExpirationTime('7d')`).
- **Payload Schema:**
  ```typescript
  export interface SessionPayload {
    userId: string;
    email: string;
    name: string;
  }
  ```
- **Storage & Transport:**
  - Transported in `fellow_session` HTTP cookie.
  - Flags: `HttpOnly = true`, `SameSite = 'lax'`, `Path = '/'`, `Max-Age = 604800` (7 days), `Secure = true` in production (`process.env.NODE_ENV === 'production'`).
  - Fallback: Accepts `Authorization: Bearer <token>` for API clients, scripts, and automated test suites.

---

### 9.2 Password Hashing & Salt Rounds (Bcrypt)

- Uses `bcryptjs`.
- Password salt generation uses 10 rounds: `bcrypt.genSalt(10)`.
- Verification uses constant-time comparison: `bcrypt.compare(password, hash)`.
- Plaintext passwords are never logged, serialized, or returned in API responses.

---

### 9.3 Centralized Role-Based Access Control (RBAC) Matrix

#### Organization Roles & Capabilities:
| Action | Owner | Admin | Member | Viewer | Guest |
|---|---|---|---|---|---|
| **View Organization** | Yes | Yes | Yes | Yes | Yes (Scoped) |
| **Manage Org Settings (name, slug)** | Yes | Yes | No | No | No |
| **Invite Members** | Yes | Yes | No | No | No |
| **Remove Members** | Yes | Yes | No | No | No |
| **Transfer Ownership** | Yes | No | No | No | No |
| **Create Projects** | Yes | Yes | Yes | No | No |

#### Project & Task Operations Matrix:
| Operation | Org Owner / Admin | Project Lead | Project Member | Viewer | Guest (Assigned) |
|---|---|---|---|---|---|
| **View Project Board** | Yes | Yes | Yes | Yes (if visible) | Yes |
| **Edit Project Settings** | Yes | Yes | No | No | No |
| **Manage Project Members** | Yes | Yes | No | No | No |
| **Configure Workflow Columns** | Yes | Yes | No | No | No |
| **Create Tasks** | Yes | Yes | Yes | No | Yes |
| **Edit Tasks** | Yes | Yes | Yes | No | Yes |
| **Reorder / Move Tasks** | Yes | Yes | Yes | No | Yes |
| **Delete Tasks** | Yes | Yes | Creator Only | No | Creator Only |
| **Post Comments** | Yes | Yes | Yes | No | Yes |
| **Delete Comments** | Yes | Yes | Author Only | No | Author Only |

---

### 9.4 Project Visibility Isolation Model

1. **`organization`:** Visible to all organization members (`owner`, `admin`, `member`, `viewer`).
2. **`private`:** Strictly restricted to organization `owner`, organization `admin`, and explicit members listed in `project_memberships`. Invisible to all other organization members.
3. **`guest`:** Accessible to designated external collaborators who have explicit records in `project_memberships`, as well as organization `owner` and `admin`.

---

### 9.5 Invitation Security & One-Way Cryptographic Token Hashing

1. When an admin invites a user via `POST /organizations/:id/invitations`:
   - System generates 32 bytes of cryptographically secure random bytes: `crypto.randomBytes(32).toString('hex')` (64-character token).
   - Computes SHA-256 digest: `crypto.createHash('sha256').update(plainToken).digest('hex')`.
   - Stores `token_hash` in `organization_invitations` table with an expiration timestamp (+7 days).
   - Returns plaintext `token` to the admin.
2. When the invitee accepts via `POST /organizations/invitations/accept`:
   - Client sends plaintext `token`.
   - Server re-hashes the token via SHA-256 and queries `WHERE token_hash = :hash`.
   - If the database is compromised, invitations cannot be intercepted or hijacked because plaintext tokens are not stored.

---

### 9.6 Environment Variables & Configuration Dictionary

| Variable Name | Required | Default / Fallback Value | Description |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | `postgresql://localhost:5432/fellow` | PostgreSQL connection URI for application runtime |
| `TEST_DATABASE_URL`| No | Falls back to `DATABASE_URL` | PostgreSQL connection URI used when `NODE_ENV === 'test'` |
| `JWT_SECRET` | **Yes** | Built-in fallback string (Warns in prod)| Cryptographic signing key for HS256 session JWTs (min 32 chars) |
| `SESSION_EXPIRES_IN`| No | `'7d'` | Session lifespan duration |
| `PORT` | No | `3000` | HTTP port for Next.js web server |
| `NODE_ENV` | No | `'development'` | Environment mode (`development`, `test`, `production`) |
| `NEXT_PUBLIC_APP_URL`| No| `http://localhost:3000` | Public base URL used for client links |

> [!WARNING]
> Never commit production secrets, database credentials, or private keys to source control. In production environments, inject `DATABASE_URL` and `JWT_SECRET` via secure cloud secret managers (e.g. AWS Secrets Manager, GCP Secret Manager, or HashiCorp Vault).

---

## 10. External Integrations and Dependencies

### 10.1 Production Runtime Dependencies

| Library | Version | Purpose in System | Verification & Error Handling |
|---|---|---|---|
| **Next.js** | `^14.2.35` | Full-stack server, route handlers, App Router | Standard Next.js server error formatting and static optimization. |
| **PostgreSQL (`pg`)** | `^8.23.1` | Native database client pool | Pool handles connection reconnection; connection errors caught in health check and service calls. |
| **Drizzle ORM** | `^0.45.4` | Query generation and relational schema definitions | Translates TypeScript schemas into parameterized SQL queries preventing SQL injection. |
| **Jose** | `^6.2.14` | JWT creation and verification | Throws on expired, malformed, or tampered signatures; handled by session verification. |
| **Bcryptjs** | `^3.0.3` | Cryptographic password hashing | Employs adaptive salt rounds; handles invalid password comparisons gracefully. |
| **Zod** | `^4.6.7` | Input validation | `safeParse()` captures schema violations and returns flattened error records. |
| **@hello-pangea/dnd**| `^18.0.1`| Accessible drag-and-drop | Handles drop reordering events; frontend rolls back state on network or concurrency rejection. |
| **YAML** | `^2.9.1` | OpenAPI specification parser | Reads `docs/openapi.yaml` and serializes to JSON for the `/docs` UI. |

---

### 10.2 Development & Build Tooling Dependencies

| Tool | Version | Purpose |
|---|---|---|
| **TypeScript** | `^5.6.3` | Enforces static type safety across client and server. |
| **Vitest** | `^5.0.5` | Test runner executing unit, security, concurrency, and integration suites. |
| **Tailwind CSS** | `^3.4.17` | Utility CSS compiler generating production styles. |
| **TSX** | `^4.23.15` | Executes TypeScript CLI scripts (`migrate.ts`, `seed.ts`, `worker.ts`). |
| **Drizzle Kit** | `^0.31.11` | Drizzle ORM schema generator. |

---

## 11. Build, Runtime, Testing, and Deployment

### 11.1 Runtime Prerequisites & Environment Setup

- **Node.js:** v18.0.0 or higher (Verified on Node.js v26.6.6).
- **PostgreSQL:** v14.0 or higher running on local port `5432`.
- **Package Manager:** `npm` v9+.

---

### 11.2 Installation & Database Migration Commands

```bash
# 1. Clone repository and install dependencies
git clone <repository_url> fellow
cd fellow
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env to set your PostgreSQL credentials:
# DATABASE_URL=postgresql://user:password@localhost:5432/fellow
# TEST_DATABASE_URL=postgresql://user:password@localhost:5432/fellow_test
# JWT_SECRET=<secure_random_key_min_32_characters>

# 3. Create databases
createdb fellow
createdb fellow_test

# 4. Apply database migrations
npm run db:migrate

# 5. Seed initial demo data
npm run db:seed
```

---

### 11.3 Development Server & Background Worker Execution

```bash
# Terminal 1: Run Next.js Development Server
npm run dev
# Server listening at http://localhost:3000

# Terminal 2: Run Background Outbox Worker (Optional for local dev, required for production)
npm run worker:outbox
# Worker polling every 3000ms
```

---

### 11.4 Production Build Verification & Results

The production build was verified by running `npm run build`:
```text
> fellow-collaboration-platform@1.0.0 build
> next build

  ▲ Next.js 14.2.35
  - Environments: .env

   Creating an optimized production build ...
 ✓ Compiled successfully
   Linting and checking validity of types     ✓ Linting and checking validity of types 
   Collecting page data                       ✓ Collecting page data 
 ✓ Generating static pages (16/16)
   Collecting build traces                    ✓ Collecting build traces 
   Finalizing page optimization               ✓ Finalizing page optimization 

Route (app)                                                  Size     First Load JS
┌ ƒ /                                                        137 B          87.4 kB
├ ○ /_not-found                                              875 B          88.2 kB
├ ƒ /api/v1/auth/login                                       0 B                0 B
├ ƒ /api/v1/auth/logout                                      0 B                0 B
├ ƒ /api/v1/auth/register                                    0 B                0 B
├ ƒ /api/v1/comments/[commentId]                             0 B                0 B
├ ƒ /api/v1/health                                           0 B                0 B
├ ƒ /api/v1/me                                               0 B                0 B
├ ƒ /api/v1/notifications                                    0 B                0 B
├ ƒ /api/v1/notifications/[notificationId]                   0 B                0 B
├ ƒ /api/v1/notifications/read-all                           0 B                0 B
├ ○ /api/v1/openapi.json                                     0 B                0 B
├ ƒ /api/v1/organizations                                    0 B                0 B
├ ƒ /api/v1/organizations/[organizationId]                   0 B                0 B
├ ƒ /api/v1/organizations/[organizationId]/invitations       0 B                0 B
├ ƒ /api/v1/organizations/[organizationId]/members           0 B                0 B
├ ƒ /api/v1/organizations/[organizationId]/members/[userId]  0 B                0 B
├ ƒ /api/v1/organizations/[organizationId]/projects          0 B                0 B
├ ƒ /api/v1/organizations/invitations/accept                 0 B                0 B
├ ƒ /api/v1/projects/[projectId]                             0 B                0 B
├ ƒ /api/v1/projects/[projectId]/members                     0 B                0 B
├ ƒ /api/v1/projects/[projectId]/members/[userId]            0 B                0 B
├ ƒ /api/v1/projects/[projectId]/statuses                    0 B                0 B
├ ƒ /api/v1/projects/[projectId]/tasks                       0 B                0 B
├ ƒ /api/v1/realtime/stream                                  0 B                0 B
├ ƒ /api/v1/search                                           0 B                0 B
├ ƒ /api/v1/tasks/[taskId]                                   0 B                0 B
├ ƒ /api/v1/tasks/[taskId]/activity                          0 B                0 B
├ ƒ /api/v1/tasks/[taskId]/comments                          0 B                0 B
├ ƒ /api/v1/tasks/[taskId]/move                              0 B                0 B
├ ○ /dashboard                                               3.86 kB         106 kB
├ ○ /docs                                                    3.69 kB        99.7 kB
├ ○ /login                                                   1.69 kB        97.7 kB
├ ƒ /organizations/[organizationId]/settings                 3.42 kB         105 kB
├ ○ /organizations/new                                       3.53 kB        99.5 kB
├ ƒ /projects/[projectId]                                    37.1 kB         139 kB
└ ○ /register                                                1.75 kB        97.7 kB
+ First Load JS shared by all                                87.3 kB

✓ Build completed with 0 errors.
```

---

### 11.5 Automated Test Suite Execution & Verified Results

#### Type Checking:
```bash
npx tsc --noEmit
# Result: 0 errors across entire codebase (Exit code 0)
```

#### Unit Test Execution:
```bash
npx vitest run tests/unit
```
**Verified Output:**
```text
✓ tests/unit/permissions.test.ts (9 tests)
✓ tests/unit/ordering.test.ts (7 tests)

Test Files  2 passed (2)
     Tests  16 passed (16)
  Duration  209ms
```

#### Test Suite Breakdown:
1. **`tests/unit/permissions.test.ts` (9 tests - PASSED):**
   - Organization role capabilities (`owner`, `admin`, `member`, `viewer`, `guest`).
   - Project visibility isolation (`organization`, `private`, `guest`).
   - Task creation, modification, and creator-only deletion policies.
2. **`tests/unit/ordering.test.ts` (7 tests - PASSED):**
   - Empty column initial position ($1000.0$).
   - Insertion at head and tail.
   - Midpoint calculation between neighbors ($1500.0, 1250.0$).
   - Compression threshold detection ($< 0.0001$).
   - Unordered neighbor detection.
   - Column rebalancing distribution ($1000, 2000, 3000, 4000$).
3. **`tests/security/tenant-isolation.test.ts` (7 tests):**
   - Cross-tenant data isolation; cross-tenant ID tampering rejection; cross-tenant task assignment prevention; private project access restriction; search scoping; immediate membership revocation. *(Requires active PostgreSQL connection)*.
4. **`tests/concurrency/concurrency.test.ts` (3 tests):**
   - Optimistic locking version mismatch (`409 Conflict`); concurrent move conflict detection; durable outbox persistence and worker publication. *(Requires active PostgreSQL connection)*.
5. **`tests/integration/api.test.ts` (7 tests):**
   - End-to-end API lifecycle across auth, orgs, projects, tasks, moves, comments, search, and statuses. *(Requires active PostgreSQL connection)*.

---

### 11.6 Production Deployment & Reverse Proxy Requirements

When deploying Fellow behind a reverse proxy (e.g. Nginx, Cloudflare, AWS ALB):
1. **SSE Buffering Disabling:** Server-Sent Events require real-time streaming without response buffering. The response includes `X-Accel-Buffering: no`, but Nginx must be configured with:
   ```nginx
   location /api/v1/realtime/stream {
       proxy_pass http://localhost:3000;
       proxy_http_version 1.1;
       proxy_set_header Connection "";
       proxy_buffering off;
       proxy_cache off;
       chunked_transfer_encoding off;
       proxy_read_timeout 86400s;
   }
   ```
2. **Horizontal Scaling:** When scaling to multiple container instances, the in-memory broker in `src/server/realtime/broker.ts` must be connected to a Redis Pub/Sub backplane so that SSE events published on Instance A are broadcast to clients connected to Instance B.

---

## 12. Technical Debt, Risk Analysis, and Improvement Roadmap

### 12.1 High Severity Findings & Vulnerabilities

#### 1. In-Memory Real-Time Broker Lacks Distributed Backplane
- **Evidence:** `src/server/realtime/broker.ts` maintains connections in a local JavaScript `Map`.
- **Risk:** In a multi-replica deployment (Kubernetes or AWS ECS), a task move processed by Node A is only broadcast to SSE clients connected to Node A. Clients connected to Node B do not receive the live update until manual page refresh or outbox polling.
- **Remediation:** Introduce a Redis Pub/Sub adapter to `RealtimeBroker.broadcast()` so messages are published to a Redis channel and received by all web instances.

#### 2. Rebalance Query Lacks Pessimistic Row Locking
- **Evidence:** `TaskService.moveTask()` queries column tasks and updates positions in a loop without `SELECT ... FOR UPDATE`.
- **Risk:** If two users simultaneously trigger rebalances in the exact same column, interleaving writes could produce non-deterministic fractional gaps.
- **Remediation:** Add `FOR UPDATE` to the column tasks query in `src/server/services/task.service.ts` during rebalancing.

---

### 12.2 Medium Severity Findings & Inconsistencies

#### 1. Missing Authentication Rate Limiting
- **Evidence:** `/api/v1/auth/login` and `/api/v1/auth/register` execute password hashing without IP or account-level rate limiting.
- **Risk:** Susceptible to brute-force credential stuffing attacks and CPU exhaustion due to bcrypt computation costs.
- **Remediation:** Integrate a rate-limiting middleware (e.g. `@upstash/ratelimit` or Redis sliding-window counter) limiting login attempts to 5 per minute per IP.

#### 2. Organization Slug Collision Fallback Loop
- **Evidence:** `OrganizationService.createOrganization` appends a 3-byte random hex string if the slug exists, but does not perform a loop check if that slug also collides.
- **Remediation:** Wrap slug generation in a retry loop or rely on a database unique constraint catch block.

#### 3. Unimplemented Playwright Test Suite
- **Evidence:** `package.json` defines `"test:e2e": "playwright test"`, but `tests/e2e/` is an empty directory and `@playwright/test` is not listed in `devDependencies`.
- **Remediation:** Install `@playwright/test` and author end-to-end browser tests for the drag-and-drop board.

---

### 12.3 Low Severity Findings & Architectural Cleanups

#### 1. Interactive ESLint Prompt
- **Evidence:** Running `npm run lint` interactively prompts for ESLint configuration because `.eslintrc.json` is absent.
- **Remediation:** Create a standard `.eslintrc.json` extending `next/core-web-vitals`.

#### 2. Vite Config Native Warning in Vitest
- **Evidence:** Vitest outputs a deprecation warning regarding `configLoader: 'native'`.
- **Remediation:** Rename `vitest.config.ts` to `vitest.config.mjs` or set `"type": "module"` in `package.json`.

---

### 12.4 Dead Code & Empty Directory Inventory

The following directories exist in the repository structure but contain no files:
- `src/features/activity/` (Empty)
- `src/features/boards/` (Empty)
- `src/features/comments/` (Empty)
- `src/features/membership/` (Empty)
- `src/features/notifications/` (Empty)
- `src/features/organizations/` (Empty)
- `src/features/projects/` (Empty)
- `src/features/tasks/` (Empty)
- `src/server/repositories/` (Empty)
- `workers/notifications/` (Empty)
- `scripts/` (Empty)
- `tests/e2e/` (Empty)

**Recommendation:** Remove the unused `src/features/` and `src/server/repositories/` directories to simplify the project structure, or migrate logic into them if transitioning to feature-sliced architecture.

---

### 12.5 Prioritized Remediation Roadmap

```mermaid
flowchart LR
    P1["Phase 1: Production Hardening"] --> P2["Phase 2: Scalability & Distributed Sync"]
    P2 --> P3["Phase 3: Cleanup & E2E Verification"]

    subgraph P1["Phase 1: Production Hardening"]
        A1["Add .eslintrc.json to resolve next lint"]
        A2["Implement Redis/IP Rate Limiting on /auth/login"]
        A3["Add FOR UPDATE row locks to rebalance transactions"]
    end

    subgraph P2["Phase 2: Scalability & Distributed Sync"]
        B1["Integrate Redis Pub/Sub into RealtimeBroker"]
        B2["Implement worker in workers/notifications"]
        B3["Add webhook dispatching to durable outbox"]
    end

    subgraph P3["Phase 3: Cleanup & E2E Verification"]
        C1["Remove empty src/features and repositories directories"]
        C2["Configure Playwright and author e2e board tests"]
        C3["Rename vitest.config.ts to vitest.config.mjs"]
    end
```

---

*This document was compiled following full static code analysis and verification of the Fellow Collaboration Platform codebase.*
