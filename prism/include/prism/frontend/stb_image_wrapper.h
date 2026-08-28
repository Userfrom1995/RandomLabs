#pragma once
#include "prism/types.h"
#include <filesystem>
namespace prism::frontend {
Raster decode_stb(const std::filesystem::path& p);
Raster decode_stb_mem(const uint8_t* data, size_t len, const std::string& hint_ext);
} // namespace prism::frontend
