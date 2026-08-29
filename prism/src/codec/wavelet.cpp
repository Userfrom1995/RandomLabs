// Prism Route 4 wavelet lift (reversible integer-to-integer).
//
// Three exactly-reversible filters: Haar, Le Gall 5/3 (primary), and a
// reversible 9/7 (4 lifting steps, no final normalization scaling so the
// transform stays integer-exact). Invariant I26: lift_inv(lift(x)) == x for
// every integer input in the coded range. The v1 production path is untouched;
// this module lives entirely behind the WAVELET_FLAG (bit7) dispatch.

#include "prism/codec/wavelet.h"
#include <algorithm>
#include <cstdlib>
#include <random>
#include <cmath>

namespace prism::codec {

// Symmetric (mirror) neighbour helpers for 1D split into even/odd arrays.

// Rounding multiply for 9/7 fixed-point coefficients (scale 2^16).
inline int32_t round_mul(int32_t fp, int32_t s) {
    int64_t p = (int64_t)fp * (int64_t)s;
    if (p >= 0) return (int32_t)((p + (1 << 15)) >> 16);
    return (int32_t)((p - (1 << 15)) >> 16);
}

// floor-div-by-2 that is identical on encode and decode (truncation toward 0).
inline int32_t div2(int32_t a) { return a >> 1; }

void forward_haar(const std::vector<int32_t>& even, const std::vector<int32_t>& odd,
                  std::vector<int32_t>& out_even, std::vector<int32_t>& out_odd) {
    size_t en = even.size(), on = odd.size();
    out_even.resize(en);
    out_odd.resize(on);
    for (size_t k = 0; k < on; ++k) {
        int32_t a = even[k];
        int32_t b = odd[k];
        int32_t H = b - a;
        int32_t L = a + div2(H);
        out_even[k] = L;
        out_odd[k] = H;
    }
    // Unpaired trailing even sample (odd length) passes through unchanged.
    if (even.size() > on) out_even[on] = even[on];
}

void inverse_haar(const std::vector<int32_t>& even, const std::vector<int32_t>& odd,
                  std::vector<int32_t>& out) {
    size_t on = odd.size();
    out.resize(even.size() + on);
    for (size_t k = 0; k < on; ++k) {
        int32_t H = odd[k];
        int32_t a = even[k] - div2(H);
        int32_t b = a + H;
        out[2 * k] = a;
        out[2 * k + 1] = b;
    }
    if (even.size() > on) out[2 * on] = even[on];
}

void forward_53(const std::vector<int32_t>& even, const std::vector<int32_t>& odd,
                std::vector<int32_t>& out_even, std::vector<int32_t>& out_odd) {
    size_t en = even.size(), on = odd.size();
    out_even.resize(en);
    out_odd.resize(on);
    // Predict on odd.
    for (size_t k = 0; k < on; ++k) {
        int32_t lv = even[k];
        int32_t rv = (k + 1 < en) ? even[k + 1] : even[k];
        out_odd[k] = odd[k] - div2(lv + rv);
    }
    // Update on even (uses the freshly predicted detail coefficients).
    for (size_t k = 0; k < en; ++k) {
        int32_t lo = (k > 0) ? (on ? out_odd[k - 1] : 0) : (on ? out_odd[0] : 0);
        int32_t ro = (k < on) ? out_odd[k] : (on ? out_odd[on - 1] : 0);
        out_even[k] = even[k] + div2(lo + ro);
    }
}

void inverse_53(const std::vector<int32_t>& even, const std::vector<int32_t>& odd,
                std::vector<int32_t>& out) {
    size_t en = even.size(), on = odd.size();
    out.resize(en + on);
    std::vector<int32_t> e = even;
    // Undo update on even.
    for (size_t k = 0; k < en; ++k) {
        int32_t lo = (k > 0) ? (on ? odd[k - 1] : 0) : (on ? odd[0] : 0);
        int32_t ro = (k < on) ? odd[k] : (on ? odd[on - 1] : 0);
        e[k] = even[k] - div2(lo + ro);
    }
    // Undo predict on odd.
    for (size_t k = 0; k < on; ++k) {
        int32_t lv = e[k];
        int32_t rv = (k + 1 < en) ? e[k + 1] : e[k];
        out[2 * k + 1] = odd[k] + div2(lv + rv);
        out[2 * k] = e[k];
    }
    if (en > on) out[2 * on] = e[on];
}

constexpr int32_t FP_ALPHA = (int32_t)std::round(-1.586134342 * 65536.0);
constexpr int32_t FP_BETA  = (int32_t)std::round(-0.052980118 * 65536.0);
constexpr int32_t FP_GAMMA = (int32_t)std::round( 0.882911076 * 65536.0);
constexpr int32_t FP_DELTA = (int32_t)std::round( 0.443506852 * 65536.0);

void forward_97(const std::vector<int32_t>& even, const std::vector<int32_t>& odd,
                std::vector<int32_t>& out_even, std::vector<int32_t>& out_odd) {
    size_t en = even.size(), on = odd.size();
    out_even.resize(en);
    out_odd.resize(on);
    std::vector<int32_t> o = odd, e = even;
    // Predict 1 on odd.
    for (size_t k = 0; k < on; ++k) {
        int32_t lv = e[k];
        int32_t rv = (k + 1 < en) ? e[k + 1] : e[k];
        o[k] = o[k] + round_mul(FP_ALPHA, lv + rv);
    }
    // Update 1 on even.
    for (size_t k = 0; k < en; ++k) {
        int32_t lo = (k > 0) ? (on ? o[k - 1] : 0) : (on ? o[0] : 0);
        int32_t ro = (k < on) ? o[k] : (on ? o[on - 1] : 0);
        e[k] = e[k] + round_mul(FP_BETA, lo + ro);
    }
    // Predict 2 on odd.
    for (size_t k = 0; k < on; ++k) {
        int32_t lv = e[k];
        int32_t rv = (k + 1 < en) ? e[k + 1] : e[k];
        o[k] = o[k] + round_mul(FP_GAMMA, lv + rv);
    }
    // Update 2 on even.
    for (size_t k = 0; k < en; ++k) {
        int32_t lo = (k > 0) ? (on ? o[k - 1] : 0) : (on ? o[0] : 0);
        int32_t ro = (k < on) ? o[k] : (on ? o[on - 1] : 0);
        e[k] = e[k] + round_mul(FP_DELTA, lo + ro);
    }
    out_even = e;
    out_odd = o;
}

void inverse_97(const std::vector<int32_t>& even, const std::vector<int32_t>& odd,
                std::vector<int32_t>& out) {
    size_t en = even.size(), on = odd.size();
    out.resize(en + on);
    std::vector<int32_t> o = odd, e = even;
    // Undo update 2 on even.
    for (size_t k = 0; k < en; ++k) {
        int32_t lo = (k > 0) ? (on ? o[k - 1] : 0) : (on ? o[0] : 0);
        int32_t ro = (k < on) ? o[k] : (on ? o[on - 1] : 0);
        e[k] = e[k] - round_mul(FP_DELTA, lo + ro);
    }
    // Undo predict 2 on odd.
    for (size_t k = 0; k < on; ++k) {
        int32_t lv = e[k];
        int32_t rv = (k + 1 < en) ? e[k + 1] : e[k];
        o[k] = o[k] - round_mul(FP_GAMMA, lv + rv);
    }
    // Undo update 1 on even.
    for (size_t k = 0; k < en; ++k) {
        int32_t lo = (k > 0) ? (on ? o[k - 1] : 0) : (on ? o[0] : 0);
        int32_t ro = (k < on) ? o[k] : (on ? o[on - 1] : 0);
        e[k] = e[k] - round_mul(FP_BETA, lo + ro);
    }
    // Undo predict 1 on odd.
    for (size_t k = 0; k < on; ++k) {
        int32_t lv = e[k];
        int32_t rv = (k + 1 < en) ? e[k + 1] : e[k];
        o[k] = o[k] - round_mul(FP_ALPHA, lv + rv);
        out[2 * k + 1] = o[k];
        out[2 * k] = e[k];
    }
    if (en > on) out[2 * on] = e[on];
}

void split_even_odd(const std::vector<int32_t>& src, std::vector<int32_t>& even,
                    std::vector<int32_t>& odd) {
    size_t n = src.size();
    even.resize((n + 1) / 2);
    odd.resize(n / 2);
    for (size_t i = 0; i < n; ++i) {
        if (i % 2 == 0) even[i / 2] = src[i];
        else odd[i / 2] = src[i];
    }
}

void lift1d(const std::vector<int32_t>& src, std::vector<int32_t>& out,
               WaveletFilter f) {
    std::vector<int32_t> even, odd;
    split_even_odd(src, even, odd);
    std::vector<int32_t> oe, oo;
    switch (f) {
        case WaveletFilter::Haar: forward_haar(even, odd, oe, oo); break;
        case WaveletFilter::LeGall53: forward_53(even, odd, oe, oo); break;
        case WaveletFilter::Reversible97: forward_97(even, odd, oe, oo); break;
    }
    // Merge: even slots hold low outputs, odd slots hold high outputs.
    out.resize(oe.size() + oo.size());
    for (size_t k = 0; k < oe.size(); ++k) out[2 * k] = oe[k];
    for (size_t k = 0; k < oo.size(); ++k) out[2 * k + 1] = oo[k];
}

void unlift1d(const std::vector<int32_t>& merged, std::vector<int32_t>& out,
               WaveletFilter f) {
    std::vector<int32_t> even, odd;
    split_even_odd(merged, even, odd);
    switch (f) {
        case WaveletFilter::Haar: inverse_haar(even, odd, out); return;
        case WaveletFilter::LeGall53: inverse_53(even, odd, out); return;
        case WaveletFilter::Reversible97: inverse_97(even, odd, out); return;
    }
}

// In-place 2D lift of a w x h buffer (rows then columns).
void WaveletLift::lift_rows_cols(std::vector<int32_t>& buf, uint32_t w, uint32_t h, WaveletFilter f) {
    std::vector<int32_t> row(w);
    for (uint32_t y = 0; y < h; ++y) {
        for (uint32_t x = 0; x < w; ++x) row[x] = buf[(size_t)y * w + x];
        std::vector<int32_t> low;
        lift1d(row, low, f);
        for (uint32_t x = 0; x < w; ++x) buf[(size_t)y * w + x] = low[x];
    }
    std::vector<int32_t> col(h);
    for (uint32_t x = 0; x < w; ++x) {
        for (uint32_t y = 0; y < h; ++y) col[y] = buf[(size_t)y * w + x];
        std::vector<int32_t> low;
        lift1d(col, low, f);
        for (uint32_t y = 0; y < h; ++y) buf[(size_t)y * w + x] = low[y];
    }
}

// Inverse 2D lift: undo columns then rows. The lifted buffer already has
// even slots = low, odd slots = high, so it is passed directly to inverse1d.
void WaveletLift::unlift_rows_cols(std::vector<int32_t>& buf, uint32_t w, uint32_t h, WaveletFilter f) {
    std::vector<int32_t> col(h);
    for (uint32_t x = 0; x < w; ++x) {
        for (uint32_t y = 0; y < h; ++y) col[y] = buf[(size_t)y * w + x];
        std::vector<int32_t> out;
        unlift1d(col, out, f);
        for (uint32_t y = 0; y < h; ++y) buf[(size_t)y * w + x] = out[y];
    }
    std::vector<int32_t> row(w);
    for (uint32_t y = 0; y < h; ++y) {
        for (uint32_t x = 0; x < w; ++x) row[x] = buf[(size_t)y * w + x];
        std::vector<int32_t> out;
        unlift1d(row, out, f);
        for (uint32_t x = 0; x < w; ++x) buf[(size_t)y * w + x] = out[x];
    }
}

int max_levels(uint32_t w, uint32_t h) {
    int lv = 0;
    while (w >= 2 && h >= 2) { ++lv; w /= 2; h /= 2; }
    return lv;
}

std::vector<Subband> WaveletLift::forward(const std::vector<int32_t>& plane,
                                          uint32_t w, uint32_t h,
                                          const WaveletParams& p) const {
    std::vector<Subband> out;
    int levels = std::min(p.levels, max_levels(w, h));
    std::vector<int32_t> cur = plane;
    uint32_t cw = w, ch = h;
    for (int step = 1; step <= levels; ++step) {
        int lvl = levels - step + 1;
        WaveletFilter f = p.filter;
        if (!p.per_level_filter.empty() && lvl < (int)p.per_level_filter.size())
            f = p.per_level_filter[lvl];
        lift_rows_cols(cur, cw, ch, f);
        uint32_t lw = (cw + 1) / 2, lh = (ch + 1) / 2;
        uint32_t hw = cw - lw, hh = ch - lh;
        Subband hl, lhsub, hhsub, ll;
        hl.orient = Subband::Orient::HL; hl.level = lvl; hl.w = hw; hl.h = lh;
        hl.coeffs.resize((size_t)hw * lh);
        lhsub.orient = Subband::Orient::LH; lhsub.level = lvl; lhsub.w = lw; lhsub.h = hh;
        lhsub.coeffs.resize((size_t)lw * hh);
        hhsub.orient = Subband::Orient::HH; hhsub.level = lvl; hhsub.w = hw; hhsub.h = hh;
        hhsub.coeffs.resize((size_t)hw * hh);
        ll.orient = Subband::Orient::LL; ll.level = 0; ll.w = lw; ll.h = lh;
        ll.coeffs.resize((size_t)lw * lh);
        for (uint32_t ry = 0; ry < lh; ++ry) {
            for (uint32_t rx = 0; rx < lw; ++rx) {
                ll.coeffs[(size_t)ry * lw + rx] = cur[(size_t)(2 * ry) * cw + (2 * rx)];
                if (rx < hw)
                    hl.coeffs[(size_t)ry * hw + rx] = cur[(size_t)(2 * ry) * cw + (2 * rx + 1)];
                if (ry < hh)
                    lhsub.coeffs[(size_t)ry * lw + rx] = cur[(size_t)(2 * ry + 1) * cw + (2 * rx)];
                if (rx < hw && ry < hh)
                    hhsub.coeffs[(size_t)ry * hw + rx] = cur[(size_t)(2 * ry + 1) * cw + (2 * rx + 1)];
            }
        }
        out.push_back(std::move(hl));
        out.push_back(std::move(lhsub));
        out.push_back(std::move(hhsub));
        cur = std::move(ll.coeffs);
        cw = lw; ch = lh;
    }
    Subband llfinal;
    llfinal.orient = Subband::Orient::LL; llfinal.level = 0;
    llfinal.w = cw; llfinal.h = ch; llfinal.coeffs = std::move(cur);
    out.push_back(std::move(llfinal));
    return out;
}

std::vector<int32_t> WaveletLift::inverse(const std::vector<Subband>& subbands,
                                          uint32_t w, uint32_t h,
                                          const WaveletParams& p) const {
    int levels = std::min(p.levels, max_levels(w, h));
    // Indices of detail groups: group g (0..levels-1) -> level = levels - g.
    // subbands layout: [g0 HL,LH,HH][g1 ...] ... [g_{levels-1} ...][LL].
    size_t total = subbands.size();
    // Start from the coarsest LL (last element).
    const Subband* ll = &subbands[total - 1];
    std::vector<int32_t> cur = ll->coeffs;
    uint32_t cw = ll->w, ch = ll->h;
    for (int L = 1; L <= levels; ++L) {
        int g = levels - L; // group index for this level
        const Subband& hl = subbands[(size_t)g * 3 + 0];
        const Subband& lhsub = subbands[(size_t)g * 3 + 1];
        const Subband& hhsub = subbands[(size_t)g * 3 + 2];
        uint32_t lw = cw, lhgt = ch;
        uint32_t hw = hl.w, hh = lhsub.h;
        uint32_t fw = lw + hw, fh = lhgt + hh;
        std::vector<int32_t> buf((size_t)fw * fh);
        for (uint32_t ry = 0; ry < lhgt; ++ry) {
            for (uint32_t rx = 0; rx < lw; ++rx) {
                buf[(size_t)(2 * ry) * fw + (2 * rx)] = cur[(size_t)ry * lw + rx];
                if (rx < hw)
                    buf[(size_t)(2 * ry) * fw + (2 * rx + 1)] = hl.coeffs[(size_t)ry * hw + rx];
                if (ry < hh)
                    buf[(size_t)(2 * ry + 1) * fw + (2 * rx)] = lhsub.coeffs[(size_t)ry * lw + rx];
                if (rx < hw && ry < hh)
                    buf[(size_t)(2 * ry + 1) * fw + (2 * rx + 1)] = hhsub.coeffs[(size_t)ry * hw + rx];
            }
        }
        WaveletFilter invf = p.filter;
        if (!p.per_level_filter.empty() && L < (int)p.per_level_filter.size())
            invf = p.per_level_filter[L];
        unlift_rows_cols(buf, fw, fh, invf);
        cur = std::move(buf);
        cw = fw; ch = fh;
    }
    return cur;
}

bool WaveletLift::reversible_for_all_inputs(const WaveletParams& p) const {
    std::mt19937 rng(20260828);
    auto test_plane = [&](uint32_t w, uint32_t h, int vmin, int vmax) -> bool {
        std::vector<int32_t> plane((size_t)w * h);
        for (auto& v : plane) v = (int32_t)(rng() % (uint32_t)(vmax - vmin + 1)) + vmin;
        auto subs = forward(plane, w, h, p);
        auto rec = inverse(subs, w, h, p);
        return rec == plane;
    };
    // Exhaustive + random coverage across sizes and value ranges.
    for (uint32_t w : {1u, 2u, 3u, 4u, 5u, 7u, 8u, 16u, 32u}) {
        for (uint32_t h : {1u, 2u, 3u, 4u, 5u, 7u, 8u, 16u}) {
            for (int range : {0, 255, 1023, 100000}) {
                if (!test_plane(w, h, -range, range)) return false;
            }
        }
    }
    // Random larger planes.
    for (int t = 0; t < 30; ++t) {
        uint32_t w = 64 + (uint32_t)(rng() % 192);
        uint32_t h = 64 + (uint32_t)(rng() % 192);
        if (!test_plane(w, h, -4096, 4096)) return false;
    }
    return true;
}

} // namespace prism::codec
