# Threat Model & Security Architecture — Lifeline-Core v2

This document details the STRIDE threat assessment, trust boundaries, concurrency defense, and data protection mechanisms in **Lifeline-Core v2**.

---

## 1. System Trust Boundaries

```
[ Untrusted Public Internet / Client Browser ]
                     │  (TLS / HTTPS, Input Sanitization)
                     ▼
================== Trust Boundary 1: Application Gateway ==================
           [ Fastify REST API (Port 3001) ]
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
=== Trust Boundary 2 ===   === Trust Boundary 3 ===
  [ C++ Engine (8081) ]       [ PostgreSQL (5433) ]
  (Loopback Only, Mutexes)    (Parameterized Queries)
```

1. **Boundary 1 (Client to Gateway):** Untrusted input. All payloads are validated using strict Zod schemas with bounded numerical ranges (`trauma_score` $\in [1, 5]$, `patient_age` $\in [1, 105]$).
2. **Boundary 2 (Gateway to C++ Engine):** High-trust loopback IPC. Operates over dedicated loopback `127.0.0.1:8081`. Reject external non-localhost traffic.
3. **Boundary 3 (Gateway to Database):** Raw SQL queries strictly utilize parameterized placeholders (`$1, $2, ...`) via the `pg` client driver to prevent SQL injection.

---

## 2. STRIDE Threat Analysis & Mitigations

| Threat Category | Potential Attack Vector | Lifeline-Core v2 Mitigation |
| :--- | :--- | :--- |
| **Spoofing** | Adversary injects bogus hospital bed capacity feeds or forged ambulance dispatch signals. | Telemetry endpoints require authenticated hospital tokens; feeds are sanity-checked against physical maximum bed capacities recorded in database schema. |
| **Tampering** | Man-in-the-middle alters candidate rankings or flips reservation states in transit. | Microservices communicate over loopback; state transitions are monotonic and enforced both by C++ engine state machines and PostgreSQL constraints. |
| **Repudiation** | An ambulance agency or hospital denies having held or cancelled a critical ICU bed. | Every dispatch, reservation state transition, and capacity update generates an append-only, immutable row in `audit_logs` with a unique correlation ID and timestamp. |
| **Information Disclosure** | Leakage of patient medical history or Personally Identifiable Information (PII). | **Zero PHI by Design:** The system only processes anonymous triage parameters (age, trauma triage tier 1-5, and target resource). No names, medical record numbers, or diagnostic texts are ever collected or stored. |
| **Denial of Service** | Malicious actors flood dispatch requests to lock all regional ICU beds and create artificial shortages. | 1. Rate limiting on dispatch endpoints.<br>2. **Strict TTL auto-expiration:** Holds automatically expire after $\text{ETA} + \delta_{\text{slack}}$ ($\approx 15\text{ mins}$), immediately restoring capacity to the hospital pool. |
| **Elevation of Privilege** | An unauthorized client attempts to force-confirm or cancel reservations. | Endpoints validate reservation ownership and reject state transitions from invalid prior states (e.g. attempting to confirm an already `EXPIRED` hold returns `409 Conflict`). |

---

## 3. Concurrency & Race Condition Defense

### The Time-of-Check to Time-of-Use (TOCTOU) Hazard
In naive dispatch systems, two ambulances query bed availability simultaneously, both observe 1 remaining bed, and both are dispatched to that single bed, leaving one patient stranded on arrival.

### Mitigation: In-Engine Atomic Reservation
Lifeline-Core v2 eliminates TOCTOU by locking the target hospital mutex during the evaluation-and-decrement step:
```cpp
std::unique_lock<std::shared_mutex> lock(hosp.mtx);
if (res.available > 0) {
    res.available--;
    res.reserved++;
    return true; // Atomic allocation guaranteed
}
```
If two threads contend for the last bed:
1. Thread 1 acquires the hospital lock, decrements `available` to 0, registers the hold, and releases the lock.
2. Thread 2 acquires the lock, observes `available == 0`, immediately releases the lock, and cascades to the next ranked candidate in its fallback list.

### Verification Evidence
The entire C++ test suite was compiled and validated with Google Clang **ThreadSanitizer** (`-fsanitize=thread`). A high-stress multi-threaded test simulating 100 concurrent allocation threads completed with **zero data races, zero deadlocks, and zero double allocations**.
