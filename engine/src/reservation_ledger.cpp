#include "lifeline/reservation_ledger.hpp"
#include <chrono>

namespace lifeline {

ReservationLedger::ReservationLedger(std::shared_ptr<ResourceStore> resource_store)
    : store_(std::move(resource_store)) {}

ReservationLedger::~ReservationLedger() {
    stop_expiry_worker();
}

std::string ReservationLedger::generate_id() {
    int64_t num = id_counter_.fetch_add(1);
    return "RES-" + std::to_string(num);
}

void ReservationLedger::start_expiry_worker(int32_t check_interval_ms) {
    if (worker_running_.exchange(true)) {
        return; // Already running
    }
    worker_thread_ = std::thread(&ReservationLedger::worker_loop, this, check_interval_ms);
}

void ReservationLedger::stop_expiry_worker() {
    if (worker_running_.exchange(false)) {
        cv_.notify_all();
        if (worker_thread_.joinable()) {
            worker_thread_.join();
        }
    }
}

void ReservationLedger::worker_loop(int32_t interval_ms) {
    while (worker_running_) {
        std::unique_lock<std::mutex> lock(ledger_mtx_);
        if (!worker_running_) break;

        int64_t now = current_time_epoch_ms();
        if (expiry_heap_.empty()) {
            cv_.wait_for(lock, std::chrono::milliseconds(interval_ms), [this] {
                return !worker_running_ || !expiry_heap_.empty();
            });
            continue;
        }

        const auto& top = expiry_heap_.top();
        if (top.expires_at_ms <= now) {
            ExpiryEntry entry = top;
            expiry_heap_.pop();

            auto it = reservations_.find(entry.reservation_id);
            if (it != reservations_.end() && it->second.state == ReservationState::HELD) {
                // Check if this heap entry corresponds to the current expiration
                if (it->second.expires_at_ms <= now) {
                    it->second.state = ReservationState::EXPIRED;
                    std::string hosp_id = it->second.hospital_id;
                    ResourceType res_type = it->second.resource_type;

                    // Release resource under hospital lock outside ledger lock to prevent lock hierarchy
                    lock.unlock();
                    store_->release_hold(hosp_id, res_type);
                    lock.lock();
                }
            }
        } else {
            int64_t wait_ms = std::min(static_cast<int64_t>(interval_ms), top.expires_at_ms - now);
            cv_.wait_for(lock, std::chrono::milliseconds(std::max<int64_t>(1, wait_ms)));
        }
    }
}

std::string ReservationLedger::reserve(
    const std::string& hospital_id,
    ResourceType resource_type,
    const std::string& request_id,
    const std::string& ambulance_id,
    int64_t ttl_ms
) {
    // 1. First attempt atomic reservation in the resource store under that hospital's mutex
    if (!store_->try_reserve(hospital_id, resource_type)) {
        return ""; // Resource unavailable
    }

    // 2. Resource secured; record hold in the ledger
    int64_t now = current_time_epoch_ms();
    int64_t expiry = now + ttl_ms;
    std::string res_id = generate_id();

    Reservation res;
    res.id = res_id;
    res.hospital_id = hospital_id;
    res.resource_type = resource_type;
    res.request_id = request_id;
    res.ambulance_id = ambulance_id;
    res.state = ReservationState::HELD;
    res.created_at_ms = now;
    res.expires_at_ms = expiry;

    {
        std::lock_guard<std::mutex> lock(ledger_mtx_);
        reservations_[res_id] = res;
        expiry_heap_.push({expiry, res_id});
    }

    cv_.notify_one();
    return res_id;
}

bool ReservationLedger::confirm(const std::string& reservation_id) {
    std::string hosp_id;
    ResourceType res_type;

    {
        std::lock_guard<std::mutex> lock(ledger_mtx_);
        auto it = reservations_.find(reservation_id);
        if (it == reservations_.end()) {
            return false;
        }

        // Only HELD reservations can be CONFIRMED
        if (it->second.state != ReservationState::HELD) {
            return false;
        }

        it->second.state = ReservationState::CONFIRMED;
        hosp_id = it->second.hospital_id;
        res_type = it->second.resource_type;
    }

    // Update resource store state
    return store_->confirm_hold(hosp_id, res_type);
}

bool ReservationLedger::release(const std::string& reservation_id) {
    std::string hosp_id;
    ResourceType res_type;

    {
        std::lock_guard<std::mutex> lock(ledger_mtx_);
        auto it = reservations_.find(reservation_id);
        if (it == reservations_.end()) {
            return false;
        }

        // Only HELD reservations can be RELEASED
        if (it->second.state != ReservationState::HELD) {
            return false;
        }

        it->second.state = ReservationState::RELEASED;
        hosp_id = it->second.hospital_id;
        res_type = it->second.resource_type;
    }

    // Return resource back to available capacity
    return store_->release_hold(hosp_id, res_type);
}

int32_t ReservationLedger::process_expirations(int64_t current_time_ms) {
    std::vector<Reservation> to_release;

    {
        std::lock_guard<std::mutex> lock(ledger_mtx_);
        while (!expiry_heap_.empty()) {
            const auto& top = expiry_heap_.top();
            if (top.expires_at_ms > current_time_ms) {
                break;
            }

            ExpiryEntry entry = top;
            expiry_heap_.pop();

            auto it = reservations_.find(entry.reservation_id);
            if (it != reservations_.end() && it->second.state == ReservationState::HELD) {
                if (it->second.expires_at_ms <= current_time_ms) {
                    it->second.state = ReservationState::EXPIRED;
                    to_release.push_back(it->second);
                }
            }
        }
    }

    // Release capacity under individual hospital locks outside ledger lock
    for (const auto& res : to_release) {
        store_->release_hold(res.hospital_id, res.resource_type);
    }

    return static_cast<int32_t>(to_release.size());
}

std::optional<Reservation> ReservationLedger::get_reservation(const std::string& reservation_id) const {
    std::lock_guard<std::mutex> lock(ledger_mtx_);
    auto it = reservations_.find(reservation_id);
    if (it != reservations_.end()) {
        return it->second;
    }
    return std::nullopt;
}

int32_t ReservationLedger::count_active_holds_after(const std::string& hospital_id, int64_t timestamp_ms) const {
    std::lock_guard<std::mutex> lock(ledger_mtx_);
    int32_t count = 0;
    for (const auto& kv : reservations_) {
        if (kv.second.hospital_id == hospital_id &&
            kv.second.state == ReservationState::HELD &&
            kv.second.created_at_ms > timestamp_ms) {
            count++;
        }
    }
    return count;
}

std::vector<Reservation> ReservationLedger::get_all_reservations() const {
    std::lock_guard<std::mutex> lock(ledger_mtx_);
    std::vector<Reservation> list;
    list.reserve(reservations_.size());
    for (const auto& kv : reservations_) {
        list.push_back(kv.second);
    }
    return list;
}

size_t ReservationLedger::active_count() const {
    std::lock_guard<std::mutex> lock(ledger_mtx_);
    size_t count = 0;
    for (const auto& kv : reservations_) {
        if (kv.second.state == ReservationState::HELD) {
            count++;
        }
    }
    return count;
}

size_t ReservationLedger::total_count() const {
    std::lock_guard<std::mutex> lock(ledger_mtx_);
    return reservations_.size();
}

void ReservationLedger::clear() {
    std::lock_guard<std::mutex> lock(ledger_mtx_);
    reservations_.clear();
    while (!expiry_heap_.empty()) {
        expiry_heap_.pop();
    }
}

} // namespace lifeline
