#pragma once
#include "prism/types.h"
#include <filesystem>
#include <vector>

namespace prism::frontend {

Raster decode_ppm(const std::filesystem::path& p);
Raster decode_ppm_mem(const uint8_t* data, size_t len);
bool is_ppm_path(const std::filesystem::path& p);

// Raw: caller supplies w,h,channels,bd
Raster decode_raw(const std::vector<uint8_t>& bytes, uint32_t w, uint32_t h, uint8_t channels, uint8_t bd);

} // namespace prism::frontend
