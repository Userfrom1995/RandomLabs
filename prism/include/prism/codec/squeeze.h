#pragma once
#include "prism/types.h"
#include <vector>
#include <cstdint>

namespace prism::codec {

// Squeeze (CDC) - JPEG XL style. For M0, levels=0 (no squeeze) is always valid.
//
// Two transform kinds share the SqueezeResult layout (post-order bands,
// band_class coding), selected by the explicit `lift` argument and, at
// container level, flag bit5 (SQUEEZE_LIFT_FLAG):
//   lift=false  legacy Stage-S decimation (ll = top-left pixel, HF = plain
//               differences). Kept byte-compatible for old streams.
//   lift=true   true CDC lifting (C4, blueprint section 6): one level =
//               horizontal pass d = a - b; s = b + floor(d/2) over column
//               pairs, then the same vertical pass over BOTH channels;
//               recursion on the average quadrant only. The integer lifting
//               is an exact bijection over Z: s-channels stay in the input
//               value range, details stay within +-value_range for BD8, so
//               int16 band storage is safe there. BD16 planes are never
//               squeezed (levels forced to 0) as before.
// Odd dimensions keep the existing edge policy: a level whose width or height
// is odd is not transformed (the chain stops); decode mirrors this exactly.

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

SqueezeResult squeeze_encode_plane(const std::vector<uint16_t>& plane, uint32_t w, uint32_t h,
                                   uint8_t levels, uint8_t bit_depth, bool lift);
std::vector<uint16_t> squeeze_decode_plane(const SqueezeResult& sr, uint32_t orig_w, uint32_t orig_h,
                                           bool lift);

// One-level lifting analysis of `cur` (W x H, both even) into the four
// quadrants (each W/2 x H/2): ll (average, recurse here), hb/vb/db (HF).
// Mirrored exactly by squeeze_merge_level_lift.
void squeeze_lift_level(const std::vector<uint16_t>& cur, uint32_t W, uint32_t H,
                        std::vector<uint16_t>& ll, std::vector<uint16_t>& hb,
                        std::vector<uint16_t>& vb, std::vector<uint16_t>& db);

// Inverse of squeeze_lift_level: merges the LL quadrant with its three HF
// bands into the parent plane (2*w2 x 2*h2). Single shared implementation so
// squeeze_decode_plane and container decode cannot diverge (invariant I2).
void squeeze_merge_level_lift(const std::vector<uint16_t>& ll, const std::vector<uint16_t>& hb,
                              const std::vector<uint16_t>& vb, const std::vector<uint16_t>& db,
                              uint32_t w2, uint32_t h2, std::vector<uint16_t>& parent);

// Per-level LL chain used by context sources (llc features): returns up to L
// planes, entry i = LL after level i. With lift=false this is the legacy
// top-left pixel copy; with lift=true it is the lifting average chain.
std::vector<std::vector<uint16_t>> squeeze_ll_chain(const std::vector<uint16_t>& plane,
                                                    uint32_t w, uint32_t h, uint8_t L, bool lift);

// Helpers
uint8_t max_squeeze_levels(uint32_t w, uint32_t h);
inline uint32_t squeeze_band_count(uint8_t levels) { return 1 + 3u * levels; }

} // namespace prism::codec
