#pragma once
#include <cstdint>
#include <cstddef>
#include <vector>

namespace prism {

uint32_t crc32(const uint8_t* data, size_t len);
uint32_t crc32(const std::vector<uint8_t>& data);
uint32_t crc32_combine(uint32_t crc, const uint8_t* data, size_t len);

} // namespace prism
