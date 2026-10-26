#include "lifeline/road_router.hpp"
#include <limits>
#include <cmath>
#include <algorithm>

namespace lifeline {

void RoadRouter::add_node(const std::string& id, const Coordinates& coords) {
    nodes_[id] = RoadNode{id, coords};
}

void RoadRouter::add_edge(
    const std::string& from_id,
    const std::string& to_id,
    double length_m,
    double speed_kmh,
    bool bidirectional
) {
    if (speed_kmh <= 0.0) speed_kmh = 45.0;
    if (speed_kmh > max_speed_kmh_) max_speed_kmh_ = speed_kmh;

    // Travel time in seconds: (length in km) / (speed in km/h) * 3600
    double travel_time_sec = (length_m / 1000.0) / speed_kmh * 3600.0;

    adj_[from_id].push_back(RoadEdge{to_id, length_m, speed_kmh, travel_time_sec});
    if (bidirectional) {
        adj_[to_id].push_back(RoadEdge{from_id, length_m, speed_kmh, travel_time_sec});
    }
}

void RoadRouter::clear() {
    nodes_.clear();
    adj_.clear();
    max_speed_kmh_ = 70.0;
}

size_t RoadRouter::edge_count() const {
    size_t count = 0;
    for (const auto& kv : adj_) {
        count += kv.second.size();
    }
    return count;
}

std::string RoadRouter::find_nearest_node(const Coordinates& coords) const {
    if (nodes_.empty()) return "";

    std::string best_id;
    double best_dist = std::numeric_limits<double>::infinity();

    for (const auto& kv : nodes_) {
        double d = coords.distance_to(kv.second.coords);
        if (d < best_dist) {
            best_dist = d;
            best_id = kv.first;
        }
    }
    return best_id;
}

RouteResult RoadRouter::route_dijkstra(const std::string& start_node, const std::string& target_node) const {
    RouteResult result;
    if (start_node.empty() || target_node.empty() ||
        nodes_.find(start_node) == nodes_.end() || nodes_.find(target_node) == nodes_.end()) {
        return result;
    }

    if (start_node == target_node) {
        result.found = true;
        result.travel_time_sec = 0.0;
        result.distance_km = 0.0;
        result.path_nodes = {start_node};
        return result;
    }

    struct QItem {
        double cost;
        std::string u;
        bool operator>(const QItem& o) const { return cost > o.cost; }
    };

    std::priority_queue<QItem, std::vector<QItem>, std::greater<QItem>> pq;
    std::unordered_map<std::string, double> dist;
    std::unordered_map<std::string, double> dist_m;
    std::unordered_map<std::string, std::string> parent;

    dist[start_node] = 0.0;
    dist_m[start_node] = 0.0;
    pq.push({0.0, start_node});

    size_t visited = 0;

    while (!pq.empty()) {
        auto [cost, u] = pq.top();
        pq.pop();
        visited++;

        if (u == target_node) break;
        if (cost > dist[u]) continue;

        auto it = adj_.find(u);
        if (it == adj_.end()) continue;

        for (const auto& edge : it->second) {
            double new_cost = cost + edge.travel_time_sec;
            auto d_it = dist.find(edge.to_node);
            if (d_it == dist.end() || new_cost < d_it->second) {
                dist[edge.to_node] = new_cost;
                dist_m[edge.to_node] = dist_m[u] + edge.length_m;
                parent[edge.to_node] = u;
                pq.push({new_cost, edge.to_node});
            }
        }
    }

    result.nodes_visited = visited;

    auto it_target = dist.find(target_node);
    if (it_target == dist.end()) {
        return result; // No path
    }

    result.found = true;
    result.travel_time_sec = it_target->second;
    result.distance_km = dist_m[target_node] / 1000.0;

    // Reconstruct path
    std::string curr = target_node;
    while (!curr.empty()) {
        result.path_nodes.push_back(curr);
        if (curr == start_node) break;
        curr = parent[curr];
    }
    std::reverse(result.path_nodes.begin(), result.path_nodes.end());
    return result;
}

RouteResult RoadRouter::route_astar(const std::string& start_node, const std::string& target_node) const {
    RouteResult result;
    if (start_node.empty() || target_node.empty()) return result;

    auto it_start = nodes_.find(start_node);
    auto it_target = nodes_.find(target_node);
    if (it_start == nodes_.end() || it_target == nodes_.end()) return result;

    if (start_node == target_node) {
        result.found = true;
        result.travel_time_sec = 0.0;
        result.distance_km = 0.0;
        result.path_nodes = {start_node};
        return result;
    }

    const Coordinates& target_coords = it_target->second.coords;

    // Admissible heuristic: straight-line distance / max possible speed
    auto heuristic = [&](const Coordinates& c) -> double {
        double d_km = c.distance_to(target_coords);
        return (d_km / max_speed_kmh_) * 3600.0; // seconds
    };

    struct QItem {
        double f_score;
        std::string u;
        bool operator>(const QItem& o) const { return f_score > o.f_score; }
    };

    std::priority_queue<QItem, std::vector<QItem>, std::greater<QItem>> pq;
    std::unordered_map<std::string, double> g_score;
    std::unordered_map<std::string, double> dist_m;
    std::unordered_map<std::string, std::string> parent;

    g_score[start_node] = 0.0;
    dist_m[start_node] = 0.0;
    pq.push({heuristic(it_start->second.coords), start_node});

    size_t visited = 0;

    while (!pq.empty()) {
        auto [f, u] = pq.top();
        pq.pop();
        visited++;

        if (u == target_node) break;

        auto u_node = nodes_.find(u);
        if (u_node == nodes_.end()) continue;

        double g_curr = g_score[u];
        auto it = adj_.find(u);
        if (it == adj_.end()) continue;

        for (const auto& edge : it->second) {
            double tentative_g = g_curr + edge.travel_time_sec;
            auto g_it = g_score.find(edge.to_node);
            if (g_it == g_score.end() || tentative_g < g_it->second) {
                g_score[edge.to_node] = tentative_g;
                dist_m[edge.to_node] = dist_m[u] + edge.length_m;
                parent[edge.to_node] = u;

                auto v_node = nodes_.find(edge.to_node);
                double h = (v_node != nodes_.end()) ? heuristic(v_node->second.coords) : 0.0;
                pq.push({tentative_g + h, edge.to_node});
            }
        }
    }

    result.nodes_visited = visited;

    auto it_found = g_score.find(target_node);
    if (it_found == g_score.end()) {
        return result;
    }

    result.found = true;
    result.travel_time_sec = it_found->second;
    result.distance_km = dist_m[target_node] / 1000.0;

    std::string curr = target_node;
    while (!curr.empty()) {
        result.path_nodes.push_back(curr);
        if (curr == start_node) break;
        curr = parent[curr];
    }
    std::reverse(result.path_nodes.begin(), result.path_nodes.end());
    return result;
}

RouteResult RoadRouter::calculate_route(const Coordinates& origin, const Coordinates& destination) const {
    double straight_dist_km = origin.distance_to(destination);

    // If graph is small or unconnected, fall back to realistic road model
    if (nodes_.size() < 2) {
        RouteResult fallback;
        fallback.found = true;
        // Circuity factor 1.35 accounts for city street grid curvature
        fallback.distance_km = straight_dist_km * 1.35;
        // Average emergency response speed 42 km/h
        fallback.travel_time_sec = (fallback.distance_km / 42.0) * 3600.0;
        return fallback;
    }

    std::string start_node = find_nearest_node(origin);
    std::string target_node = find_nearest_node(destination);

    RouteResult r = route_astar(start_node, target_node);
    if (r.found) {
        // Add ingress/egress straight-line travel to nearest road nodes
        double start_ingress = origin.distance_to(nodes_.at(start_node).coords);
        double target_egress = destination.distance_to(nodes_.at(target_node).coords);
        double extra_dist = start_ingress + target_egress;
        r.distance_km += extra_dist;
        r.travel_time_sec += (extra_dist / 30.0) * 3600.0; // 30 km/h local street access
        return r;
    }

    // Fallback if disjoint graph component
    RouteResult fallback;
    fallback.found = true;
    fallback.distance_km = straight_dist_km * 1.35;
    fallback.travel_time_sec = (fallback.distance_km / 42.0) * 3600.0;
    return fallback;
}

} // namespace lifeline
