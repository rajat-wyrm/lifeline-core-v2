#include "lifeline/triage_queue.hpp"

namespace lifeline {

TriageQueue::TriageQueue(double aging_rate_per_sec)
    : aging_rate_(aging_rate_per_sec) {}

void TriageQueue::push(const EmergencyRequest& req) {
    std::lock_guard<std::mutex> lock(mtx_);
    queue_.push_back(req);
}

std::optional<EmergencyRequest> TriageQueue::pop(int64_t current_time_ms) {
    std::lock_guard<std::mutex> lock(mtx_);
    if (queue_.empty()) return std::nullopt;

    // Find patient with highest priority score at current_time_ms
    auto best_it = queue_.begin();
    double best_score = best_it->priority_score(current_time_ms, aging_rate_);

    for (auto it = queue_.begin() + 1; it != queue_.end(); ++it) {
        double score = it->priority_score(current_time_ms, aging_rate_);
        if (score > best_score || (score == best_score && it->arrival_timestamp_ms < best_it->arrival_timestamp_ms)) {
            best_score = score;
            best_it = it;
        }
    }

    EmergencyRequest result = *best_it;
    queue_.erase(best_it);
    return result;
}

std::optional<EmergencyRequest> TriageQueue::peek(int64_t current_time_ms) const {
    std::lock_guard<std::mutex> lock(mtx_);
    if (queue_.empty()) return std::nullopt;

    auto best_it = queue_.begin();
    double best_score = best_it->priority_score(current_time_ms, aging_rate_);

    for (auto it = queue_.begin() + 1; it != queue_.end(); ++it) {
        double score = it->priority_score(current_time_ms, aging_rate_);
        if (score > best_score || (score == best_score && it->arrival_timestamp_ms < best_it->arrival_timestamp_ms)) {
            best_score = score;
            best_it = it;
        }
    }
    return *best_it;
}

void TriageQueue::requeue(EmergencyRequest req, int64_t backoff_ms) {
    std::lock_guard<std::mutex> lock(mtx_);
    req.retry_count++;
    req.arrival_timestamp_ms += backoff_ms; // Backoff delay before re-triage
    queue_.push_back(req);
}

size_t TriageQueue::size() const {
    std::lock_guard<std::mutex> lock(mtx_);
    return queue_.size();
}

bool TriageQueue::empty() const {
    std::lock_guard<std::mutex> lock(mtx_);
    return queue_.empty();
}

void TriageQueue::clear() {
    std::lock_guard<std::mutex> lock(mtx_);
    queue_.clear();
}

std::vector<EmergencyRequest> TriageQueue::snapshot(int64_t current_time_ms) const {
    std::lock_guard<std::mutex> lock(mtx_);
    std::vector<EmergencyRequest> copy = queue_;
    std::sort(copy.begin(), copy.end(), [this, current_time_ms](const auto& a, const auto& b) {
        double sa = a.priority_score(current_time_ms, aging_rate_);
        double sb = b.priority_score(current_time_ms, aging_rate_);
        if (sa != sb) return sa > sb;
        return a.arrival_timestamp_ms < b.arrival_timestamp_ms;
    });
    return copy;
}

} // namespace lifeline
