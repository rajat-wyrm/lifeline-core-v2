#include "third_party/catch.hpp"
#include "lifeline/resource_store.hpp"

using namespace lifeline;

TEST_CASE("ResourceStore registration and basic invariants", "[resource_store]") {
    ResourceStore store;

    Hospital h;
    h.id = "HOSP-01";
    h.name = "Test Hospital";
    h.coords = {30.7, 76.7};
    h.last_report_timestamp_ms = 1000;
    h.resources[ResourceType::ICU_BED] = {10, 5, 0};

    store.register_hospital(h);

    SECTION("Get hospital returns exact state") {
        auto opt = store.get_hospital("HOSP-01");
        REQUIRE(opt.has_value());
        REQUIRE(opt->id == "HOSP-01");
        REQUIRE(opt->resources[ResourceType::ICU_BED].available == 5);
        REQUIRE(opt->resources[ResourceType::ICU_BED].total == 10);
    }

    SECTION("Try reserve decrements available and increments reserved") {
        bool ok = store.try_reserve("HOSP-01", ResourceType::ICU_BED);
        REQUIRE(ok);

        auto cnt = store.get_resource_count("HOSP-01", ResourceType::ICU_BED);
        REQUIRE(cnt.has_value());
        REQUIRE(cnt->available == 4);
        REQUIRE(cnt->reserved == 1);
    }

    SECTION("Cannot reserve below zero") {
        // Drain all 5 beds
        for (int i = 0; i < 5; ++i) {
            REQUIRE(store.try_reserve("HOSP-01", ResourceType::ICU_BED));
        }

        // 6th attempt must fail
        REQUIRE_FALSE(store.try_reserve("HOSP-01", ResourceType::ICU_BED));

        auto cnt = store.get_resource_count("HOSP-01", ResourceType::ICU_BED);
        REQUIRE(cnt->available == 0);
        REQUIRE(cnt->reserved == 5);
    }

    SECTION("Stale reports cannot overwrite newer state") {
        // Initial report was at timestamp 1000.
        // A report with timestamp 900 is stale and must be rejected.
        bool applied_stale = store.apply_feed_update("HOSP-01", ResourceType::ICU_BED, 8, 900, 0);
        REQUIRE_FALSE(applied_stale);

        auto cnt = store.get_resource_count("HOSP-01", ResourceType::ICU_BED);
        REQUIRE(cnt->available == 5); // Unchanged

        // Newer report at timestamp 1100 with 1 active hold created after report
        bool applied_new = store.apply_feed_update("HOSP-01", ResourceType::ICU_BED, 8, 1100, 1);
        REQUIRE(applied_new);

        cnt = store.get_resource_count("HOSP-01", ResourceType::ICU_BED);
        // Effective available should be reported (8) minus active holds after report (1) = 7
        REQUIRE(cnt->available == 7);
    }
}
