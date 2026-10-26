#pragma once

#include "lifeline/types.hpp"
#include "lifeline/resource_store.hpp"
#include "lifeline/reservation_ledger.hpp"
#include "lifeline/spatial_index.hpp"
#include "lifeline/segment_tree.hpp"
#include "lifeline/road_router.hpp"
#include "lifeline/triage_queue.hpp"
#include "lifeline/belief_state.hpp"

#include <memory>
#include <string>
#include <vector>

namespace lifeline {

class AllocationEngine {
public:
    AllocationEngine(
        std::shared_ptr<ResourceStore> store,
        std::shared_ptr<ReservationLedger> ledger,
        std::shared_ptr<SpatialIndex> spatial_index,
        std::shared_ptr<RoadRouter> router,
        std::shared_ptr<TriageQueue> triage,
        std::shared_ptr<BeliefStateCalculator> belief_calc
    );

    // Main allocation pipeline
    AllocationResult allocate(
        const EmergencyRequest& request,
        const std::string& ambulance_id = "AMB-AUTO",
        int64_t ttl_ms = 900000 // 15 minutes default
    );

    // Multi-resource atomic all-or-nothing allocation
    AllocationResult allocate_multi_resource(
        const EmergencyRequest& primary_request,
        const std::vector<ResourceType>& required_resources,
        const std::string& ambulance_id = "AMB-AUTO",
        int64_t ttl_ms = 900000
    );

    // Baseline routing policies for three-policy evaluation
    AllocationResult allocate_nearest(
        const EmergencyRequest& request,
        const std::string& ambulance_id = "AMB-AUTO"
    );

    AllocationResult allocate_portal_count(
        const EmergencyRequest& request,
        const std::string& ambulance_id = "AMB-AUTO"
    );

    // Accessors to underlying subsystems
    std::shared_ptr<ResourceStore> get_store() const { return store_; }
    std::shared_ptr<ReservationLedger> get_ledger() const { return ledger_; }
    std::shared_ptr<SpatialIndex> get_spatial_index() const { return spatial_index_; }
    std::shared_ptr<RoadRouter> get_router() const { return router_; }
    std::shared_ptr<TriageQueue> get_triage() const { return triage_; }
    std::shared_ptr<BeliefStateCalculator> get_belief_calc() const { return belief_calc_; }

    void rebuild_spatial_index();

private:
    std::shared_ptr<ResourceStore> store_;
    std::shared_ptr<ReservationLedger> ledger_;
    std::shared_ptr<SpatialIndex> spatial_index_;
    std::shared_ptr<RoadRouter> router_;
    std::shared_ptr<TriageQueue> triage_;
    std::shared_ptr<BeliefStateCalculator> belief_calc_;
};

} // namespace lifeline
