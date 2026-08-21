#pragma once
#include "prism/types.h"
#include <vector>

namespace prism::codec {

// Squeeze (CDC) - JPEG XL style. For M0, levels=0 (no squeeze) is always valid.
// Full implementation lands in B7 (M3).

struct SqueezeResult {
    // sub-bands in post-order: [LL_deepest, HF...]  total 1+3*L per plane
    struct Band {
        uint32_t w = 0, h = 0;
        std::vector<uint16_t> data; // row-major w*h
        uint8_t band_class = 0; // 0=LL,1=H,2=V,3=D plus level in high bits
    };
    std::vector<Band> bands; // post-order
    uint8_t levels = 0;
};

SqueezeResult squeeze_encode_plane(const std::vector<uint16_t>& plane, uint32_t w, uint32_t h, uint8_t levels, uint8_t bit_depth);
std::vector<uint16_t> squeeze_decode_plane(const SqueezeResult& sr, uint32_t orig_w, uint32_t orig_h);

// Helpers
uint8_t max_squeeze_levels(uint32_t w, uint32_t h);
uint32_t squeeze_band_count(uint8_t levels) { return 1 + 3u * levels; }

} // namespace prism::codec
