#include <gtest/gtest.h>
#include "prism/prism.h"
#include "prism/codec/predict.h"
#include "prism/codec/squeeze.h"
#include "prism/codec/container.h"
#include "prism/codec/analyze.h"
#include "prism/codec/acoder.h"
#include "prism/crc32.h"
#include <random>
#include <cmath>

using namespace prism;
using namespace prism::codec;

namespace {
std::vector<uint16_t> random_plane(uint32_t w, uint32_t h, uint32_t seed, uint16_t maxv) {
    std::mt19937 rng(seed);
    std::uniform_int_distribution<int> dist(0, maxv);
    std::vector<uint16_t> p((size_t)w * h);
    for (auto& v : p) v = (uint16_t)dist(rng);
    return p;
}

Raster make_raster(const std::vector<uint16_t>& plane, uint32_t w, uint32_t h) {
    Raster r(w, h, Channels::GRAY, BitDepth::BD8);
    r.planes[0] = plane;
    return r;
}

void recrc(std::vector<uint8_t>& data) {
    uint32_t crc = crc32(data.data(), data.size() - 4);
    data[data.size()-4] = (uint8_t)crc; data[data.size()-3] = (uint8_t)(crc>>8);
    data[data.size()-2] = (uint8_t)(crc>>16); data[data.size()-1] = (uint8_t)(crc>>24);
}

// Build a plane whose HF lifting bands are the co-located LL gradient times
// a fixed weight plus small noise (computed with the shared functions the
// coder uses): a smooth sinusoidal LL keeps every band's dominant structure
// exactly predictable from the LL gradient, while flat MED coding of the
// textured parent stays expensive, so the chooser must find a decisive
// squeezing win with the matching weights.
std::vector<uint16_t> make_cross_band_correlated_plane(uint32_t w, uint32_t h) {
    uint32_t w2 = w / 2, h2 = h / 2;
    std::vector<uint16_t> ll((size_t)w2 * h2);
    for (uint32_t y = 0; y < h2; ++y)
        for (uint32_t x = 0; x < w2; ++x) {
            double v = 128.0 + 60.0 * std::sin(2.0 * M_PI * x / 16.0)
                               * std::sin(2.0 * M_PI * y / 16.0);
            ll[(size_t)y * w2 + x] = (uint16_t)std::lround(v);
        }
    std::vector<uint16_t> hb((size_t)w2 * h2), vb((size_t)w2 * h2), db((size_t)w2 * h2);
    for (uint32_t y = 0; y < h2; ++y) {
        for (uint32_t x = 0; x < w2; ++x) {
            size_t i = (size_t)y * w2 + x;
            uint64_t z = ((uint64_t)y * w2 + x + 7) * 0x9E3779B97F4A7C15ull;
            z ^= z >> 31; z *= 0x94D049BB133111EBull; z ^= z >> 29;
            int32_t nz = (int32_t)(z % 5u) - 2;
            hb[i] = (uint16_t)(int16_t)(xband_apply(xband_gradient(ll, w2, h2, x, y, 1), 12) + nz);
            vb[i] = (uint16_t)(int16_t)(xband_apply(xband_gradient(ll, w2, h2, x, y, 2), -12) + nz);
            db[i] = (uint16_t)(int16_t)(xband_apply(xband_gradient(ll, w2, h2, x, y, 3), 12) + nz);
        }
    }
    std::vector<uint16_t> parent;
    squeeze_merge_level_lift(ll, hb, vb, db, w2, h2, parent);
    return parent;
}
} // namespace

// The shared math: central differences inside, one-sided at borders, floor
// semantics on negative products, exact identity at weight or gradient zero.
TEST(XbandMath, GradientAndWeightSemantics) {
    // row-major: (x,y) -> y*3+x
    std::vector<uint16_t> ll = {10, 20, 40,
                                30, 50, 80,
                                60, 90, 130};
    EXPECT_EQ(xband_gradient(ll, 3, 3, 1, 1, 1), 50);   // H central: at(2,1)-at(0,1)
    EXPECT_EQ(xband_gradient(ll, 3, 3, 0, 1, 1), 20);   // H right-border one-sided
    EXPECT_EQ(xband_gradient(ll, 3, 3, 2, 1, 1), 30);   // H left-border one-sided
    EXPECT_EQ(xband_gradient(ll, 3, 3, 1, 1, 2), 70);   // V central: at(1,2)-at(1,0)
    EXPECT_EQ(xband_gradient(ll, 3, 3, 1, 0, 2), 30);   // V top one-sided down
    EXPECT_EQ(xband_gradient(ll, 3, 3, 1, 2, 2), 40);   // V bottom one-sided up
    EXPECT_EQ(xband_gradient(ll, 3, 3, 1, 1, 3), 120);  // D central: at(2,2)-at(0,0)
    EXPECT_EQ(xband_gradient(ll, 3, 3, 0, 0, 3), 40);   // D corner one-sided
    EXPECT_EQ(xband_apply(33, 4), 8);                   // floor(132/16)
    EXPECT_EQ(xband_apply(-33, 4), -9);                 // floor(-132/16) = -9
    EXPECT_EQ(xband_apply(33, -4), -9);
    EXPECT_EQ(xband_apply(-33, -4), 8);
    EXPECT_EQ(xband_apply(0, 100), 0);
    EXPECT_EQ(xband_apply(12345, 0), 0);
}

// Zero weights must reproduce plain-lifting band payloads exactly, plus only
// the 3 header bytes per squeezing plane.
TEST(XbandIdentity, ZeroWeightsCostOnlyHeaderBytes) {
    auto plane = random_plane(32, 32, 42u, 255);
    Raster r = make_raster(plane, 32, 32);
    EncodeOpts base; base.effort = 3;
    EncodeOpts sq = base;
    sq.force_squeeze_levels = {1};
    EncodeOpts xb = sq;
    xb.force_xband_weights = {0, 0, 0};
    auto plain = encode(r, sq);
    auto zeroW = encode(r, xb);
    ASSERT_FALSE(plain.empty());
    EXPECT_TRUE((plain[16] & XBAND_FLAG) == 0);
    EXPECT_TRUE((zeroW[16] & XBAND_FLAG) != 0);
    // One squeezing plane -> exactly three extra header bytes, nothing else.
    EXPECT_EQ(zeroW.size(), plain.size() + 3);
    EXPECT_EQ(decode(zeroW), r);
}

// Directed round trip through nonzero weights on a constructed cross-band
// correlated plane; bit6 visible in the flags byte, decode byte-exact.
TEST(XbandRoundTrip, DirectedWeightsBijection) {
    auto plane = make_cross_band_correlated_plane(32, 32);
    Raster r = make_raster(plane, 32, 32);
    EncodeOpts opts; opts.effort = 3;
    opts.force_squeeze_levels = {1};
    opts.force_xband_weights = {48, 0, 0}; // weight 3.0 on H bands only
    auto bytes = encode(r, opts);
    ASSERT_FALSE(bytes.empty());
    EXPECT_TRUE((bytes[16] & XBAND_FLAG) != 0);
    EXPECT_TRUE((bytes[16] & SQUEEZE_LIFT_FLAG) != 0);
    EXPECT_EQ(decode(bytes), r);

    // Corruption anywhere still rejects via CRC (never garbage out).
    std::vector<uint8_t> bad = bytes;
    bad[bad.size() / 2] ^= 0xFF;
    EXPECT_THROW(decode(bad), DecodeError);

    // An unknown flag bit above bit6 is a hard error even after re-CRC.
    std::vector<uint8_t> unk = bytes;
    unk[16] |= 0x80;
    recrc(unk);
    EXPECT_THROW(decode(unk), DecodeError);
}

// Never-expand invariant of the exported chooser on arbitrary planes: the
// adopted plan never costs more than the flat baseline it replaces.
TEST(XbandSelector, ChooserNeverExpands) {
    for (uint32_t seed = 1; seed <= 8; ++seed) {
        auto plane = random_plane(24, 24, seed * 17u, 255);
        SqueezeXBandPlan plan = choose_squeeze_plan_xband(plane, 24, 24, 8, PredId::MED);
        auto flatRes = compute_residuals(plane, 24, 24, PredId::MED);
        size_t flat = acoder_encode_plane_v2(flatRes, 24, 24, AC_V2_RESDIFF_CONTEXTS).size();
        EXPECT_LE(plan.total_bytes, flat) << "seed " << seed;
        if (plan.levels == 0) {
            EXPECT_EQ(plan.total_bytes, flat);
            EXPECT_EQ(plan.weights[0], 0);
            EXPECT_EQ(plan.weights[1], 0);
            EXPECT_EQ(plan.weights[2], 0);
        } else {
            EXPECT_LT(plan.total_bytes, flat) << "seed " << seed;
        }
    }
}

// On the constructed cross-band plane the chooser must find a squeezing plan
// with a nonzero H weight that strictly beats flat coding.
TEST(XbandSelector, FindsCrossBandWinOnConstructedPlane) {
    auto plane = make_cross_band_correlated_plane(32, 32);
    SqueezeXBandPlan plan = choose_squeeze_plan_xband(plane, 32, 32, 8, PredId::MED);
    EXPECT_GE(plan.levels, 1u);
    EXPECT_NE(plan.weights[0], 0);
    auto flatRes = compute_residuals(plane, 32, 32, PredId::MED);
    size_t flat = acoder_encode_plane_v2(flatRes, 32, 32, AC_V2_RESDIFF_CONTEXTS).size();
    EXPECT_LT(plan.total_bytes, flat);
}

// Header round trip carries the weights verbatim, sized to the squeezing
// planes only.
TEST(XbandContainer, WeightsRoundTripThroughHeader) {
    auto plane = random_plane(16, 16, 7u, 255);
    Raster r = make_raster(plane, 16, 16);
    EncodeOpts opts; opts.effort = 3;
    opts.force_squeeze_levels = {1};
    opts.force_xband_weights = {12, -12, 4};
    auto bytes = encode(r, opts);
    size_t header_end = 0;
    Container c = container_decode_header(bytes.data(), bytes.size() - 4, header_end);
    EXPECT_TRUE(c.hdr.flags & XBAND_FLAG);
    ASSERT_EQ(c.hdr.xband_weights.size(), (size_t)3);
    EXPECT_EQ(c.hdr.xband_weights[0], 12);
    EXPECT_EQ(c.hdr.xband_weights[1], -12);
    EXPECT_EQ(c.hdr.xband_weights[2], 4);
}

// bit6 without any squeeze level is an invalid combination even with a
// fresh CRC.
TEST(XbandFlags, XbandWithoutSqueezeRejected) {
    auto plane = random_plane(16, 16, 5u, 255);
    Raster r = make_raster(plane, 16, 16);
    EncodeOpts opts; opts.effort = 1; // no squeeze at effort 1
    auto bytes = encode(r, opts);
    ASSERT_TRUE((bytes[16] & XBAND_FLAG) == 0);
    bytes[16] |= XBAND_FLAG;
    recrc(bytes);
    EXPECT_THROW(decode(bytes), DecodeError);
}
