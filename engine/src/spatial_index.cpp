#include "lifeline/spatial_index.hpp"
#include <cmath>
#include <algorithm>

namespace lifeline {

SpatialIndex::SpatialIndex(double cell_size_deg)
    : cell_size_deg_(cell_size_deg) {}

void SpatialIndex::insert(const std::string& hospital_id, const Coordinates& coords) {
    HospitalSpatialEntry entry{hospital_id, coords};
    all_entries_.push_back(entry);
    GridCoord cell = to_cell(coords);
    grid_[cell].push_back(entry);
}

void SpatialIndex::clear() {
    all_entries_.clear();
    grid_.clear();
}

std::vector<std::pair<std::string, double>> SpatialIndex::query_radius(
    const Coordinates& origin,
    double max_radius_km,
    size_t limit
) const {
    // Determine cell coordinates for the query origin
    GridCoord center_cell = to_cell(origin);

    // Compute cell radius to inspect: 1 degree latitude is approx 111.0 km
    double deg_radius = max_radius_km / 111.0;
    int32_t cell_radius = static_cast<int32_t>(std::ceil(deg_radius / cell_size_deg_));
    if (cell_radius < 1) cell_radius = 1;

    std::vector<std::pair<std::string, double>> candidates;

    // Scan the bounding window of grid cells
    for (int32_t dx = -cell_radius; dx <= cell_radius; ++dx) {
        for (int32_t dy = -cell_radius; dy <= cell_radius; ++dy) {
            GridCoord cell{center_cell.x + dx, center_cell.y + dy};
            auto it = grid_.find(cell);
            if (it != grid_.end()) {
                for (const auto& entry : it->second) {
                    double dist = origin.distance_to(entry.coords);
                    if (dist <= max_radius_km) {
                        candidates.emplace_back(entry.id, dist);
                    }
                }
            }
        }
    }

    // Sort by distance ascending
    std::sort(candidates.begin(), candidates.end(), [](const auto& a, const auto& b) {
        return a.second < b.second;
    });

    if (candidates.size() > limit) {
        candidates.resize(limit);
    }

    return candidates;
}

std::vector<std::pair<std::string, double>> SpatialIndex::query_radius_bruteforce(
    const Coordinates& origin,
    double max_radius_km,
    size_t limit
) const {
    // Reference implementation: full linear scan
    std::vector<std::pair<std::string, double>> candidates;
    for (const auto& entry : all_entries_) {
        double dist = origin.distance_to(entry.coords);
        if (dist <= max_radius_km) {
            candidates.emplace_back(entry.id, dist);
        }
    }

    std::sort(candidates.begin(), candidates.end(), [](const auto& a, const auto& b) {
        return a.second < b.second;
    });

    if (candidates.size() > limit) {
        candidates.resize(limit);
    }

    return candidates;
}

} // namespace lifeline
