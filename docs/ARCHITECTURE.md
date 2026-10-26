# Architecture & System Design — Lifeline-Core v2

This document describes the architectural topology, subsystem boundaries, data contracts, and concurrency mechanisms of **Lifeline-Core v2**.

---

## 1. Subsystem Architecture

Lifeline-Core v2 implements a high-performance polyglot architecture designed around separation of concerns:

```mermaid
flowchart TD
    subgraph Client ["Client Layer"]
        Browser["Next.js 15 Web Application\n(React, Tailwind, Leaflet, Radix UI)"]
    end

    subgraph API ["Application Gateway (Port 3001)"]
        Fastify["Fastify TypeScript Server\n(Zod Validation, Route Handlers)"]
        Repo["Data Access Layer\n(Raw SQL via pg Pool)"]
        ClientAdapter["Engine HTTP Client Adapter\n(Keep-Alive Connection Pool)"]
    end

    subgraph Persistence ["Storage Layer (Port 5433)"]
        Postgres[("PostgreSQL 18 User-Space Cluster\n(hospitals, resources, reservations, audit_logs)")]
    end

    subgraph NativeEngine ["Authoritative Allocation Core (Port 8081)"]
        CppServer["C++17 HTTP Daemon\n(cpp-httplib)"]
        Store["ResourceStore\n(Per-Hospital std::shared_mutex)"]
        Ledger["ReservationLedger\n(std::priority_queue Min-Heap)"]
        Router["RoadRouter\n(A* Search on Tricity Graph)"]
        Belief["BeliefStateCalculator\n(Poisson Decay Estimator)"]
        Triage["TriageQueue\n(Starvation-Free Aging Queue)"]
    end

    subgraph SimTooling ["Research & Simulator Subsystem"]
        PySim["Python Monte Carlo Simulator\n(city_model, policies, simulator, experiments)"]
    end

    Browser <-->|HTTP / JSON (port 3000 /api/*)| Fastify
    Fastify --> Repo
    Fastify --> ClientAdapter
    Repo <-->|Raw SQL (port 5433)| Postgres
    ClientAdapter <-->|HTTP / JSON (port 8081)| CppServer
    CppServer --> Store
    CppServer --> Ledger
    CppServer --> Router
    CppServer --> Belief
    CppServer --> Triage
    Fastify -.->|Subprocess Exec| PySim
```

---

## 2. Allocation & Reservation Sequence Flow

The core user journey transitions an incoming emergency request into an atomic reservation hold:

```mermaid
sequenceDiagram
    autonumber
    actor Dispatcher as Ambulance Dispatcher
    participant API as Fastify Backend
    participant Engine as C++ Allocation Engine
    participant DB as PostgreSQL Database

    Dispatcher->>API: POST /api/v2/requests {patient_age, trauma_score, required_resource, origin_lat, origin_lon}
    API->>API: Validate input schema with Zod
    API->>Engine: POST /allocate {required_resource, origin_lat, origin_lon, trauma_score, patient_age}
    
    activate Engine
    Engine->>Engine: Filter candidates via 2D Spatial Grid
    Engine->>Engine: Compute A* road travel times & ETAs
    Engine->>Engine: Calculate Poisson decay P(free) & freshness scores
    Engine->>Engine: Rank top candidates by composite utility
    Engine->>Engine: Acquire std::unique_lock on target hospital mutex
    Engine->>Engine: Decrement available, increment reserved
    Engine->>Engine: Push hold into Min-Heap TTL expiry queue
    deactivate Engine

    Engine-->>API: 200 OK {allocation_id, chosen_hospital_id, eta_seconds, expires_at_ms, ranked_candidates}
    
    API->>DB: INSERT INTO emergency_requests (id, status, assigned_hospital_id)
    API->>DB: INSERT INTO reservations (id, hospital_id, state='HELD', expires_at_ms)
    API->>DB: INSERT INTO audit_logs (action='EMERGENCY_REQUEST_ALLOCATED')
    
    API-->>Dispatcher: 200 OK {request_id, allocation, success: true}
```

---

## 3. State Machine & Monotonic Progression

Reservations follow a strictly monotonic state machine. Reversion from any terminal state is rejected at both the native engine and database layers:

```mermaid
stateDiagram-v2
    [*] --> HELD: Atomic Lock Acquired in C++ Engine
    HELD --> CONFIRMED: Ambulance arrives at hospital door
    HELD --> RELEASED: Dispatcher cancels or diverts hold
    HELD --> EXPIRED: Min-Heap TTL passed (ETA + Slack)
    CONFIRMED --> [*]: Resource permanently consumed
    RELEASED --> [*]: Capacity restored to available pool
    EXPIRED --> [*]: Capacity automatically reclaimed
```

### Invariants:
1. **Capacity Conservation:** For any hospital $h$ and resource type $r$:
   $$\text{total}(h, r) = \text{available}(h, r) + \text{reserved}(h, r) + \text{occupied}(h, r)$$
2. **Non-Negative Availability:** $\text{available}(h, r) \ge 0$ strictly holds at all times under all concurrency conditions.
3. **No Double Allocations:** A resource unit cannot be simultaneously held by more than one active `HELD` reservation.

---

## 4. Subsystem Design Decisions

### A. C++17 as the Authoritative Engine
*Rationale:* Emergency resource allocation requires low-latency, deterministic execution without garbage collection pauses, and memory cache locality. The C++17 engine executes ranking and locking across 50 hospitals in **$1.5\text{ milliseconds}$**, ensuring maximum throughput under mass-casualty surges.

### B. Raw SQL via `pg` (No ORM)
*Rationale:* Following the core engineering ladder (standard library and installed dependencies before speculative abstractions), raw SQL provides maximum query transparency, zero runtime overhead, and explicit transaction boundaries.

### C. Fine-Grained Per-Hospital Mutexes
*Rationale:* A global mutex creates a single synchronization bottleneck across all CPU cores. By associating each hospital with an independent `std::shared_mutex`, allocations targeting different facilities proceed completely in parallel, achieving **$10.3\times$ higher throughput** at 16 threads.
