#include "third_party/catch.hpp"
#include "lifeline/road_router.hpp"

using namespace lifeline;

TEST_CASE("RoadRouter Dijkstra and A* match known ground truth", "[road_router]") {
    RoadRouter router;

    // A simple 4-node diamond graph
    // A (0, 0), B (0.02, 0.01), C (0.04, 0.02), D (0.01, 0.03)
    router.add_node("A", {30.70, 76.70});
    router.add_node("B", {30.72, 76.71});
    router.add_node("C", {30.74, 76.72});
    router.add_node("D", {30.71, 76.73});

    // Path 1: A -> B -> C
    // Edge A->B: 3000m @ 60 km/h = 180.0 sec
    router.add_edge("A", "B", 3000.0, 60.0, false);
    // Edge B->C: 4000m @ 60 km/h = 240.0 sec
    router.add_edge("B", "C", 4000.0, 60.0, false);

    // Path 2: A -> D -> C (longer travel time)
    // Edge A->D: 1000m @ 30 km/h = 120.0 sec
    router.add_edge("A", "D", 1000.0, 30.0, false);
    // Edge D->C: 8000m @ 80 km/h = 360.0 sec
    router.add_edge("D", "C", 8000.0, 80.0, false);

    SECTION("Dijkstra chooses faster path A -> B -> C (420s)") {
        auto res = router.route_dijkstra("A", "C");
        REQUIRE(res.found);
        REQUIRE(std::abs(res.travel_time_sec - 420.0) < 1e-3);
        REQUIRE(res.path_nodes == std::vector<std::string>{"A", "B", "C"});
    }

    SECTION("A* matches Dijkstra result with fewer or equal visited nodes") {
        auto d_res = router.route_dijkstra("A", "C");
        auto a_res = router.route_astar("A", "C");

        REQUIRE(a_res.found);
        REQUIRE(std::abs(a_res.travel_time_sec - d_res.travel_time_sec) < 1e-3);
        REQUIRE(a_res.path_nodes == d_res.path_nodes);
    }
}
