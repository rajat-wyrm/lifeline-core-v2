# Lifeline-Core v3 — Multi-Route User Journeys & End-to-End Scenarios

This document specifies the 8 canonical multi-route operator journeys, defining pre-conditions, navigation transitions, server-side side effects, and acceptance criteria.

---

## Journey 1: Hospital Intelligence & Capacity Investigation
- **Persona:** Emergency Medical Supervisor / Regional Resource Coordinator
- **User Intent:** Investigate whether a tertiary hospital has true ICU bed availability before routing a critical trauma patient.
- **Path:**
  1. `/app/hospitals`: Filter by "Chandigarh" sector and "Level 1 Trauma". Observe PGIMER (`HOSP-101`) reporting 26 available ICU beds.
  2. `/app/hospitals/HOSP-101`: Inspect hospital overview. Note Poisson walk-in parameter $\lambda_{walk} = 0.25/\text{hr}$ and last report timestamp.
  3. `/app/hospitals/HOSP-101/resources`: Drill into granular resource pools. Inspect `ICU-BED` vs `VENTILATOR`.
  4. `/app/hospitals/HOSP-101/feed-health`: Check telemetry feed freshness. Verify latency is under $5\text{ minutes}$.
  5. `/app/hospitals/HOSP-101/status-history`: Review recent bed decrement logs and confirmed admissions.
  6. `/app/hospitals/HOSP-101/audit`: Confirm recent capacity adjustments were performed by authenticated hospital operators.
- **Acceptance Criteria:** Every sub-route loads real PostgreSQL data for `HOSP-101`, breadcrumbs link back cleanly, and tabs preserve URL history.

---

## Journey 2: Emergency Request Dispatch & Candidate Ranking
- **Persona:** Emergency Dispatcher (108 Telecommunicator)
- **User Intent:** Dispatch an ambulance for an incoming severe road traffic accident in Sector 17 with acute respiratory distress.
- **Path:**
  1. `/app/requests/new`: Fill guided dispatch form:
     - Patient Age: 42
     - Trauma Score: 1 (Resuscitation)
     - Required Resource: `ICU-BED`
     - Incident Coordinates: $30.7333^\circ\text{ N}, 76.7794^\circ\text{ E}$
  2. Submission initiates atomic request to Fastify `POST /api/v2/requests`.
  3. System redirects to `/app/requests/[requestId]`:
     - Displays assigned facility: `HOSP-101` (PGIMER Chandigarh)
     - Decision latency: $1.5\text{ ms}$
     - Road network ETA: $6.9\text{ minutes}$
  4. `/app/requests/[requestId]/allocation`:
     - Inspect candidate ranking breakdown: ETA score, available beds, freshness score, and Poisson survival probability $P(\text{free on arrival}) = 1.0$.
  5. Click active hold link $\to$ Navigates to `/app/reservations/[reservationId]`.
- **Acceptance Criteria:** Real C++ engine allocation creates a durable reservation in PostgreSQL with state `HELD`, decrements hospital capacity atomically, and registers an expiry timestamp in min-heap and PostgreSQL.

---

## Journey 3: Reservation Lifecycle & Bed Confirmation
- **Persona:** Ambulance Paramedic & Receiving Hospital Triage Nurse
- **User Intent:** Confirm patient arrival and admit patient, permanently converting the temporary hold into an occupied admission.
- **Path:**
  1. `/app/reservations`: Locate active hold `RES-1000`. Observe live countdown timer ($14\text{m } 30\text{s}$ remaining).
  2. `/app/reservations/RES-1000`: Inspect hold workspace showing ambulance `AMB-101`, request link, and target bed `ICU-BED`.
  3. Action: Click **"Confirm Arrival & Admit Patient"**.
  4. Backend verifies state `HELD`, transitions to `CONFIRMED`, and notifies C++ engine.
  5. `/app/hospitals/HOSP-101/resources`: Verify available capacity remains decremented and reserved capacity transitions to confirmed occupancy.
  6. `/app/requests/[requestId]/timeline`: Verify lifecycle shows event `CONFIRMED` with exact arrival timestamp.
- **Acceptance Criteria:** State transitions idempotently; duplicate confirm calls return current state without double decrementing; terminal state cannot be reverted.

---

## Journey 4: Stale Feed Degradation & Automatic Fallback Routing
- **Persona:** Dispatcher & Operations Engineer
- **User Intent:** Test system resiliency when a primary hospital's telemetry feed freezes or goes offline.
- **Path:**
  1. `/app/hospitals/HOSP-101/feed-health`: Trigger simulated telemetry freeze (simulate network partition).
  2. Ingest 20 minutes of elapsed time. Staleness $\Delta t$ causes Poisson confidence $P(\text{free on arrival})$ to degrade from $1.0 \to 0.28$.
  3. `/app/requests/new`: Dispatch emergency request near Sector 11.
  4. `/app/requests/[requestId]/allocation`: Observe that `HOSP-101` is penalized/disqualified due to low belief state confidence ($P(\text{free}) < 0.40$).
  5. System automatically cascades to fallback candidate `HOSP-108` (GMSH Sector 16) with fresh telemetry, acquiring hold without bed miss.
- **Acceptance Criteria:** The engine avoids stale hospitals without human intervention, preventing the "arrived but no bed" failure.

---

## Journey 5: System Alerts & Dependency Incident Triage
- **Persona:** Site Reliability Engineer / System Administrator
- **User Intent:** Investigate an operational alert indicating high feed latency on Mohali hospital cluster.
- **Path:**
  1. `/app`: Alert notification banner displays "WARNING: Feed stale on 3 Mohali facilities".
  2. `/app/alerts`: Click on alert `ALT-204` (Mohali Telemetry Drift).
  3. Review alert detail: Affected facilities `HOSP-104`, `HOSP-108`, `HOSP-114`.
  4. Click **"Acknowledge Alert"** with operator identity.
  5. `/app/observability/health`: Inspect Fastify, PostgreSQL, and C++ Engine latency percentiles.
  6. `/app/alerts`: Enter resolution notes "Network gateway restored, telemetry ping received" and click **"Resolve Alert"**.
- **Acceptance Criteria:** Alert lifecycle transitions cleanly (`ACTIVE` $\to$ `ACKNOWLEDGED` $\to$ `RESOLVED`) with durable audit records.

---

## Journey 6: Reproducible Scientific Simulation & Policy Comparison
- **Persona:** Healthcare Operations Researcher & Policy Analyst
- **User Intent:** Reproduce the 20-seed Monte Carlo evaluation comparing Lifeline-Core against Portal-Count and Nearest Hospital.
- **Path:**
  1. `/app/simulator/scenarios`: Select "Feed Outage Chaos" preset (PGIMER, GMCH-32, Fortis frozen).
  2. `/app/simulator`: Set $N = 200$ requests, Seed = 42. Click "Execute Simulation Run".
  3. Watch live progress indicator while Python engine executes arterial road A* routing and Poisson walk-in competition.
  4. `/app/simulator/runs/[runId]`: Inspect output metrics: Bed Miss Rate $0.00\%$, Redirects $0$, Double Allocations $0$.
  5. `/app/experiments`: Navigate to 3-policy comparative view. View aggregated mean $\pm$ standard deviation across 20 randomized seeds.
  6. Click "Export Experiment JSON" to download raw trial records.
- **Acceptance Criteria:** Re-running with identical seeds yields bit-for-bit identical results; synthetic simulation is clearly labeled.

---

## Journey 7: Dynamic Policy Configuration & Weight Tuning
- **Persona:** Medical Director / Chief Dispatch Administrator
- **User Intent:** Adjust candidate scoring weights to prioritize road-network ETA over hospital bed cushion during extreme weather.
- **Path:**
  1. `/app/settings/policies`: View current weights: $w_{eta} = 40.0, w_{avail} = 30.0, w_{fresh} = 15.0, w_{poisson} = 15.0$.
  2. Enter edit mode: Set $w_{eta} = 60.0, w_{avail} = 20.0, w_{fresh} = 10.0, w_{poisson} = 10.0$.
  3. Click **"Validate & Test Workload"**: Runs a dry-run check against synthetic benchmark incidents.
  4. Click **"Activate Policy Version v2.1"**: Writes to `system_settings` and pushes configuration update to C++ engine via `POST /config`.
  5. `/app/settings/audit`: Verify administrative audit record logs the configuration diff.
- **Acceptance Criteria:** Weights update dynamically without requiring C++ engine recompilation or process restart.

---

## Journey 8: Global Search & Deep Entity Investigation
- **Persona:** Emergency Incident Auditor
- **User Intent:** Search for an ambulance unit (`AMB-101`) to trace all incidents, holds, and hospital handoffs over the past 24 hours.
- **Path:**
  1. `/app/search`: Enter query `AMB-101` in global search bar.
  2. Search returns grouped results:
     - Reservations (1 active, 3 historical)
     - Requests (4 linked incidents)
     - Audit Events (8 timestamped handoffs)
  3. Click on reservation `RES-1000` $\to$ Navigates directly to `/app/reservations/RES-1000`.
  4. Click linked incident $\to$ Navigates to `/app/requests/REQ-1793003021823-814`.
  5. Click linked hospital $\to$ Navigates to `/app/hospitals/HOSP-101`.
- **Acceptance Criteria:** Cross-entity links navigate seamlessly, keyboard navigation (`Enter`, arrow keys) works, and search results respect permissions.
