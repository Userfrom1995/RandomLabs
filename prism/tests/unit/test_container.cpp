#include <gtest/gtest.h>
#include "prism/prism.h"
#include "prism/types.h"

TEST(Container, EncodeDecodeRoundtrip) {
    prism::Raster r(4,4, prism::Channels::RGB, prism::BitDepth::BD8);
    for(size_t c=0;c<3;++c) for(size_t i=0;i<16;++i) r.planes[c][i]=(uint16_t)((i*13+c*37)%256);
    for(uint8_t e: {0,4,7}){
        prism::EncodeOpts opts; opts.effort=e;
        auto bytes = prism::encode(r, opts);
        // check magic
        EXPECT_EQ(bytes[0],'P'); EXPECT_EQ(bytes[1],'R'); EXPECT_EQ(bytes[2],'S'); EXPECT_EQ(bytes[3],'M');
        auto dec = prism::decode(bytes);
        EXPECT_EQ(dec, r) << "effort "<<(int)e;
    }
}

TEST(Container, CorruptionRejected) {
    prism::Raster r(4,4, prism::Channels::RGB, prism::BitDepth::BD8);
    for(auto& pl: r.planes) for(auto& v: pl) v=42;
    auto bytes = prism::encode(r);
    // flip a byte in payload
    bytes[bytes.size()/2] ^= 0xFF;
    EXPECT_THROW(prism::decode(bytes), prism::DecodeError);
}

TEST(Container, GrayscaleRoundtrip) {
    prism::Raster r(2,3, prism::Channels::GRAY, prism::BitDepth::BD8);
    r.planes[0]={1,2,3,4,5,6};
    auto bytes=prism::encode(r);
    auto dec=prism::decode(bytes);
    EXPECT_EQ(dec,r);
}

TEST(Container, RGBA16Roundtrip) {
    prism::Raster r(2,2, prism::Channels::RGBA, prism::BitDepth::BD16);
    for(size_t c=0;c<4;++c) for(size_t i=0;i<4;++i) r.planes[c][i]=(uint16_t)(1000+c*100+i);
    auto bytes=prism::encode(r);
    auto dec=prism::decode(bytes);
    EXPECT_EQ(dec,r);
}
