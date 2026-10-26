#pragma once

#include "lifeline/types.hpp"
#include <vector>
#include <cmath>
#include <string>

namespace lifeline {

struct ScoringWeights {
    double w_eta{40.0};          // Weight for 1 / (ETA_min + epsilon)
    double w_availability{2.0};   // Weight for available bed count
    double w_freshness{15.0};     // Weight for freshness decay score [0, 1]
    double w_probability{25.0};   // Weight for Poisson probability [0, 1]
};

class BeliefStateCalculator {
public:
    explicit BeliefStateCalculator(
        int64_t max_report_age_ms = 3600000, // 60 minutes
        ScoringWeights weights = ScoringWeights{}
    );

    // Calculate freshness decay score in range [0.0, 1.0]
    double calculate_freshness(int64_t report_timestamp_ms, int64_t current_time_ms) const;

    // Calculate probability that at least 1 bed is still available on arrival
    // Given effective free beds `a`, ambulance travel time `t_min`, and Poisson walk-in rate `lambda`
    double calculate_p_free_on_arrival(int32_t effective_beds, double eta_minutes, double lambda) const;

    // Score a candidate hospital for a specific request
    CandidateScore score_candidate(
        const Hospital& hospital,
        ResourceType resource,
        double eta_seconds,
        double distance_km,
        int32_t active_holds_after_report,
        int64_t current_time_ms
    ) const;

    void set_weights(const ScoringWeights& w) { weights_ = w; }
    const ScoringWeights& get_weights() const { return weights_; }

private:
    int64_t max_report_age_ms_;
    ScoringWeights weights_;
};

} // namespace lifeline
