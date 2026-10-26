# Developer Guide & Verification Standards — Lifeline-Core v2

This guide details how to build, run, test, profile, and verify **Lifeline-Core v2** on a local developer machine.

---

## 1. Prerequisites & Toolchain

- **C++ Compiler:** GCC 9+ or Clang 11+ supporting C++17.
- **Build System:** CMake 3.16+ and GNU Make or Ninja.
- **Node.js:** Node.js 20+ with `pnpm` (v9+).
- **Database:** PostgreSQL 14+ command-line tools (`initdb`, `pg_ctl`, `psql`, `pg_isready`).
- **Python:** Python 3.9+ with standard library.

---

## 2. PostgreSQL User-Space Development Cluster

To avoid requiring root access or interfering with host system databases, Lifeline provides a user-space cluster script:

```bash
# Initialize cluster directory at .data/postgres and apply migrations
./scripts/db-dev.sh init

# Start database cluster in background on port 5433
./scripts/db-dev.sh start

# Stop database cluster
./scripts/db-dev.sh stop

# Reset database (wipes and re-seeds from scratch)
./scripts/db-dev.sh reset
```

---

## 3. C++17 Allocation Engine

### Standard Release Build & Unit Tests
```bash
mkdir -p engine/build && cd engine/build
cmake -DCMAKE_BUILD_TYPE=Release ..
make -j$(nproc)

# Execute Catch2 test suite (471 assertions across 10 test cases)
./lifeline-tests

# Run microbenchmarks (Segment Tree crossover, lock scaling, spatial grid)
./lifeline-engine --benchmark

# Launch HTTP daemon on port 8081
./lifeline-engine --port 8081
```

### Sanitizer Builds (ThreadSanitizer & AddressSanitizer)
Lifeline-Core v2 mandates zero data races and zero memory leaks.

```bash
# ThreadSanitizer Build (concurrency race verification)
mkdir -p engine/build_tsan && cd engine/build_tsan
cmake -DCMAKE_BUILD_TYPE=Debug -DENABLE_TSAN=ON ..
make -j$(nproc)
./lifeline-tests # Validates 100-thread concurrent contention test with zero races

# AddressSanitizer Build (memory leak & boundary check)
mkdir -p engine/build_asan && cd engine/build_asan
cmake -DCMAKE_BUILD_TYPE=Debug -DENABLE_ASAN=ON ..
make -j$(nproc)
./lifeline-tests
```

---

## 4. Fastify TypeScript Backend

```bash
cd backend
pnpm install

# Type-check and compile to dist/
pnpm build

# Execute automated integration test suite
pnpm test

# Run development server with auto-reload on port 3001
pnpm dev
```

---

## 5. Next.js Frontend Web Application

```bash
cd frontend
pnpm install

# Verify strict TypeScript type-checking across all 17 routes
pnpm exec tsc --noEmit

# Production compilation
pnpm build

# Run local development server on port 3000
pnpm dev
```

---

## 6. Python Simulation & Experiments

```bash
# Run simulator unit tests
PYTHONPATH=. python3 -m unittest sim/tests/test_simulation.py

# Execute 20-seed 3-policy Monte Carlo comparison (outputs to sim/results/)
PYTHONPATH=. python3 sim/experiments.py
```
