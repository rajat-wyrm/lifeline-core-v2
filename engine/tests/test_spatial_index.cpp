#include "third_party/catch.hpp"
#include "lifeline/spatial_index.hpp"
#include <random>

using namespace lifeline;

TEST_CASE("SpatialIndex matches Brute-Force Oracle", "[spatial_index]") {
    SpatialIndex index(0.015);

    // Tricity bounding box: Lat 30.55 to 30.85, Lon 76.60 to 76.90
    std::mt19937 rng(12345);
    std::uniform_real_distribution<double> lat_dist(30.55, 30.85);
    std::uniform_real_distribution<double> lon_dist(76.60, 76.90);

    const size_t num_hospitals = 100;
    for (size_t i = 0; i < num_hospitals; ++i) {
        std::string id = "HOSP-" + std::to_string(i);
        index.insert(id, {lat_dist(rng), lon_dist(rng)});
    }

    REQUIRE(index.size() == num_hospitals);

    // Run 50 random test queries comparing grid index vs brute-force scan
    for (int q = 0; q < 50; ++q) {
        Coordinates origin{lat_dist(rng), lon_dist(rng)};
        double radius_km = 12.0;

        auto grid_res = index.query_radius(origin, radius_km, 10);
        auto brute_res = index.query_radius_bruteforce(origin, radius_km, 10);

        // Candidate count and nearest hospital must match oracle
        if (!brute_res.empty()) {
            REQUIRE_FALSE(grid_res.empty());
            REQUIRE(grid_res.front().first == brute_res.front().first);
            REQUIRE(std::abs(grid_res.front().second - brute_res.front().second) < 1e-4);
        }
    }
}
