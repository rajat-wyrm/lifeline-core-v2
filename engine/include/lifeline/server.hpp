#pragma once

#include "lifeline/allocation_engine.hpp"
#include <memory>
#include <string>

namespace lifeline {

class EngineHttpServer {
public:
    explicit EngineHttpServer(std::shared_ptr<AllocationEngine> engine, int port = 8081);
    ~EngineHttpServer();

    void start();
    void stop();
    bool is_running() const { return running_; }

private:
    std::shared_ptr<AllocationEngine> engine_;
    int port_;
    bool running_{false};
    struct Impl;
    std::unique_ptr<Impl> pimpl_;
};

} // namespace lifeline
