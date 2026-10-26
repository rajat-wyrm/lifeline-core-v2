# Requirements Traceability Matrix — Lifeline-Core v3

This matrix maps all architectural, functional, security, and scientific requirements to their implementing components and verification tests.

| Req ID | Requirement Description | Subsystem & File References | Verification Method | Status |
| :--- | :--- | :--- | :--- | :---: |
| **REQ-SEC-01** | Credential safety & no embedded PATs in Git | `.git/config`, `docs/SECURITY_REVIEW.md` | `git remote -v`, `git log -p` audit | **VERIFIED** |
| **REQ-SEC-02** | Secure Authentication & RBAC | `backend/src/plugins/auth.ts`, `backend/src/routes/auth.ts` | Unit & API integration tests | In Progress |
| **REQ-SEC-03** | Server-side role authorization & least privilege | `backend/src/routes/` preHandlers | Unauthorized role 403 test | In Progress |
| **REQ-DAT-01** | Durable PostgreSQL reservation state machine | `backend/migrations/003_v3_core_schema.sql` | Migration check & DB transactions | In Progress |
| **REQ-DAT-02** | Background worker for expired holds with `SKIP LOCKED` | `backend/src/services/durable_worker.ts` | Crash recovery & expiry test | In Progress |
| **REQ-DAT-03** | Multi-resource atomic allocation transactions | `backend/src/repositories/reservation_repository.ts` | Multi-bed atomic rollback test | In Progress |
| **REQ-DAT-04** | Idempotent request submission & state transitions | `idempotency_keys` table & handler | Duplicate header replay test | In Progress |
| **REQ-DAT-05** | Spatial indexing via native PostgreSQL geometry | `hospitals (latitude, longitude)`, `cube`, `earthdistance` | `EXPLAIN (ANALYZE, BUFFERS)` | In Progress |
| **REQ-DAT-06** | Semantic operational playbook retrieval | `operational_playbooks`, `playbook_service.ts` | Cosine similarity & trigram search test | In Progress |
| **REQ-ENG-01** | C++17 authoritative allocation core | `engine/src/allocation_engine.cpp`, `engine/src/resource_store.cpp` | Catch2 471 assertions | **VERIFIED** |
| **REQ-ENG-02** | ThreadSanitizer verified concurrency | `engine/tests/test_concurrency.cpp` | Clang `-fsanitize=thread` test | **VERIFIED** |
| **REQ-ENG-03** | Dynamic engine scoring weights configuration | `engine/src/server.cpp`, `backend/src/services/engine_client.ts` | Runtime config update test | In Progress |
| **REQ-FE-01** | 34+ Deeply functional application routes | `frontend/src/app/` route hierarchy | Next.js production build | In Progress |
| **REQ-FE-02** | Operational Overview & Alerts Management | `/app`, `/app/alerts`, `/app/activity` | Playwright E2E test | In Progress |
| **REQ-FE-03** | Hospital Intelligence & Feed Health Inspection | `/app/hospitals/[hospitalId]/...` | Playwright E2E test | In Progress |
| **REQ-FE-04** | Real-time Server-Sent Events (SSE) stream | `backend/src/routes/events.ts`, `frontend/src/lib/sse.ts` | Connection & live event test | In Progress |
| **REQ-SIM-01** | 20-Seed Monte Carlo simulation with ground truth | `sim/experiments.py`, `sim/simulator.py` | Statistical summary reproduction | **VERIFIED** |
| **REQ-OPS-01** | Zero-downtime startup, health & readiness probes | `GET /ready`, `GET /health` | Liveness & readiness probes | **VERIFIED** |
| **REQ-OPS-02** | Automated operations runbook & disaster recovery | `docs/OPERATIONS_RUNBOOK.md` | Backup & restore verification | In Progress |
| **REQ-ETH-01** | Non-clinical disclaimer & synthetic data critique | `docs/LIMITATIONS.md`, `/about/limitations` | Documentation & UI banner audit | **VERIFIED** |
