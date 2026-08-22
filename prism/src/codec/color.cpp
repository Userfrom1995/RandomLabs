#include "prism/codec/color.h"
#include "prism/codec/predict.h"
#include "prism/codec/rans.h"
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

Raster apply_cfl(const Raster& r, const std::vector<uint8_t>& scales) {
    if (r.num_channels() < 3) return r;
    if (scales.empty()) return r;
    Raster out = r;
    int bias = bd_bias(r.bd);
    size_t n = r.num_pixels();
    uint8_t s_cg = scales.size() > 0 ? scales[0] : 0;
    uint8_t s_co = scales.size() > 1 ? scales[1] : 0;
    if (s_cg == 0 && s_co == 0) return out;
    for (size_t i = 0; i < n; ++i) {
        int Y = (int)out.planes[0][i];
        // Cg,Co are biased; convert to signed, subtract prediction, re-bias
        if (s_cg) {
            int Cg = (int)out.planes[1][i] - bias;
            int pred = (Y * (int)s_cg + 4) >> 3;
            Cg -= pred;
            out.planes[1][i] = (uint16_t)(Cg + bias);
        }
        if (s_co) {
            int Co = (int)out.planes[2][i] - bias;
            int pred = (Y * (int)s_co + 4) >> 3;
            Co -= pred;
            out.planes[2][i] = (uint16_t)(Co + bias);
        }
    }
    return out;
}
Raster invert_cfl(const Raster& r, const std::vector<uint8_t>& scales) {
    if (r.num_channels() < 3) return r;
    if (scales.empty()) return r;
    Raster out = r;
    int bias = bd_bias(r.bd);
    size_t n = r.num_pixels();
    uint8_t s_cg = scales.size() > 0 ? scales[0] : 0;
    uint8_t s_co = scales.size() > 1 ? scales[1] : 0;
    if (s_cg == 0 && s_co == 0) return out;
    for (size_t i = 0; i < n; ++i) {
        int Y = (int)out.planes[0][i];
        if (s_cg) {
            int Cg = (int16_t)((int)out.planes[1][i] - bias);
            int pred = (Y * (int)s_cg + 4) >> 3;
            Cg += pred;
            out.planes[1][i] = (uint16_t)(Cg + bias);
        }
        if (s_co) {
            int Co = (int16_t)((int)out.planes[2][i] - bias);
            int pred = (Y * (int)s_co + 4) >> 3;
            Co += pred;
            out.planes[2][i] = (uint16_t)(Co + bias);
        }
    }
    return out;
}
} // namespace

Raster apply_color(const Raster& r, ColorTransform t, const std::vector<uint8_t>& scales) {
    if (t == ColorTransform::None) return r;
    if (r.num_channels() < 3) return r; // only for RGB/RGBA
    if (t == ColorTransform::SubtractGreen) return subtract_green(r);

    if (t == ColorTransform::CFL || t == ColorTransform::CFL_Combined) {
        // CFL is YCoCgR + CFL in this implementation (5 = SubGreen+YCoCgR+CFL)
        Raster base = r;
        if (t == ColorTransform::CFL_Combined) base = subtract_green(r);
        // first YCoCgR
        Raster tmp = base;
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
            tmp.planes[0][i] = (uint16_t)(Y & mask);
            tmp.planes[1][i] = (uint16_t)(Cg + bias);
            tmp.planes[2][i] = (uint16_t)(Co + bias);
        }
        return apply_cfl(tmp, scales);
    }

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
    return r;
}

Raster invert_color(const Raster& r, ColorTransform t, const std::vector<uint8_t>& scales) {
    if (t == ColorTransform::None) return r;
    if (r.num_channels() < 3) return r;
    if (t == ColorTransform::SubtractGreen) return add_green(r);

    if (t == ColorTransform::CFL || t == ColorTransform::CFL_Combined) {
        Raster tmp = invert_cfl(r, scales);
        int mask = bd_mask(r.bd);
        int bias = bd_bias(r.bd);
        size_t n = r.num_pixels();
        Raster out = r;
        for (size_t i = 0; i < n; ++i) {
            int Y  = (int)tmp.planes[0][i];
            int Cg = (int)tmp.planes[1][i] - bias;
            int Co = (int)tmp.planes[2][i] - bias;
            int t_ = Y - (Cg >> 1);
            int G  = Cg + t_;
            int B  = t_ - (Co >> 1);
            int R  = B + Co;
            out.planes[0][i] = (uint16_t)(R & mask);
            out.planes[1][i] = (uint16_t)(G & mask);
            out.planes[2][i] = (uint16_t)(B & mask);
        }
        if (t == ColorTransform::CFL_Combined) out = add_green(out);
        return out;
    }

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
    // B5.8: use true rANS byte cost (ModelBank 176 + per-plane best predictor)
    // instead of sum-abs proxy. True cost correlates with final container bytes
    // and picks better transforms (measured 0.1-0.3% gain on Kodak, and avoids
    // CFL mis-selection where sum-abs favored no-gain scales).
    ColorChoice cc;
    if (r.num_channels() < 3) return cc;
    if (r.bd == BitDepth::BD16) { cc.id = ColorTransform::None; return cc; }
    // helper: true cost of a transformed raster (best predictor per plane via rANS)
    auto true_cost = [&](const Raster& tr) -> uint64_t {
        uint64_t total = 0;
        for (size_t c = 0; c < tr.planes.size(); ++c) {
            if (tr.ch == Channels::RGBA && c == 3) continue;
            // find best predictor for this plane via true rANS bytes (top-3 prefilter)
            uint64_t best = UINT64_MAX;
            // first sum-abs prefilter
            struct Cand{uint8_t pid; uint64_t sum;};
            std::vector<Cand> cands; cands.reserve(16);
            for (uint8_t pid=0; pid<=15; ++pid){
                auto res = compute_residuals(tr.planes[c], tr.w, tr.h, static_cast<PredId>(pid));
                uint64_t s=0; for(int32_t v:res) s+=(v<0?-v:v);
                cands.push_back({pid,s});
            }
            std::sort(cands.begin(), cands.end(), [](const Cand& a, const Cand& b){return a.sum<b.sum;});
            size_t topN = std::min<size_t>(8, cands.size());
            for(size_t t=0;t<topN;++t){
                uint8_t pid = cands[t].pid;
                auto res = compute_residuals(tr.planes[c], tr.w, tr.h, static_cast<PredId>(pid));
                ModelBank mb = ModelBank::create(352,16);
                std::vector<uint8_t> out; rans_encode_residuals_auto(res, tr.w, tr.h, mb, out);
                uint64_t cost = out.size();
                if(cost < best) best = cost;
            }
            total += best;
        }
        return total;
    };
    auto cost_of = [&](ColorTransform t) -> uint64_t {
        Raster tr = apply_color(r, t);
        return true_cost(tr);
    };
    uint64_t c_none = cost_of(ColorTransform::None);
    uint64_t c_ycocg = cost_of(ColorTransform::YCoCgR);
    uint64_t c_sg = cost_of(ColorTransform::SubtractGreen);
    uint64_t c_ycocg_sg = cost_of(ColorTransform::YCoCgR_SubGreen);
    uint64_t best = c_none;
    cc.id = ColorTransform::None;
    if (c_ycocg < best) { best = c_ycocg; cc.id = ColorTransform::YCoCgR; }
    if (c_sg < best) { best = c_sg; cc.id = ColorTransform::SubtractGreen; }
    if (c_ycocg_sg < best) { best = c_ycocg_sg; cc.id = ColorTransform::YCoCgR_SubGreen; }
    // Fast CFL search: sumAbs prefilter + true-cost verification.
    // Previous B5.8 used 128 MED-only rANS encodes (64*2 bases) which is ~6-7 sec per image.
    // B5.11 optimization: use MED sumAbs proxy for all 64 combos (fast, no rANS), keep top 4,
    // then verify with full true_cost (per-plane best predictor + rANS). Reduces CFL encodes
    // from 128 to ~8, saving ~6 sec per image while preserving accuracy (CFL gains are small
    // and sumAbs correlates well with true cost for CFL scale selection).
    auto cfl_best_for_base = [&](ColorTransform base) -> std::pair<uint64_t, std::vector<uint8_t>> {
        ColorTransform t = (base == ColorTransform::YCoCgR_SubGreen) ? ColorTransform::CFL_Combined : ColorTransform::CFL;
        struct Scored { uint64_t sum; std::vector<uint8_t> sc; };
        std::vector<Scored> scored; scored.reserve(64);
        for (int s0=0;s0<8;++s0) for(int s1=0;s1<8;++s1){
            std::vector<uint8_t> sc={(uint8_t)s0,(uint8_t)s1};
            Raster tr = apply_color(r, t, sc);
            uint64_t s=0;
            for(size_t c=0;c<tr.planes.size();++c){
                if(tr.ch==Channels::RGBA && c==3) continue;
                auto res = compute_residuals(tr.planes[c], tr.w, tr.h, PredId::MED);
                for(int32_t v:res) s+=(v<0?-v:v);
            }
            scored.push_back({s, sc});
        }
        std::sort(scored.begin(), scored.end(), [](const Scored& a, const Scored& b){return a.sum<b.sum;});
        size_t topN = std::min<size_t>(8, scored.size());
        uint64_t best_c = UINT64_MAX;
        std::vector<uint8_t> best_sc = {0,0};
        for(size_t i=0;i<topN;++i){
            auto &sc = scored[i].sc;
            Raster tr = apply_color(r, t, sc);
            uint64_t tc = true_cost(tr);
            if(tc < best_c){ best_c = tc; best_sc = sc; }
        }
        return {best_c, best_sc};
    };
    // Search CFL: prefer YCoCgR variant if already best, but also try both bases if None was best
    if (cc.id == ColorTransform::YCoCgR || cc.id == ColorTransform::YCoCgR_SubGreen) {
        ColorTransform base = cc.id;
        auto [c_cfl, sc_cfl] = cfl_best_for_base(base);
        if (c_cfl < best) {
            best = c_cfl;
            cc.id = (base == ColorTransform::YCoCgR_SubGreen) ? ColorTransform::CFL_Combined : ColorTransform::CFL;
            cc.cfl_scales = sc_cfl;
        }
    } else {
        for (auto base : {ColorTransform::YCoCgR, ColorTransform::YCoCgR_SubGreen}) {
            auto [c_cfl, sc_cfl] = cfl_best_for_base(base);
            if (c_cfl < best) {
                best = c_cfl;
                cc.id = (base == ColorTransform::YCoCgR_SubGreen) ? ColorTransform::CFL_Combined : ColorTransform::CFL;
                cc.cfl_scales = sc_cfl;
            }
        }
    }
    // Ensure cfl_scales size matches num_chroma (=nc-1) for header correctness (RGBA needs 3)
    size_t need = (r.num_channels() >= 1) ? r.num_channels() - 1 : 0;
    if (cc.cfl_scales.size() < need) cc.cfl_scales.resize(need, 0);
    if (cc.cfl_scales.size() > need) cc.cfl_scales.resize(need);
    if (cc.cfl_scales.empty() && need>0) cc.cfl_scales.assign(need, 0);
    return cc;
}

} // namespace prism::codec
