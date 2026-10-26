#include "lifeline/server.hpp"
#include "third_party/httplib.h"
#include "third_party/json.hpp"

#include <iostream>
#include <thread>
#include <chrono>

using json = nlohmann::json;

namespace lifeline {

struct EngineHttpServer::Impl {
    httplib::Server svr;
    std::thread server_thread;
};

EngineHttpServer::EngineHttpServer(std::shared_ptr<AllocationEngine> engine, int port)
    : engine_(std::move(engine)), port_(port), pimpl_(std::make_unique<Impl>()) {}

EngineHttpServer::~EngineHttpServer() {
    stop();
}

void EngineHttpServer::stop() {
    if (running_) {
        pimpl_->svr.stop();
        if (pimpl_->server_thread.joinable()) {
            pimpl_->server_thread.join();
        }
        running_ = false;
    }
}

void EngineHttpServer::start() {
    if (running_) return;

    auto& svr = pimpl_->svr;

    // Enable CORS for frontend and API integration
    svr.set_default_headers({
        {"Access-Control-Allow-Origin", "*"},
        {"Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS"},
        {"Access-Control-Allow-Headers", "Content-Type, Authorization, X-Correlation-ID"}
    });

    svr.Options(".*", [](const httplib::Request&, httplib::Response& res) {
        res.status = 204;
    });

    // Health Check
    svr.Get("/health", [](const httplib::Request&, httplib::Response& res) {
        json j = {
            {"status", "UP"},
            {"engine", "Lifeline-Core C++17"},
            {"timestamp", current_time_epoch_ms()}
        };
        res.set_content(j.dump(), "application/json");
    });

    // List all hospitals
    svr.Get("/hospitals", [this](const httplib::Request&, httplib::Response& res) {
        auto hospitals = engine_->get_store()->get_all_hospitals();
        json j_list = json::array();

        for (const auto& h : hospitals) {
            json res_map = json::object();
            for (const auto& [rt, count] : h.resources) {
                res_map[resource_type_to_string(rt)] = {
                    {"total", count.total},
                    {"available", count.available},
                    {"reserved", count.reserved}
                };
            }
            j_list.push_back({
                {"id", h.id},
                {"name", h.name},
                {"lat", h.coords.lat},
                {"lon", h.coords.lon},
                {"last_report_timestamp_ms", h.last_report_timestamp_ms},
                {"walk_in_lambda", h.walk_in_lambda},
                {"resources", res_map}
            });
        }
        res.set_content(j_list.dump(), "application/json");
    });

    // Register/update hospital
    svr.Post("/hospitals", [this](const httplib::Request& req, httplib::Response& res) {
        try {
            auto body = json::parse(req.body);
            Hospital h;
            h.id = body.at("id").get<std::string>();
            h.name = body.value("name", h.id);
            h.coords.lat = body.at("lat").get<double>();
            h.coords.lon = body.at("lon").get<double>();
            h.walk_in_lambda = body.value("walk_in_lambda", 0.15);
            h.last_report_timestamp_ms = body.value("last_report_timestamp_ms", current_time_epoch_ms());

            if (body.contains("resources")) {
                for (auto& [key, val] : body["resources"].items()) {
                    ResourceType rt = string_to_resource_type(key);
                    ResourceCount rc;
                    rc.total = val.value("total", 20);
                    rc.available = val.value("available", rc.total);
                    rc.reserved = val.value("reserved", 0);
                    h.resources[rt] = rc;
                }
            }

            engine_->get_store()->register_hospital(h);
            engine_->rebuild_spatial_index();

            json resp = {{"status", "REGISTERED"}, {"id", h.id}};
            res.set_content(resp.dump(), "application/json");
        } catch (const std::exception& e) {
            json err = {{"error", "BAD_REQUEST"}, {"message", e.what()}};
            res.status = 400;
            res.set_content(err.dump(), "application/json");
        }
    });

    // Apply Hospital Feed update
    svr.Post("/hospitals/feed", [this](const httplib::Request& req, httplib::Response& res) {
        try {
            auto body = json::parse(req.body);
            std::string hosp_id = body.at("hospital_id").get<std::string>();
            ResourceType rt = string_to_resource_type(body.at("resource_type").get<std::string>());
            int32_t reported_free = body.at("reported_free").get<int32_t>();
            int64_t report_time = body.value("report_timestamp_ms", current_time_epoch_ms());

            int32_t active_holds = engine_->get_ledger()->count_active_holds_after(hosp_id, report_time);
            bool applied = engine_->get_store()->apply_feed_update(
                hosp_id, rt, reported_free, report_time, active_holds
            );

            json resp = {
                {"status", applied ? "APPLIED" : "STALE_IGNORED"},
                {"hospital_id", hosp_id},
                {"resource_type", resource_type_to_string(rt)},
                {"effective_applied", applied}
            };
            res.set_content(resp.dump(), "application/json");
        } catch (const std::exception& e) {
            json err = {{"error", "BAD_REQUEST"}, {"message", e.what()}};
            res.status = 400;
            res.set_content(err.dump(), "application/json");
        }
    });

    // Allocate Emergency Request (Policy C - Lifeline-Core)
    svr.Post("/allocate", [this](const httplib::Request& req, httplib::Response& res) {
        try {
            auto body = json::parse(req.body);
            EmergencyRequest ereq;
            ereq.request_id = body.value("request_id", "REQ-" + std::to_string(current_time_epoch_ms()));
            ereq.patient_age = body.value("patient_age", 45);
            ereq.trauma_score = body.value("trauma_score", 3);
            ereq.required_resource = string_to_resource_type(body.value("required_resource", "ICU-BED"));
            ereq.origin.lat = body.at("origin_lat").get<double>();
            ereq.origin.lon = body.at("origin_lon").get<double>();
            ereq.arrival_timestamp_ms = body.value("timestamp_ms", current_time_epoch_ms());

            std::string ambulance_id = body.value("ambulance_id", "AMB-101");
            int64_t ttl_ms = body.value("ttl_ms", 900000); // 15 mins default

            AllocationResult alloc = engine_->allocate(ereq, ambulance_id, ttl_ms);

            json ranked_j = json::array();
            for (const auto& c : alloc.ranked_candidates) {
                ranked_j.push_back({
                    {"hospital_id", c.hospital_id},
                    {"hospital_name", c.hospital_name},
                    {"score", c.score},
                    {"eta_seconds", c.eta_seconds},
                    {"distance_km", c.distance_km},
                    {"freshness_score", c.freshness_score},
                    {"effective_available", c.effective_available},
                    {"p_free_on_arrival", c.p_free_on_arrival},
                    {"explanation", c.explanation},
                    {"reservation_attempted", c.reservation_attempted},
                    {"reservation_succeeded", c.reservation_succeeded}
                });
            }

            json resp = {
                {"success", alloc.success},
                {"request_id", alloc.request_id},
                {"allocation_id", alloc.allocation_id},
                {"chosen_hospital_id", alloc.chosen_hospital_id},
                {"chosen_hospital_name", alloc.chosen_hospital_name},
                {"resource_type", resource_type_to_string(alloc.resource_type)},
                {"eta_seconds", alloc.eta_seconds},
                {"distance_km", alloc.distance_km},
                {"freshness_score", alloc.freshness_score},
                {"p_free_on_arrival", alloc.p_free_on_arrival},
                {"expires_at_ms", alloc.expires_at_ms},
                {"fallback_count", alloc.fallback_count},
                {"decision_latency_us", alloc.decision_latency_us},
                {"policy", alloc.policy},
                {"ranked_candidates", ranked_j}
            };
            res.set_content(resp.dump(), "application/json");
        } catch (const std::exception& e) {
            json err = {{"error", "BAD_REQUEST"}, {"message", e.what()}};
            res.status = 400;
            res.set_content(err.dump(), "application/json");
        }
    });

    // Confirm reservation
    svr.Post(R"(/reservations/(RES-[\d]+)/confirm)", [this](const httplib::Request& req, httplib::Response& res) {
        std::string res_id = req.matches[1];
        bool ok = engine_->get_ledger()->confirm(res_id);
        json resp = {
            {"reservation_id", res_id},
            {"state", ok ? "CONFIRMED" : "REJECTED"},
            {"success", ok}
        };
        res.status = ok ? 200 : 409;
        res.set_content(resp.dump(), "application/json");
    });

    // Release reservation
    svr.Post(R"(/reservations/(RES-[\d]+)/release)", [this](const httplib::Request& req, httplib::Response& res) {
        std::string res_id = req.matches[1];
        bool ok = engine_->get_ledger()->release(res_id);
        json resp = {
            {"reservation_id", res_id},
            {"state", ok ? "RELEASED" : "REJECTED"},
            {"success", ok}
        };
        res.status = ok ? 200 : 409;
        res.set_content(resp.dump(), "application/json");
    });

    // List all reservations
    svr.Get("/reservations", [this](const httplib::Request&, httplib::Response& res) {
        auto list = engine_->get_ledger()->get_all_reservations();
        json j_list = json::array();
        for (const auto& r : list) {
            j_list.push_back({
                {"id", r.id},
                {"hospital_id", r.hospital_id},
                {"resource_type", resource_type_to_string(r.resource_type)},
                {"request_id", r.request_id},
                {"ambulance_id", r.ambulance_id},
                {"state", reservation_state_to_string(r.state)},
                {"created_at_ms", r.created_at_ms},
                {"expires_at_ms", r.expires_at_ms}
            });
        }
        res.set_content(j_list.dump(), "application/json");
    });

    // Triage Queue Inspection
    svr.Get("/triage", [this](const httplib::Request&, httplib::Response& res) {
        int64_t now_ms = current_time_epoch_ms();
        auto queue = engine_->get_triage()->snapshot(now_ms);
        json j_list = json::array();
        for (const auto& r : queue) {
            j_list.push_back({
                {"request_id", r.request_id},
                {"age", r.patient_age},
                {"trauma_score", r.trauma_score},
                {"required_resource", resource_type_to_string(r.required_resource)},
                {"arrival_timestamp_ms", r.arrival_timestamp_ms},
                {"retry_count", r.retry_count},
                {"priority_score", r.priority_score(now_ms)}
            });
        }
        res.set_content(j_list.dump(), "application/json");
    });

    // Launch server in background thread
    running_ = true;
    pimpl_->server_thread = std::thread([this, &svr]() {
        svr.listen("0.0.0.0", port_);
        running_ = false;
    });

    // Brief yield to let listener socket bind
    std::this_thread::sleep_for(std::chrono::milliseconds(50));
    std::cout << "[Lifeline Engine] HTTP API Server listening on port " << port_ << std::endl;
}

} // namespace lifeline
