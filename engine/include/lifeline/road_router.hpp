#pragma once

#include "lifeline/types.hpp"
#include <vector>
#include <string>
#include <unordered_map>
#include <queue>
#include <memory>
#include <optional>

namespace lifeline {

struct RoadNode {
    std::string id;
    Coordinates coords;
};

struct RoadEdge {
    std::string to_node;
    double length_m{0.0};
    double speed_kmh{45.0};
    double travel_time_sec{0.0};
};

struct RouteResult {
    bool found{false};
    double travel_time_sec{0.0};
    double distance_km{0.0};
    std::vector<std::string> path_nodes;
    size_t nodes_visited{0};
};

class RoadRouter {
public:
    RoadRouter() = default;

    void add_node(const std::string& id, const Coordinates& coords);
    void add_edge(
        const std::string& from_id,
        const std::string& to_id,
        double length_m,
        double speed_kmh = 45.0,
        bool bidirectional = true
    );

    void clear();

    std::string find_nearest_node(const Coordinates& coords) const;

    // Dijkstra Shortest Path
    RouteResult route_dijkstra(const std::string& start_node, const std::string& target_node) const;

    // A* Shortest Path with admissible Haversine heuristic
    RouteResult route_astar(const std::string& start_node, const std::string& target_node) const;

    // High-level ETA calculation from arbitrary GPS coordinates to hospital GPS coordinates
    RouteResult calculate_route(const Coordinates& origin, const Coordinates& destination) const;

    size_t node_count() const { return nodes_.size(); }
    size_t edge_count() const;

private:
    std::unordered_map<std::string, RoadNode> nodes_;
    std::unordered_map<std::string, std::vector<RoadEdge>> adj_;
    double max_speed_kmh_{70.0}; // Upper bound for A* admissible heuristic
};

} // namespace lifeline
