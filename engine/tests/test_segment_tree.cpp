#include "third_party/catch.hpp"
#include "lifeline/segment_tree.hpp"
#include <random>

using namespace lifeline;

TEST_CASE("MaxSegmentTree queries match Linear Scan Oracle", "[segment_tree]") {
    const size_t N = 250;
    std::mt19937 rng(999);
    std::uniform_int_distribution<int32_t> val_dist(0, 50);

    std::vector<int32_t> initial_data(N);
    for (size_t i = 0; i < N; ++i) {
        initial_data[i] = val_dist(rng);
    }

    MaxSegmentTree tree(initial_data);

    SECTION("Initial range queries match linear scan") {
        for (int q = 0; q < 100; ++q) {
            size_t l = rng() % N;
            size_t r = rng() % N;
            if (l > r) std::swap(l, r);

            int32_t tree_max = tree.query_max(l, r);
            int32_t linear_max = tree.linear_query_max(l, r);
            REQUIRE(tree_max == linear_max);

            int32_t threshold = 25;
            auto tree_idx = tree.find_first_ge(l, r, threshold);
            auto linear_idx = tree.linear_find_first_ge(l, r, threshold);
            REQUIRE(tree_idx == linear_idx);
        }
    }

    SECTION("Point updates maintain full parity with linear oracle") {
        for (int u = 0; u < 50; ++u) {
            size_t idx = rng() % N;
            int32_t new_val = val_dist(rng);
            tree.update(idx, new_val);

            // Test query after update
            size_t l = rng() % N;
            size_t r = rng() % N;
            if (l > r) std::swap(l, r);

            REQUIRE(tree.query_max(l, r) == tree.linear_query_max(l, r));
        }
    }
}
