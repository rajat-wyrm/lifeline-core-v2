# Entity Relationships & Data Model — Lifeline-Core v3

This document details the complete relational schema, foreign key constraints, cascade rules, and domain invariants for **Lifeline-Core v3**.

---

## 1. Relational Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    HOSPITALS ||--o{ HOSPITAL_RESOURCES : "has inventory"
    HOSPITALS ||--o{ HOSPITAL_STATUS_HISTORY : "status changes"
    HOSPITALS ||--o{ HOSPITAL_FEED_LOGS : "feed health"
    HOSPITALS ||--o{ ALERTS : "raises"
    HOSPITALS ||--o{ RESERVATIONS : "holds capacity"
    
    EMERGENCY_REQUESTS ||--o| RESERVATIONS : "allocates"
    
    RESERVATIONS ||--o{ RESERVATION_LINES : "contains items"
    RESERVATIONS ||--o{ RESERVATION_EVENTS : "transitions"
    
    USERS ||--o{ SESSIONS : "authenticates"
    USERS ||--o{ AUDIT_LOGS : "acts"
    
    HOSPITALS {
        string id PK
        string name
        float latitude
        float longitude
        float walk_in_lambda
        string trauma_level
        string operational_status
        string source_provenance
        timestamp created_at
    }

    HOSPITAL_RESOURCES {
        int id PK
        string hospital_id FK
        string resource_type
        int total_capacity
        int available_capacity
        int reserved_capacity
        int occupied_capacity
        bigint last_report_timestamp
    }

    EMERGENCY_REQUESTS {
        string id PK
        int patient_age
        int trauma_score
        string required_resource
        float origin_latitude
        float origin_longitude
        string status
        timestamp created_at
    }

    RESERVATIONS {
        string id PK
        string hospital_id FK
        string request_id FK
        string resource_type
        string ambulance_id
        string state
        int version
        bigint created_at_ms
        bigint expires_at_ms
        timestamp confirmed_at
        timestamp released_at
        timestamp expired_at
    }

    RESERVATION_LINES {
        int id PK
        string reservation_id FK
        string resource_type
        int quantity
    }

    RESERVATION_EVENTS {
        int id PK
        string reservation_id FK
        string from_state
        string to_state
        string event_reason
        bigint timestamp_ms
    }

    USERS {
        string id PK
        string email
        string password_hash
        string role
        string full_name
        string hospital_id FK
        boolean is_active
    }

    SESSIONS {
        string id PK
        string user_id FK
        string token_hash
        timestamp expires_at
        timestamp revoked_at
    }

    ALERTS {
        string id PK
        string hospital_id FK
        string severity
        string code
        string message
        boolean is_acknowledged
        string acknowledged_by
        timestamp acknowledged_at
        timestamp resolved_at
    }

    OPERATIONAL_PLAYBOOKS {
        string id PK
        string title
        string category
        text content
        text tags
        float[] embedding
        timestamp updated_at
    }

    OUTBOX_EVENTS {
        int id PK
        string aggregate_type
        string aggregate_id
        string event_type
        jsonb payload
        string status
        int retry_count
        timestamp created_at
    }
```

---

## 2. Invariants & Integrity Constraints

1. **Capacity Conservation:**
   $$\text{total\_capacity} = \text{available\_capacity} + \text{reserved\_capacity} + \text{occupied\_capacity}$$
   Enforced via SQL `CHECK (available_capacity + reserved_capacity + occupied_capacity <= total_capacity)`.

2. **Non-Negative Inventory:**
   `CHECK (available_capacity >= 0 AND reserved_capacity >= 0 AND occupied_capacity >= 0)`

3. **Deterministic Deadlock Prevention Order:**
   Any transaction mutating multiple `hospital_resources` rows must acquire row locks in deterministic ascending order:
   `SELECT * FROM hospital_resources WHERE ... ORDER BY hospital_id ASC, resource_type ASC FOR UPDATE`.

4. **Monotonic Reservation Progression:**
   `HELD` $\longrightarrow$ `CONFIRMED` $\mid$ `RELEASED` $\mid$ `EXPIRED`.
   Terminal states cannot transition to any other state. Optimistic locking is enforced via `version` increment on every mutation.
