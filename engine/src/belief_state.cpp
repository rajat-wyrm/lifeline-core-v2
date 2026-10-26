#include "lifeline/belief_state.hpp"
#include <sstream>
#include <iomanip>

namespace lifeline {

BeliefStateCalculator::BeliefStateCalculator(int64_t max_report_age_ms, ScoringWeights weights)
    : max_report_age_ms_(max_report_age_ms), weights_(weights) {}

double BeliefStateCalculator::calculate_freshness(int64_t report_timestamp_ms, int64_t current_time_ms) const {
    if (report_timestamp_ms <= 0) return 0.0;
    int64_t age_ms = current_time_ms - report_timestamp_ms;
    if (age_ms <= 0) return 1.0;
    if (age_ms >= max_report_age_ms_) return 0.0;
    return 1.0 - (static_cast<double>(age_ms) / static_cast<double>(max_report_age_ms_));
}

double BeliefStateCalculator::calculate_p_free_on_arrival(
    int32_t effective_beds,
    double eta_minutes,
    double lambda
) const {
    if (effective_beds <= 0) {
        return 0.0; // Zero probability if no beds available
    }

    if (eta_minutes <= 0.0 || lambda <= 0.0) {
        return 1.0;
    }

    // Expected walk-in arrivals during ambulance travel time
    double expected_arrivals = lambda * eta_minutes;

    // P(walk-ins < effective_beds) = sum_{k=0}^{effective_beds - 1} e^(-mu) * mu^k / k!
    double sum_prob = 0.0;
    double current_term = std::exp(-expected_arrivals); // k = 0
    sum_prob += current_term;

    for (int32_t k = 1; k < effective_beds; ++k) {
        current_term *= (expected_arrivals / static_cast<double>(k));
        sum_prob += current_term;
        if (sum_prob >= 1.0) {
            sum_prob = 1.0;
            break;
        }
    }

    return std::min(1.0, std::max(0.0, sum_prob));
}

CandidateScore BeliefStateCalculator::score_candidate(
    const Hospital& hospital,
    ResourceType resource,
    double eta_seconds,
    double distance_km,
    int32_t active_holds_after_report,
    int64_t current_time_ms
) const {
    CandidateScore cs;
    cs.hospital_id = hospital.id;
    cs.hospital_name = hospital.name;
    cs.eta_seconds = eta_seconds;
    cs.distance_km = distance_km;

    // 1. Freshness
    cs.freshness_score = calculate_freshness(hospital.last_report_timestamp_ms, current_time_ms);

    // 2. Effective availability
    int32_t raw_available = 0;
    auto it = hospital.resources.find(resource);
    if (it != hospital.resources.end()) {
        raw_available = it->second.available;
    }
    cs.effective_available = std::max(0, raw_available - active_holds_after_report);

    // 3. Poisson probability of availability on arrival
    double eta_min = std::max(0.1, eta_seconds / 60.0);
    cs.p_free_on_arrival = calculate_p_free_on_arrival(
        cs.effective_available,
        eta_min,
        hospital.walk_in_lambda
    );

    // 4. Combined scoring
    double eta_component = weights_.w_eta * (1.0 / (eta_min + 0.1));
    double avail_component = weights_.w_availability * cs.effective_available;
    double fresh_component = weights_.w_freshness * cs.freshness_score;
    double prob_component = weights_.w_probability * cs.p_free_on_arrival;

    // Hard penalty if effective availability is zero
    if (cs.effective_available == 0) {
        cs.score = -100.0 + eta_component * 0.1;
    } else {
        cs.score = eta_component + avail_component + fresh_component + prob_component;
    }

    std::ostringstream oss;
    oss << "ETA: " << std::fixed << std::setprecision(1) << eta_min << "m (" << eta_component << "), "
        << "Avail: " << cs.effective_available << " (" << avail_component << "), "
        << "Fresh: " << std::setprecision(2) << cs.freshness_score << " (" << fresh_component << "), "
        << "P(free): " << (cs.p_free_on_arrival * 100.0) << "% (" << prob_component << ")";
    cs.explanation = oss.str();

    return cs;
}

} // namespace lifeline
