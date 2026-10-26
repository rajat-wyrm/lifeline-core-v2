#pragma once

#include "lifeline/types.hpp"
#include "lifeline/resource_store.hpp"
#include <mutex>
#include <condition_variable>
#include <thread>
#include <atomic>
#include <queue>
#include <unordered_map>
#include <string>
#include <optional>
#include <memory>
#include <vector>

namespace lifeline {

struct ExpiryEntry {
    int64_t expires_at_ms;
    std::string reservation_id;

    bool operator>(const ExpiryEntry& other) const {
        return expires_at_ms > other.expires_at_ms;
    }
};

class ReservationLedger {
public:
    explicit ReservationLedger(std::shared_ptr<ResourceStore> resource_store);
    ~ReservationLedger();

    ReservationLedger(const ReservationLedger&) = delete;
    ReservationLedger& operator=(const ReservationLedger&) = delete;

    // Start background auto-expiry worker thread
    void start_expiry_worker(int32_t check_interval_ms = 100);

    // Stop background auto-expiry worker thread (clean RAII shutdown)
    void stop_expiry_worker();

    // Create a new atomic hold
    std::string reserve(
        const std::string& hospital_id,
        ResourceType resource_type,
        const std::string& request_id,
        const std::string& ambulance_id,
        int64_t ttl_ms
    );

    // Transition HELD -> CONFIRMED
    bool confirm(const std::string& reservation_id);

    // Transition HELD -> RELEASED (voluntary ambulance cancellation)
    bool release(const std::string& reservation_id);

    // Run a single manual expiry tick (used in deterministic tests / simulators)
    int32_t process_expirations(int64_t current_time_ms);

    // Look up reservation by ID
    std::optional<Reservation> get_reservation(const std::string& reservation_id) const;

    // Retrieve all active holds for a specific hospital (used for stale-report adjustment)
    int32_t count_active_holds_after(const std::string& hospital_id, int64_t timestamp_ms) const;

    // List all reservations
    std::vector<Reservation> get_all_reservations() const;

    // Size metrics
    size_t active_count() const;
    size_t total_count() const;

    // Reset ledger state
    void clear();

private:
    std::shared_ptr<ResourceStore> store_;

    mutable std::mutex ledger_mtx_;
    std::unordered_map<std::string, Reservation> reservations_;
    std::priority_queue<ExpiryEntry, std::vector<ExpiryEntry>, std::greater<ExpiryEntry>> expiry_heap_;

    std::atomic<bool> worker_running_{false};
    std::thread worker_thread_;
    std::condition_variable cv_;
    std::atomic<int64_t> id_counter_{1000};

    std::string generate_id();
    void worker_loop(int32_t interval_ms);
};

} // namespace lifeline
