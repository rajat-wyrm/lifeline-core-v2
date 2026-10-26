#include "third_party/catch.hpp"
#include "lifeline/reservation_ledger.hpp"

using namespace lifeline;

TEST_CASE("ReservationLedger state transitions and TTL expiry", "[reservation_ledger]") {
    auto store = std::make_shared<ResourceStore>();

    Hospital h;
    h.id = "HOSP-02";
    h.name = "Sector 32 Hospital";
    h.coords = {30.7, 76.7};
    h.resources[ResourceType::VENTILATOR] = {5, 2, 0};
    store->register_hospital(h);

    ReservationLedger ledger(store);

    SECTION("Successful reservation creates HELD state") {
        std::string id = ledger.reserve("HOSP-02", ResourceType::VENTILATOR, "REQ-1", "AMB-1", 5000);
        REQUIRE_FALSE(id.empty());

        auto res = ledger.get_reservation(id);
        REQUIRE(res.has_value());
        REQUIRE(res->state == ReservationState::HELD);
        REQUIRE(res->hospital_id == "HOSP-02");

        auto cnt = store->get_resource_count("HOSP-02", ResourceType::VENTILATOR);
        REQUIRE(cnt->available == 1);
        REQUIRE(cnt->reserved == 1);
    }

    SECTION("Confirm moves HELD -> CONFIRMED and decrements reserved") {
        std::string id = ledger.reserve("HOSP-02", ResourceType::VENTILATOR, "REQ-1", "AMB-1", 5000);
        bool ok = ledger.confirm(id);
        REQUIRE(ok);

        auto res = ledger.get_reservation(id);
        REQUIRE(res->state == ReservationState::CONFIRMED);

        auto cnt = store->get_resource_count("HOSP-02", ResourceType::VENTILATOR);
        REQUIRE(cnt->available == 1);
        REQUIRE(cnt->reserved == 0); // Converted to confirmed utilization

        // Second confirm must fail (invalid transition)
        REQUIRE_FALSE(ledger.confirm(id));
        // Release on confirmed must fail
        REQUIRE_FALSE(ledger.release(id));
    }

    SECTION("Release moves HELD -> RELEASED and restores available bed") {
        std::string id = ledger.reserve("HOSP-02", ResourceType::VENTILATOR, "REQ-1", "AMB-1", 5000);
        bool ok = ledger.release(id);
        REQUIRE(ok);

        auto res = ledger.get_reservation(id);
        REQUIRE(res->state == ReservationState::RELEASED);

        auto cnt = store->get_resource_count("HOSP-02", ResourceType::VENTILATOR);
        REQUIRE(cnt->available == 2); // Restored
        REQUIRE(cnt->reserved == 0);

        // Cannot release twice
        REQUIRE_FALSE(ledger.release(id));
    }

    SECTION("Manual process_expirations releases expired hold exactly once") {
        int64_t now = current_time_epoch_ms();
        std::string id = ledger.reserve("HOSP-02", ResourceType::VENTILATOR, "REQ-1", "AMB-1", 100);

        // Before expiry: 0 expired
        int32_t expired = ledger.process_expirations(now + 50);
        REQUIRE(expired == 0);

        auto cnt = store->get_resource_count("HOSP-02", ResourceType::VENTILATOR);
        REQUIRE(cnt->available == 1);

        // After expiry timestamp: exactly 1 expired
        expired = ledger.process_expirations(now + 150);
        REQUIRE(expired == 1);

        auto res = ledger.get_reservation(id);
        REQUIRE(res->state == ReservationState::EXPIRED);

        cnt = store->get_resource_count("HOSP-02", ResourceType::VENTILATOR);
        REQUIRE(cnt->available == 2); // Returned to pool

        // Subsequent call must not double-return
        expired = ledger.process_expirations(now + 200);
        REQUIRE(expired == 0);
        cnt = store->get_resource_count("HOSP-02", ResourceType::VENTILATOR);
        REQUIRE(cnt->available == 2);
    }
}
