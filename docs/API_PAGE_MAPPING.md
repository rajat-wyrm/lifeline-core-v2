# Frontend Route to Backend API Mapping — Lifeline-Core v3

This document maps every application route to its supporting Fastify REST API endpoints, HTTP methods, and database operations.

---

## Complete API-to-Page Contract

| Frontend Route | HTTP Method | Fastify API Endpoint | Payload / Query Params | Database Tables Accessed | Side Effects / Engine Calls |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `/` | `GET` | `/api/ready`, `/api/v2/observability/stats` | None | `hospitals`, `reservations`, `emergency_requests` | None (Read-only) |
| `/app` | `GET` | `/api/v2/observability/stats`<br>`/api/v2/reservations`<br>`/api/v2/requests` | `?limit=10` | `hospitals`, `reservations`, `emergency_requests`, `audit_logs` | None (Read-only) |
| `/app/activity` | `GET` | `/api/v2/observability/events` | `?limit=50&category=...&severity=...` | `audit_logs`, `reservation_events` | None |
| `/app/alerts` | `GET`<br>`POST` | `/api/v2/alerts`<br>`/api/v2/alerts/:id/acknowledge`<br>`/api/v2/alerts/:id/resolve` | `{ notes: string }` | `alerts`, `audit_logs` | State transition on alert row; audit log inserted |
| `/app/search` | `GET` | `/api/v2/search` | `?q=...&category=...` | `hospitals`, `emergency_requests`, `reservations`, `operational_playbooks` | Full-text and vector search |
| `/app/notifications` | `GET`<br>`POST` | `/api/v2/notifications`<br>`/api/v2/notifications/:id/read` | None | `notifications` | Updates `is_read = true` |
| `/app/help` | `GET` | `/api/v2/playbooks/search` | `?q=...` | `operational_playbooks` | Cosine similarity & trigram match |
| `/app/hospitals` | `GET` | `/api/v2/hospitals` | `?sector=...&type=...&available_only=true` | `hospitals`, `hospital_resources` | None |
| `/app/hospitals/new` | `POST` | `/api/v2/hospitals` | `{ id, name, latitude, longitude, walk_in_lambda, resources }` | `hospitals`, `hospital_resources`, `audit_logs` | Inserts hospital and resources; notifies C++ engine |
| `/app/hospitals/:id` | `GET`<br>`POST` | `/api/v2/hospitals/:id`<br>`/api/v2/hospitals/:id/resources/:type` | `{ total: number, available: number }` | `hospitals`, `hospital_resources`, `audit_logs` | Updates bed inventory and resets staleness timestamp |
| `/app/hospitals/:id/resources` | `GET` | `/api/v2/hospitals/:id/resources` | None | `hospital_resources`, `reservations` | Detailed resource query |
| `/app/hospitals/:id/feed-health` | `GET`<br>`POST` | `/api/v2/hospitals/:id/feed-health`<br>`/api/v2/hospitals/:id/feed/sync` | None | `hospital_feed_logs`, `hospitals` | Triggers test telemetry heartbeat |
| `/app/hospitals/:id/status-history` | `GET` | `/api/v2/hospitals/:id/status-history` | `?limit=50` | `hospital_status_history`, `reservation_events` | Chronological transition log |
| `/app/hospitals/:id/audit` | `GET` | `/api/v2/hospitals/:id/audit` | `?limit=50` | `audit_logs` | Filtered audit events |
| `/app/map` | `GET` | `/api/v2/hospitals` | None | `hospitals`, `hospital_resources` | Fetches coordinates and inventory |
| `/app/requests` | `GET` | `/api/v2/requests` | `?status=...&resource=...&limit=50` | `emergency_requests`, `reservations` | Paginated query |
| `/app/requests/new` | `POST` | `/api/v2/requests` | `{ patient_age, trauma_score, required_resource, origin_latitude, origin_longitude }` | `emergency_requests`, `reservations`, `audit_logs` | Calls C++ `POST /allocate`; acquires mutex lock; writes hold |
| `/app/requests/:id` | `GET` | `/api/v2/requests/:id` | None | `emergency_requests`, `reservations`, `hospitals` | Retrieves request and candidate logs |
| `/app/requests/:id/allocation` | `GET` | `/api/v2/requests/:id/allocation` | None | `audit_logs`, `emergency_requests` | Detailed ranking calculation breakdown |
| `/app/requests/:id/timeline` | `GET` | `/api/v2/requests/:id/timeline` | None | `reservation_events`, `audit_logs` | Incident event stream |
| `/app/triage` | `GET`<br>`POST` | `/api/v2/triage`<br>`/api/v2/requests` | Dispatch payload | `emergency_requests` | C++ `GET /triage`; calculates aging $P_{eff}$ |
| `/app/reservations` | `GET` | `/api/v2/reservations` | `?limit=100` | `reservations`, `hospitals` | Returns active and historical holds |
| `/app/reservations/:id` | `GET` | `/api/v2/reservations/:id` | None | `reservations`, `reservation_lines`, `emergency_requests` | Complete hold workspace |
| `/app/reservations/:id/confirm` | `POST` | `/api/v2/reservations/:id/confirm` | None | `reservations`, `hospital_resources`, `reservation_events` | Transitions to `CONFIRMED`; notifies C++ engine |
| `/app/reservations/:id/release` | `POST` | `/api/v2/reservations/:id/release` | None | `reservations`, `hospital_resources`, `reservation_events` | Transitions to `RELEASED`; restores capacity |
| `/app/reservations/expiring` | `GET` | `/api/v2/reservations?expiring=true` | None | `reservations` | Filters `expires_at_ms <= NOW() + 120s` |
| `/app/reservations/history` | `GET` | `/api/v2/reservations/history` | `?limit=100` | `reservations` | Returns terminal state records |
| `/app/simulator` | `GET`<br>`POST` | `/api/v2/simulator/scenarios`<br>`/api/v2/simulator/run` | `{ scenario, policy, num_requests, seed, freeze_hospitals }` | `simulation_runs` | Executes Python simulation; records results |
| `/app/experiments` | `GET` | `/api/v2/experiments` | None | `simulation_runs` / JSON cache | Aggregated 3-policy 20-seed statistics |
| `/app/benchmarks` | `GET` | `/api/v2/benchmarks` | None | None | Empirical C++ benchmark curves |
| `/app/algorithms` | `GET` | Static + `/api/v2/algorithms` | None | None | Invariants, complexity, and code |
| `/app/observability` | `GET` | `/api/v2/observability/stats`<br>`/api/v2/observability/events` | None | `audit_logs`, `hospitals`, `reservations` | Live health and audit stream |
| `/app/settings/policies` | `GET`<br>`POST` | `/api/v2/settings/policies` | `{ weights, aging_step_seconds }` | `system_settings`, `audit_logs` | Notifies C++ `POST /config` dynamically |
| `/app/settings/users` | `GET`<br>`POST` | `/api/v2/users`<br>`/api/v2/users` | `{ email, role, full_name, password }` | `users`, `audit_logs` | Manages operator accounts and RBAC |
| `/login` | `POST` | `/api/v2/auth/login` | `{ email, password }` | `users`, `sessions` | Sets HttpOnly session cookie |
| Live Events Hub | `GET` | `/api/v2/events/stream` | SSE Connection | In-memory pub/sub | Broadcasts real-time events to all clients |
