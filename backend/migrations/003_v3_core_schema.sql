-- Lifeline-Core v3 Migration 003: Core Production Schema Evolution
-- Adds users, sessions, RBAC, durable reservation lines, alerts, operational playbooks, outbox events, and idempotency

BEGIN;

-- 1. Evolve Hospitals Table with Provenance & Capabilities
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS trauma_level VARCHAR(32) DEFAULT 'LEVEL_2';
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS operational_status VARCHAR(32) DEFAULT 'OPEN' CHECK (operational_status IN ('OPEN', 'DIVERSION', 'RESTRICTED', 'CLOSED'));
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS source_provenance VARCHAR(64) DEFAULT 'VERIFIED_REGISTRY';
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(32) DEFAULT '+91-172-2747585';
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS address VARCHAR(255) DEFAULT 'Chandigarh Metropolitan Area';

-- 2. Hospital Capability Profiles
CREATE TABLE IF NOT EXISTS hospital_capability_profiles (
    hospital_id VARCHAR(32) PRIMARY KEY REFERENCES hospitals(id) ON DELETE CASCADE,
    trauma_center_level VARCHAR(32) DEFAULT 'LEVEL_2',
    has_pediatric_icu BOOLEAN DEFAULT FALSE,
    has_cardiac_cath_lab BOOLEAN DEFAULT FALSE,
    has_burn_unit BOOLEAN DEFAULT FALSE,
    has_helipad BOOLEAN DEFAULT FALSE,
    specialties JSONB DEFAULT '["EMERGENCY", "GENERAL_SURGERY", "CRITICAL_CARE"]'::jsonb,
    restrictions JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Hospital Status History
CREATE TABLE IF NOT EXISTS hospital_status_history (
    id SERIAL PRIMARY KEY,
    hospital_id VARCHAR(32) NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    previous_status VARCHAR(32),
    new_status VARCHAR(32) NOT NULL,
    reason TEXT,
    changed_by VARCHAR(64) DEFAULT 'SYSTEM',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Hospital Telemetry Feed Logs
CREATE TABLE IF NOT EXISTS hospital_feed_logs (
    id SERIAL PRIMARY KEY,
    hospital_id VARCHAR(32) NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    resource_type VARCHAR(32) NOT NULL,
    report_timestamp BIGINT NOT NULL,
    latency_ms INT DEFAULT 0,
    status VARCHAR(32) DEFAULT 'ACCEPTED' CHECK (status IN ('ACCEPTED', 'STALE_REJECTED', 'VALIDATION_FAILED')),
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Users & RBAC
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('DISPATCHER', 'HOSPITAL_OPERATOR', 'ADMIN', 'AUDITOR', 'VIEWER')),
    full_name VARCHAR(255) NOT NULL,
    hospital_id VARCHAR(32) REFERENCES hospitals(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Sessions Table (Secure Cookie Authentication)
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

-- 7. Evolve Reservations Table with Versioning & Explicit Timestamps
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS expired_at TIMESTAMPTZ;

-- 8. Multi-Resource Reservation Lines
CREATE TABLE IF NOT EXISTS reservation_lines (
    id SERIAL PRIMARY KEY,
    reservation_id VARCHAR(64) NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    resource_type VARCHAR(32) NOT NULL,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    CONSTRAINT uq_reservation_line UNIQUE (reservation_id, resource_type)
);

-- 9. Operational Alerts
CREATE TABLE IF NOT EXISTS alerts (
    id VARCHAR(64) PRIMARY KEY,
    hospital_id VARCHAR(32) REFERENCES hospitals(id) ON DELETE SET NULL,
    severity VARCHAR(32) NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
    code VARCHAR(64) NOT NULL,
    message TEXT NOT NULL,
    is_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by VARCHAR(64) REFERENCES users(id),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Persistent Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    category VARCHAR(64) DEFAULT 'DISPATCH',
    is_read BOOLEAN DEFAULT FALSE,
    entity_type VARCHAR(64),
    entity_id VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. System Settings & Dynamic Policy Weights
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(64) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by VARCHAR(64),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Operational Playbooks & Semantic Knowledge Base
CREATE TABLE IF NOT EXISTS operational_playbooks (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,
    content TEXT NOT NULL,
    tags TEXT NOT NULL,
    embedding FLOAT8[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Transactional Outbox Pattern
CREATE TABLE IF NOT EXISTS outbox_events (
    id SERIAL PRIMARY KEY,
    aggregate_type VARCHAR(64) NOT NULL,
    aggregate_id VARCHAR(64) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(32) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSED', 'FAILED')),
    retry_count INT DEFAULT 0,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- 14. Idempotency Keys Table
CREATE TABLE IF NOT EXISTS idempotency_keys (
    key VARCHAR(128) PRIMARY KEY,
    route VARCHAR(255) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    response_status INT NOT NULL,
    response_body JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Strategic Query Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions (token_hash) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reservations_worker ON reservations (state, expires_at_ms) WHERE state = 'HELD';
CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts (severity, is_acknowledged) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_outbox_pending ON outbox_events (status, created_at) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_feed_logs_hosp ON hospital_feed_logs (hospital_id, report_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_playbooks_title ON operational_playbooks USING gin (to_tsvector('english', title || ' ' || content || ' ' || tags));

-- 16. Seed Standard System Settings & Default Roles
INSERT INTO system_settings (key, value, description) VALUES
('scoring_weights', '{"eta": 40.0, "available": 30.0, "freshness": 15.0, "poisson": 15.0}'::jsonb, 'Candidate utility weights for C++ allocation engine'),
('aging_policy', '{"tau_seconds": 30, "max_aging_promotion": 4}'::jsonb, 'Starvation prevention aging configuration'),
('ttl_slack', '{"slack_minutes": 10}'::jsonb, 'Slack buffer added to road ETA for reservation hold expiration')
ON CONFLICT (key) DO NOTHING;

-- Seed Default Test Accounts (Passwords hashed with SHA-256 for local testing)
-- Password for all seed accounts is: "Lifeline@2026"
-- SHA-256 hash: 18df138370cd02e007343bb93d027dea9dadb3253ab8c0051c42b2e966646e0e
INSERT INTO users (id, email, password_hash, role, full_name, hospital_id) VALUES
('USR-ADMIN-01', 'admin@lifeline.local', '18df138370cd02e007343bb93d027dea9dadb3253ab8c0051c42b2e966646e0e', 'ADMIN', 'Dr. Rajesh Sharma (Chief Medical Officer)', NULL),
('USR-DISPATCH-01', 'dispatch@lifeline.local', '18df138370cd02e007343bb93d027dea9dadb3253ab8c0051c42b2e966646e0e', 'DISPATCHER', 'Paramedic Ananya Kaur (108 Lead Dispatcher)', NULL),
('USR-HOSP-01', 'pgimer.operator@lifeline.local', '18df138370cd02e007343bb93d027dea9dadb3253ab8c0051c42b2e966646e0e', 'HOSPITAL_OPERATOR', 'Sister Sunita Verma (PGIMER Bed Board)', 'HOSP-101'),
('USR-VIEW-01', 'auditor@lifeline.local', '18df138370cd02e007343bb93d027dea9dadb3253ab8c0051c42b2e966646e0e', 'AUDITOR', 'Health Dept Inspector Sandhu', NULL)
ON CONFLICT (id) DO NOTHING;

-- Seed Operational Playbooks
INSERT INTO operational_playbooks (id, title, category, content, tags) VALUES
('PBK-101', 'Mass Casualty Triage Protocol (MCI Level 3)', 'TRIAGE_PROTOCOLS', 
 'When incoming emergency calls exceed 10 simultaneous trauma incidents within a 15-minute window, switch allocation policy from single-facility load balancing to sector-based geographic dispersal. Ensure Level 1 trauma resuscitation cases are directed to PGIMER and GMCH-32, with lower acuity trauma directed to community facilities.', 
 'mci, mass-casualty, trauma, disaster, pgi, gmch'),
('PBK-102', 'Telemetry Feed Staleness Remediation', 'INFRASTRUCTURE', 
 'If a major hospital feed has not reported within 15 minutes, automated belief state decay will reduce confidence to <40%. Telecommunicators must place a voice check call to the hospital emergency bed board and manually trigger a feed sync from the hospital feed-health panel.', 
 'staleness, feed-outage, telemetry, sync, bed-board'),
('PBK-103', 'ICU Ventilator Shortage Surge Diversion', 'RESOURCE_SURGE', 
 'In the event of city-wide ICU ventilator utilization exceeding 88%, the system automatically enforces reservation hold clamps, restricting holds to 15-minute maximums. Non-invasive oxygen beds should be evaluated as initial stabilization alternatives.', 
 'ventilator, icu, shortage, surge, clamp')
ON CONFLICT (id) DO NOTHING;

-- Seed Initial Active Operational Alerts
INSERT INTO alerts (id, hospital_id, severity, code, message) VALUES
('ALT-201', 'HOSP-101', 'INFO', 'HIGH_CAPACITY_LOAD', 'PGIMER Chandigarh ICU bed capacity utilization exceeds 80%. Consider secondary routing for stable patients.'),
('ALT-202', 'HOSP-104', 'WARNING', 'FEED_LATENCY_DRIFT', 'Fortis Hospital Mohali telemetry feed lag is 12 minutes (threshold: 10m). Belief confidence penalty applied.')
ON CONFLICT (id) DO NOTHING;

COMMIT;
