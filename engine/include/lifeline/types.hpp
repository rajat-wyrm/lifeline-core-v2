#pragma once

#include <string>
#include <vector>
#include <unordered_map>
#include <cstdint>
#include <chrono>
#include <cmath>
#include <sstream>
#include <iomanip>

namespace lifeline {

enum class ResourceType : uint8_t {
    ICU_BED = 0,
    VENTILATOR = 1,
    OXYGEN_BED = 2,
    GENERAL_BED = 3
};

inline const char* resource_type_to_string(ResourceType t) {
    switch (t) {
        case ResourceType::ICU_BED: return "ICU-BED";
        case ResourceType::VENTILATOR: return "VENTILATOR";
        case ResourceType::OXYGEN_BED: return "OXYGEN-BED";
        case ResourceType::GENERAL_BED: return "GENERAL-BED";
        default: return "UNKNOWN";
    }
}

inline ResourceType string_to_resource_type(const std::string& s) {
    if (s == "ICU-BED" || s == "icu" || s == "ICU") return ResourceType::ICU_BED;
    if (s == "VENTILATOR" || s == "ventilator" || s == "VENT") return ResourceType::VENTILATOR;
    if (s == "OXYGEN-BED" || s == "oxygen" || s == "OXYGEN") return ResourceType::OXYGEN_BED;
    return ResourceType::GENERAL_BED;
}

// Bitmask for multi-resource capabilities
inline uint8_t resource_mask(ResourceType t) {
    return static_cast<uint8_t>(1 << static_cast<uint8_t>(t));
}

enum class ReservationState : uint8_t {
    HELD = 0,
    CONFIRMED = 1,
    RELEASED = 2,
    EXPIRED = 3
};

inline const char* reservation_state_to_string(ReservationState s) {
    switch (s) {
        case ReservationState::HELD: return "HELD";
        case ReservationState::CONFIRMED: return "CONFIRMED";
        case ReservationState::RELEASED: return "RELEASED";
        case ReservationState::EXPIRED: return "EXPIRED";
        default: return "UNKNOWN";
    }
}

inline ReservationState string_to_reservation_state(const std::string& s) {
    if (s == "CONFIRMED") return ReservationState::CONFIRMED;
    if (s == "RELEASED") return ReservationState::RELEASED;
    if (s == "EXPIRED") return ReservationState::EXPIRED;
    return ReservationState::HELD;
}

struct ResourceCount {
    int32_t total{0};
    int32_t available{0};
    int32_t reserved{0};
};

struct Coordinates {
    double lat{0.0};
    double lon{0.0};

    double distance_to(const Coordinates& other) const {
        // Haversine formula for distance in kilometers
        constexpr double R = 6371.0; // Earth radius in km
        constexpr double DEG_TO_RAD = 3.14159265358979323846 / 180.0;
        double dlat = (other.lat - lat) * DEG_TO_RAD;
        double dlon = (other.lon - lon) * DEG_TO_RAD;
        double a = std::sin(dlat / 2.0) * std::sin(dlat / 2.0) +
                   std::cos(lat * DEG_TO_RAD) * std::cos(other.lat * DEG_TO_RAD) *
                   std::sin(dlon / 2.0) * std::sin(dlon / 2.0);
        double c = 2.0 * std::atan2(std::sqrt(a), std::sqrt(1.0 - a));
        return R * c;
    }
};

struct Hospital {
    std::string id;
    std::string name;
    Coordinates coords;
    std::unordered_map<ResourceType, ResourceCount> resources;
    int64_t last_report_timestamp_ms{0};
    double walk_in_lambda{0.15}; // Poisson walk-in arrival rate per minute
};

struct Reservation {
    std::string id;
    std::string hospital_id;
    ResourceType resource_type{ResourceType::GENERAL_BED};
    std::string request_id;
    std::string ambulance_id;
    ReservationState state{ReservationState::HELD};
    int64_t created_at_ms{0};
    int64_t expires_at_ms{0};
};

struct EmergencyRequest {
    std::string request_id;
    int32_t patient_age{45};
    int32_t trauma_score{3}; // 1 (lowest) to 5 (critical)
    ResourceType required_resource{ResourceType::GENERAL_BED};
    Coordinates origin;
    int64_t arrival_timestamp_ms{0};
    int32_t retry_count{0};
    int64_t wait_time_ms{0};

    // Calculate priority with dynamic aging to prevent starvation
    double priority_score(int64_t current_time_ms, double aging_rate = 0.5) const {
        double wait_sec = std::max(0.0, static_cast<double>(current_time_ms - arrival_timestamp_ms) / 1000.0);
        double age_weight = (patient_age < 12 || patient_age > 65) ? 10.0 : 0.0;
        return (trauma_score * 100.0) + (wait_sec * aging_rate) + age_weight;
    }
};

struct CandidateScore {
    std::string hospital_id;
    std::string hospital_name;
    double score{0.0};
    double eta_seconds{0.0};
    double distance_km{0.0};
    double freshness_score{1.0};
    int32_t effective_available{0};
    double p_free_on_arrival{1.0};
    std::string explanation;
    bool reservation_attempted{false};
    bool reservation_succeeded{false};
};

struct AllocationResult {
    bool success{false};
    std::string request_id;
    std::string allocation_id;
    std::string chosen_hospital_id;
    std::string chosen_hospital_name;
    ResourceType resource_type{ResourceType::GENERAL_BED};
    double eta_seconds{0.0};
    double distance_km{0.0};
    double freshness_score{1.0};
    double p_free_on_arrival{1.0};
    int64_t expires_at_ms{0};
    std::vector<CandidateScore> ranked_candidates;
    int32_t fallback_count{0};
    int64_t decision_latency_us{0};
    std::string policy{"LIFELINE_CORE"};
};

inline int64_t current_time_epoch_ms() {
    return std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()
    ).count();
}

} // namespace lifeline
