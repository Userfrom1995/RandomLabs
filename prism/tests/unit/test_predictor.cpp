// X6a (Route 4 / L1) unit tests: learned coefficient predictor + residual path.
//
// Rails:
//   VB-X-RESIDUAL-ROUNDTRIP    - decode(encode_residual(x)) == x byte-exact (I31)
//   VB-X-PREDICTOR-DETERMINISM - encode (reads true c) and decode (reads recon)
//                                compute the identical c_hat for every coefficient
//   VB-X-NET-AUDIT-RESIDUAL    - residual frame reports NET = payload + header with
//                                RESIDUAL_FLAG set, zero predictor bytes transmitted

#include <gtest/gtest.h>
#include "prism/types.h"
#include "prism/codec/wavelet.h"
#include "prism/codec/wavelet_container.h"
#include "prism/codec/color.h"
#include "prism/codec/predictor.h"
#include <random>
#include <vector>

using namespace prism;
using namespace prism::codec;

namespace {

Raster make_raster(uint32_t w, uint32_t h, uint8_t ch, uint8_t bd, std::mt19937& rng) {
    Raster r(w, h, (Channels)ch, bd == 8 ? BitDepth::BD8 : BitDepth::BD16);
    uint32_t maxv = bd == 8 ? 255u : 65535u;
    for (auto& pl : r.planes)
        for (auto& v : pl) v = (uint16_t)(rng() % (maxv + 1));
    return r;
}

// Build the residual field r = c - c_hat for a lifted subband set, mirroring the
// encode pre-pass exactly.
std::vector<Subband> build_residuals(const std::vector<Subband>& subs, const CoefficientPredictor& pred) {
    std::vector<int> order, parent, sib1, sib2;
    CoefficientPredictor::build_topology(subs, order, parent, sib1, sib2);
    std::vector<std::vector<int32_t>> recon(subs.size());
    for (size_t si = 0; si < subs.size(); ++si) recon[si] = subs[si].coeffs;
    std::vector<Subband> R(subs.size());
    for (size_t si = 0; si < subs.size(); ++si) {
        R[si].orient = subs[si].orient; R[si].level = subs[si].level;
        R[si].w = subs[si].w; R[si].h = subs[si].h;
        R[si].coeffs.assign((size_t)subs[si].w * subs[si].h, 0);
    }
    for (int si : order) {
        const Subband& s = subs[si];
        for (int y = 0; y < s.h; ++y)
            for (int x = 0; x < s.w; ++x) {
                int32_t c = s.coeffs[(size_t)y * s.w + x];
                int32_t c_hat = pred.predict(recon, subs, parent, sib1, sib2, si, x, y);
                R[si].coeffs[(size_t)y * s.w + x] = c - c_hat;
            }
    }
    return R;
}

// Reconstruct c = c_hat + r from the residual field, mirroring the decode
// post-pass exactly (recon starts at zero and is filled causally).
std::vector<Subband> reconstruct_from_residual(const std::vector<Subband>& R, const CoefficientPredictor& pred) {
    std::vector<int> order, parent, sib1, sib2;
    CoefficientPredictor::build_topology(R, order, parent, sib1, sib2);
    std::vector<std::vector<int32_t>> recon(R.size());
    for (size_t si = 0; si < R.size(); ++si) recon[si].assign(R[si].coeffs.size(), 0);
    std::vector<Subband> out(R.size());
    for (size_t si = 0; si < R.size(); ++si) {
        out[si].orient = R[si].orient; out[si].level = R[si].level;
        out[si].w = R[si].w; out[si].h = R[si].h;
        out[si].coeffs.assign(R[si].coeffs.size(), 0);
    }
    for (int si : order) {
        const Subband& s = R[si];
        for (int y = 0; y < s.h; ++y)
            for (int x = 0; x < s.w; ++x) {
                int32_t c_hat = pred.predict(recon, out, parent, sib1, sib2, si, x, y);
                int32_t r = s.coeffs[(size_t)y * s.w + x];
                recon[si][(size_t)y * s.w + x] = c_hat + r;
                out[si].coeffs[(size_t)y * s.w + x] = c_hat + r;
            }
    }
    return out;
}

} // namespace

// VB-X-RESIDUAL-ROUNDTRIP: full FRAME-WAVELET-RESIDUAL pipeline is byte-exact.
TEST(X6Predictor, ResidualRoundtrip) {
    std::mt19937 rng(20260829);
    WaveletFilter filters[] = {WaveletFilter::Haar, WaveletFilter::LeGall53,
                               WaveletFilter::Reversible97};
    for (auto f : filters) {
        for (int levels = 1; levels <= 5; ++levels) {
            Raster r = make_raster(48, 48, 3, 8, rng);
            size_t net = 0;
            auto bytes = frame_wavelet_encode_residual(r, f, levels, net);
            Raster dec = frame_wavelet_decode(bytes);
            EXPECT_EQ(dec, r) << "filter " << (int)f << " levels " << levels;
        }
    }
}

TEST(X6Predictor, ResidualRoundtripBd16) {
    std::mt19937 rng(13);
    Raster r = make_raster(40, 40, 3, 16, rng);
    size_t net = 0;
    auto bytes = frame_wavelet_encode_residual(r, WaveletFilter::LeGall53, 4, net);
    Raster dec = frame_wavelet_decode(bytes);
    EXPECT_EQ(dec, r);
}

// VB-X-PREDICTOR-DETERMINISM: the encode pre-pass and decode post-pass agree on
// every coefficient, so the reconstructed c matches the original exactly even
// when exercised as two independent walks (I31).
TEST(X6Predictor, PredictorDeterminism) {
    std::mt19937 rng(8675309);
    CoefficientPredictor pred;
    WaveletLift lift;
    for (int trial = 0; trial < 8; ++trial) {
        Raster r = make_raster(33, 41, 3, 8, rng);
        Raster t = apply_color(r, ColorTransform::YCoCgR);
        WaveletParams p{WaveletFilter::LeGall53, 5};
        for (auto& pl : t.planes) {
            std::vector<int32_t> plane(pl.begin(), pl.end());
            auto subs = lift.forward(plane, t.w, t.h, p);
            auto R = build_residuals(subs, pred);
            auto rec = reconstruct_from_residual(R, pred);
            ASSERT_EQ(rec.size(), subs.size());
            for (size_t si = 0; si < subs.size(); ++si) {
                ASSERT_EQ(rec[si].coeffs.size(), subs[si].coeffs.size());
                for (size_t i = 0; i < subs[si].coeffs.size(); ++i)
                    EXPECT_EQ(rec[si].coeffs[i], subs[si].coeffs[i])
                        << "trial " << trial << " sub " << si << " i " << i;
            }
        }
    }
}

// VB-X-NET-AUDIT-RESIDUAL: the residual frame sets RESIDUAL_FLAG, round-trips,
// and carries no predictor tables (the weights are baked constants).
TEST(X6Predictor, NetAuditResidual) {
    std::mt19937 rng(555);
    Raster r = make_raster(64, 64, 3, 8, rng);
    size_t net = 0;
    auto bytes = frame_wavelet_encode_residual(r, WaveletFilter::LeGall53, 5, net);
    WaveletFrame frame = wavelet_container_decode(bytes);
    EXPECT_EQ(frame.hdr.residual_mode & 1u, 1u);
    // NET equals the total stream length (payload + header + crc); no model tables.
    EXPECT_EQ(bytes.size(), net);
    Raster dec = frame_wavelet_decode(bytes);
    EXPECT_EQ(dec, r);
}
