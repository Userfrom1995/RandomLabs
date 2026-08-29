cmake_minimum_required(VERSION 3.16)
project(prism VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

option(PRISM_WITH_WEBP "Enable WebP decode via libwebp" OFF)
option(PRISM_WITH_TIFF "Enable TIFF decode via libtiff" OFF)
option(PRISM_BUILD_TESTS "Build tests" ON)

add_library(prism_core STATIC
    src/common/crc32.cpp
    src/common/bitstream.cpp
    src/codec/color.cpp
    src/codec/predict.cpp
    src/codec/rans.cpp
    src/codec/bitplane_rans.cpp
    src/codec/bitplane.cpp
    src/codec/learned_ctx.cpp
    src/codec/wavelet.cpp
    src/codec/wavelet_container.cpp
    src/codec/predictor.cpp
    src/codec/acoder.cpp
    src/codec/mixer.cpp
    src/codec/matree.cpp
    src/codec/matree_builder.cpp
    src/codec/squeeze.cpp
    src/codec/cm.cpp
    src/codec/lzp.cpp
    src/codec/tokenize.cpp
    src/codec/staticmodel.cpp
    src/codec/analyze.cpp
    src/codec/container.cpp
    src/codec/transform.cpp
    src/codec/histogram.cpp
    src/codec/hybrid_uint.cpp
    src/codec/ans_static.cpp
    src/codec/multipass.cpp
    src/codec/r1_encoder.cpp
    src/frontend/ppm_raw.cpp
    src/frontend/stb_image_wrapper.cpp
    src/frontend/webp_wrapper.cpp
    src/frontend/tiff_wrapper.cpp
    src/frontend/icc.cpp
    src/frontend/frontend.cpp
    src/prism.cpp
)

target_include_directories(prism_core PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${CMAKE_CURRENT_SOURCE_DIR}/third_party
)

target_compile_options(prism_core PRIVATE -Wall -Wextra -Wpedantic -O2)

if(PRISM_WITH_WEBP)
    find_package(WebP QUIET)
    if(WebP_FOUND)
        target_compile_definitions(prism_core PRIVATE PRISM_WITH_WEBP=1)
        target_link_libraries(prism_core PRIVATE WebP::webp)
    endif()
endif()

if(PRISM_WITH_TIFF)
    find_package(TIFF QUIET)
    if(TIFF_FOUND)
        target_compile_definitions(prism_core PRIVATE PRISM_WITH_TIFF=1)
        target_link_libraries(prism_core PRIVATE TIFF::TIFF)
    endif()
endif()

add_executable(prism src/cli/main.cpp)
target_link_libraries(prism PRIVATE prism_core)
target_compile_options(prism PRIVATE -Wall -Wextra -Wpedantic -O2)

if(PRISM_BUILD_TESTS)
    enable_testing()
    # Try system gtest, else fetch
    find_package(GTest QUIET)
    if(NOT GTest_FOUND)
        include(FetchContent)
        FetchContent_Declare(
            googletest
            URL https://github.com/google/googletest/archive/refs/tags/v1.14.0.zip
        )
        # avoid building gmock
        set(BUILD_GMOCK OFF CACHE BOOL "" FORCE)
        FetchContent_MakeAvailable(googletest)
    endif()

    add_executable(prism_tests
        tests/unit/test_crc32.cpp
        tests/unit/test_bitstream.cpp
        tests/unit/test_color.cpp
        tests/unit/test_predict.cpp
        tests/unit/test_rans.cpp
        tests/unit/test_acoder.cpp
        tests/unit/test_mixer.cpp
        tests/unit/test_matree.cpp
        tests/unit/test_analyze.cpp
        tests/unit/test_squeeze.cpp
        tests/unit/test_xband.cpp
        tests/unit/test_blend.cpp
        tests/unit/test_bias.cpp
        tests/unit/test_tokenize.cpp
        tests/unit/test_staticmodel.cpp
        tests/unit/test_container.cpp
        tests/unit/test_roundtrip.cpp
        tests/unit/test_fuzz_gate.cpp
        tests/unit/test_transform.cpp
        tests/unit/test_histogram.cpp
        tests/unit/test_hybrid_uint.cpp
        tests/unit/test_ans_static.cpp
        tests/unit/test_multipass.cpp
        tests/unit/test_acoder_hybrid.cpp
        tests/unit/test_x0_wavelet.cpp
        tests/unit/test_predictor.cpp
    )
    target_link_libraries(prism_tests PRIVATE prism_core GTest::gtest_main)
    target_compile_options(prism_tests PRIVATE -Wall -Wextra -Wpedantic -O2)
    include(GoogleTest)
    gtest_discover_tests(prism_tests)
endif()

# Benchmark helpers
install(TARGETS prism prism_core
    RUNTIME DESTINATION bin
    ARCHIVE DESTINATION lib
)
