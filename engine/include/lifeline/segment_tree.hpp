#pragma once

#include <vector>
#include <cstdint>
#include <cstddef>
#include <algorithm>
#include <optional>

namespace lifeline {

class MaxSegmentTree {
public:
    MaxSegmentTree() = default;
    explicit MaxSegmentTree(size_t n, int32_t initial_val = 0);
    explicit MaxSegmentTree(const std::vector<int32_t>& data);

    void build(const std::vector<int32_t>& data);

    // Point update: set value at index to new_val in O(log n)
    void update(size_t index, int32_t new_val);

    // Range maximum query over [l, r] (0-indexed, inclusive) in O(log n)
    int32_t query_max(size_t l, size_t r) const;

    // Find the first index in [l, r] with available capacity >= threshold in O(log n)
    // Returns index, or std::nullopt if no hospital in range has enough capacity
    std::optional<size_t> find_first_ge(size_t l, size_t r, int32_t threshold) const;

    // Get current value at index
    int32_t get(size_t index) const;

    size_t size() const { return n_; }

    // Reference Oracle: Linear Scan over [l, r] for correctness verification and crossover benchmarking
    int32_t linear_query_max(size_t l, size_t r) const;
    std::optional<size_t> linear_find_first_ge(size_t l, size_t r, int32_t threshold) const;

private:
    size_t n_{0};
    std::vector<int32_t> tree_;
    std::vector<int32_t> raw_values_;

    void build_internal(size_t node, size_t start, size_t end);
    void update_internal(size_t node, size_t start, size_t end, size_t idx, int32_t val);
    int32_t query_internal(size_t node, size_t start, size_t end, size_t l, size_t r) const;
    std::optional<size_t> find_first_ge_internal(size_t node, size_t start, size_t end, size_t l, size_t r, int32_t threshold) const;
};

} // namespace lifeline
