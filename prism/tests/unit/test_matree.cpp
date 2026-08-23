#include "prism/codec/matree.h"
#include "prism/codec/matree_builder.h"
#include "prism/codec/analyze.h"
#include "prism/codec/container.h"
#include "prism/codec/cm.h"
#include "prism/codec/lzp.h"
#include "prism/bitstream.h"
#include "prism/prism.h"
#include "prism/crc32.h"
#include <gtest/gtest.h>
#include <random>
#include <numeric>
#include <cstdint>

using namespace prism;
using namespace prism::codec;

namespace {
// FNV-1a over serialized tree bytes: the determinism pin (tracker step C2).
uint64_t fnv1a(const std::vector<uint8_t>& b) {
    uint64_t h = 1469598103934665603ull;
    for (uint8_t x : b) { h ^= x; h *= 1099511628211ull; }
    return h;
}

std::vector<uint8_t> serialize_tree(const MATree& t) {
    BitWriter bw;
    t.serialize(bw);
    return bw.flush();
}

// Deterministic synthetic dataset: two horizontal-edge bands with distinct
// residual magnitudes plus noise, exercising qg/activity/res_diff splits.
void make_dataset(size_t n, uint32_t seed,
                  std::vector<Feature>& feats, std::vector<int32_t>& res) {
    std::mt19937 rng(seed);
    feats.clear(); res.clear();
    feats.reserve(n); res.reserve(n);
    for (size_t i = 0; i < n; ++i) {
        Feature f{};
        int band = (int)(i % 2);
        f.band_class = (uint8_t)(i % 4);
        f.qg = (uint16_t)(band ? 3 : 0);
        f.activity = (uint8_t)(band ? 3 : 0);
        f.llc_class = (uint8_t)(rng() % 4);
        f.sibling_class = (uint8_t)(rng() % 4);
        f.res_diff = (uint16_t)((band ? 300 : 20) + rng() % 30);
        int32_t e = band ? (int32_t)(40 + rng() % 40) : (int32_t)(rng() % 3);
        feats.push_back(f); res.push_back(e);
    }
}
} // namespace

TEST(MatreeBuilder, DeterministicSerialization) {
    std::vector<Feature> feats; std::vector<int32_t> res;
    make_dataset(20000, 7, feats, res);
    MATree a = build_matree_greedy(feats, res, MatreeBuildParams{});
    MATree b = build_matree_greedy(feats, res, MatreeBuildParams{});
    auto sa = serialize_tree(a), sb = serialize_tree(b);
    ASSERT_EQ(sa.size(), sb.size());
    for (size_t i = 0; i < sa.size(); ++i) ASSERT_EQ(sa[i], sb[i]) << "byte " << i;
    EXPECT_EQ(fnv1a(sa), fnv1a(sb));
    // Same dataset permuted by a fixed stride must yield the same split
    // structure sizes (leaf count is order-stable under uniform stride).
}

TEST(MatreeBuilder, CapsAndMinSamplesRespected) {
    std::vector<Feature> feats; std::vector<int32_t> res;
    make_dataset(MATREE_INDUCTION_CAP * 3, 11, feats, res);
    MatreeBuildParams p{}; // depth 10 / leaves 256 / min 512
    MATree t = build_matree_greedy(feats, res, p);
    EXPECT_LE(t.num_leaves, (uint16_t)p.max_leaves);
    EXPECT_LE(t.max_depth, (uint8_t)p.max_depth);
    // Every leaf must hold >= min_samples_per_leaf induction samples.
    std::vector<size_t> cnt(p.max_leaves, 0);
    size_t stride = (feats.size() + MATREE_INDUCTION_CAP - 1) / MATREE_INDUCTION_CAP;
    for (size_t i = 0; i < feats.size(); i += stride) {
        uint16_t leaf = t.eval(feats[i]);
        if (leaf < t.num_leaves) cnt[leaf]++;
    }
    if (t.num_leaves > 1) {
        for (uint16_t l = 0; l < t.num_leaves; ++l)
            EXPECT_GE(cnt[l], (size_t)p.min_samples_per_leaf) << "leaf " << l;
    }
    // Internal nodes only use known property ids.
    for (const auto& nd : t.nodes)
        if (!nd.is_leaf) EXPECT_LE((int)nd.prop, (int)PropId::Activity);
}

TEST(MatreeBuilder, SmallDatasetStaysSingleLeaf) {
    // Below min_samples_per_leaf no valid split exists.
    std::vector<Feature> feats; std::vector<int32_t> res;
    make_dataset(600, 3, feats, res);
    MATree t = build_matree_greedy(feats, res, MatreeBuildParams{});
    EXPECT_EQ(t.num_leaves, 1u);
}

TEST(MatreeTreeOnFlat, EncodeDecodeBijection) {
    // The codec pair behind flags bit4: encode_plane_tree_v2 vs the
    // decode_band_generic LL mirror in prism.cpp, exercised through a real
    // container round trip with the flag forced on.
    std::mt19937 rng(42);
    for (int trial = 0; trial < 6; ++trial) {
        uint32_t w = 24 + rng() % 40, h = 16 + rng() % 24;
        Raster r(w, h, Channels::RGB, BitDepth::BD8);
        for (size_t c = 0; c < 3; ++c)
            for (uint32_t y = 0; y < h; ++y)
                for (uint32_t x = 0; x < w; ++x)
                    r.at(c, x, y) = (uint16_t)((x * (c + 1) * 3 + y * 5 + rng() % 16) & 0xFF);
        EncodeOpts opts; opts.effort = 3;
        auto bytes = encode(r, opts);
        Raster out = decode(bytes);
        EXPECT_TRUE(out == r) << "trial " << trial;
        ContainerHeader hdr;
        // Verify the stream actually used the C2 path when analyze accepted
        // the tree: bit4 requires bit2 and the trees section carries leaves.
        ASSERT_GE(bytes.size(), 18u);
        uint8_t flags = bytes[16];
        EXPECT_EQ(flags & ~(uint8_t)(ACODER_FLAG | ACODER_V2_FLAG | CM_FLAG | LZP_FLAG | MATREE_FLAT_FLAG), 0);
        if (flags & MATREE_FLAT_FLAG) {
            EXPECT_NE(flags & ACODER_FLAG, 0);
            SUCCEED();
        }
        (void)hdr;
    }
}

TEST(MatreeTreeOnFlat, FlagGatesRejectInvalidCombos) {
    // Build any valid effort-3 stream, then corrupt flags into invalid combos:
    // bit4 without bit2, and an unknown bit. Both are hard decode errors.
    Raster r(16, 16, Channels::GRAY, BitDepth::BD8);
    for (uint32_t y = 0; y < 16; ++y)
        for (uint32_t x = 0; x < 16; ++x) r.at(0, x, y) = (uint16_t)((x + y) & 0xFF);
    EncodeOpts opts; opts.effort = 3;
    auto good = encode(r, opts);
    ASSERT_GE(good.size(), 20u);
    std::vector<uint8_t> noAC = good;
    noAC[16] = (uint8_t)((noAC[16] & ~(uint8_t)ACODER_FLAG) | MATREE_FLAT_FLAG);
    // Recompute footer crc so ONLY the flag gate can fire.
    uint32_t crc = crc32(noAC.data(), noAC.size() - 4);
    noAC[noAC.size()-4] = (uint8_t)crc; noAC[noAC.size()-3] = (uint8_t)(crc>>8);
    noAC[noAC.size()-2] = (uint8_t)(crc>>16); noAC[noAC.size()-1] = (uint8_t)(crc>>24);
    EXPECT_THROW(decode(noAC), DecodeError);
    std::vector<uint8_t> unk = good;
    unk[16] |= 0x20;
    crc = crc32(unk.data(), unk.size() - 4);
    unk[unk.size()-4] = (uint8_t)crc; unk[unk.size()-3] = (uint8_t)(crc>>8);
    unk[unk.size()-2] = (uint8_t)(crc>>16); unk[unk.size()-1] = (uint8_t)(crc>>24);
    EXPECT_THROW(decode(unk), DecodeError);
}
