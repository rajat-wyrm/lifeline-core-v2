#include "lifeline/resource_store.hpp"
#include <algorithm>

namespace lifeline {

void ResourceStore::register_hospital(const Hospital& hospital) {
    std::unique_lock<std::shared_mutex> reg_lock(registry_mtx_);
    auto it = hospitals_.find(hospital.id);
    if (it != hospitals_.end()) {
        std::lock_guard<std::mutex> node_lock(it->second->mtx);
        it->second->data = hospital;
    } else {
        hospitals_[hospital.id] = std::make_shared<HospitalNode>(hospital);
    }
}

std::shared_ptr<HospitalNode> ResourceStore::find_node(const std::string& hospital_id) const {
    std::shared_lock<std::shared_mutex> reg_lock(registry_mtx_);
    auto it = hospitals_.find(hospital_id);
    if (it != hospitals_.end()) {
        return it->second;
    }
    return nullptr;
}

std::optional<Hospital> ResourceStore::get_hospital(const std::string& hospital_id) const {
    auto node = find_node(hospital_id);
    if (!node) return std::nullopt;

    std::lock_guard<std::mutex> lock(node->mtx);
    return node->data;
}

std::vector<Hospital> ResourceStore::get_all_hospitals() const {
    std::vector<std::shared_ptr<HospitalNode>> nodes;
    {
        std::shared_lock<std::shared_mutex> reg_lock(registry_mtx_);
        nodes.reserve(hospitals_.size());
        for (const auto& kv : hospitals_) {
            nodes.push_back(kv.second);
        }
    }

    std::vector<Hospital> result;
    result.reserve(nodes.size());
    for (const auto& node : nodes) {
        std::lock_guard<std::mutex> lock(node->mtx);
        result.push_back(node->data);
    }
    return result;
}

bool ResourceStore::apply_feed_update(
    const std::string& hospital_id,
    ResourceType resource_type,
    int32_t reported_free,
    int64_t report_timestamp_ms,
    int32_t active_holds_created_after_report
) {
    auto node = find_node(hospital_id);
    if (!node) return false;

    std::lock_guard<std::mutex> lock(node->mtx);
    // Stale report rule: if a report is older than the last recorded report, ignore or discount
    if (report_timestamp_ms < node->data.last_report_timestamp_ms) {
        return false; // Stale observation cannot overwrite newer state
    }

    node->data.last_report_timestamp_ms = report_timestamp_ms;
    auto& count = node->data.resources[resource_type];

    // Compute effective available: reported count minus holds created AFTER the report was generated
    int32_t effective = std::max(0, reported_free - active_holds_created_after_report);
    // Bounded by total capacity if known
    if (count.total > 0) {
        effective = std::min(effective, count.total - count.reserved);
    }
    count.available = std::max(0, effective);
    return true;
}

bool ResourceStore::try_reserve(const std::string& hospital_id, ResourceType resource_type) {
    auto node = find_node(hospital_id);
    if (!node) return false;

    std::lock_guard<std::mutex> lock(node->mtx);
    auto& count = node->data.resources[resource_type];
    if (count.available <= 0) {
        return false; // No available capacity
    }

    count.available -= 1;
    count.reserved += 1;
    return true;
}

bool ResourceStore::confirm_hold(const std::string& hospital_id, ResourceType resource_type) {
    auto node = find_node(hospital_id);
    if (!node) return false;

    std::lock_guard<std::mutex> lock(node->mtx);
    auto& count = node->data.resources[resource_type];
    if (count.reserved <= 0) {
        return false;
    }
    // Hold is converted to confirmed utilization (reserved decrements, available stays decremented)
    count.reserved -= 1;
    return true;
}

bool ResourceStore::release_hold(const std::string& hospital_id, ResourceType resource_type) {
    auto node = find_node(hospital_id);
    if (!node) return false;

    std::lock_guard<std::mutex> lock(node->mtx);
    auto& count = node->data.resources[resource_type];
    if (count.reserved > 0) {
        count.reserved -= 1;
    }
    count.available += 1;
    if (count.total > 0 && (count.available + count.reserved) > count.total) {
        count.available = count.total - count.reserved;
    }
    return true;
}

std::optional<ResourceCount> ResourceStore::get_resource_count(
    const std::string& hospital_id,
    ResourceType resource_type
) const {
    auto node = find_node(hospital_id);
    if (!node) return std::nullopt;

    std::lock_guard<std::mutex> lock(node->mtx);
    auto it = node->data.resources.find(resource_type);
    if (it != node->data.resources.end()) {
        return it->second;
    }
    return std::nullopt;
}

void ResourceStore::clear() {
    std::unique_lock<std::shared_mutex> reg_lock(registry_mtx_);
    hospitals_.clear();
}

size_t ResourceStore::size() const {
    std::shared_lock<std::shared_mutex> reg_lock(registry_mtx_);
    return hospitals_.size();
}

} // namespace lifeline
