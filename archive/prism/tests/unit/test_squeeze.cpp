#include <gtest/gtest.h>
#include "prism/prism.h"
#include "prism/codec/squeeze.h"
#include "prism/codec/container.h"
#include <random>

using namespace prism;
using prism::codec::SqueezeResult;
using prism::codec::squeeze_encode_plane;
using prism::codec::squeeze_decode_plane;
using prism::codec::max_squeeze_levels;
using prism::codec::squeeze_band_count;
using prism::codec::squeeze_lift_level;
using prism::codec::squeeze_merge_level_lift;
using prism::codec::squeeze_ll_chain;

namespace {
std::vector<uint16_t> random_plane(uint32_t w, uint32_t h, uint32_t seed, uint16_t maxv) {
    std::mt19937 rng(seed);
    std::uniform_int_distribution<int> dist(0, maxv);
    std::vector<uint16_t> p((size_t)w * h);
    for (auto& v : p) v = (uint16_t)dist(rng);
    return p;
}
} // namespace

// Blueprint C4 acceptance: inverse exactness is the blocker. Random BD8
// planes over the full value range, every dim 1..65 (odd included), L up to
// max; lifting must reconstruct exactly (no clamping needed in range).
TEST(SqueezeLift, BijectionRandomPlanesBD8) {
    for (uint32_t w = 1; w <= 65; w += 2) {
        for (uint32_t h = 1; h <= 65; h += 2) {
            auto plane = random_plane(w, h, 1000u + w * 100u + h, 255);
            uint8_t maxL = max_squeeze_levels(w, h);
            for (uint8_t L = 0; L <= maxL + 1 && L < 8; ++L) {
                SqueezeResult sr = squeeze_encode_plane(plane, w, h, L, 8, true);
                auto back = squeeze_decode_plane(sr, w, h, true);
                ASSERT_EQ(back.size(), plane.size()) << w << "x" << h << " L" << (int)L;
                EXPECT_EQ(back, plane) << "lift bijection broken at " << w << "x" << h << " L" << (int)L;
            }
        }
    }
}

// Even dimensions exercise deep chains (up to the cap of 4 levels).
TEST(SqueezeLift, BijectionEvenDimsDeepChains) {
    for (uint32_t dim : {2u, 4u, 6u, 8u, 16u, 32u, 64u}) {
        auto plane = random_plane(dim, dim, 7u * dim, 255);
        uint8_t maxL = max_squeeze_levels(dim, dim);
        ASSERT_GT(maxL, 0u);
        for (uint8_t L = 1; L <= maxL; ++L) {
            SqueezeResult sr = squeeze_encode_plane(plane, dim, dim, L, 8, true);
            EXPECT_EQ(sr.levels, L);
            EXPECT_EQ(sr.bands.size(), squeeze_band_count(L));
            auto back = squeeze_decode_plane(sr, dim, dim, true);
            EXPECT_EQ(back, plane) << "dim " << dim << " L" << (int)L;
        }
    }
}

// Layout contract unchanged by C4: post-order bands, LL first with
// band_class = levels<<2, HF classes (lvl<<2)|1..3, all quadrants w/2 x h/2.
TEST(SqueezeLift, BandLayoutPostOrderUnchanged) {
    const uint32_t w = 16, h = 16;
    auto plane = random_plane(w, h, 42, 255);
    SqueezeResult sr = squeeze_encode_plane(plane, w, h, 2, 8, true);
    ASSERT_EQ(sr.bands.size(), 1u + 3u * 2u);
    EXPECT_EQ(sr.bands[0].band_class, (uint8_t)(2 << 2));
    EXPECT_EQ(sr.bands[0].w, 4u);
    EXPECT_EQ(sr.bands[0].h, 4u);
    size_t idx = 1;
    for (int lvl = 1; lvl >= 0; --lvl) {
        const uint32_t qw = w >> (lvl + 1), qh = h >> (lvl + 1);
        for (uint8_t type = 1; type <= 3; ++type, ++idx) {
            EXPECT_EQ(sr.bands[idx].band_class, (uint8_t)((lvl << 2) | type));
            EXPECT_EQ(sr.bands[idx].w, qw);
            EXPECT_EQ(sr.bands[idx].h, qh);
        }
    }
}

// The one-level transform and its inverse are exact mirrors over Z:
// lift(merge(x)) == x for adversarial full-range u16 inputs at the quadrant
// level (details may exceed int16 here only through wrap storage, so this
// property is checked on BD8-range values where storage is lossless).
TEST(SqueezeLift, LevelMergeIsExactInverse) {
    const uint32_t W = 8, H = 8;
    auto cur = random_plane(W, H, 99, 255);
    std::vector<uint16_t> ll, hb, vb, db;
    squeeze_lift_level(cur, W, H, ll, hb, vb, db);
    std::vector<uint16_t> parent;
    squeeze_merge_level_lift(ll, hb, vb, db, W / 2, H / 2, parent);
    EXPECT_EQ(parent, cur);
}

// Determinism: same input, same bytes, every level.
TEST(SqueezeLift, Deterministic) {
    const uint32_t w = 13, h = 9;
    auto plane = random_plane(w, h, 1234, 255);
    for (uint8_t L = 0; L <= max_squeeze_levels(w, h); ++L) {
        auto a = squeeze_encode_plane(plane, w, h, L, 8, true);
        auto b = squeeze_encode_plane(plane, w, h, L, 8, true);
        ASSERT_EQ(a.bands.size(), b.bands.size());
        for (size_t i = 0; i < a.bands.size(); ++i) EXPECT_EQ(a.bands[i].data, b.bands[i].data);
    }
}

// The average chain under lifting stays within the input value range
// (floor((a+b)/2) cannot leave [min, max]); this is what makes int16 detail
// storage safe for BD8 chains of any depth.
TEST(SqueezeLift, AverageChainStaysInRange) {
    const uint32_t w = 32, h = 32;
    auto plane = random_plane(w, h, 555, 255);
    auto chain = squeeze_ll_chain(plane, w, h, 4, true);
    for (size_t lvl = 0; lvl < chain.size(); ++lvl)
        for (uint16_t v : chain[lvl]) ASSERT_LE(v, 255u) << "level " << lvl;
}

// Legacy decimation path keeps its historical behavior: bit5-clear streams
// decode exactly as before (LL = top-left pixel copy, plain diffs).
TEST(SqueezeLegacy, DecimationBijectionSmallValues) {
    for (uint32_t dim : {2u, 4u, 8u, 16u}) {
        // diffs must stay within int16 for legacy wrap-storage correctness
        auto plane = random_plane(dim, dim, 31u + dim, 100);
        uint8_t maxL = max_squeeze_levels(dim, dim);
        for (uint8_t L = 1; L <= maxL; ++L) {
            SqueezeResult sr = squeeze_encode_plane(plane, dim, dim, L, 8, false);
            auto back = squeeze_decode_plane(sr, dim, dim, false);
            EXPECT_EQ(back, plane) << "legacy decimation broken at " << dim << " L" << (int)L;
        }
    }
}

// BD16 planes are never squeezed (levels forced to 0), both paths.
TEST(SqueezeLevels, BD16NeverSqueezed) {
    auto plane = random_plane(16, 16, 77, 65535);
    for (bool lift : {true, false}) {
        SqueezeResult sr = squeeze_encode_plane(plane, 16, 16, 3, 16, lift);
        EXPECT_EQ(sr.levels, 0u);
        EXPECT_EQ(sr.bands.size(), 1u);
        auto back = squeeze_decode_plane(sr, 16, 16, lift);
        EXPECT_EQ(back, plane);
    }
}

// Directed container-level proof of the C4 path: with the squeeze plan forced
// through the public probe hook, production must emit bit5 streams whose
// decode is exact - this exercises the encode band path, lifting llc chain,
// flag routing, and the shared merge helper end to end.
TEST(SqueezeLift, ForcedPlanContainerRoundtrip) {
    prism::Raster r(8, 8, prism::Channels::RGB, prism::BitDepth::BD8);
    for (size_t c = 0; c < r.planes.size(); ++c)
        for (size_t i = 0; i < r.planes[c].size(); ++i)
            r.planes[c][i] = (uint16_t)((i * 29 + c * 71 + (i / 8) * 13) % 256);
    prism::EncodeOpts opts;
    opts.effort = 3;
    opts.force_squeeze_levels = {1, 1, 1};
    auto bytes = prism::encode(r, opts);
    // flags byte lives at offset 16 (same layout the flag-gate tests probe)
    EXPECT_NE(bytes[16] & prism::codec::SQUEEZE_LIFT_FLAG, 0u)
        << "forced squeeze plan must mark the stream as lifting";
    auto dec = prism::decode(bytes);
    EXPECT_EQ(dec, r);

    // wrong override size is a hard error, never a silent fallback
    prism::EncodeOpts bad;
    bad.effort = 3;
    bad.force_squeeze_levels = {1};
    EXPECT_THROW(prism::encode(r, bad), prism::EncodeError);
}
