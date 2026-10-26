#include "lifeline/segment_tree.hpp"
#include <climits>
#include <stdexcept>

namespace lifeline {

MaxSegmentTree::MaxSegmentTree(size_t n, int32_t initial_val)
    : n_(n), raw_values_(n, initial_val) {
    if (n_ > 0) {
        tree_.resize(4 * n_, initial_val);
        build_internal(1, 0, n_ - 1);
    }
}

MaxSegmentTree::MaxSegmentTree(const std::vector<int32_t>& data) {
    build(data);
}

void MaxSegmentTree::build(const std::vector<int32_t>& data) {
    n_ = data.size();
    raw_values_ = data;
    if (n_ > 0) {
        tree_.assign(4 * n_, 0);
        build_internal(1, 0, n_ - 1);
    } else {
        tree_.clear();
    }
}

void MaxSegmentTree::build_internal(size_t node, size_t start, size_t end) {
    if (start == end) {
        tree_[node] = raw_values_[start];
        return;
    }
    size_t mid = start + (end - start) / 2;
    build_internal(2 * node, start, mid);
    build_internal(2 * node + 1, mid + 1, end);
    tree_[node] = std::max(tree_[2 * node], tree_[2 * node + 1]);
}

void MaxSegmentTree::update(size_t index, int32_t new_val) {
    if (index >= n_) {
        throw std::out_of_range("Segment tree index out of range");
    }
    raw_values_[index] = new_val;
    update_internal(1, 0, n_ - 1, index, new_val);
}

void MaxSegmentTree::update_internal(size_t node, size_t start, size_t end, size_t idx, int32_t val) {
    if (start == end) {
        tree_[node] = val;
        return;
    }
    size_t mid = start + (end - start) / 2;
    if (idx <= mid) {
        update_internal(2 * node, start, mid, idx, val);
    } else {
        update_internal(2 * node + 1, mid + 1, end, idx, val);
    }
    tree_[node] = std::max(tree_[2 * node], tree_[2 * node + 1]);
}

int32_t MaxSegmentTree::query_max(size_t l, size_t r) const {
    if (n_ == 0 || l > r || r >= n_) return 0;
    return query_internal(1, 0, n_ - 1, l, r);
}

int32_t MaxSegmentTree::query_internal(size_t node, size_t start, size_t end, size_t l, size_t r) const {
    if (r < start || end < l) {
        return INT_MIN;
    }
    if (l <= start && end <= r) {
        return tree_[node];
    }
    size_t mid = start + (end - start) / 2;
    int32_t left_max = query_internal(2 * node, start, mid, l, r);
    int32_t right_max = query_internal(2 * node + 1, mid + 1, end, l, r);
    return std::max(left_max, right_max);
}

std::optional<size_t> MaxSegmentTree::find_first_ge(size_t l, size_t r, int32_t threshold) const {
    if (n_ == 0 || l > r || r >= n_) return std::nullopt;
    return find_first_ge_internal(1, 0, n_ - 1, l, r, threshold);
}

std::optional<size_t> MaxSegmentTree::find_first_ge_internal(
    size_t node, size_t start, size_t end, size_t l, size_t r, int32_t threshold
) const {
    // If this entire segment is out of the query range or has maximum < threshold, skip
    if (r < start || end < l || tree_[node] < threshold) {
        return std::nullopt;
    }
    if (start == end) {
        return start;
    }
    size_t mid = start + (end - start) / 2;
    // Check left child first to guarantee finding the first index
    auto left_res = find_first_ge_internal(2 * node, start, mid, l, r, threshold);
    if (left_res.has_value()) {
        return left_res;
    }
    return find_first_ge_internal(2 * node + 1, mid + 1, end, l, r, threshold);
}

int32_t MaxSegmentTree::get(size_t index) const {
    if (index >= n_) throw std::out_of_range("Segment tree index out of range");
    return raw_values_[index];
}

int32_t MaxSegmentTree::linear_query_max(size_t l, size_t r) const {
    if (n_ == 0 || l > r || r >= n_) return 0;
    int32_t mx = raw_values_[l];
    for (size_t i = l + 1; i <= r; ++i) {
        if (raw_values_[i] > mx) mx = raw_values_[i];
    }
    return mx;
}

std::optional<size_t> MaxSegmentTree::linear_find_first_ge(size_t l, size_t r, int32_t threshold) const {
    if (n_ == 0 || l > r || r >= n_) return std::nullopt;
    for (size_t i = l; i <= r; ++i) {
        if (raw_values_[i] >= threshold) return i;
    }
    return std::nullopt;
}

} // namespace lifeline
