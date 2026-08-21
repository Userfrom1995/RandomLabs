#include <gtest/gtest.h>
#include "prism/codec/predict.h"

TEST(Predict, MED) {
    EXPECT_EQ(prism::codec::med_predictor(10,20,15), 15);
    EXPECT_EQ(prism::codec::med_predictor(20,10,15), 15);
    EXPECT_EQ(prism::codec::med_predictor(10,10,10), 10);
    EXPECT_EQ(prism::codec::med_predictor(10,20,5), 20);
    EXPECT_EQ(prism::codec::med_predictor(10,20,30), 10);
}

TEST(Predict, RoundtripMED) {
    std::vector<uint16_t> plane={10,20,30,40,50,60,70,80,90};
    auto res = prism::codec::compute_residuals(plane, 3,3, prism::codec::PredId::MED);
    auto rec = prism::codec::reconstruct_plane(res, 3,3, prism::codec::PredId::MED, 255);
    EXPECT_EQ(plane, rec);
}

TEST(Predict, AllPredictorsRoundtrip) {
    std::vector<uint16_t> plane(16);
    for (int i=0;i<16;++i) plane[i]= (i*37)%256;
    for (uint8_t id=0; id<=7; ++id){
        auto res = prism::codec::compute_residuals(plane,4,4, (prism::codec::PredId)id);
        auto rec = prism::codec::reconstruct_plane(res,4,4,(prism::codec::PredId)id,255);
        EXPECT_EQ(plane, rec) << "pred " << (int)id;
    }
}
