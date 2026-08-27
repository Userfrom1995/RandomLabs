#pragma once
#include "prism/types.h"
#include <vector>
#include <cstdint>
#include <filesystem>

#define PRISM_VERSION_MAJOR 0
#define PRISM_VERSION_MINOR 1
#define PRISM_VERSION_PATCH 0
#define PRISM_VERSION "0.1.0"
#define PRISM_MAGIC "PRSM"

namespace prism {

static constexpr uint8_t PRISM_CONTAINER_VERSION = 1;

// Effort 0..7
struct EncodeOpts {
    uint8_t effort = 0; // 0..7
    bool use_ycocg = true; // if true, consider YCoCg-R transform
    // C4 probe hook: when non-empty, overrides the analyzer's per-plane
    // squeeze levels (size must equal the channel count; each level is
    // clamped to max_squeeze_levels). Deterministic A-B for benchmarks/tests;
    // production keeps it empty so trials decide.
    std::vector<uint8_t> force_squeeze_levels;
    // C5 probe hook: when non-empty (size must equal 3 * channel count),
    // overrides the analyzer's cross-band weight selection with these exact
    // H/V/D triples (1/16 units) for every plane that squeezes. All zeros
    // reproduce plain lifting streams bit-for-bit. Production keeps it empty
    // so trials decide.
    std::vector<int8_t> force_xband_weights;
    // D4c probe hook: when set, overrides the analyzer's color-transform
    // trial with this exact ColorTransform id. Deterministic A-B for
    // benchmarks/tests; production keeps it clear so trials decide.
    bool force_color = false;
    uint8_t forced_color_id = 0;
    // Route 3: when true, use multi-pass ANS coding instead of single-pass
    // adaptive coder. Container carries MULTIPASS_FLAG and a separate
    // r3_model blob (MA-tree + histograms + cluster IDs).
    bool use_r3 = false;
    // Route 3: number of MA-tree clusters (K). Only used when use_r3=true.
    // Default 32 matches addendum 22 pinned constant.
    uint16_t r3_num_clusters = 32;
};

// Encode a Raster to Prism container bytes. Throws EncodeError.
std::vector<uint8_t> encode(const Raster& raster, const EncodeOpts& opts = {});

// Decode Prism container bytes to Raster. Throws DecodeError.
Raster decode(const std::vector<uint8_t>& data);
Raster decode(const uint8_t* data, size_t len);

// File helpers
std::vector<uint8_t> encode_file(const std::filesystem::path& in_path, const EncodeOpts& opts);
Raster decode_file(const std::filesystem::path& in_path);
void write_file(const std::filesystem::path& p, const std::vector<uint8_t>& data);
std::vector<uint8_t> read_file(const std::filesystem::path& p);

} // namespace prism
