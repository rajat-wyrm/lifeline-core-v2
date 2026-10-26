#include "third_party/catch.hpp"
#include "lifeline/resource_store.hpp"
#include "lifeline/reservation_ledger.hpp"
#include "lifeline/spatial_index.hpp"
#include "lifeline/road_router.hpp"
#include "lifeline/triage_queue.hpp"
#include "lifeline/belief_state.hpp"
#include "lifeline/allocation_engine.hpp"

using namespace lifeline;

TEST_CASE("TriageQueue aging prevents starvation", "[triage]") {
    TriageQueue triage(0.5); // aging rate 0.5 points per second waited

    int64_t t0 = 1000000;

    // Patient 1: Trauma score 1 (low severity), arrived at t0
    EmergencyRequest p1;
    p1.request_id = "P1-LOW";
    p1.trauma_score = 1;
    p1.patient_age = 30;
    p1.arrival_timestamp_ms = t0;
    triage.push(p1);

    // After 600 seconds (10 minutes), Patient 2 arrives with Trauma score 3
    int64_t t_later = t0 + 600000; // 600 sec later
    EmergencyRequest p2;
    p2.request_id = "P2-MED";
    p2.trauma_score = 3;
    p2.patient_age = 30;
    p2.arrival_timestamp_ms = t_later;
    triage.push(p2);

    // P1 initial priority: 1 * 100 = 100 + (600s * 0.5) = 400
    // P2 initial priority: 3 * 100 = 300 + (0s * 0.5) = 300
    // P1 aged priority (400) should beat P2 newly arrived priority (300)
    auto top = triage.pop(t_later);
    REQUIRE(top.has_value());
    REQUIRE(top->request_id == "P1-LOW");

    auto next = triage.pop(t_later);
    REQUIRE(next.has_value());
    REQUIRE(next->request_id == "P2-MED");
}

TEST_CASE("AllocationEngine fallback when preferred hospital is unavailable", "[fallback]") {
    auto store = std::make_shared<ResourceStore>();
    auto ledger = std::make_shared<ReservationLedger>(store);
    auto spatial = std::make_shared<SpatialIndex>(0.02);
    auto router = std::make_shared<RoadRouter>();
    auto triage = std::make_shared<TriageQueue>();
    auto belief_calc = std::make_shared<BeliefStateCalculator>();

    // Hospital A: closer (0.5 km away) but has 0 ICU beds
    Hospital hA;
    hA.id = "HOSP-FULL";
    hA.name = "Full Hospital";
    hA.coords = {30.70, 76.70};
    hA.resources[ResourceType::ICU_BED] = {10, 0, 10}; // 0 available
    hA.last_report_timestamp_ms = current_time_epoch_ms();
    store->register_hospital(hA);

    // Hospital B: farther (2.0 km away) and has 3 ICU beds
    Hospital hB;
    hB.id = "HOSP-AVAIL";
    hB.name = "Available Hospital";
    hB.coords = {30.72, 76.72};
    hB.resources[ResourceType::ICU_BED] = {10, 3, 0}; // 3 available
    hB.last_report_timestamp_ms = current_time_epoch_ms();
    store->register_hospital(hB);

    AllocationEngine engine(store, ledger, spatial, router, triage, belief_calc);

    EmergencyRequest req;
    req.request_id = "REQ-FALLBACK-1";
    req.origin = {30.701, 76.701}; // Very close to HOSP-FULL
    req.required_resource = ResourceType::ICU_BED;
    req.arrival_timestamp_ms = current_time_epoch_ms();

    auto alloc = engine.allocate(req, "AMB-99");

    REQUIRE(alloc.success);
    // Even though HOSP-FULL was closest, HOSP-AVAIL had the available beds and won allocation
    REQUIRE(alloc.chosen_hospital_id == "HOSP-AVAIL");
    REQUIRE_FALSE(alloc.allocation_id.empty());

    // Capacity at HOSP-AVAIL should now be decremented to 2
    auto cnt = store->get_resource_count("HOSP-AVAIL", ResourceType::ICU_BED);
    REQUIRE(cnt->available == 2);
    REQUIRE(cnt->reserved == 1);
}

TEST_CASE("Multi-resource all-or-nothing allocation rolls back partial hold on mismatch", "[multi_resource]") {
    auto store = std::make_shared<ResourceStore>();
    auto ledger = std::make_shared<ReservationLedger>(store);
    auto spatial = std::make_shared<SpatialIndex>(0.02);
    auto router = std::make_shared<RoadRouter>();
    auto triage = std::make_shared<TriageQueue>();
    auto belief_calc = std::make_shared<BeliefStateCalculator>();

    // Hospital with ICU bed available but ZERO ventilators
    Hospital h;
    h.id = "HOSP-PARTIAL";
    h.name = "Partial Hospital";
    h.coords = {30.70, 76.70};
    h.resources[ResourceType::ICU_BED] = {5, 2, 0}; // 2 ICU
    h.resources[ResourceType::VENTILATOR] = {5, 0, 5}; // 0 Ventilators
    store->register_hospital(h);

    AllocationEngine engine(store, ledger, spatial, router, triage, belief_calc);

    EmergencyRequest req;
    req.request_id = "REQ-MULTI-1";
    req.origin = {30.70, 76.70};
    req.required_resource = ResourceType::ICU_BED;

    // Patient requires combination of ICU_BED + VENTILATOR
    std::vector<ResourceType> combination = {ResourceType::ICU_BED, ResourceType::VENTILATOR};

    auto alloc = engine.allocate_multi_resource(req, combination, "AMB-MULTI");

    // Must fail because ventilator is unavailable
    REQUIRE_FALSE(alloc.success);

    // Invariant: The ICU bed that was checked first must have been ROLLED BACK and NOT leaked!
    auto cnt_icu = store->get_resource_count("HOSP-PARTIAL", ResourceType::ICU_BED);
    REQUIRE(cnt_icu->available == 2);
    REQUIRE(cnt_icu->reserved == 0);
}
