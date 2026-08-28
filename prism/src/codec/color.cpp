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

// --- CFL helpers (B6) ---
static Raster apply_cfl(const Raster& r, const std::vector<uint8_t>& scales) {
    if (r.num_channels() < 2) return r;
    if (scales.empty()) return r;
    Raster out = r;
    // Widened CFL mask: if the raster came from YCoCg-R (BD8, chroma in 257..767),
    // wrapping mod 256 would truncate the 9th bit. Use full u16 mask for YCoCg
    // derived planes. Detect by any chroma >255 when BD8.
    bool widened = false;
    if (r.bd == BitDepth::BD8 && r.num_channels() >= 3) {
        for (size_t c = 1; c < r.num_channels(); ++c) {
            if (r.ch == Channels::RGBA && c == 3) continue;
            for (uint16_t v : r.planes[c]) if (v > 255) { widened = true; break; }
            if (widened) break;
        }
    }
    int mask = widened ? 0xFFFF : bd_mask(r.bd);
    size_t n = r.num_pixels();
    // luma = plane 0 (Y after YCoCg-R, otherwise G/R). Use plane 0.
    for (size_t c = 1; c < out.num_channels(); ++c) {
        // alpha never transformed
        if (r.ch == Channels::RGBA && c == 3) continue;
        if (r.ch == Channels::GA && c == 1) continue; // GA alpha is channel 1?
        size_t si = c - 1;
        if (si >= scales.size()) continue;
        uint8_t s = scales[si] & 7;
        if (s == 0) continue;
        for (size_t i = 0; i < n; ++i) {
            int L = (int)r.planes[0][i]; // use original luma before chroma mod (same for all c)
            // But after first chroma mod, luma unchanged, so using out.planes[0][i] == r.planes[0][i]
            int C = (int)out.planes[c][i];
            int pred = (s * L + 4) >> 3; // round(s*L/8)
            int Cp = (C - pred) & mask;
            out.planes[c][i] = (uint16_t)Cp;
        }
    }
    return out;
}
static Raster invert_cfl(const Raster& r, const std::vector<uint8_t>& scales) {
    if (r.num_channels() < 2) return r;
    if (scales.empty()) return r;
    Raster out = r;
    bool widened = false;
    if (r.bd == BitDepth::BD8 && r.num_channels() >= 3) {
        for (size_t c = 1; c < r.num_channels(); ++c) {
            if (r.ch == Channels::RGBA && c == 3) continue;
            for (uint16_t v : r.planes[c]) if (v > 255) { widened = true; break; }
            if (widened) break;
        }
        // Also need to detect widened after CFL: values may have wrapped into >255 as well
        // Use same mask as forward: check if original forwarded widened, but after CFL values stay wide.
        // For invert, the input is Cp which after CFL with wide mask stays in 0..65535 wide.
        // Detect wide by any value >255 as well.
    }
    int mask = widened ? 0xFFFF : bd_mask(r.bd);
    size_t n = r.num_pixels();
    for (size_t c = 1; c < out.num_channels(); ++c) {
        if (r.ch == Channels::RGBA && c == 3) continue;
        if (r.ch == Channels::GA && c == 1) continue;
        size_t si = c - 1;
        if (si >= scales.size()) continue;
        uint8_t s = scales[si] & 7;
        if (s == 0) continue;
        for (size_t i = 0; i < n; ++i) {
            int L = (int)out.planes[0][i]; // luma already reconstructed before chroma invert
            int Cp = (int)out.planes[c][i];
            int pred = (s * L + 4) >> 3;
            int C = (Cp + pred) & mask;
            out.planes[c][i] = (uint16_t)C;
        }
    }
    return out;
}

} // anonymous namespace

// --- 5/3 lifting (B6) ---
std::vector<uint16_t> lift53_forward_plane(const std::vector<uint16_t>& plane,
                                           uint32_t w, uint32_t h, uint16_t bd_max) {
    if (plane.empty() || w < 2 || h < 2) return plane;
    if (bd_max == 65535) return plane; // widening gate: avoid 16->18 bit overflow for BD16
    std::vector<int32_t> tmp(plane.size());
    for (size_t i = 0; i < plane.size(); ++i) tmp[i] = (int32_t)plane[i];
    // Horizontal predict/update per row
    for (uint32_t y = 0; y < h; ++y) {
        // Predict: odd = odd - floor((even_left+even_right)/2)
        for (uint32_t x = 1; x < w; x += 2) {
            size_t idx = (size_t)y*w + x;
            int left = tmp[idx-1];
            int right = (x+1 < w) ? tmp[idx+1] : tmp[idx-1];
            tmp[idx] -= (left + right) >> 1;
        }
        // Update: even = even + floor((odd_left+odd_right+2)/4)
        for (uint32_t x = 0; x < w; x += 2) {
            size_t idx = (size_t)y*w + x;
            int oddL = (x > 0) ? tmp[idx-1] : tmp[idx+1];
            int oddR = (x+1 < w) ? tmp[idx+1] : tmp[idx-1];
            // Handle edge where no odd exists? Keep simple.
            if (w == 1) continue;
            if (x == 0) {
                // only right odd
                tmp[idx] += (oddR + 2) >> 2;
            } else if (x+1 >= w) {
                // only left odd (last even when w even)
                tmp[idx] += (oddL + 2) >> 2;
            } else {
                tmp[idx] += (oddL + oddR + 2) >> 2;
            }
        }
    }
    // Vertical predict/update per column
    for (uint32_t x = 0; x < w; ++x) {
        for (uint32_t y = 1; y < h; y += 2) {
            size_t idx = (size_t)y*w + x;
            int top = tmp[idx - w];
            int bottom = (y+1 < h) ? tmp[idx + w] : tmp[idx - w];
            tmp[idx] -= (top + bottom) >> 1;
        }
        for (uint32_t y = 0; y < h; y += 2) {
            size_t idx = (size_t)y*w + x;
            int oddT = (y > 0) ? tmp[idx - w] : tmp[idx + w];
            int oddB = (y+1 < h) ? tmp[idx + w] : tmp[idx - w];
            if (h == 1) continue;
            if (y == 0) tmp[idx] += (oddB + 2) >> 2;
            else if (y+1 >= h) tmp[idx] += (oddT + 2) >> 2;
            else tmp[idx] += (oddT + oddB + 2) >> 2;
        }
    }
    std::vector<uint16_t> out(plane.size());
    for (size_t i = 0; i < tmp.size(); ++i) {
        int32_t v = tmp[i];
        // Keep within bit-depth via modular wrap then clamp to bd_max range through offset?
        // For reversibility we store mod 2^B, so wrap.
        int mod = bd_max + 1;
        if (bd_max == 65535) mod = 65536;
        // Use modular reduction to u16 range then reinterpret? Keep true integer for now clamped?
        // To keep lossless, we need to store the integer difference which may be outside [0,bd_max].
        // But spec says widen to B+1/B+2 bits - we keep via bias/mask? Simpler: store as (v & mask) mod.
        // However for invert we need signed value. So we store as uint16 via two's complement wrap:
        // encode: plane value 0..bd_max map to signed offset then lift => may go negative.
        // We'll store as (v & mask) but decode must recover signed correctly via wrapping.
        // Use mask to wrap, but invert will unwrap by interpreting as signed 16? Let's store directly
        // as uint16 after offset bias 32768 for 8-bit? Alternative: store raw i32 -> u16 wrap with mask.
        // For 8-bit, mask 0xFF may cause collision for values outside range.
        // To avoid loss, use larger mask: we need B+2 bits intermediate, so use 9-bit for 8-bit input
        // could exceed 0-255. But container plane is still u16; we can store up to 65535, so wrap is safe
        // if we store full widened value mod 65536 and invert recovers via same mod.
        // So we just store low 16 bits.
        out[i] = (uint16_t)(v & 0xFFFF);
        // For 8-bit inputs, the value after lifting may be in [-128,383] etc still within 0..65535 after wrap.
        // Decoder will reconstruct same int32 by interpreting stored u16 as signed 16? But we need original modulo.
        // Instead we store shifted: bias 32768 approach. Simpler: store v+32768 bias then mask for invert to subtract bias.
        // But to keep round-trip exact for all intra, we instead store v as signed but wrap via (v & mask) for bd depth.
        // For BD8, mask 255 would discard high bits and lose data. So we must NOT mask to 255 for lifting.
        // Lift53 therefore widens storage to 16 bits regardless of bit depth, like Squeeze B+2.
        // So we store full 16-bit value (no bd mask) - it will fit because lifting adds at most ~1 bit.
        // Use 0xFFFF mask.
        (void)bd_max;
    }
    return out;
}
std::vector<uint16_t> lift53_inverse_plane(const std::vector<uint16_t>& data,
                                           uint32_t w, uint32_t h, uint16_t bd_max) {
    if (data.empty() || w < 2 || h < 2) return data;
    if (bd_max == 65535) return data;
    // Reconstruct signed ints: data was stored as (v & 0xFFFF) signed 16
    std::vector<int32_t> tmp(data.size());
    for (size_t i = 0; i < data.size(); ++i) {
        int16_t s = (int16_t)data[i];
        tmp[i] = (int32_t)s;
        // For values that were originally e.g., 300, stored as 300 -> s=300 correct.
        // For negative -10 stored as 65526 -> s=-10 correct.
        // So conversion via int16 recovers.
    }
    // Inverse vertical: undo update then predict
    for (uint32_t x = 0; x < w; ++x) {
        for (uint32_t y = 0; y < h; y += 2) {
            size_t idx = (size_t)y*w + x;
            int oddT = (y > 0) ? tmp[idx - w] : tmp[idx + w];
            int oddB = (y+1 < h) ? tmp[idx + w] : tmp[idx - w];
            if (h == 1) continue;
            if (y == 0) tmp[idx] -= (oddB + 2) >> 2;
            else if (y+1 >= h) tmp[idx] -= (oddT + 2) >> 2;
            else tmp[idx] -= (oddT + oddB + 2) >> 2;
        }
        for (uint32_t y = 1; y < h; y += 2) {
            size_t idx = (size_t)y*w + x;
            int top = tmp[idx - w];
            int bottom = (y+1 < h) ? tmp[idx + w] : tmp[idx - w];
            tmp[idx] += (top + bottom) >> 1;
        }
    }
    for (uint32_t y = 0; y < h; ++y) {
        for (uint32_t x = 0; x < w; x += 2) {
            size_t idx = (size_t)y*w + x;
            int oddL = (x > 0) ? tmp[idx-1] : tmp[idx+1];
            int oddR = (x+1 < w) ? tmp[idx+1] : tmp[idx-1];
            if (w == 1) continue;
            if (x == 0) tmp[idx] -= (oddR + 2) >> 2;
            else if (x+1 >= w) tmp[idx] -= (oddL + 2) >> 2;
            else tmp[idx] -= (oddL + oddR + 2) >> 2;
        }
        for (uint32_t x = 1; x < w; x += 2) {
            size_t idx = (size_t)y*w + x;
            int left = tmp[idx-1];
            int right = (x+1 < w) ? tmp[idx+1] : tmp[idx-1];
            tmp[idx] += (left + right) >> 1;
        }
    }
    std::vector<uint16_t> out(data.size());
    for (size_t i = 0; i < tmp.size(); ++i) {
        int32_t v = tmp[i];
        if (v < 0) v = 0;
        if (v > 65535) v = 65535; // clamp for safety, but ideally keep exact
        out[i] = (uint16_t)v;
    }
    return out;
}

Raster apply_color(const Raster& r, ColorTransform t, const std::vector<uint8_t>& cfl_scales) {
    Raster out;
    // D4c rotations: dispatch to the shared family implementation. They never
    // compose with CFL (same policy as the YCoCg family; the offline A-B that
    // earned adoption measured base transforms alone).
    if (is_color_rotation(t)) {
        static const int kRotToId[] = {
            colorrot::kLocoId,                    // ROT_LOCO
            1 /* rct-grb */, 2 /* rct-gbr */,
            4 /* rct-brg */, 3 /* rct-rbg */
        };
        return colorrot::apply(r, kRotToId[(int)t - (int)ColorTransform::ROT_LOCO]);
    }
    // Step 1: base color transform
    if (t == ColorTransform::Lift53) {
        // 5/3 lifting as alternative single-level decorrelator (B6)
        // Applied per-plane after any color handling (here as the color stage itself)
        out = r;
        uint16_t bd_max = (r.bd == BitDepth::BD8) ? 255 : 65535;
        for (size_t c = 0; c < out.num_channels(); ++c) {
            if (r.ch == Channels::RGBA && c == 3) continue; // leave alpha untouched
            out.planes[c] = lift53_forward_plane(r.planes[c], r.w, r.h, bd_max);
        }
    } else if (t == ColorTransform::None) {
        out = r;
    } else if (r.num_channels() < 3) {
        out = r;
    } else if (t == ColorTransform::SubtractGreen) {
        out = subtract_green(r);
    } else if (t == ColorTransform::YCoCgR || t == ColorTransform::YCoCgR_SubGreen) {
        Raster base = r;
        if (t == ColorTransform::YCoCgR_SubGreen) base = subtract_green(r);
        out = r;
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
    } else {
        out = r;
    }
    // Step 2: CFL on top (B6) if scales indicate non-zero and not Lift53 or
    // a D4c rotation (rotations never compose with CFL)
    if (t != ColorTransform::Lift53 && !is_color_rotation(t) && !cfl_scales.empty()) {
        bool any = false;
        for (auto s : cfl_scales) if (s & 7) { any = true; break; }
        if (any) out = apply_cfl(out, cfl_scales);
    }
    return out;
}

Raster invert_color(const Raster& r, ColorTransform t, const std::vector<uint8_t>& cfl_scales) {
    Raster out = r;
    // Invert CFL first (it was applied after base)
    if (t != ColorTransform::Lift53 && !is_color_rotation(t) && !cfl_scales.empty()) {
        bool any = false;
        for (auto s : cfl_scales) if (s & 7) { any = true; break; }
        if (any) out = invert_cfl(out, cfl_scales);
    }
    // D4c rotations: dispatch to the shared family implementation.
    if (is_color_rotation(t)) {
        static const int kRotToId[] = {
            colorrot::kLocoId,                    // ROT_LOCO
            1 /* rct-grb */, 2 /* rct-gbr */,
            4 /* rct-brg */, 3 /* rct-rbg */
        };
        return colorrot::invert(out, kRotToId[(int)t - (int)ColorTransform::ROT_LOCO]);
    }
    // Invert base
    if (t == ColorTransform::Lift53) {
        Raster tmp = out;
        uint16_t bd_max = (out.bd == BitDepth::BD8) ? 255 : 65535;
        for (size_t c = 0; c < out.num_channels(); ++c) {
            if (out.ch == Channels::RGBA && c == 3) continue;
            tmp.planes[c] = lift53_inverse_plane(out.planes[c], out.w, out.h, bd_max);
        }
        return tmp;
    }
    if (t == ColorTransform::None) return out;
    if (out.num_channels() < 3) return out;
    if (t == ColorTransform::SubtractGreen) return add_green(out);

    if (t == ColorTransform::YCoCgR || t == ColorTransform::YCoCgR_SubGreen) {
        Raster dec = out;
        int mask = bd_mask(out.bd);
        int bias = bd_bias(out.bd);
        size_t n = out.num_pixels();
        for (size_t i = 0; i < n; ++i) {
            int Y  = (int)out.planes[0][i];
            int Cg = (int)out.planes[1][i] - bias;
            int Co = (int)out.planes[2][i] - bias;
            int t_ = Y - (Cg >> 1);
            int G  = Cg + t_;
            int B  = t_ - (Co >> 1);
            int R  = B + Co;
            dec.planes[0][i] = (uint16_t)(R & mask);
            dec.planes[1][i] = (uint16_t)(G & mask);
            dec.planes[2][i] = (uint16_t)(B & mask);
        }
        if (t == ColorTransform::YCoCgR_SubGreen) dec = add_green(dec);
        return dec;
    }
    return out;
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

// --- D4c reversible rotation family (spec section 13) ---

namespace colorrot {
namespace {

struct RoleTriple { int a, b, c; }; // input channel indices in raster plane order

constexpr RoleTriple kRoles[kCount] = {
    {0, 1, 2}, // 0 ycocgr  (R, G, B)
    {1, 0, 2}, // 1 rct-grb (G, R, B)
    {1, 2, 0}, // 2 rct-gbr (G, B, R)
    {0, 2, 1}, // 3 rct-rbg (R, B, G)
    {2, 0, 1}, // 4 rct-brg (B, R, G)
    {2, 1, 0}, // 5 rct-bgr (B, G, R)
    {0, 0, 0}, // 6 loco    (special-cased, unused)
};

constexpr const char* kNames[kCount] = {
    "ycocgr", "rct-grb", "rct-gbr", "rct-rbg", "rct-brg", "rct-bgr", "loco",
};

void check_input(const Raster& r) {
    if (r.bd != BitDepth::BD8 || r.num_channels() < 3)
        throw std::invalid_argument("colorrot: BD8 RGB rasters only");
}

} // anonymous namespace

const char* name(int id) {
    if (id < 0 || id >= kCount)
        throw std::out_of_range("colorrot: bad candidate id");
    return kNames[id];
}

int id_of(const std::string& n) {
    for (int i = 0; i < kCount; ++i)
        if (n == kNames[i]) return i;
    return -1;
}

Raster apply(const Raster& r, int id) {
    check_input(r);
    Raster out = r;
    const size_t n = r.num_pixels();
    constexpr int kBias = 512;
    if (id == kLocoId) {
        for (size_t i = 0; i < n; ++i) {
            int R = (int)r.planes[0][i];
            int G = (int)r.planes[1][i];
            int B = (int)r.planes[2][i];
            out.planes[0][i] = (uint16_t)G;
            out.planes[1][i] = (uint16_t)((R - G) + kBias);
            out.planes[2][i] = (uint16_t)((B - ((R + G) >> 1)) + kBias);
        }
        return out;
    }
    if (id < 0 || id >= kCount)
        throw std::out_of_range("colorrot: bad candidate id");
    const RoleTriple& rt = kRoles[id];
    for (size_t i = 0; i < n; ++i) {
        int a = (int)r.planes[rt.a][i];
        int b = (int)r.planes[rt.b][i];
        int c = (int)r.planes[rt.c][i];
        int Co = a - c;
        int t = c + (Co >> 1);
        int Cg = b - t;
        int Y = t + (Cg >> 1);
        out.planes[0][i] = (uint16_t)Y;
        out.planes[1][i] = (uint16_t)(Cg + kBias);
        out.planes[2][i] = (uint16_t)(Co + kBias);
    }
    return out;
}

Raster invert(const Raster& r, int id) {
    check_input(r);
    Raster out = r;
    const size_t n = r.num_pixels();
    constexpr int kBias = 512;
    if (id == kLocoId) {
        for (size_t i = 0; i < n; ++i) {
            int G = (int)r.planes[0][i];
            int U = (int)r.planes[1][i] - kBias;
            int V = (int)r.planes[2][i] - kBias;
            int R = G + U;
            int B = V + ((R + G) >> 1);
            out.planes[0][i] = (uint16_t)R;
            out.planes[1][i] = (uint16_t)G;
            out.planes[2][i] = (uint16_t)B;
        }
        return out;
    }
    if (id < 0 || id >= kCount)
        throw std::out_of_range("colorrot: bad candidate id");
    const RoleTriple& rt = kRoles[id];
    for (size_t i = 0; i < n; ++i) {
        int Y = (int)r.planes[0][i];
        int Cg = (int)r.planes[1][i] - kBias;
        int Co = (int)r.planes[2][i] - kBias;
        int t = Y - (Cg >> 1);
        int b = Cg + t;
        int c = t - (Co >> 1);
        int a = c + Co;
        out.planes[rt.a][i] = (uint16_t)a;
        out.planes[rt.b][i] = (uint16_t)b;
        out.planes[rt.c][i] = (uint16_t)c;
    }
    return out;
}

} // namespace colorrot

} // namespace prism::codec
