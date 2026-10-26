# Operations Runbook & Disaster Recovery — Lifeline-Core v3

This runbook provides step-by-step procedures for managing, monitoring, backing up, restoring, and troubleshooting **Lifeline-Core v3** in local and staging environments.

---

## 1. Service Management & Health Verification

### Process Architecture
- **PostgreSQL Database:** User-space cluster on `127.0.0.1:5433` (Data dir: `.data/postgres`)
- **C++17 Allocation Engine:** Daemon on `127.0.0.1:8081`
- **Fastify REST API:** Node.js process on `127.0.0.1:3001`
- **Next.js Web Application:** Node.js process on `127.0.0.1:3000`

### Quick Health Probes
```bash
# 1. Database Connectivity Probe
pg_isready -h 127.0.0.1 -p 5433 -U rajat -d lifeline_dev

# 2. C++ Allocation Engine Liveness Probe
curl -s http://127.0.0.1:8081/health

# 3. Application Gateway Readiness Probe (verifies DB & Engine)
curl -s http://127.0.0.1:3001/api/ready
```
Expected output: `{"status":"READY","dependencies":{"database":{"status":"UP"},"engine":{"status":"UP"}}}`.

---

## 2. Database Backup & Restore Procedure

### Creating a Snapshot Backup
```bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=".data/backups"
mkdir -p "$BACKUP_DIR"

pg_dump -h 127.0.0.1 -p 5433 -U rajat -d lifeline_dev -F c -f "$BACKUP_DIR/lifeline_backup_$TIMESTAMP.dump"
echo "Backup saved to $BACKUP_DIR/lifeline_backup_$TIMESTAMP.dump"
```

### Verifying & Restoring a Backup
```bash
# 1. Terminate active backend connections
pkill -f "tsx watch src/server.ts" || true

# 2. Restore database from snapshot
pg_restore -h 127.0.0.1 -p 5433 -U rajat -d lifeline_dev --clean --if-exists "$BACKUP_DIR/lifeline_backup_$TIMESTAMP.dump"

# 3. Verify table counts
psql -h 127.0.0.1 -p 5433 -U rajat -d lifeline_dev -c "SELECT COUNT(*) FROM hospitals; SELECT COUNT(*) FROM hospital_resources;"
```

---

## 3. Incident Response Playbooks

### Incident 1: C++ Allocation Engine Daemon Failure
- **Symptom:** `GET /api/ready` returns `503 DEGRADED` with `engine: { status: "DOWN" }`.
- **Diagnostic Steps:**
  1. Inspect process: `ps aux | grep lifeline-engine`
  2. Inspect crash logs in `engine/build/`
- **Remediation:**
  ```bash
  # Restart C++ Engine daemon
  cd /home/rajat/.gemini/antigravity/scratch/lifeline-core-v2
  ./engine/build/lifeline-engine --port 8081 &
  ```
  Fastify's keep-alive connection pool will automatically re-establish communication within 500ms.

### Incident 2: Telemetry Feed Outage (Stale Hospital Reports)
- **Symptom:** Alert `ALT-204` triggers: "Telemetry stale on PGIMER Chandigarh (>15 mins)".
- **Remediation:**
  1. Check hospital webhook connector in `/app/settings/integrations`.
  2. Trigger manual feed sync via `/app/hospitals/HOSP-101/feed-health`.
  3. Lifeline-Core's Poisson belief state will automatically downgrade the hospital until telemetry resumes, protecting incoming ambulances from bed misses.

### Incident 3: Invariant Violation (Negative or Exceeded Capacity)
- **Symptom:** Reservation creation fails with PostgreSQL error `chk_capacity_invariants`.
- **Remediation:**
  1. Run reconciliation script via `/app/reservations/reconciliation`.
  2. Execute durable recovery to reclaim expired holds:
     ```bash
     psql -h 127.0.0.1 -p 5433 -U rajat -d lifeline_dev -c "
       UPDATE reservations SET state = 'EXPIRED' WHERE state = 'HELD' AND expires_at_ms <= EXTRACT(EPOCH FROM NOW())*1000;
     "
     ```
