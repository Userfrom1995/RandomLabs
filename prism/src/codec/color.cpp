#include "prism/codec/color.h"
#include "prism/codec/predict.h"
#include <algorithm>
#include <stdexcept>

namespace prism::codec {

namespace {
int bd_mask(BitDepth bd) { return (bd == BitDepth::BD8) ? 0xFF : 0xFFFF; }
int bd_bias(BitDepth bd) {
    // 8-bit: Co in [-255,255], Cg in [-382,382] -> bias 512 keeps both in
    // unsigned u16 and never wraps. 16-bit (limited range, the supported M0
    // case): bias 32768 keeps the biased intermediates in u16. Full-range
    // 16-bit (Co up to +/-65535, Cg up to +/-98301) requires widened storage
    // and is deferred to M2 (see architecture.md); M0 never selects YCoCg-R
    // for BD16.
    return (bd == BitDepth::BD8) ? 512 : 32768;
}

Raster subtract_green(const Raster& r) {
    Raster out = r;
    int mask = bd_mask(r.bd);
    size_t n = r.num_pixels();
    for (size_t i = 0; i < n; ++i) {
        int g0 = (int)out.planes[1][i];
        int r0 = (int)out.planes[0][i] - g0;
        int b0 = (int)out.planes[2][i] - g0;
        out.planes[0][i] = (uint16_t)(r0 & mask);
        out.planes[2][i] = (uint16_t)(b0 & mask);
    }
    return out;
}

Raster add_green(const Raster& r) {
    Raster out = r;
    int mask = bd_mask(r.bd);
    size_t n = r.num_pixels();
    for (size_t i = 0; i < n; ++i) {
        int g0 = (int)out.planes[1][i];
        int r0 = (int)out.planes[0][i] + g0;
        int b0 = (int)out.planes[2][i] + g0;
        out.planes[0][i] = (uint16_t)(r0 & mask);
        out.planes[2][i] = (uint16_t)(b0 & mask);
    }
    return out;
}
} // namespace

Raster apply_color(const Raster& r, ColorTransform t, const std::vector<uint8_t>&) {
    if (t == ColorTransform::None) return r;
    if (r.num_channels() < 3) return r; // only for RGB/RGBA
    if (t == ColorTransform::SubtractGreen) return subtract_green(r);

    if (t == ColorTransform::YCoCgR || t == ColorTransform::YCoCgR_SubGreen) {
        // Reversible YCoCg-R. Operate on signed integers; bias the signed
        // chroma into unsigned u16 so the round-trip is exact (no sign
        // extension, no colliding wrap). The forward/inverse pair below is the
        // mathematically reversible transform, not the lossy float version.
        Raster base = r;
        if (t == ColorTransform::YCoCgR_SubGreen) base = subtract_green(r);
        Raster out = r;
        int mask = bd_mask(r.bd);
        int bias = bd_bias(r.bd);
        size_t n = r.num_pixels();
        for (size_t i = 0; i < n; ++i) {
            int R = (int)base.planes[0][i];
            int G = (int)base.planes[1][i];
            int B = (int)base.planes[2][i];
            int Co = R - B;
            int t_ = B + (Co >> 1);
            int Cg = G - t_;
            int Y  = t_ + (Cg >> 1);
            out.planes[0][i] = (uint16_t)(Y & mask);
            out.planes[1][i] = (uint16_t)(Cg + bias);
            out.planes[2][i] = (uint16_t)(Co + bias);
        }
        return out;
    }
    // CFL and others are identity for M0 (added in M2/M3).
    return r;
}

Raster invert_color(const Raster& r, ColorTransform t, const std::vector<uint8_t>&) {
    if (t == ColorTransform::None) return r;
    if (r.num_channels() < 3) return r;
    if (t == ColorTransform::SubtractGreen) return add_green(r);

    if (t == ColorTransform::YCoCgR || t == ColorTransform::YCoCgR_SubGreen) {
        Raster out = r;
        int mask = bd_mask(r.bd);
        int bias = bd_bias(r.bd);
        size_t n = r.num_pixels();
        for (size_t i = 0; i < n; ++i) {
            int Y  = (int)r.planes[0][i];
            int Cg = (int)r.planes[1][i] - bias;
            int Co = (int)r.planes[2][i] - bias;
            int t_ = Y - (Cg >> 1);
            int G  = Cg + t_;
            int B  = t_ - (Co >> 1);
            int R  = B + Co;
            out.planes[0][i] = (uint16_t)(R & mask);
            out.planes[1][i] = (uint16_t)(G & mask);
            out.planes[2][i] = (uint16_t)(B & mask);
        }
        if (t == ColorTransform::YCoCgR_SubGreen) out = add_green(out);
        return out;
    }
    return r;
}

ColorChoice choose_color_transform(const Raster& r) {
    // M0 heuristic: for RGB, try None vs YCoCgR, pick lower sum of absolute MED residuals.
    // For non-RGB, None. Full-range 16-bit YCoCg-R needs widened storage (M2),
    // so for BD16 we stay on None to avoid silent corruption.
    ColorChoice cc;
    if (r.num_channels() < 3) return cc;
    if (r.bd == BitDepth::BD16) { cc.id = ColorTransform::None; return cc; }
    auto cost_of = [&](ColorTransform t) -> uint64_t {
        Raster tr = apply_color(r, t);
        uint64_t sum = 0;
        for (size_t c = 0; c < tr.num_channels(); ++c) {
            if (tr.ch == Channels::RGBA && c == 3) continue;
            const auto& pl = tr.planes[c];
            uint32_t w = tr.w, h = tr.h;
            for (uint32_t y = 0; y < h; ++y) {
                for (uint32_t x = 0; x < w; ++x) {
                    size_t idx = (size_t)y * w + x;
                    int L = (x > 0) ? (int)pl[idx - 1] : 0;
                    int T = (y > 0) ? (int)pl[idx - w] : 0;
                    int TL = (x > 0 && y > 0) ? (int)pl[idx - w - 1] : 0;
                    int pred = med_predictor(L, T, TL);
                    int e = (int)pl[idx] - pred;
                    sum += (uint64_t)(e < 0 ? -e : e);
                }
            }
        }
        return sum;
    };
    uint64_t c_none = cost_of(ColorTransform::None);
    uint64_t c_ycocg = cost_of(ColorTransform::YCoCgR);
    cc.id = (c_ycocg < c_none) ? ColorTransform::YCoCgR : ColorTransform::None;
    return cc;
}

} // namespace prism::codec
