#include <gtest/gtest.h>
#include "prism/codec/jxl_modular.h"
#include "prism/codec/jxl_modular_ans.h"
#include "prism/types.h"
#include <cstring>

using namespace prism;
using namespace prism::codec;

TEST(JXLModularANS, EncodeDecodeRoundTrip) {
    JXLModularANS coder;
    std::vector<std::array<uint32_t, 512>> hists(1);
    hists[0].fill(0);
    hists[0][0] = 100;
    hists[0][1] = 50;
    hists[0][2] = 30;
    hists[0][3] = 20;
    std::vector<uint32_t> totals = {200};
    coder.build(hists, totals);

    std::vector<uint32_t> syms = {0, 1, 2, 3, 0, 1, 0, 0, 2, 3};
    std::vector<uint16_t> cids(syms.size(), 0);
    auto encoded = coder.encode(syms.data(), cids.data(), syms.size());
    EXPECT_FALSE(encoded.empty());

    std::vector<uint32_t> decoded(syms.size());
    coder.decode(encoded.data(), encoded.size(), decoded.data(), cids.data(), syms.size());
    EXPECT_EQ(syms, decoded);

    // Also test incremental decode_one
    {
        const uint8_t* ptr = encoded.data();
        uint32_t state = JXLModularANS::decode_init(ptr);
        for (size_t i = 0; i < syms.size(); ++i) {
            uint32_t sym = coder.decode_one(state, ptr, cids[i]);
            EXPECT_EQ(sym, syms[i]);
        }
    }
}

TEST(JXLModularRoundTrip, WaveletRoundTrip) {
    WaveletLift lift;
    WaveletParams wp{WaveletFilter::LeGall53, 5};
    std::vector<int32_t> orig(64, 42);
    auto subs = lift.forward(orig, 8, 8, wp);
    auto recon = lift.inverse(subs, 8, 8, wp);
    EXPECT_EQ(recon.size(), orig.size());
    for (size_t i = 0; i < orig.size(); ++i) {
        if (recon[i] != orig[i]) {
            ADD_FAILURE() << "sample[" << i << "]: recon=" << recon[i] << " orig=" << orig[i];
            break;
        }
    }
}

static Raster make_solid(uint32_t w, uint32_t h, uint16_t val) {
    Raster r(w, h, Channels::RGB, BitDepth::BD8);
    for (auto& plane : r.planes)
        std::fill(plane.begin(), plane.end(), val);
    return r;
}

static Raster make_gradient(uint32_t w, uint32_t h) {
    Raster r(w, h, Channels::RGB, BitDepth::BD8);
    for (size_t c = 0; c < r.planes.size(); ++c)
        for (uint32_t y = 0; y < h; ++y)
            for (uint32_t x = 0; x < w; ++x)
                r.planes[c][y * w + x] = (uint16_t)((x * 7 + y * 3 + c * 50) & 0xFF);
    return r;
}

static Raster make_solid_u16(uint32_t w, uint32_t h, uint16_t val) {
    Raster r(w, h, Channels::RGB, BitDepth::BD16);
    for (auto& plane : r.planes)
        std::fill(plane.begin(), plane.end(), val);
    return r;
}

TEST(JXLModularRoundTrip, Solid256x256_NoColorTransform) {
    Raster orig = make_solid_u16(256, 256, 42);
    auto res = jxl_modular_encode(orig);
    EXPECT_FALSE(res.encoded_bytes.empty());
    EXPECT_TRUE(res.byte_exact) << "per_sample=" << res.per_sample_bpp
        << " total_bytes=" << res.total_bytes;
}

TEST(JXLModularRoundTrip, Solid16x16_NoColorTransform) {
    Raster orig = make_solid_u16(16, 16, 128);
    auto res = jxl_modular_encode(orig, 1);
    EXPECT_FALSE(res.encoded_bytes.empty());
    EXPECT_TRUE(res.byte_exact) << "per_sample=" << res.per_sample_bpp
        << " total_bytes=" << res.total_bytes;
}

TEST(JXLModularRoundTrip, Solid16x16) {
    Raster orig = make_solid(16, 16, 128);
    auto res = jxl_modular_encode(orig);
    EXPECT_FALSE(res.encoded_bytes.empty());

    Raster decoded = jxl_modular_decode(res.encoded_bytes.data(), res.encoded_bytes.size());
    EXPECT_EQ(decoded.w, orig.w);
    EXPECT_EQ(decoded.h, orig.h);
    EXPECT_EQ(decoded.planes.size(), orig.planes.size());

    size_t mismatches = 0;
    for (size_t c = 0; c < orig.planes.size(); ++c) {
        for (size_t i = 0; i < orig.planes[c].size(); ++i) {
            if (decoded.planes[c][i] != orig.planes[c][i]) {
                if (mismatches < 5) {
                    ADD_FAILURE() << "plane[" << c << "][" << i << "]: decoded="
                        << decoded.planes[c][i] << " orig=" << orig.planes[c][i];
                }
                mismatches++;
            }
        }
    }
    if (mismatches > 0)
        ADD_FAILURE() << "total mismatches: " << mismatches;
    EXPECT_TRUE(res.byte_exact);
}

TEST(JXLModularRoundTrip, TruncatedDataThrows) {
    Raster orig = make_solid(16, 16, 100);
    auto res = jxl_modular_encode(orig);
    EXPECT_THROW(jxl_modular_decode(res.encoded_bytes.data(), 4), std::runtime_error);
}

TEST(JXLModularRoundTrip, BadMagicThrows) {
    uint8_t garbage[32] = {};
    EXPECT_THROW(jxl_modular_decode(garbage, 32), std::runtime_error);
}

TEST(JXLModularRoundTrip, Gradient64x64_NoColorTransform) {
    Raster orig = make_gradient(64, 64);
    auto res = jxl_modular_encode(orig, 1);
    EXPECT_FALSE(res.encoded_bytes.empty());
    Raster decoded = jxl_modular_decode(res.encoded_bytes.data(), res.encoded_bytes.size());
    size_t mismatches = 0;
    for (size_t c = 0; c < orig.planes.size(); ++c)
        for (size_t i = 0; i < orig.planes[c].size(); ++i)
            if (decoded.planes[c][i] != orig.planes[c][i]) mismatches++;
    EXPECT_EQ(mismatches, 0u) << "per_sample=" << res.per_sample_bpp;
    EXPECT_TRUE(res.byte_exact);
}
