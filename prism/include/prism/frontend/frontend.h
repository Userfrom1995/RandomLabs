#pragma once
#include "prism/types.h"
#include <filesystem>

namespace prism::frontend {

struct DecodeOpts {
    bool apply_icc = true;
};

Raster decode_to_raster(const std::filesystem::path& in, const DecodeOpts& opts = {});

// Encode Raster to image files
void write_ppm(const std::filesystem::path& out, const Raster& r);
void write_ppm_to_vec(std::vector<uint8_t>& out, const Raster& r);

} // namespace prism::frontend
