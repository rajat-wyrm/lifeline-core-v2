# Known Issues & Defect Ledger — Lifeline-Core v4

This document maintains an active ledger of identified defects, architectural ceilings, security observations, and their resolution status.

---

## Active Issue Ledger

| Issue ID | Severity | Category | Description | Root Cause | Status | Resolution Summary |
| :--- | :---: | :--- | :--- | :--- | :---: | :--- |
| **ISSUE-001** | **HIGH** | Reliability | Reservation expiry lost if C++ process restarts. | In-memory min-heap is non-persistent across process restarts. | **RESOLVED** | Implemented `DurableWorker` in Fastify polling PostgreSQL every 1000ms with `SELECT ... FOR UPDATE SKIP LOCKED`. Expired holds are transitioned to `EXPIRED`, capacity restored in `hospital_resources`, and outbox events emitted. |
| **ISSUE-002** | **HIGH** | Security | Unauthenticated API endpoints. | Initial prototype lacked session authentication and role enforcement. | **RESOLVED** | Implemented secure HttpOnly cookie session management (`@fastify/cookie`), SHA-256 password hashing, PostgreSQL `sessions` table, and RBAC pre-handler hooks (`DISPATCHER`, `HOSPITAL_OPERATOR`, `ADMIN`, `AUDITOR`, `VIEWER`). |
| **ISSUE-003** | **MEDIUM** | Data Integrity | Single resource allocation limitation. | Schema only supported 1 resource type per reservation hold. | **RESOLVED** | Added `reservation_lines` table and multi-resource transactional hold handler. Multi-line requests (e.g., `ICU-BED` + `VENTILATOR`) reserve atomically with complete rollback on partial failure. |
| **ISSUE-004** | **LOW** | Extensibility | System-level PostGIS & pgvector libraries not in root `/usr/lib/postgresql`. | Host runs Arch Linux user-space PostgreSQL without root package install permissions. | **RESOLVED** | Implemented spherical bounding box indexing via native `earthdistance` + `cube` extensions and semantic playbook retrieval via native PostgreSQL `FLOAT8[]` array cosine similarity and `pg_trgm` inverted indexes. |
| **ISSUE-005** | **INFO** | Modeling | Static road speeds vs real dynamic traffic congestion. | Static road graph corridors use baseline speed limits. | **RESOLVED** | Added dynamic `traffic_multiplier` parameter ($0.8\times$ to $2.5\times$) in `/api/v2/routes/plan` and documented operational limits in `docs/LIMITATIONS.md`. |
| **ISSUE-006** | **CRITICAL** | Security | GitHub Personal Access Token (PAT) exposed in earlier command. | Credential pasted in chat command. | **RESOLVED** | Quarantined and revoked token. Enforced zero PAT storage in git config, shell commands, or source files. Strict zero-remote-push policy maintained. |
