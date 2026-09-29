#pragma once
#include "prism/types.h"
#include <filesystem>
namespace prism::frontend {
Raster decode_webp(const std::filesystem::path& p);
Raster decode_webp_mem(const uint8_t* data, size_t len);
}
