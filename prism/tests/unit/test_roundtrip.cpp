#include <gtest/gtest.h>
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
