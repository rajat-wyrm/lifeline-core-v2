#pragma once

#include "lifeline/types.hpp"
#include <mutex>
#include <shared_mutex>
#include <unordered_map>
#include <memory>
#include <optional>
#include <vector>

namespace lifeline {

class HospitalNode {
public:
    Hospital data;
    mutable std::mutex mtx;

    explicit HospitalNode(Hospital h) : data(std::move(h)) {}
    // Non-copyable due to mutex
    HospitalNode(const HospitalNode&) = delete;
    HospitalNode& operator=(const HospitalNode&) = delete;
};

class ResourceStore {
public:
    ResourceStore() = default;
    ~ResourceStore() = default;

    // Disallow copy/move
    ResourceStore(const ResourceStore&) = delete;
    ResourceStore& operator=(const ResourceStore&) = delete;

    // Register or update hospital definition
    void register_hospital(const Hospital& hospital);

    // Retrieve a copy of a hospital's current state
    std::optional<Hospital> get_hospital(const std::string& hospital_id) const;

    // Retrieve copies of all registered hospitals
    std::vector<Hospital> get_all_hospitals() const;

    // Apply an external hospital availability report with stale-data protection
    bool apply_feed_update(
        const std::string& hospital_id,
        ResourceType resource_type,
        int32_t reported_free,
        int64_t report_timestamp_ms,
        int32_t active_holds_created_after_report
    );

    // Atomic reservation attempt under the specific hospital's lock
    // Returns true if reserved (available was > 0), false otherwise
    bool try_reserve(const std::string& hospital_id, ResourceType resource_type);

    // Confirm reservation (ambulance arrived, bed occupied)
    bool confirm_hold(const std::string& hospital_id, ResourceType resource_type);

    // Release reservation (ambulance cancelled or TTL expired, bed returned)
    bool release_hold(const std::string& hospital_id, ResourceType resource_type);

    // Direct inspect of resource counts
    std::optional<ResourceCount> get_resource_count(
        const std::string& hospital_id,
        ResourceType resource_type
    ) const;

    // Global reset (useful in test harnesses and benchmarks)
    void clear();

    // Size of registered hospitals
    size_t size() const;

private:
    mutable std::shared_mutex registry_mtx_;
    std::unordered_map<std::string, std::shared_ptr<HospitalNode>> hospitals_;

    std::shared_ptr<HospitalNode> find_node(const std::string& hospital_id) const;
};

} // namespace lifeline
