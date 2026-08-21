#include <gtest/gtest.h>
#include "prism/prism.h"
#include <random>
#include <cstdlib>

TEST(FuzzGate, RandomRoundtrip) {
    std::mt19937 rng(42);
    for(int i=0;i<200;++i){
        uint32_t w=1+(rng()%16);
        uint32_t h=1+(rng()%16);
        uint8_t ch=1+(rng()%4);
        uint8_t bd=(rng()%2)?8:16;
        uint8_t effort=(rng()%3==0)?0:(rng()%2?4:7);
        prism::Raster r(w,h,(prism::Channels)ch, bd==8?prism::BitDepth::BD8:prism::BitDepth::BD16);
        uint32_t maxv=bd==8?255:65535;
        for(auto& pl: r.planes) for(auto& v: pl) v=rng()%(maxv+1);
        prism::EncodeOpts opts; opts.effort=effort;
        auto enc=prism::encode(r,opts);
        auto dec=prism::decode(enc);
        ASSERT_EQ(dec,r) << "iter "<<i<<" "<<w<<"x"<<h<<" ch"<<(int)ch<<" bd"<<(int)bd<<" effort"<<(int)effort;
    }
}

TEST(FuzzGate, CorruptionRejection) {
    prism::Raster r(8,8,prism::Channels::RGB, prism::BitDepth::BD8);
    for(auto& pl: r.planes) for(auto& v: pl) v=rand()%256;
    auto enc=prism::encode(r);
    for(int i=0;i<10;++i){
        auto corrupt=enc;
        size_t pos=10+(rand()%(corrupt.size()-10));
        corrupt[pos]^=0xFF;
        EXPECT_THROW(prism::decode(corrupt), prism::DecodeError);
    }
}
