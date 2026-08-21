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
