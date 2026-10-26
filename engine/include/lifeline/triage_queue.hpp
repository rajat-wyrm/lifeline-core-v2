#pragma once

#include "lifeline/types.hpp"
#include <vector>
#include <mutex>
#include <optional>
#include <algorithm>

namespace lifeline {

class TriageQueue {
public:
    explicit TriageQueue(double aging_rate_per_sec = 0.5);

    void push(const EmergencyRequest& req);
    std::optional<EmergencyRequest> pop(int64_t current_time_ms);
    std::optional<EmergencyRequest> peek(int64_t current_time_ms) const;

    void requeue(EmergencyRequest req, int64_t backoff_ms = 5000);

    size_t size() const;
    bool empty() const;
    void clear();

    std::vector<EmergencyRequest> snapshot(int64_t current_time_ms) const;

private:
    double aging_rate_;
    mutable std::mutex mtx_;
    std::vector<EmergencyRequest> queue_;
};

} // namespace lifeline
