# Lifeline-Core v2 REST API Specification

The Fastify REST API exposes endpoints for dispatching emergency requests, managing atomic reservation holds, ingesting telemetry updates, running simulations, and inspecting system metrics.

---

## 1. System Health & Readiness

### `GET /health` / `GET /api/health`
Liveness check returning current process uptime.
- **Response `200 OK`**:
```json
{
  "status": "UP",
  "uptime_seconds": 128.45,
  "timestamp": "2026-10-26T12:00:00.000Z"
}
```

### `GET /ready` / `GET /api/ready`
Readiness probe verifying that both PostgreSQL 18 and the C++17 Allocation Engine are connected and healthy.
- **Response `200 OK` (Ready)**:
```json
{
  "status": "READY",
  "dependencies": {
    "database": { "status": "UP", "latency_ms": 12 },
    "engine": { "status": "UP", "latency_ms": 28 }
  },
  "timestamp": "2026-10-26T12:00:00.000Z"
}
```

---

## 2. Emergency Request & Dispatch

### `POST /api/v2/requests`
Submits an emergency incident for allocation. Triggers candidate spatial filtering, road A* routing, Poisson belief scoring, and atomic reservation hold in the C++ engine.

- **Request Body**:
```json
{
  "patient_age": 55,
  "trauma_score": 1,
  "required_resource": "ICU-BED",
  "origin_latitude": 30.7333,
  "origin_longitude": 76.7794
}
```
*Constraints:* `trauma_score` between 1 and 5. `required_resource` one of: `ICU-BED`, `VENTILATOR`, `OXYGEN-BED`, `GENERAL-BED`.

- **Response `200 OK`**:
```json
{
  "request_id": "REQ-1793003021823-814",
  "allocation": {
    "allocation_id": "RES-1000",
    "chosen_hospital_id": "HOSP-101",
    "chosen_hospital_name": "PGIMER Chandigarh",
    "decision_latency_us": 1557,
    "distance_km": 3.6,
    "eta_seconds": 416.4,
    "expires_at_ms": 1793003921845,
    "fallback_count": 0,
    "freshness_score": 0.95,
    "p_free_on_arrival": 1.0,
    "policy": "LIFELINE_CORE",
    "ranked_candidates": [...]
  }
}
```

### `GET /api/v2/requests`
Lists recent emergency requests with pagination.

### `GET /api/v2/requests/:id`
Retrieves dispatch status, assigned hospital, candidate breakdown, and timeline for a specific incident.

---

## 3. Reservation Ledger

### `GET /api/v2/reservations`
Lists active and past reservations from PostgreSQL.
- **Response `200 OK`**:
```json
{
  "count": 1,
  "data": [
    {
      "id": "RES-1000",
      "hospital_id": "HOSP-101",
      "resource_type": "ICU-BED",
      "request_id": "REQ-1793003021823-814",
      "ambulance_id": "AMB-101",
      "state": "HELD",
      "created_at_ms": 1793003021856,
      "expires_at_ms": 1793003921845,
      "updated_at": "2026-10-26T08:23:41.857Z"
    }
  ]
}
```

### `POST /api/v2/reservations/:id/confirm`
Confirms patient arrival at the destination hospital. Transitions state from `HELD` to `CONFIRMED`.
- **Response `200 OK`**:
```json
{
  "reservation_id": "RES-1000",
  "state": "CONFIRMED",
  "success": true
}
```

### `POST /api/v2/reservations/:id/release`
Releases a reservation hold if the ambulance was cancelled or diverted. Restores available capacity in the C++ engine and sets state to `RELEASED`.

---

## 4. Hospital Inventory & Telemetry

### `GET /api/v2/hospitals`
Returns inventory and coordinates for all 50 hospitals.

### `GET /api/v2/hospitals/:id`
Returns hospital detail with per-resource capacity, Poisson walk-in rate $\lambda_{walk}$, and telemetry staleness timestamp.

### `POST /api/v2/hospitals/:id/resources/:type`
Simulates a telemetry feed report from a hospital's EHR/bed board system.
- **Request Body**:
```json
{
  "total": 30,
  "available": 8
}
```

---

## 5. Simulator & Experiments

### `GET /api/v2/simulator/scenarios`
Returns the 3 predefined scenarios (`normal_day`, `contention_surge`, `feed_outage_chaos`).

### `POST /api/v2/simulator/run`
Executes an on-demand Monte Carlo simulation run using the Python simulator.
- **Request Body**:
```json
{
  "scenario": "contention_surge",
  "policy": "LIFELINE_CORE",
  "num_requests": 250,
  "seed": 42,
  "freeze_hospitals": ["HOSP-101", "HOSP-102"]
}
```

### `GET /api/v2/experiments`
Retrieves aggregated 3-policy summary results across 20 randomized seeds.

### `GET /api/v2/benchmarks`
Returns micro-benchmark data including the Segment Tree crossover curve and multi-threaded lock scaling.

---

## 6. Observability

### `GET /api/v2/observability/stats`
Summary counters of hospitals, requests, held holds, confirmed admissions, and expired reservations.

### `GET /api/v2/observability/events`
Audit log stream capturing state transitions with actor and JSON payload.
