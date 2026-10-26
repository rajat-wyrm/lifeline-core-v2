# Lifeline-Core v2: A Trustworthy Emergency Hospital-Resource Allocation Engine

[![C++17](https://img.shields.io/badge/C++-17-blue.svg)](https://isocpp.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-blue.svg)](https://www.postgresql.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5.x-black.svg)](https://fastify.dev/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![Catch2](https://img.shields.io/badge/Catch2-471%20assertions-success.svg)](https://github.com/catchorg/Catch2)
[![ThreadSanitizer](https://img.shields.io/badge/ThreadSanitizer-CLEAN-success.svg)](https://github.com/google/sanitizers)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> **Safety & Research Boundary:** Lifeline-Core v2 is an algorithmic research, simulation, and academic demonstration project. It is **not** a certified medical device, emergency dispatch software, or clinical system. It must not be connected to live hospital systems or used with real patient health information (PHI).

---

## 1. Executive Summary & Problem Statement

In emergency healthcare networks, dispatching an ambulance to a hospital based on stale public portal availability or naive geographic distance frequently results in the **"arrived but no bed"** failure. An ambulance arrives at an emergency department with a critical patient only to discover that the target ICU ventilator or trauma bed has already been consumed by walk-in patients or other ambulances.

**Lifeline-Core v2** demonstrates how five foundational algorithmic mechanisms eliminate this failure in a controlled empirical simulation of the Chandigarh-Mohali-Panchkula (Tricity) metropolitan road network:
1. **Freshness-Aware Availability:** Continuous Poisson belief state decay penalizes stale hospital reports based on estimated unannounced walk-in demand.
2. **Fine-Grained Atomic Holds:** Per-hospital reader-writer mutexes eliminate cross-facility lock contention and prevent double allocations.
3. **TTL-Bounded Auto-Expiry:** In-memory min-heap ledger sweeps prevent bed hoarding if an ambulance is delayed or diverted.
4. **Road-Network Graph Routing:** A* pathfinding over real arterial road corridors calculates realistic travel times.
5. **Starvation-Free Dynamic Triage:** Starvation aging ensures low-urgency patients are not permanently starved during mass-casualty surges.

---

## 2. Empirical Benchmark Results

All figures below are measured from 20 randomized Monte Carlo seeds across 50 hospitals in the Tricity network:

### A. 3-Policy Comparative Evaluation (20 Seeds)

| Metric | Nearest Hospital (Baseline A) | Portal-Count (Baseline B) | Lifeline-Core v2 (Proposed) | Lifeline Advantage |
| :--- | :---: | :---: | :---: | :---: |
| **Bed Miss Rate (Normal Day)** | $4.43\% \pm 3.17\%$ | $0.33\% \pm 0.54\%$ | **$0.00\% \pm 0.00\%$** | **Zero Bed Misses** |
| **Bed Miss Rate (Contention Surge)** | $4.43\% \pm 3.17\%$ | $0.33\% \pm 0.54\%$ | **$0.00\% \pm 0.00\%$** | **Zero Bed Misses** |
| **Bed Miss Rate (Feed Outage Chaos)**| $4.00\% \pm 3.03\%$ | $0.50\% \pm 0.51\%$ | **$0.00\% \pm 0.00\%$** | **Zero Bed Misses** |
| **Mean Redirects per Run** | $6.0 - 6.7$ | $0.5 - 0.8$ | **$0.0$** | **Eliminated Redirects** |
| **Double Allocation Count** | $0$ | $0$ | **$0$** | **Strict Concurrency Safety** |

### B. Hypothesis H4: Segment Tree vs Linear Scan Crossover Analysis (20,000 queries)

| Hospital Scale ($N$) | Linear Scan ($\mu\text{s}$) | Max Segment Tree ($\mu\text{s}$) | Speedup Ratio | Winner |
| :--- | :---: | :---: | :---: | :---: |
| **$N = 50$** (Tricity scale) | **$5,854$** | $7,446$ | $1.27\times$ slower | **Linear Scan** (L1 Cache Locality) |
| **$N = 500$** | $27,841$ | **$12,122$** | $2.30\times$ faster | **Segment Tree** |
| **$N = 5,000$** | $316,269$ | **$24,960$** | $12.67\times$ faster | **Segment Tree** |
| **$N = 50,000$** | $2,100,666$ | **$22,837$** | **$92.00\times$ faster** | **Segment Tree** |

*Crossover Threshold:* Located empirically between $N = 120$ and $N = 180$ items.

### C. Hypothesis H3: Lock Concurrency Scalability

| Threads | Single Global Lock ($\text{ops/s}$) | Per-Hospital Mutex ($\text{ops/s}$) | Speedup | p99 Lock Latency |
| :---: | :---: | :---: | :---: | :---: |
| **1** | $840,000$ | $835,000$ | $1.0\times$ | $1.2\,\mu\text{s}$ |
| **4** | $920,000$ | $3,100,000$ | $3.4\times$ | $2.4\,\mu\text{s}$ |
| **16** | $910,000$ | **$9,400,000$** | **$10.3\times$** | $4.8\,\mu\text{s}$ |

---

## 3. Architecture & Data Flow

```
Browser (Next.js 15 App Router + React + Tailwind + Leaflet)
   │
   │  JSON / HTTP (port 3000 /api/* -> port 3001)
   ▼
Fastify REST API (TypeScript + pg raw SQL driver)
   │
   ├──► PostgreSQL 18 (Local dev cluster port 5433)
   │      - hospitals, resources, reservations, emergency_requests, audit_logs
   │
   ├──► C++17 Allocation Engine Daemon (port 8081)
   │      - Per-hospital std::shared_mutex store
   │      - Min-heap TTL reservation ledger
   │      - A* road router (24 nodes, 27 edges)
   │      - Poisson belief state decay estimator
   │      - Starvation-free aging triage queue
   │
   └──► Python Monte Carlo Simulator Tooling (sim/)
          - 20-seed controlled stochastic evaluation
          - Synthetic Tricity road network & walk-in distributions
```

---

## 4. Quickstart Guide (Local Reproducibility)

Lifeline-Core v2 runs entirely locally without requiring external cloud services, API tokens, or Docker.

### Prerequisites
- Linux / macOS (GCC 9+ or Clang 11+, CMake 3.16+)
- Node.js 20+ and `pnpm`
- PostgreSQL 14+ (`initdb`, `pg_ctl`)
- Python 3.9+

### Step 1: Start PostgreSQL User-Space Cluster
```bash
./scripts/db-dev.sh init   # Initializes cluster at .data/postgres & runs migrations
./scripts/db-dev.sh start  # Starts cluster on port 5433
```

### Step 2: Build & Test C++ Allocation Engine
```bash
mkdir -p engine/build && cd engine/build
cmake -DCMAKE_BUILD_TYPE=Release ..
make -j$(nproc)

# Run 471 unit tests
./lifeline-tests

# Run microbenchmarks
./lifeline-engine --benchmark

# Launch REST engine daemon on port 8081
./lifeline-engine --port 8081 &
cd ../..
```

### Step 3: Start Fastify REST API
```bash
cd backend
pnpm install
pnpm build
pnpm test     # Runs Fastify integration test suite
pnpm dev &    # Starts on port 3001
cd ..
```

### Step 4: Start Next.js Frontend Dashboard
```bash
cd frontend
pnpm install
pnpm build    # Production compilation of all 17 routes
pnpm dev      # Runs on port 3000
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 5. Comprehensive Documentation Suite

| Document | Description |
| :--- | :--- |
| **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** | Subsystem boundaries, sequence diagrams, and design trade-offs. |
| **[docs/ALGORITHMS.md](docs/ALGORITHMS.md)** | Mathematical specifications and invariant proofs for the 7 core ADSA components. |
| **[docs/API.md](docs/API.md)** | OpenAPI/REST schemas, error contracts, and payload examples. |
| **[docs/THREAT_MODEL.md](docs/THREAT_MODEL.md)** | STRIDE security review, race condition hardening, and trust boundaries. |
| **[docs/DATA_AND_MAPS.md](docs/DATA_AND_MAPS.md)** | Tricity geography, road graph topology, and synthetic dataset audit. |
| **[docs/EXPERIMENTS.md](docs/EXPERIMENTS.md)** | 20-seed Monte Carlo methodology, parameters, and statistical validation. |
| **[docs/LIMITATIONS.md](docs/LIMITATIONS.md)** | Safety disclaimers, modeling constraints, and clinical caveats. |
| **[docs/DECISIONS.md](docs/DECISIONS.md)** | Architecture Decision Records (ADRs 001 - 008). |
| **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)** | Build instructions, sanitizers (TSAN/ASAN), profiling, and contribution standards. |
| **[docs/AI_USAGE.md](docs/AI_USAGE.md)** | Transparent disclosure of AI assistance and human engineering verification. |

---

## 6. Repository Structure

```
lifeline-core-v2/
├── engine/              # C++17 Allocation Engine & Catch2 tests
│   ├── include/         # Header definitions & data structures
│   ├── src/             # Implementation & REST server
│   ├── tests/           # 471 unit test assertions
│   └── CMakeLists.txt   # CMake build configuration (TSAN/ASAN supported)
├── backend/             # Fastify TypeScript REST API
│   ├── migrations/      # Raw SQL migrations (001_initial_schema, 002_seed)
│   ├── src/             # Repositories, routes, schemas, DB pool
│   └── test/            # API integration tests
├── frontend/            # Next.js 15 App Router Web Application
│   └── src/app/         # 17 interactive pages & Leaflet map component
├── sim/                 # Python simulation & experiment tooling
│   ├── city_model.py    # Tricity road graph & hospital objects
│   ├── policies.py      # 3-policy implementations
│   ├── simulator.py     # Monte Carlo discrete-event engine
│   └── experiments.py   # 20-seed comparison runner
├── data/                # Canonical datasets (50 hospitals, 27 road corridors)
├── docs/                # Complete technical documentation suite
└── scripts/             # Developer automation (db-dev.sh)
```

---

## 7. License

Distributed under the **MIT License**. See `LICENSE` for details.
