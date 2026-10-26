#include "lifeline/allocation_engine.hpp"
#include <chrono>
#include <algorithm>

namespace lifeline {

AllocationEngine::AllocationEngine(
    std::shared_ptr<ResourceStore> store,
    std::shared_ptr<ReservationLedger> ledger,
    std::shared_ptr<SpatialIndex> spatial_index,
    std::shared_ptr<RoadRouter> router,
    std::shared_ptr<TriageQueue> triage,
    std::shared_ptr<BeliefStateCalculator> belief_calc
) : store_(std::move(store)),
    ledger_(std::move(ledger)),
    spatial_index_(std::move(spatial_index)),
    router_(std::move(router)),
    triage_(std::move(triage)),
    belief_calc_(std::move(belief_calc)) {
    rebuild_spatial_index();
}

void AllocationEngine::rebuild_spatial_index() {
    if (!spatial_index_ || !store_) return;
    spatial_index_->clear();
    auto hospitals = store_->get_all_hospitals();
    for (const auto& h : hospitals) {
        spatial_index_->insert(h.id, h.coords);
    }
}

AllocationResult AllocationEngine::allocate(
    const EmergencyRequest& request,
    const std::string& ambulance_id,
    int64_t ttl_ms
) {
    auto start_time = std::chrono::high_resolution_clock::now();
    int64_t now_ms = current_time_epoch_ms();

    AllocationResult res;
    res.request_id = request.request_id;
    res.resource_type = request.required_resource;
    res.policy = "LIFELINE_CORE";

    // 1. Find nearby candidate hospitals via Spatial Index (within 35 km)
    auto candidates = spatial_index_->query_radius(request.origin, 35.0, 15);
    if (candidates.empty()) {
        // Fallback to all hospitals if spatial search finds none in sparse region
        auto all_h = store_->get_all_hospitals();
        for (const auto& h : all_h) {
            candidates.emplace_back(h.id, request.origin.distance_to(h.coords));
        }
    }

    // 2. Score each candidate
    std::vector<CandidateScore> scored_candidates;
    scored_candidates.reserve(candidates.size());

    for (const auto& [hosp_id, dist_km] : candidates) {
        auto hosp_opt = store_->get_hospital(hosp_id);
        if (!hosp_opt) continue;

        // Calculate road ETA via router
        RouteResult route = router_->calculate_route(request.origin, hosp_opt->coords);
        int32_t active_holds = ledger_->count_active_holds_after(hosp_id, hosp_opt->last_report_timestamp_ms);

        CandidateScore cs = belief_calc_->score_candidate(
            *hosp_opt,
            request.required_resource,
            route.travel_time_sec,
            dist_km,
            active_holds,
            now_ms
        );
        scored_candidates.push_back(cs);
    }

    // Sort descending by score
    std::sort(scored_candidates.begin(), scored_candidates.end(), [](const auto& a, const auto& b) {
        return a.score > b.score;
    });

    // 3. Fallback ranking loop: Attempt atomic reservation starting from best candidate
    int32_t fallback_count = 0;
    bool reserved = false;

    for (auto& cand : scored_candidates) {
        cand.reservation_attempted = true;
        std::string res_id = ledger_->reserve(
            cand.hospital_id,
            request.required_resource,
            request.request_id,
            ambulance_id,
            ttl_ms
        );

        if (!res_id.empty()) {
            // Success!
            cand.reservation_succeeded = true;
            res.success = true;
            res.allocation_id = res_id;
            res.chosen_hospital_id = cand.hospital_id;
            res.chosen_hospital_name = cand.hospital_name;
            res.eta_seconds = cand.eta_seconds;
            res.distance_km = cand.distance_km;
            res.freshness_score = cand.freshness_score;
            res.p_free_on_arrival = cand.p_free_on_arrival;
            res.expires_at_ms = now_ms + ttl_ms;
            res.fallback_count = fallback_count;
            reserved = true;
            break;
        }

        // Reservation failed under contention; try next candidate
        cand.reservation_succeeded = false;
        fallback_count++;
    }

    res.ranked_candidates = scored_candidates;

    if (!reserved) {
        // Starvation prevention: If all candidates failed, preserve request in triage queue
        res.success = false;
        res.fallback_count = fallback_count;
        triage_->requeue(request, 5000);
    }

    auto end_time = std::chrono::high_resolution_clock::now();
    res.decision_latency_us = std::chrono::duration_cast<std::chrono::microseconds>(
        end_time - start_time
    ).count();

    return res;
}

AllocationResult AllocationEngine::allocate_multi_resource(
    const EmergencyRequest& primary_request,
    const std::vector<ResourceType>& required_resources,
    const std::string& ambulance_id,
    int64_t ttl_ms
) {
    auto start_time = std::chrono::high_resolution_clock::now();
    int64_t now_ms = current_time_epoch_ms();

    AllocationResult res;
    res.request_id = primary_request.request_id;
    res.resource_type = primary_request.required_resource;
    res.policy = "LIFELINE_MULTI_RESOURCE";

    auto candidates = spatial_index_->query_radius(primary_request.origin, 35.0, 15);
    std::vector<CandidateScore> scored;

    for (const auto& [hosp_id, dist_km] : candidates) {
        auto hosp_opt = store_->get_hospital(hosp_id);
        if (!hosp_opt) continue;

        RouteResult route = router_->calculate_route(primary_request.origin, hosp_opt->coords);
        int32_t active_holds = ledger_->count_active_holds_after(hosp_id, hosp_opt->last_report_timestamp_ms);

        CandidateScore cs = belief_calc_->score_candidate(
            *hosp_opt,
            primary_request.required_resource,
            route.travel_time_sec,
            dist_km,
            active_holds,
            now_ms
        );
        scored.push_back(cs);
    }

    std::sort(scored.begin(), scored.end(), [](const auto& a, const auto& b) {
        return a.score > b.score;
    });

    int32_t fallback_count = 0;
    bool all_reserved = false;

    for (auto& cand : scored) {
        cand.reservation_attempted = true;
        std::vector<std::string> held_res_ids;
        bool failed = false;

        // All-or-nothing: Try reserving each resource in the combination
        for (ResourceType r : required_resources) {
            std::string id = ledger_->reserve(cand.hospital_id, r, primary_request.request_id, ambulance_id, ttl_ms);
            if (id.empty()) {
                failed = true;
                break;
            }
            held_res_ids.push_back(id);
        }

        if (!failed) {
            cand.reservation_succeeded = true;
            res.success = true;
            res.allocation_id = held_res_ids.front();
            res.chosen_hospital_id = cand.hospital_id;
            res.chosen_hospital_name = cand.hospital_name;
            res.eta_seconds = cand.eta_seconds;
            res.distance_km = cand.distance_km;
            res.freshness_score = cand.freshness_score;
            res.p_free_on_arrival = cand.p_free_on_arrival;
            res.expires_at_ms = now_ms + ttl_ms;
            res.fallback_count = fallback_count;
            all_reserved = true;
            break;
        }

        // Release any partial holds to prevent capacity leaks!
        for (const auto& partial_id : held_res_ids) {
            ledger_->release(partial_id);
        }
        fallback_count++;
    }

    res.ranked_candidates = scored;
    if (!all_reserved) {
        res.success = false;
        res.fallback_count = fallback_count;
        triage_->requeue(primary_request, 5000);
    }

    auto end_time = std::chrono::high_resolution_clock::now();
    res.decision_latency_us = std::chrono::duration_cast<std::chrono::microseconds>(
        end_time - start_time
    ).count();

    return res;
}

AllocationResult AllocationEngine::allocate_nearest(
    const EmergencyRequest& request,
    const std::string& ambulance_id
) {
    auto start_time = std::chrono::high_resolution_clock::now();

    AllocationResult res;
    res.request_id = request.request_id;
    res.resource_type = request.required_resource;
    res.policy = "NEAREST_HOSPITAL";

    // Policy A: Chooses strictly nearest hospital by road distance, NO reservation, ignores capacity
    auto candidates = spatial_index_->query_radius(request.origin, 50.0, 50);
    if (!candidates.empty()) {
        const auto& [best_id, dist] = candidates.front();
        auto hosp_opt = store_->get_hospital(best_id);
        if (hosp_opt) {
            RouteResult route = router_->calculate_route(request.origin, hosp_opt->coords);
            res.success = true;
            res.chosen_hospital_id = best_id;
            res.chosen_hospital_name = hosp_opt->name;
            res.distance_km = dist;
            res.eta_seconds = route.travel_time_sec;
            res.freshness_score = 0.5;
            res.p_free_on_arrival = 0.5;
        }
    }

    auto end_time = std::chrono::high_resolution_clock::now();
    res.decision_latency_us = std::chrono::duration_cast<std::chrono::microseconds>(
        end_time - start_time
    ).count();
    return res;
}

AllocationResult AllocationEngine::allocate_portal_count(
    const EmergencyRequest& request,
    const std::string& ambulance_id
) {
    auto start_time = std::chrono::high_resolution_clock::now();

    AllocationResult res;
    res.request_id = request.request_id;
    res.resource_type = request.required_resource;
    res.policy = "PORTAL_COUNT";

    // Policy B: Chooses nearest hospital where LAST REPORTED free count > 0, NO reservation, ignores freshness decay
    auto candidates = spatial_index_->query_radius(request.origin, 50.0, 50);

    for (const auto& [hosp_id, dist] : candidates) {
        auto hosp_opt = store_->get_hospital(hosp_id);
        if (!hosp_opt) continue;

        auto it = hosp_opt->resources.find(request.required_resource);
        if (it != hosp_opt->resources.end() && it->second.available > 0) {
            RouteResult route = router_->calculate_route(request.origin, hosp_opt->coords);
            res.success = true;
            res.chosen_hospital_id = hosp_id;
            res.chosen_hospital_name = hosp_opt->name;
            res.distance_km = dist;
            res.eta_seconds = route.travel_time_sec;
            res.freshness_score = 1.0; // Blindly trusts portal
            res.p_free_on_arrival = 1.0;
            break;
        }
    }

    auto end_time = std::chrono::high_resolution_clock::now();
    res.decision_latency_us = std::chrono::duration_cast<std::chrono::microseconds>(
        end_time - start_time
    ).count();
    return res;
}

} // namespace lifeline
