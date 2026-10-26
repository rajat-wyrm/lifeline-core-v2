# Interaction Catalog & State Transitions — Lifeline-Core v3

This document catalogs every interactive user control, its validation rules, API contract, server-side authorization, database side effects, and UI reconciliation behavior.

---

## 1. Request Management & Allocation Interactions

### `ACTION-REQ-001`: Submit Emergency Request
- **Location:** `/app/requests/new`
- **Trigger:** Click "Submit to Allocation Engine"
- **Client Validation:** Patient age $\in [1, 125]$, Trauma score $\in [1, 5]$, Required resource non-empty, Coordinates within Tricity bounding box.
- **API Request:** `POST /api/v2/requests`
- **Authorization:** `DISPATCHER`, `SUPERVISOR`, `ADMIN`
- **Engine / Database Side Effect:**
  - Evaluates candidates in C++ engine.
  - Locks target hospital mutex and decrements available capacity.
  - Writes hold to `reservations` with state `HELD`.
  - Inserts row into `emergency_requests`.
  - Appends audit record to `audit_logs`.
- **UI Reconciliation:** Redirects to `/app/requests/[requestId]` displaying assigned hospital, ETA, and countdown timer.
- **Failure Path:** Returns 400 for validation errors or 503 if engine is offline with clear user recovery suggestions.

### `ACTION-REQ-002`: Manual Dispatcher Override / Fallback
- **Location:** `/app/requests/[requestId]`
- **Trigger:** Click "Manual Override Facility"
- **Client Validation:** Selected fallback hospital must report available capacity $> 0$. Justification reason required.
- **API Request:** `POST /api/v2/requests/:id/override`
- **Authorization:** `SUPERVISOR`, `ADMIN`
- **Database Side Effect:** Releases initial hold, acquires new hold on fallback hospital, records override reason in `audit_logs`.
- **UI Reconciliation:** Refreshes request workspace with updated assignment and red "Manual Override" badge.

---

## 2. Reservation Lifecycle Interactions

### `ACTION-RES-001`: Confirm Ambulance Arrival
- **Location:** `/app/reservations`, `/app/reservations/[reservationId]`
- **Trigger:** Click "Confirm Arrival & Admit"
- **Client Validation:** Confirmation dialog with patient and ambulance confirmation.
- **API Request:** `POST /api/v2/reservations/:id/confirm`
- **Authorization:** `DISPATCHER`, `HOSPITAL_OPERATOR`, `ADMIN`
- **Database Side Effect:**
  - Verifies current state is `HELD`.
  - Transitions state to `CONFIRMED`.
  - Sets `confirmed_at = NOW()`.
  - Converts `reserved_capacity` to occupied admission in `hospital_resources`.
  - Notifies C++ engine to remove hold from min-heap.
- **UI Reconciliation:** Updates reservation state badge to green `CONFIRMED`; removes expiry countdown.
- **Idempotency:** Replaying request on an already `CONFIRMED` hold returns 200 OK without double-decrementing.

### `ACTION-RES-002`: Voluntary Cancellation / Release Hold
- **Location:** `/app/reservations/[reservationId]`
- **Trigger:** Click "Release Reservation Hold"
- **Client Validation:** Reason selector (e.g. "Patient diverted", "Paramedic cancellation", "Field refusal").
- **API Request:** `POST /api/v2/reservations/:id/release`
- **Authorization:** `DISPATCHER`, `HOSPITAL_OPERATOR`, `ADMIN`
- **Database Side Effect:**
  - Transitions state to `RELEASED`.
  - Restores available capacity in `hospital_resources`.
  - Notifies C++ engine to return capacity to resource store.
- **UI Reconciliation:** State badge transitions to blue `RELEASED`; capacity restored notification displayed.

---

## 3. Hospital Inventory & Telemetry Interactions

### `ACTION-HOSP-001`: Update Resource Telemetry Feed
- **Location:** `/app/hospitals/[hospitalId]/resources`
- **Trigger:** Click "Submit Inventory Report"
- **Client Validation:** Total capacity $\ge$ Available capacity $\ge 0$.
- **API Request:** `POST /api/v2/hospitals/:id/resources/:type`
- **Authorization:** `HOSPITAL_OPERATOR`, `ADMIN`
- **Database Side Effect:**
  - Updates `total_capacity`, `available_capacity`, and sets `last_report_timestamp = NOW()`.
  - Records update in `hospital_status_history` and `hospital_feed_logs`.
  - Notifies C++ engine to update belief state and reset staleness decay.
- **UI Reconciliation:** Freshness badge flips to green "Active (&lt;1m ago)"; confidence score resets to 100%.

### `ACTION-HOSP-002`: Simulate Telemetry Feed Outage / Freeze
- **Location:** `/app/hospitals/[hospitalId]/feed-health`
- **Trigger:** Toggle "Simulate Telemetry Freeze"
- **API Request:** `POST /api/v2/hospitals/:id/feed/freeze`
- **Authorization:** `ADMIN`, `ENGINEER`
- **Database Side Effect:** Halts automated telemetry updates; freezes `last_report_timestamp`.
- **UI Reconciliation:** Displays amber warning banner "Telemetry feed frozen for simulation testing".

---

## 4. Alert Triage Interactions

### `ACTION-ALT-001`: Acknowledge Operational Alert
- **Location:** `/app/alerts`
- **Trigger:** Click "Acknowledge" on active alert
- **API Request:** `POST /api/v2/alerts/:id/acknowledge`
- **Authorization:** `DISPATCHER`, `OPERATOR`, `ADMIN`
- **Database Side Effect:** Updates `is_acknowledged = true`, `acknowledged_by = current_user.id`, `acknowledged_at = NOW()`.
- **UI Reconciliation:** Alert row status changes from blinking red `ACTIVE` to steady amber `ACKNOWLEDGED`.

### `ACTION-ALT-002`: Resolve Operational Alert
- **Location:** `/app/alerts`
- **Trigger:** Click "Resolve Alert"
- **Client Validation:** Resolution notes required (minimum 10 characters).
- **API Request:** `POST /api/v2/alerts/:id/resolve`
- **Authorization:** `DISPATCHER`, `OPERATOR`, `ADMIN`
- **Database Side Effect:** Sets `resolved_at = NOW()`, appends resolution note to `audit_logs`.
- **UI Reconciliation:** Alert moves to "Resolved" tab; counter decrements.
