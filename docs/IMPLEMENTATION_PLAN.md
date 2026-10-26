# Lifeline-Core v3 — Comprehensive Implementation Plan

## 1. Mission & Scope
Transform **Lifeline-Core v2** into **Lifeline-Core v3**: an enterprise-grade, secure, resilient, deeply functional, production-engineered emergency hospital resource coordination and allocation platform.

---

## 2. Phase Zero: Reality Audit Findings & Immediate Actions

### Audit Results:
1. **Durable Reservation Lifecycle:**
   - *Current State:* The C++ in-memory min-heap handles TTL expiry, but on crash or restart, in-memory state is lost. PostgreSQL had no background worker claiming expired reservations using `SKIP LOCKED`.
   - *V3 Action:* Implement durable PostgreSQL-backed reservation state machine with a dedicated reliable background expiry worker using row-level locking, idempotent confirmation/release endpoints, optimistic concurrency tokens, and multi-resource reservation lines.
2. **Security & Authentication Boundary:**
   - *Current State:* Fastify API had zero authentication, no RBAC, no session management, no password hashing, and unauthenticated state mutation endpoints.
   - *V3 Action:* Implement secure cookie-based session management, Argon2/bcrypt password hashing, RBAC (`DISPATCHER`, `HOSPITAL_OPERATOR`, `ADMIN`, `AUDITOR`, `VIEWER`), CSRF tokens, strict rate limiting, and centralized error classification without stack trace disclosure.
3. **PostgreSQL Capabilities & Extensions:**
   - *Current State:* PostgreSQL 18 user-space instance running on port 5433 has `earthdistance`, `cube`, `pg_trgm`, `btree_gist`, and `uuid-ossp` available. Native `postgis` and `pgvector` are not installed at the system level.
   - *V3 Action:* Use PostgreSQL native spherical geometry via `earthdistance` + `cube` for spatial indexing and radius queries. Implement an extensible semantic knowledge retrieval pipeline with exact cosine similarity vector matching over PostgreSQL vector arrays (`FLOAT8[]`), backed by trigram text search (`pg_trgm`) for operational incident playbooks and hospital service restrictions.
4. **Real-time Observability & Telemetry:**
   - *Current State:* Client uses 3-5s polling. No Server-Sent Events (SSE).
   - *V3 Action:* Implement Server-Sent Events (`/api/v2/events/stream`) in Fastify for live reservation state transitions, capacity alerts, and operational feed status updates with heartbeat, reconnection, and full-state hydration.
5. **Route Completeness:**
   - *Current State:* 17 routes exist, but missing dedicated sub-routes for hospital resources, feed health, status history, alerts, activity timelines, new request workflow, and administrative settings.
   - *V3 Action:* Build out the full 34+ route hierarchy specified in Section 4 with consistent Radix UI, Tailwind CSS, TanStack Query, error boundaries, skeleton loaders, and deep-linking query parameters.

---

## 3. Workstream Execution Roadmap

### Workstream 1: Database Migration & Schema Evolution (v3.0.0)
- [ ] Migration `003_v3_core_schema.sql`:
  - `users`, `sessions`, `roles_permissions`
  - `hospital_capability_profiles`, `hospital_status_history`, `hospital_feed_logs`
  - `reservation_lines` (multi-resource atomic reservations)
  - `alerts` (with acknowledgement and resolution tracking)
  - `system_settings` (configurable engine weights and parameters)
  - `outbox_events` (transactional outbox pattern)
  - `operational_playbooks` (semantic operational playbook retrieval with embeddings & trigram search)
  - `idempotency_keys`
- [ ] Apply migration against `lifeline_dev` on port 5433.
- [ ] Verify query plans with `EXPLAIN (ANALYZE, BUFFERS)` for spatial lookups and reservation scans.

### Workstream 2: Backend Architecture & Security Hardening
- [ ] Authentication & RBAC plugin (`src/plugins/auth.ts`):
  - Password hashing with `bcrypt` / `crypto`
  - Secure HttpOnly session cookies
  - Role-based authorization pre-handlers (`requireRole(['DISPATCHER', 'ADMIN'])`)
- [ ] Durable Expiry & Outbox Worker (`src/services/durable_worker.ts`):
  - Periodic transaction with `SELECT ... FOR UPDATE SKIP LOCKED`
  - Graceful recovery on restart
  - Idempotent confirmation and release
- [ ] Multi-resource atomic allocation transactions
- [ ] Server-Sent Events (SSE) live updates hub (`src/routes/events.ts`)
- [ ] OpenTelemetry-compatible metrics & structured JSON logging with correlation IDs
- [ ] Playbook semantic retrieval service (`src/services/playbook_service.ts`)

### Workstream 3: Allocation Engine Protocol & Synchronization
- [ ] Add engine configuration endpoints (`POST /config`) to dynamically update scoring weights without recompilation.
- [ ] Bi-directional state reconciliation between PostgreSQL and C++ in-memory store on startup.
- [ ] C++ Catch2 unit tests for edge cases and malformed inputs.

### Workstream 4: Deep Frontend Route Expansion & Operational Polish
- [ ] Overview & Operations:
  - `/app/activity` (Event timeline)
  - `/app/alerts` (Alert resolution & triage)
  - `/app/search` (Global entity search)
- [ ] Hospital Intelligence:
  - `/app/hospitals/[hospitalId]/resources`
  - `/app/hospitals/[hospitalId]/status-history`
  - `/app/hospitals/[hospitalId]/feed-health`
  - `/app/hospitals/[hospitalId]/audit`
- [ ] Requests & Allocation:
  - `/app/requests/new` (Dedicated dispatch wizard)
  - `/app/requests/[requestId]/allocation`
  - `/app/requests/[requestId]/timeline`
  - `/app/allocations` & `/app/allocations/[allocationId]`
- [ ] Reservations:
  - `/app/reservations/[reservationId]`
  - `/app/reservations/expiring`
  - `/app/reservations/history`
- [ ] Administration & Settings:
  - `/app/settings`
  - `/app/settings/policies`
  - `/app/settings/integrations`
  - `/app/settings/users`
  - `/app/settings/audit`
- [ ] Authentication Pages:
  - `/login` with demo role quick-switcher

### Workstream 5: Testing, Load Testing & Release Gate Verification
- [ ] Playwright E2E browser test suite covering all 10 core operator workflows.
- [ ] Fastify integration test suite covering auth, RBAC, durable expiry, and multi-resource allocation.
- [ ] Autocannon HTTP load testing measuring p50, p95, and p99 decision latencies.
- [ ] Release gates validation (Gates A through I).
