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
