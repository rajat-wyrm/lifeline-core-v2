# Engineering Research Log & Decision Record — Lifeline-Core v3

This document records technical research, authoritative documentation citations, comparative evaluations, and architectural trade-offs made during the engineering of **Lifeline-Core v3**.

---

## Log Entry 001 — PostgreSQL 18 Spatial & Vector Capabilities in User-Space
- **Date:** 2026-10-26
- **Context:** The prompt mandates evaluating PostGIS for spatial operations and pgvector for semantic retrieval. Environment inspection revealed Arch Linux running PostgreSQL 18.6 in a user-space development directory (`.data/postgres`). The host does not have passwordless sudo or root-owned `/usr/lib/postgresql/` write permissions.
- **Investigation:**
  - Querying `pg_available_extensions` showed 60 native extensions compiled with PostgreSQL 18.
  - `earthdistance` (v1.2) and `cube` (v1.5) are installed and fully available.
  - `pg_trgm` (v1.6), `fuzzystrmatch` (v1.2), and `btree_gist` (v1.8) are available.
  - Native `postgis` and `pgvector` are not installed system packages.
- **Decision:**
  1. For Spatial Geometry: Use native PostgreSQL `earthdistance` + `cube`. This provides mathematically exact great-circle spherical distance (`earth_distance(ll_to_earth(lat1, lon1), ll_to_earth(lat2, lon2))`) and GiST/cube bounding box indexes without requiring external root binaries.
  2. For Vector Semantic Retrieval: Implement a pure SQL / PostgreSQL vector retrieval engine utilizing standard `FLOAT8[]` array operations for dot product and cosine similarity:
     $$\text{similarity}(A, B) = \frac{\sum A_i B_i}{\sqrt{\sum A_i^2} \sqrt{\sum B_i^2}}$$
     combined with `pg_trgm` inverted indexes for fast hybrid lexical-semantic filtering of operational playbooks and hospital service restrictions.
  3. Provide an extensible adapter interface so that if `pgvector` is available in a future containerized deployment, it activates transparently.

---

## Log Entry 002 — Durable Reservation Lifecycle & Deadlock Prevention
- **Date:** 2026-10-26
- **Context:** In Lifeline-Core v2, the C++ in-memory min-heap tracked TTL expirations. If the engine restarted, in-memory state vanished. We require durable PostgreSQL persistence where worker processes safely claim expired reservations without race conditions.
- **Investigation & Authoritative Sources:**
  - PostgreSQL 9.5+ introduced `SKIP LOCKED` for queue-like workloads.
  - Using `SELECT id, hospital_id, resource_type FROM reservations WHERE state = 'HELD' AND expires_at_ms <= $1 FOR UPDATE SKIP LOCKED` allows the worker to lock only actionable rows without blocking other concurrent transactions.
  - To prevent deadlocks when updating hospital capacity across multiple rows, resources must always be acquired in a deterministic sorted order:
    `ORDER BY hospital_id ASC, resource_type ASC`.
- **Decision:** Implement `DurableWorker` in Fastify that polls for expired reservations every 1000ms using `FOR UPDATE SKIP LOCKED`. Restores capacity to `hospital_resources` within an explicit PostgreSQL transaction and writes an audit event to `reservation_events` and `outbox_events`.

---

## Log Entry 003 — Session Management & RBAC vs Stateless JWTs
- **Date:** 2026-10-26
- **Context:** Need secure authentication and role-based access control (`DISPATCHER`, `HOSPITAL_OPERATOR`, `ADMIN`, `AUDITOR`, `VIEWER`).
- **Investigation:**
  - Stateless JWTs cannot be instantly revoked upon security incidents without maintaining a centralized revocation list (which negates their stateless benefit).
  - HttpOnly, SameSite=Strict cookies backed by server-side `sessions` table in PostgreSQL provide immediate revocation, protection against XSS token theft, and simple expiration management.
- **Decision:** Implement cookie-based session authentication with SHA-256 hashed session tokens stored in PostgreSQL. Passwords hashed using standard cryptographic PBKDF2/bcrypt.

---

## Log Entry 004 — Real-time Updates: Server-Sent Events (SSE) vs WebSockets
- **Date:** 2026-10-26
- **Context:** Operators need real-time notifications of new dispatches, reservation confirmations, bed expirations, and telemetry drift alerts.
- **Investigation:**
  - WebSockets require full-duplex protocol upgrades, connection state management, and ping/pong heartbeats.
  - Server-Sent Events (SSE) operate over standard HTTP/1.1 and HTTP/2, provide built-in client reconnection, require zero external libraries on modern browsers (`EventSource`), and are strictly unidirectional (server-to-client), which perfectly matches operational telemetry broadcasts.
- **Decision:** Implement an SSE hub at `/api/v2/events/stream` in Fastify with structured event types (`RESERVATION_CREATED`, `RESERVATION_STATE_CHANGED`, `CAPACITY_UPDATED`, `ALERT_RAISED`).
