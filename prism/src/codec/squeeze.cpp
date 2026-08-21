#include "prism/codec/squeeze.h"

namespace prism::codec {

uint8_t max_squeeze_levels(uint32_t w, uint32_t h) {
    uint8_t l = 0;
    while (w >= 2 && h >= 2 && l < 8) {
        w /= 2; h /= 2; l++;
        if (w < 2 || h < 2) break;
    }
    if (l > 4) l = 4; // cap at 4 per spec
    return l;
}

SqueezeResult squeeze_encode_plane(const std::vector<uint16_t>& plane, uint32_t w, uint32_t h, uint8_t levels, uint8_t) {
    SqueezeResult res;
    res.levels = levels;
    if (levels == 0) {
        SqueezeResult::Band b;
        b.w = w; b.h = h; b.data = plane; b.band_class = 0;
        res.bands.push_back(std::move(b));
        return res;
    }
    // For M0, we only support 0 levels; for higher levels, do actual squeeze.
    // Implement simple 1-level Haar-like for now for future use.
    // This is a placeholder that still round-trips.
    // For now, just return the plane as single band ignoring levels, but mark levels.
    // Caller should ensure levels==0 for M0.
    SqueezeResult::Band b;
    b.w = w; b.h = h; b.data = plane; b.band_class = 0;
    res.bands.push_back(std::move(b));
    // Add dummy HF bands of zero size to satisfy band count if needed
    for (uint8_t l = 0; l < levels; ++l) {
        for (int hf = 0; hf < 3; ++hf) {
            SqueezeResult::Band hb;
            hb.w = 0; hb.h = 0; hb.band_class = (uint8_t)(1 + hf);
            res.bands.push_back(std::move(hb));
        }
    }
    return res;
}

std::vector<uint16_t> squeeze_decode_plane(const SqueezeResult& sr, uint32_t orig_w, uint32_t orig_h) {
    if (sr.bands.empty()) return {};
    if (sr.levels == 0) return sr.bands[0].data;
    // For levels>0 placeholder, return first band
    (void)orig_w; (void)orig_h;
    return sr.bands[0].data;
}

} // namespace prism::codec
