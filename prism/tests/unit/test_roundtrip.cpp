#include <gtest/gtest.h>
#include <random>
#include "prism/prism.h"

TEST(Roundtrip, ExhaustiveSmall) {
    for(uint8_t ch=1; ch<=4; ++ch){
        for(uint8_t bd: {8,16}){
            prism::Raster r(3,3, (prism::Channels)ch, bd==8?prism::BitDepth::BD8:prism::BitDepth::BD16);
            uint32_t maxv=bd==8?255:65535;
            for(auto& pl: r.planes) for(size_t i=0;i<pl.size();++i) pl[i]=(uint16_t)((i*17+ch*31)%(maxv+1));
            auto bytes=prism::encode(r);
            auto dec=prism::decode(bytes);
            EXPECT_EQ(dec,r) << "ch"<<(int)ch<<" bd"<<(int)bd;
        }
    }
}

TEST(Roundtrip, MultipassSmall) {
    for(uint8_t ch=1; ch<=3; ++ch){
        for(uint8_t bd: {8}){
            prism::Raster r(8,8, (prism::Channels)ch, bd==8?prism::BitDepth::BD8:prism::BitDepth::BD16);
            uint32_t maxv=bd==8?255:65535;
            for(auto& pl: r.planes) for(size_t i=0;i<pl.size();++i) pl[i]=(uint16_t)((i*13+ch*7)%(maxv+1));
            prism::EncodeOpts opts;
            opts.effort = 5;
            opts.use_r3 = true;
            auto bytes=prism::encode(r, opts);
            auto dec=prism::decode(bytes);
            EXPECT_EQ(dec,r) << "ch"<<(int)ch<<" bd"<<(int)bd<<" multipass";
        }
    }
}

TEST(Roundtrip, MultipassSingleChannel) {
    prism::Raster r(16,16, prism::Channels::GRAY, prism::BitDepth::BD8);
    for(size_t i=0;i<r.planes[0].size();++i)
        r.planes[0][i] = (uint16_t)(i % 256);
    prism::EncodeOpts opts;
    opts.effort = 5;
    opts.use_r3 = true;
    auto bytes=prism::encode(r, opts);
    auto dec=prism::decode(bytes);
    EXPECT_EQ(dec, r);
}

TEST(Roundtrip, MultipassLargeRandom) {
    prism::Raster r(64,64, prism::Channels::RGB, prism::BitDepth::BD8);
    std::mt19937 rng(42);
    for(auto& pl: r.planes) for(auto& v: pl) v = rng() % 256;
    prism::EncodeOpts opts;
    opts.effort = 5;
    opts.use_r3 = true;
    auto bytes=prism::encode(r, opts);
    auto dec=prism::decode(bytes);
    EXPECT_EQ(dec, r);
}
