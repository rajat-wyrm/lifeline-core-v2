#pragma once

#include "lifeline/types.hpp"
#include <unordered_map>
#include <vector>
#include <string>
#include <cmath>
#include <algorithm>

namespace lifeline {

struct GridCoord {
    int32_t x;
    int32_t y;

    bool operator==(const GridCoord& other) const {
        return x == other.x && y == other.y;
    }
};

struct GridCoordHash {
    size_t operator()(const GridCoord& c) const {
        return std::hash<int64_t>()((static_cast<int64_t>(c.x) << 32) ^ static_cast<int64_t>(c.y));
    }
};

struct HospitalSpatialEntry {
    std::string id;
    Coordinates coords;
};

class SpatialIndex {
public:
    // Cell size in degrees (~0.01 deg is ~1.11 km)
    explicit SpatialIndex(double cell_size_deg = 0.015);

    void insert(const std::string& hospital_id, const Coordinates& coords);
    void clear();

    // Query hospitals within radius_km, or closest k hospitals using grid search
    std::vector<std::pair<std::string, double>> query_radius(
        const Coordinates& origin,
        double max_radius_km,
        size_t limit = 10
    ) const;

    // Reference Oracle: Brute-force linear scan over all entries
    std::vector<std::pair<std::string, double>> query_radius_bruteforce(
        const Coordinates& origin,
        double max_radius_km,
        size_t limit = 10
    ) const;

    size_t size() const { return all_entries_.size(); }

private:
    double cell_size_deg_;
    std::vector<HospitalSpatialEntry> all_entries_;
    std::unordered_map<GridCoord, std::vector<HospitalSpatialEntry>, GridCoordHash> grid_;

    GridCoord to_cell(const Coordinates& coords) const {
        return {
            static_cast<int32_t>(std::floor(coords.lat / cell_size_deg_)),
            static_cast<int32_t>(std::floor(coords.lon / cell_size_deg_))
        };
    }
};

} // namespace lifeline
