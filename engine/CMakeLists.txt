cmake_minimum_required(VERSION 3.16)
project(lifeline_core_engine VERSION 2.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

option(ENABLE_TSAN "Enable ThreadSanitizer" OFF)
option(ENABLE_ASAN "Enable AddressSanitizer" OFF)

if(ENABLE_TSAN)
    message(STATUS "ThreadSanitizer ENABLED")
    add_compile_options(-fsanitize=thread -g -O1 -fno-omit-frame-pointer)
    add_link_options(-fsanitize=thread)
endif()

if(ENABLE_ASAN)
    message(STATUS "AddressSanitizer ENABLED")
    add_compile_options(-fsanitize=address,undefined -g -O1 -fno-omit-frame-pointer)
    add_link_options(-fsanitize=address,undefined)
endif()

# Compiler warnings
if(MSVC)
    add_compile_options(/W4 /EHsc)
else()
    add_compile_options(-Wall -Wextra -Wpedantic -Wno-unused-parameter)
endif()

find_package(Threads REQUIRED)

# Include paths
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${CMAKE_CURRENT_SOURCE_DIR}/include/third_party
)

# Core Engine Library
set(ENGINE_SOURCES
    src/resource_store.cpp
    src/reservation_ledger.cpp
    src/spatial_index.cpp
    src/segment_tree.cpp
    src/road_router.cpp
    src/triage_queue.cpp
    src/belief_state.cpp
    src/allocation_engine.cpp
    src/server.cpp
)

add_library(lifeline_core STATIC ${ENGINE_SOURCES})
target_link_libraries(lifeline_core PUBLIC Threads::Threads)

# Main Executable & Server Daemon
add_executable(lifeline-engine src/main.cpp)
target_link_libraries(lifeline-engine PRIVATE lifeline_core Threads::Threads)

# Unit & Concurrency Test Runner
set(TEST_SOURCES
    tests/test_main.cpp
    tests/test_resource_store.cpp
    tests/test_reservation_ledger.cpp
    tests/test_concurrency.cpp
    tests/test_spatial_index.cpp
    tests/test_segment_tree.cpp
    tests/test_road_router.cpp
    tests/test_triage_and_fallback.cpp
)

add_executable(lifeline-tests ${TEST_SOURCES})
target_link_libraries(lifeline-tests PRIVATE lifeline_core Threads::Threads)

enable_testing()
add_test(NAME AllLifelineTests COMMAND lifeline-tests)
