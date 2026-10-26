# Lifeline-Core v4 — Security Review & Threat Mitigation Audit

**Audit Date:** October 26, 2026  
**Auditor:** Principal Security Architect & Engineering Lead  
**Classification:** Internal Compliance & Release Candidate Gate  

---

## 1. Executive Security Status

Lifeline-Core v4 enforces a zero-trust, defense-in-depth architecture spanning API gateways, session management, SQL parameterization, and allocation engine sockets.

### Core Security Mandates:
1. **GitHub Credential Quarantine (ACTIVE):** The previously exposed personal access token (PAT) has been quarantined, revoked, and completely scrubbed from all git configurations, remote URLs, shell commands, and source trees. No automated push commands or remote publications are permitted without explicit user authorization.
2. **Strict SQL Parameterization (ACTIVE):** Zero ORMs, zero string concatenation in queries. Every database operation uses PostgreSQL parameterized placeholders (`$1, $2, ...`) through the native `pg` driver.
3. **Cookie-Based Cryptographic Sessions (ACTIVE):** All authenticated operator sessions utilize random 256-bit cryptographically secure session tokens hashed with SHA-256 in PostgreSQL `sessions` and delivered via `HttpOnly`, `SameSite=Lax` cookies. No JWTs or sensitive credentials are stored in browser `localStorage`.
4. **Idempotency Protection (ACTIVE):** The `Idempotency-Key` header prevents duplicate dispatches or double reservation holds on mobile network retries over a 24-hour window.

---

## 2. Role-Based Access Control (RBAC) Enforcement Matrix

| Endpoint Route | HTTP Method | Minimum Required Role | Purpose & Enforcement Boundary |
|:---|:---|:---|:---|
| `/api/v2/auth/login` | `POST` | Public | Authenticates operator email & SHA-256 password hash |
| `/api/v2/auth/me` | `GET` | Authenticated | Returns current operator profile and assigned role |
| `/api/v2/auth/logout` | `POST` | Authenticated | Revokes session token in PostgreSQL `sessions` table |
| `/api/v2/requests` | `POST` | `DISPATCHER` | Provisions emergency request, allocates hospital, creates hold |
| `/api/v2/reservations/:id/confirm` | `POST` | `HOSPITAL_OPERATOR` | Confirms patient arrival at emergency department |
| `/api/v2/reservations/:id/cancel` | `POST` | `DISPATCHER` / `HOSPITAL_OPERATOR` | Releases active hold and restores bed capacity |
| `/api/v2/hospitals/:id/resources` | `POST` | `HOSPITAL_OPERATOR` / `ADMIN` | Adjusts facility bed counts |
| `/api/v2/hospitals/new` | `POST` | `ADMIN` | Registers new hospital node into PostgreSQL and C++ engine |
| `/api/v2/settings` | `POST` | `ADMIN` | Modifies allocation scoring weights and starvation aging rates |
| `/api/v2/users` | `POST` | `ADMIN` | Provisions new operator accounts and assigns RBAC roles |
| `/api/v2/observability/events` | `GET` | `AUDITOR` / `ADMIN` | Inspects append-only audit trail and correlation payloads |
| `/api/v2/alerts/:id/acknowledge` | `POST` | `DISPATCHER` / `HOSPITAL_OPERATOR` | Marks alert as acknowledged |
| `/api/v2/alerts/:id/resolve` | `POST` | `ADMIN` / `DISPATCHER` | Resolves operational alert |

---

## 3. Threat Model & STRIDE Mitigation Analysis

### 3.1 Spoofing (Identity & Authentication)
- **Threat:** Malicious actor impersonates a 108 emergency dispatcher to generate false reservations or divert ambulances.
- **Mitigation:**
  - Password hashes stored with SHA-256.
  - Active session verification against PostgreSQL `sessions` on every privileged endpoint.
  - Expired or revoked tokens rejected immediately with HTTP 401 Unauthorized.
  - Demo accounts restricted to local loopback testing.

### 3.2 Tampering (Data Integrity)
- **Threat:** Uncoordinated race conditions or concurrent network requests cause over-allocation of hospital beds.
- **Mitigation:**
  - In-memory C++ engine employs fine-grained per-hospital mutex striping with atomic test-and-decrement.
  - Database persistence uses PostgreSQL atomic transactions with `SELECT ... FOR UPDATE`.
  - Non-negative integer constraints (`CHECK (available_capacity >= 0)`) in database schema prevent inventory underflow under any race condition.

### 3.3 Repudiation (Audit & Governance)
- **Threat:** An operator denies having declared hospital divert or cancelled an emergency reservation.
- **Mitigation:**
  - Immutable append-only `audit_logs` records every mutation with W3C TraceContext `correlation_id`, operator ID, action name, timestamp, and full JSON payload.
  - Outbox events emitted transactionally with state mutations.

### 3.4 Information Disclosure (Privacy & PII)
- **Threat:** Unauthorized access to patient health data or geographic trajectories.
- **Mitigation:**
  - System strictly isolates clinical identifiers. Patient records contain only triage acuity (trauma score 1-5, age in years) and required resource type. Zero patient names, phone numbers, or insurance IDs are ingested or stored.
  - All test data is explicitly generated synthetic data for Tricity.

### 3.5 Denial of Service (Availability)
- **Threat:** High-frequency request floods or hanging long-lived SSE connections exhaust server resources.
- **Mitigation:**
  - Fastify rate limiting configured with sensible burst windows.
  - Heartbeat timers in SSE and background workers utilize `.unref()` to prevent event loop starvation and memory leaks.
  - Non-blocking `SELECT ... FOR UPDATE SKIP LOCKED` background polling ensures worker instances do not lock each other or block HTTP dispatch requests.

### 3.6 Elevation of Privilege (Authorization)
- **Threat:** Viewer or Operator escalates privileges to modify dynamic scoring weights or create admin accounts.
- **Mitigation:**
  - Fastify `requireRole('ADMIN')` pre-handler hook strictly validates user role extracted from server-side session lookup before routing to settings mutation handlers.
