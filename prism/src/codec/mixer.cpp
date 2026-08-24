#include "prism/codec/mixer.h"

namespace prism::codec {

// squash table (spec 12.1): 33 knot values of the piecewise-linear logistic
// curve over d in [-2047, 2047]. Integer-only, platform-independent.
int mix_squash(int d) {
    static const int t[33] = {
        1, 2, 3, 6, 10, 16, 27, 45, 73, 120, 194, 310, 488, 747, 1101,
        1546, 2047, 2549, 2994, 3348, 3607, 3785, 3901, 3975, 4024, 4050,
        4068, 4079, 4085, 4089, 4092, 4093, 4094};
    if (d > MIX_STRETCH_MAX) return 4095;
    if (d < -MIX_STRETCH_MAX) return 0;
    int w = d & 127;
    int i = (d >> 7) + 16;
    return (t[i] * (128 - w) + t[i + 1] * w + 64) >> 7;
}

namespace {
// stretch lookup; built once by the exact-inverse sweep from spec 12.1.
int16_t g_stretch[4096];
bool g_stretch_ready = false;
} // namespace

void mix_stretch_init() {
    if (g_stretch_ready) return;
    int pi = 0;
    for (int x = -MIX_STRETCH_MAX; x <= MIX_STRETCH_MAX; ++x) {
        int v = mix_squash(x);
        if (v > 4095) v = 4095;
        for (int j = pi; j <= v && j < 4096; ++j) g_stretch[j] = (int16_t)x;
        pi = v + 1;
        if (pi > 4095) pi = 4095;
    }
    for (int j = pi; j < 4096; ++j) g_stretch[j] = MIX_STRETCH_MAX;
    g_stretch_ready = true;
}

int mix_stretch(int p12) {
    if (!g_stretch_ready) mix_stretch_init();
    if (p12 < 0) p12 = 0;
    if (p12 > 4095) p12 = 4095;
    return g_stretch[p12];
}

MixerCore::MixerCore(const MixerConfig& cfg) : cfg_(cfg) {
    if (cfg_.K < 1) cfg_.K = 1;
    if (cfg_.sse_classes < 1) cfg_.sse_classes = 1;
    w_.assign((size_t)cfg_.K, cfg_.w_init);
    mix_stretch_init();
    sse_.assign((size_t)cfg_.sse_classes * 33, 0);
    if (cfg_.use_sse) {
        for (int c = 0; c < cfg_.sse_classes; ++c)
            for (int j = 0; j < 33; ++j)
                sse_[(size_t)c * 33 + (size_t)j] =
                    (int64_t)(j * 128 - MIX_STRETCH_MAX) << 16;
    }
}

int MixerCore::filter(const int32_t* st, int sse_class) const {
    int64_t dot = 0;
    for (int k = 0; k < cfg_.K; ++k) dot += (int64_t)w_[k] * st[k];
    int s_mix = (int)(dot >> 16); // arithmetic shift per spec 12.2
    if (s_mix < -MIX_STRETCH_MAX) s_mix = -MIX_STRETCH_MAX;
    if (s_mix > MIX_STRETCH_MAX) s_mix = MIX_STRETCH_MAX;
    if (!cfg_.use_sse) return s_mix;
    if (sse_class < 0) sse_class = 0;
    if (sse_class >= cfg_.sse_classes) sse_class = cfg_.sse_classes - 1;
    int u = s_mix + MIX_STRETCH_MAX; // [0, 4094]
    int j = u >> 7;                  // 0..31
    int frac = u & 127;
    const int64_t* T = &sse_[(size_t)sse_class * 33];
    int64_t v = (T[j] * (128 - frac) + T[j + 1] * frac) >> 23;
    int s_out = (int)v;
    if (s_out < -MIX_STRETCH_MAX) s_out = -MIX_STRETCH_MAX;
    if (s_out > MIX_STRETCH_MAX) s_out = MIX_STRETCH_MAX;
    return s_out;
}

void MixerCore::update(bool bit, const int32_t* st, int sse_class) {
    // Recompute s_mix exactly as filter() saw it (weights change after).
    int64_t dot = 0;
    for (int k = 0; k < cfg_.K; ++k) dot += (int64_t)w_[k] * st[k];
    int s_mix = (int)(dot >> 16);
    if (s_mix < -MIX_STRETCH_MAX) s_mix = -MIX_STRETCH_MAX;
    if (s_mix > MIX_STRETCH_MAX) s_mix = MIX_STRETCH_MAX;
    // Probability-domain logistic-loss error (lpaq-style): training against
    // the observed bit in P-domain keeps the common-mode weight growth
    // bounded - a perfect prediction contributes near-zero error, so weights
    // stay near the mixture scale instead of amplifying the stretch.
    int p12_mix = mix_squash(s_mix);
    int err = bit ? -p12_mix : (4095 - p12_mix);
    if (cfg_.lr_shift >= 0) {
        int div = 20 - cfg_.lr_shift; // lr 4..8 -> divisor 16..12
        if (div < 1) div = 1;
        for (int k = 0; k < cfg_.K; ++k) {
            int64_t delta = ((int64_t)err * st[k]) >> div;
            int64_t nw = (int64_t)w_[k] + delta;
            if (nw < cfg_.w_min) nw = cfg_.w_min;
            if (nw > cfg_.w_max) nw = cfg_.w_max;
            w_[k] = (int32_t)nw;
        }
    }
    if (!cfg_.use_sse) return;
    if (cfg_.sse_rate_shift < 0) return; // frozen APM (ablation presets)
    if (sse_class < 0) sse_class = 0;
    if (sse_class >= cfg_.sse_classes) sse_class = cfg_.sse_classes - 1;
    int u = s_mix + MIX_STRETCH_MAX;
    int j = u >> 7;
    int64_t& t = sse_[(size_t)sse_class * 33 + (size_t)j];
    int target = bit ? -MIX_STRETCH_MAX : MIX_STRETCH_MAX; // APM pulls toward confidence
    t += ((int64_t)target * 65536 - t) >> cfg_.sse_rate_shift;
    int64_t lo = -(int64_t)MIX_STRETCH_MAX * 65536;
    int64_t hi = (int64_t)MIX_STRETCH_MAX * 65536;
    if (t < lo) t = lo;
    if (t > hi) t = hi;
}

} // namespace prism::codec
