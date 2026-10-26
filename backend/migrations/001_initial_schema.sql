-- Lifeline-Core v2 Migration 001: Initial Schema
-- Production-grade schema with raw SQL constraints, explicit foreign keys, and indexes

CREATE TABLE IF NOT EXISTS hospitals (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    walk_in_lambda DOUBLE PRECISION DEFAULT 0.15,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hospital_resources (
    id SERIAL PRIMARY KEY,
    hospital_id VARCHAR(32) NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    resource_type VARCHAR(32) NOT NULL CHECK (resource_type IN ('ICU-BED', 'VENTILATOR', 'OXYGEN-BED', 'GENERAL-BED')),
    total_capacity INT NOT NULL CHECK (total_capacity >= 0),
    available_capacity INT NOT NULL CHECK (available_capacity >= 0),
    reserved_capacity INT NOT NULL CHECK (reserved_capacity >= 0),
    last_report_timestamp BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uq_hospital_resource UNIQUE(hospital_id, resource_type),
    CONSTRAINT chk_capacity_invariants CHECK (available_capacity + reserved_capacity <= total_capacity)
);

CREATE TABLE IF NOT EXISTS emergency_requests (
    id VARCHAR(64) PRIMARY KEY,
    patient_age INT CHECK (patient_age >= 0 AND patient_age <= 125),
    trauma_score INT CHECK (trauma_score >= 1 AND trauma_score <= 5),
    required_resource VARCHAR(32) NOT NULL CHECK (required_resource IN ('ICU-BED', 'VENTILATOR', 'OXYGEN-BED', 'GENERAL-BED')),
    origin_latitude DOUBLE PRECISION NOT NULL,
    origin_longitude DOUBLE PRECISION NOT NULL,
    status VARCHAR(32) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ALLOCATED', 'IN-TRANSIT', 'COMPLETED', 'FAILED')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reservations (
    id VARCHAR(64) PRIMARY KEY,
    hospital_id VARCHAR(32) NOT NULL REFERENCES hospitals(id),
    resource_type VARCHAR(32) NOT NULL CHECK (resource_type IN ('ICU-BED', 'VENTILATOR', 'OXYGEN-BED', 'GENERAL-BED')),
    request_id VARCHAR(64) REFERENCES emergency_requests(id),
    ambulance_id VARCHAR(64) NOT NULL,
    state VARCHAR(32) NOT NULL CHECK (state IN ('HELD', 'CONFIRMED', 'RELEASED', 'EXPIRED')),
    created_at_ms BIGINT NOT NULL,
    expires_at_ms BIGINT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reservation_events (
    id SERIAL PRIMARY KEY,
    reservation_id VARCHAR(64) NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    from_state VARCHAR(32),
    to_state VARCHAR(32) NOT NULL,
    event_reason TEXT,
    timestamp_ms BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS simulation_runs (
    id VARCHAR(64) PRIMARY KEY,
    scenario VARCHAR(64) NOT NULL,
    policy VARCHAR(64) NOT NULL,
    num_requests INT NOT NULL,
    seed INT NOT NULL,
    bed_miss_rate_pct DOUBLE PRECISION NOT NULL,
    mean_time_min DOUBLE PRECISION NOT NULL,
    p95_time_min DOUBLE PRECISION NOT NULL,
    p99_time_min DOUBLE PRECISION NOT NULL,
    redirect_count INT NOT NULL DEFAULT 0,
    double_allocation_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    correlation_id VARCHAR(64),
    action VARCHAR(64) NOT NULL,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Operational Query Indexes
CREATE INDEX IF NOT EXISTS idx_hosp_coords ON hospitals (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_res_hosp ON hospital_resources (hospital_id, resource_type);
CREATE INDEX IF NOT EXISTS idx_reservations_state ON reservations (state, expires_at_ms);
CREATE INDEX IF NOT EXISTS idx_requests_status ON emergency_requests (status, created_at);
CREATE INDEX IF NOT EXISTS idx_sim_scenario_policy ON simulation_runs (scenario, policy);
