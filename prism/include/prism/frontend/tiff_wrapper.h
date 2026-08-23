#pragma once
#include "prism/types.h"
#include <filesystem>
namespace prism::frontend {
Raster decode_tiff(const std::filesystem::path& p);
Raster decode_tiff_mem(const uint8_t* data, size_t len);
}
