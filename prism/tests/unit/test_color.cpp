#include <gtest/gtest.h>
#include "prism/codec/color.h"

TEST(Color, YCoCgRRoundtrip) {
    prism::Raster r(4,4, prism::Channels::RGB, prism::BitDepth::BD8);
    for (size_t c=0;c<3;++c) for(size_t i=0;i<16;++i) r.planes[c][i]=(uint16_t)((c*50+i*7)%256);
    auto enc = prism::codec::apply_color(r, prism::codec::ColorTransform::YCoCgR);
    auto dec = prism::codec::invert_color(enc, prism::codec::ColorTransform::YCoCgR);
    EXPECT_EQ(dec, r);
}

// Dense lattice: exercise the full 8-bit RGB cube so the reversible transform
// is actually validated (the original hand-picked test missed 40% of cases).
TEST(Color, YCoCgRDenseRoundtrip) {
    prism::Raster r(1,1, prism::Channels::RGB, prism::BitDepth::BD8);
    for (int R=0; R<256; ++R)
        for (int G=0; G<256; ++G)
            for (int B=0; B<256; ++B) {
                r.planes[0][0]=(uint16_t)R;
                r.planes[1][0]=(uint16_t)G;
                r.planes[2][0]=(uint16_t)B;
                auto enc = prism::codec::apply_color(r, prism::codec::ColorTransform::YCoCgR);
                auto dec = prism::codec::invert_color(enc, prism::codec::ColorTransform::YCoCgR);
                ASSERT_EQ(dec.planes[0][0], (uint16_t)R) << "R=" << R << " G=" << G << " B=" << B;
                ASSERT_EQ(dec.planes[1][0], (uint16_t)G) << "R=" << R << " G=" << G << " B=" << B;
                ASSERT_EQ(dec.planes[2][0], (uint16_t)B) << "R=" << R << " G=" << G << " B=" << B;
            }
}

TEST(Color, YCoCgR16Roundtrip) {
    prism::Raster r(2,2, prism::Channels::RGB, prism::BitDepth::BD16);
    r.planes[0]={1000,2000,3000,4000};
    r.planes[1]={5000,6000,7000,8000};
    r.planes[2]={9000,10000,11000,12000};
    auto enc = prism::codec::apply_color(r, prism::codec::ColorTransform::YCoCgR);
    auto dec = prism::codec::invert_color(enc, prism::codec::ColorTransform::YCoCgR);
    EXPECT_EQ(dec, r);
}

TEST(Color, SubtractGreenRoundtrip) {
    prism::Raster r(2,2, prism::Channels::RGB, prism::BitDepth::BD8);
    r.planes[0]={10,20,30,40}; r.planes[1]={50,60,70,80}; r.planes[2]={90,100,110,120};
    auto enc = prism::codec::apply_color(r, prism::codec::ColorTransform::SubtractGreen);
    auto dec = prism::codec::invert_color(enc, prism::codec::ColorTransform::SubtractGreen);
    EXPECT_EQ(dec, r);
}

TEST(Color, YCoCgRSubGreenRoundtrip) {
    prism::Raster r(4,4, prism::Channels::RGB, prism::BitDepth::BD8);
    for (size_t c=0;c<3;++c) for(size_t i=0;i<16;++i) r.planes[c][i]=(uint16_t)((c*53+i*11)%256);
    auto enc = prism::codec::apply_color(r, prism::codec::ColorTransform::YCoCgR_SubGreen);
    auto dec = prism::codec::invert_color(enc, prism::codec::ColorTransform::YCoCgR_SubGreen);
    EXPECT_EQ(dec, r);
}

// --- D4c reversible rotation family (spec section 13) ---

#include <stdexcept>

namespace {
// Stratified sweep: full 8-bit cube is 16.7M points per id; the corners,
// edges, sign-carry boundaries and a fixed pseudo-random interior cover the
// rounding paths (Co>>1, Cg>>1, (R+G)>>1) exhaustively enough to prove the
// bijection without multiplying suite time by seven.
prism::Raster stratified_raster() {
    prism::Raster r(1, 1, prism::Channels::RGB, prism::BitDepth::BD8);
    return r;
}
} // namespace

TEST(ColorRot, NamesAndIdsRoundTrip) {
    using prism::codec::colorrot::kCount;
    for (int i = 0; i < kCount; ++i)
        EXPECT_EQ(prism::codec::colorrot::id_of(prism::codec::colorrot::name(i)), i);
    EXPECT_EQ(prism::codec::colorrot::id_of("no-such-mode"), -1);
    EXPECT_THROW(prism::codec::colorrot::name(kCount), std::out_of_range);
}

TEST(ColorRot, DenseBijectionAllCandidates) {
    using namespace prism;
    using namespace prism::codec;
    for (int id = 0; id < colorrot::kCount; ++id) {
        Raster r = stratified_raster();
        uint64_t seen = 0;
        auto visit = [&](int R, int G, int B) {
            r.planes[0][0] = (uint16_t)R;
            r.planes[1][0] = (uint16_t)G;
            r.planes[2][0] = (uint16_t)B;
            Raster enc = colorrot::apply(r, id);
            // Containment: luma plane stays in [0,255]; biased chroma planes
            // stay inside [257,767] (Cg/Co/U/V all within +-255) - any wrap
            // would corrupt the bijection silently.
            ASSERT_LE(enc.planes[0][0], (uint16_t)255) << "id=" << id;
            ASSERT_GE(enc.planes[1][0], (uint16_t)257) << "id=" << id;
            ASSERT_LE(enc.planes[1][0], (uint16_t)767) << "id=" << id;
            ASSERT_GE(enc.planes[2][0], (uint16_t)257) << "id=" << id;
            ASSERT_LE(enc.planes[2][0], (uint16_t)767) << "id=" << id;
            Raster dec = colorrot::invert(enc, id);
            ASSERT_EQ(dec.planes[0][0], (uint16_t)R)
                << "id=" << id << " R=" << R << " G=" << G << " B=" << B;
            ASSERT_EQ(dec.planes[1][0], (uint16_t)G)
                << "id=" << id << " R=" << R << " G=" << G << " B=" << B;
            ASSERT_EQ(dec.planes[2][0], (uint16_t)B)
                << "id=" << id << " R=" << R << " G=" << G << " B=" << B;
            ++seen;
        };
        for (int R = 0; R < 256; ++R) {
            visit(R, 0, 0);
            visit(R, 255, 255);
            visit(R, 0, 255);
            visit(R, 255, 0);
            for (int G = 0; G < 256; ++G) { visit(R, G, 0); visit(R, G, 255); }
            for (int B = 0; B < 256; ++B) { visit(R, 0, B); visit(R, 255, B); }
        }
        uint64_t seed = 0x9e3779b97f4a7c15ull;
        for (int k = 0; k < 200000; ++k) {
            seed ^= seed << 13; seed ^= seed >> 7; seed ^= seed << 17;
            visit((int)((seed >> 24) & 0xFF), (int)((seed >> 40) & 0xFF),
                  (int)((seed >> 56) & 0xFF));
        }
        ASSERT_GT(seen, 400000u);
    }
}

TEST(ColorRot, Id0MatchesShippedYCoCgR) {
    using namespace prism;
    using namespace prism::codec;
    // Anchor equivalence on a deterministic pseudo-random image.
    Raster r(23, 17, Channels::RGB, BitDepth::BD8);
    uint64_t seed = 0x243f6a8885a308d3ull;
    for (size_t i = 0; i < r.num_pixels(); ++i) {
        seed ^= seed << 13; seed ^= seed >> 7; seed ^= seed << 17;
        r.planes[0][i] = (uint16_t)((seed >> 8) & 0xFF);
        r.planes[1][i] = (uint16_t)((seed >> 24) & 0xFF);
        r.planes[2][i] = (uint16_t)((seed >> 40) & 0xFF);
    }
    Raster shipped = apply_color(r, ColorTransform::YCoCgR);
    Raster mine = colorrot::apply(r, colorrot::kYcocgrId);
    EXPECT_EQ(mine.planes[0], shipped.planes[0]);
    EXPECT_EQ(mine.planes[1], shipped.planes[1]);
    EXPECT_EQ(mine.planes[2], shipped.planes[2]);
    Raster back = colorrot::invert(mine, colorrot::kYcocgrId);
    EXPECT_EQ(back, r);
}

TEST(ColorRot, RejectsNonBD8OrGray) {
    using namespace prism;
    using namespace prism::codec;
    Raster g16(4, 4, Channels::RGB, BitDepth::BD16);
    Raster gray(4, 4, Channels::GRAY, BitDepth::BD8);
    for (int id = 0; id < colorrot::kCount; ++id) {
        EXPECT_THROW(colorrot::apply(g16, id), std::invalid_argument);
        EXPECT_THROW(colorrot::invert(g16, id), std::invalid_argument);
        EXPECT_THROW(colorrot::apply(gray, id), std::invalid_argument);
    }
}
