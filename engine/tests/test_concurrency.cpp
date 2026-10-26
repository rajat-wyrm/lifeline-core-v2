#include "third_party/catch.hpp"
#include "lifeline/resource_store.hpp"
#include "lifeline/reservation_ledger.hpp"

#include <thread>
#include <vector>
#include <atomic>
#include <chrono>

using namespace lifeline;

TEST_CASE("100-thread contention stress test on single bed resource", "[concurrency]") {
    auto store = std::make_shared<ResourceStore>();

    // Single hospital with exactly 5 ICU beds
    Hospital h;
    h.id = "HOSP-CONTENTION";
    h.name = "Contention Center";
    h.resources[ResourceType::ICU_BED] = {10, 5, 0};
    store->register_hospital(h);

    ReservationLedger ledger(store);

    const int num_threads = 100;
    std::vector<std::thread> threads;
    threads.reserve(num_threads);

    std::atomic<int> success_count{0};
    std::atomic<int> fail_count{0};
    std::atomic<bool> start_gate{false};

    for (int i = 0; i < num_threads; ++i) {
        threads.emplace_back([&, i]() {
            while (!start_gate.load(std::memory_order_acquire)) {
                std::this_thread::yield();
            }

            std::string req_id = "REQ-" + std::to_string(i);
            std::string amb_id = "AMB-" + std::to_string(i);

            std::string res_id = ledger.reserve(
                "HOSP-CONTENTION",
                ResourceType::ICU_BED,
                req_id,
                amb_id,
                60000 // 60s
            );

            if (!res_id.empty()) {
                success_count.fetch_add(1, std::memory_order_relaxed);
            } else {
                fail_count.fetch_add(1, std::memory_order_relaxed);
            }
        });
    }

    // Release all 100 threads simultaneously
    start_gate.store(true, std::memory_order_release);

    for (auto& t : threads) {
        t.join();
    }

    // Verification of ADSA Invariants:
    // 1. Success count must equal initial available beds (5) exactly
    REQUIRE(success_count.load() == 5);
    // 2. Failure count must equal remaining threads (95)
    REQUIRE(fail_count.load() == 95);

    auto cnt = store->get_resource_count("HOSP-CONTENTION", ResourceType::ICU_BED);
    REQUIRE(cnt.has_value());
    // 3. Available count must be exactly 0 (no negative availability!)
    REQUIRE(cnt->available == 0);
    // 4. Reserved count must be exactly 5 (zero double-allocations!)
    REQUIRE(cnt->reserved == 5);
}

TEST_CASE("Race condition test: Expiry vs Cancel", "[concurrency]") {
    auto store = std::make_shared<ResourceStore>();

    Hospital h;
    h.id = "HOSP-RACE";
    h.resources[ResourceType::OXYGEN_BED] = {10, 1, 0};
    store->register_hospital(h);

    ReservationLedger ledger(store);

    int64_t now = current_time_epoch_ms();
    std::string res_id = ledger.reserve("HOSP-RACE", ResourceType::OXYGEN_BED, "REQ-R1", "AMB-R1", 10);

    // Initial capacity drained
    auto cnt = store->get_resource_count("HOSP-RACE", ResourceType::OXYGEN_BED);
    REQUIRE(cnt->available == 0);

    // Concurrently trigger expiry and voluntary cancellation
    std::atomic<bool> start_signal{false};
    std::atomic<bool> cancel_result{false};
    std::atomic<int32_t> expiry_result{0};

    std::thread t_cancel([&]() {
        while (!start_signal.load(std::memory_order_acquire)) {}
        cancel_result = ledger.release(res_id);
    });

    std::thread t_expire([&]() {
        while (!start_signal.load(std::memory_order_acquire)) {}
        expiry_result = ledger.process_expirations(now + 100);
    });

    start_signal.store(true, std::memory_order_release);
    t_cancel.join();
    t_expire.join();

    // Bed must be returned exactly once: either cancel succeeded OR expiry succeeded, but never double-returned
    cnt = store->get_resource_count("HOSP-RACE", ResourceType::OXYGEN_BED);
    REQUIRE(cnt->available == 1);
    REQUIRE(cnt->reserved == 0);
}
