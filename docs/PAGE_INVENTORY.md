# Lifeline-Core v3 — Page Inventory & Functional Audit

This document records the exact inventory of all application routes, their operational purpose, authorized audience, backing APIs, state handling, relationships, and verified status.

---

## Domain A: Application Home & Operations Center

| Route | Purpose | Audience | Data Sources & Endpoints | Actions & Mutations | Related Records | Verified Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| `/` | System overview, mission, boundaries & navigation | Public / All | Static metadata, `/api/v2/observability/stats` | Navigation to `/app`, `/docs`, `/login` | Public docs, safety boundary | **IMPLEMENTED** |
| `/app` | Live emergency operations dashboard | Dispatchers, Supervisors, Admins | `/api/v2/observability/stats`, `/api/v2/reservations`, `/api/v2/requests`, `/api/v2/hospitals` | Quick dispatch test, refresh data, filter time windows | Hospitals, Requests, Ledger, Alerts | **IMPLEMENTED** |
| `/app/activity` | Searchable operational event timeline | All authenticated | `/api/v2/observability/events`, `/api/v2/audit` | Filter by severity, category, entity; export events | Requests, Reservations, Hospitals | In Progress |
| `/app/alerts` | Actionable operational alerts & feed outages | Dispatchers, Operators, Admins | `/api/v2/alerts` | Acknowledge alert, resolve alert with notes | Hospitals, Telemetry feeds | In Progress |
| `/app/search` | Global operational entity search | All authenticated | `/api/v2/search` | Search across hospitals, requests, holds, runs | All entities | In Progress |
| `/app/notifications` | Persistent notification history & read states | All authenticated | `/api/v2/notifications` | Mark as read, dismiss, filter by category | Requests, Allocations, Alerts | In Progress |
| `/app/help` | Operational procedures & knowledge base | All authenticated | `/api/v2/playbooks/search` | Query playbooks, view emergency protocols | Playbooks, settings | In Progress |

---

## Domain B: Hospital Directory & Intelligence

| Route | Purpose | Audience | Data Sources & Endpoints | Actions & Mutations | Related Records | Verified Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| `/app/hospitals` | Master hospital directory with filters & search | All authenticated | `/api/v2/hospitals` | Search, filter by sector, capability, freshness | Hospital detail, Leaflet map | **IMPLEMENTED** |
| `/app/hospitals/new` | Register new hospital facility | Admins, System Operators | `POST /api/v2/hospitals` | Form validation, coordinate validation, submit | Hospital directory | In Progress |
| `/app/hospitals/[hospitalId]` | Comprehensive hospital overview workspace | All authenticated | `/api/v2/hospitals/:id` | Tab navigation, simulate telemetry update, view status | Resources, Capabilities, Feed | **IMPLEMENTED** |
| `/app/hospitals/[hospitalId]/resources` | Deep resource inventory & historical capacity | All authenticated | `/api/v2/hospitals/:id/resources` | Adjust capacity, view reservations on resource | Hospital detail, Ledger | In Progress |
| `/app/hospitals/[hospitalId]/capabilities` | Inspect clinical capabilities & trauma tier | All authenticated | `/api/v2/hospitals/:id/capabilities` | Update capabilities, verify equipment | Hospital detail | In Progress |
| `/app/hospitals/[hospitalId]/feed-health` | Telemetry feed latency, outages & staleness | Operators, Engineers | `/api/v2/hospitals/:id/feed-health` | Force feed sync, simulate freeze/outage | Hospital detail, Alerts | In Progress |
| `/app/hospitals/[hospitalId]/status-history` | Historical log of verified bed changes | Auditors, Operators | `/api/v2/hospitals/:id/status-history` | Time range filter, inspect transition logs | Reservations, Audit | In Progress |
| `/app/hospitals/[hospitalId]/audit` | Immutable audit trail for hospital mutations | Auditors, Admins | `/api/v2/hospitals/:id/audit` | Filter by actor, verify payload diff | Audit events | In Progress |
| `/app/map` | Geographic Tricity Leaflet operations map | Dispatchers, Operators | `/api/v2/hospitals`, `/data/tricity_roads.json` | Pan, zoom, select hospital marker, view road corridors | Hospital detail, Request origin | **IMPLEMENTED** |

---

## Domain C: Request Management & Allocation

| Route | Purpose | Audience | Data Sources & Endpoints | Actions & Mutations | Related Records | Verified Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| `/app/requests` | Emergency request dispatch ledger | Dispatchers, Supervisors | `/api/v2/requests` | Filter by status, trauma tier, resource | Request detail, Hospital | **IMPLEMENTED** |
| `/app/requests/new` | Multi-step validated dispatch wizard | Dispatchers | `POST /api/v2/requests` | Form validation, geocoding, submit to C++ engine | Generated request & hold | In Progress |
| `/app/requests/[requestId]` | Primary request workspace & outcome | All authenticated | `/api/v2/requests/:id` | View assigned hospital, candidate scoring, cancel | Assigned hospital, Hold | **IMPLEMENTED** |
| `/app/requests/[requestId]/allocation` | Deep candidate ranking & scoring inspection | Dispatchers, Engineers | `/api/v2/requests/:id/allocation` | Inspect formula factors: ETA, Avail, Fresh, Poisson | Ranked candidates, C++ engine | In Progress |
| `/app/requests/[requestId]/timeline` | Complete lifecycle timeline for incident | Dispatchers, Auditors | `/api/v2/requests/:id/timeline` | View chronological state events | Events, Reservations | In Progress |
| `/app/requests/[requestId]/audit` | Request-specific audit history | Auditors, Admins | `/api/v2/requests/:id/audit` | Filter by timestamp, inspect payload diff | Audit trail | In Progress |
| `/app/triage` | Real-time starvation-free priority queue | Dispatchers | `/api/v2/triage` | Enqueue emergency request, view dynamic aging | Triage queue, Dispatch | **IMPLEMENTED** |
| `/app/allocations` | Searchable allocation decision archive | All authenticated | `/api/v2/allocations` | Filter by policy, latency, success/failure | Requests, Reservations | In Progress |
| `/app/allocations/[allocationId]` | Detailed decision record & fallback trace | Engineers, Researchers | `/api/v2/allocations/:id` | Inspect rejected candidates, fallback sequence | Request, C++ engine decision | In Progress |

---

## Domain D: Reservation Lifecycle

| Route | Purpose | Audience | Data Sources & Endpoints | Actions & Mutations | Related Records | Verified Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| `/app/reservations` | Active reservation ledger with live countdown | Dispatchers, Operators | `/api/v2/reservations` | Confirm arrival, release hold, filter state | Hospital, Request, Ledger | **IMPLEMENTED** |
| `/app/reservations/[reservationId]` | Dedicated reservation workspace | Dispatchers, Operators | `/api/v2/reservations/:id` | Confirm arrival, cancel/release, extend hold | Request, Hospital, Resource | In Progress |
| `/app/reservations/expiring` | Urgent holds nearing TTL expiration threshold | Dispatchers | `/api/v2/reservations?expiring=true` | Urgent confirm, release hold, alert ambulance | Active holds, Ambulances | In Progress |
| `/app/reservations/history` | Historical archive of confirmed/expired holds | Auditors, Supervisors | `/api/v2/reservations/history` | Date range filter, export CSV/JSON | Past admissions, Outbox | In Progress |
| `/app/reservations/reconciliation` | Invariant checker & orphan hold detection | Admins, Engineers | `/api/v2/reservations/reconcile` | Run consistency scan, trigger durable recovery | Database invariants | In Progress |

---

## Domain E: Simulator & Scientific Evaluation

| Route | Purpose | Audience | Data Sources & Endpoints | Actions & Mutations | Related Records | Verified Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| `/app/simulator` | Monte Carlo scenario runner & live sliders | Researchers, Operators | `/api/v2/simulator/scenarios`, `POST /run` | Select scenario, set seed, freeze feeds, run | Simulation runs, Results | **IMPLEMENTED** |
| `/app/simulator/scenarios` | Preset and custom scenario library | Researchers | `/api/v2/simulator/scenarios` | Create custom scenario, duplicate, execute | Simulation runs | In Progress |
| `/app/simulator/scenarios/[scenarioId]` | Detailed scenario configuration & parameters | Researchers | `/api/v2/simulator/scenarios/:id` | Edit arrival lambda, walk-in rate, road speeds | Simulator runner | In Progress |
| `/app/simulator/runs` | Historical simulator execution ledger | Researchers | `/api/v2/simulator/runs` | Filter by scenario, policy, seed, date | Run detail, Results | In Progress |
| `/app/simulator/runs/[runId]` | Full execution log & metrics for single trial | Researchers | `/api/v2/simulator/runs/:id` | Download run JSON/CSV, inspect step events | Scenarios, Experiments | **IMPLEMENTED** |
| `/app/experiments` | 3-Policy empirical comparison (20 seeds) | Researchers, Evaluators | `/api/v2/experiments` | Switch scenario tabs, inspect seed trials | 3-Policy comparison | **IMPLEMENTED** |
| `/app/experiments/[runId]` | Seed-level drilldown for 3-policy trial | Researchers | `/api/v2/experiments/:id` | Inspect bed miss rate, mean transit, redirects | Experiments, Runs | **IMPLEMENTED** |
| `/app/benchmarks` | ADSA C++ microbenchmark measurements | Researchers, Engineers | `/api/v2/benchmarks` | Inspect H4 segment tree crossover, H3 lock scaling | C++ benchmark binary | **IMPLEMENTED** |
| `/app/algorithms` | 7 Core ADSA algorithms & invariant visualizer | Engineers, Students | Static architecture + `/api/v2/algorithms` | Tab selection, inspect invariants & C++ code | C++ engine source | **IMPLEMENTED** |
| `/app/algorithms/[algorithmId]` | Deep dive on single algorithm (e.g. segment tree) | Engineers | `/api/v2/algorithms/:id` | Interactive parameter test, benchmark curve | C++ algorithms | In Progress |

---

## Domain F: Observability, Settings & System Administration

| Route | Purpose | Audience | Data Sources & Endpoints | Actions & Mutations | Related Records | Verified Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| `/app/observability` | Operational health landing & daemon heartbeats | Admins, Engineers | `/api/v2/observability/stats`, `/ready` | Inspect engine, database, fastify uptimes | Audit logs, Health checks | **IMPLEMENTED** |
| `/app/observability/health` | Comprehensive liveness & readiness probes | Admins, SRE | `/api/ready`, `/health` | Test dependency latencies, restart probe | Engine daemon, Postgres | In Progress |
| `/app/observability/metrics` | Latency percentiles & throughput time series | Engineers, SRE | `/api/v2/observability/metrics` | Time-window selector, metric breakdown | API Gateway, C++ Engine | In Progress |
| `/app/observability/traces` | Distributed request correlation & spans | Engineers | `/api/v2/observability/traces` | Filter by correlation ID, inspect span timeline | Requests, Allocations | In Progress |
| `/app/observability/events` | Immutable security audit log stream | Auditors, Admins | `/api/v2/observability/events` | Search event types, inspect JSON payload modal | Audit logs | In Progress |
| `/app/settings` | Settings center & configuration overview | Admins | `/api/v2/settings` | Navigation to policy, user, integration settings | System settings | In Progress |
| `/app/settings/policies` | Configure dynamic scoring weights & aging | Admins | `/api/v2/settings/policies` | Update scoring weights, adjust aging step tau | C++ AllocationEngine | In Progress |
| `/app/settings/integrations` | Manage telemetry feed webhooks & connectors | Admins, Engineers | `/api/v2/settings/integrations` | Configure hospital webhook, test ping | Hospital feeds | In Progress |
| `/app/settings/users` | User management & role-based access control | Admins | `/api/v2/users` | Create user, assign role, revoke sessions | Users, Sessions | In Progress |
| `/app/settings/audit` | Privileged administrative action log | Auditors, Admins | `/api/v2/settings/audit` | Filter by admin actor, inspect configuration diffs | System audit | In Progress |
| `/docs` | Complete architecture, API & developer docs | All | Static docs & OpenAPI schema | Copy code snippets, navigate documentation | Architecture, API | **IMPLEMENTED** |
| `/about/limitations` | Safety boundaries, ethics & synthetic data audit | All | Static disclaimer & audit findings | Return to dashboard, review clinical boundaries | Ethical standards | **IMPLEMENTED** |
| `/login` | Secure operator login & session initiation | Unauthenticated | `POST /api/v2/auth/login` | Email/password submission, role switcher | Sessions, Users | In Progress |
