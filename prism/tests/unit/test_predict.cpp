#include <gtest/gtest.h>
#include <random>
#include <utility>
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

// ----- S1 predictor families (spec 18.4 + amendment A4; pins P-S1-*) -----

namespace {

std::vector<uint16_t> random_plane(size_t n, uint32_t seed, uint16_t maxv) {
    std::mt19937 rng(seed);
    std::vector<uint16_t> p(n);
    for (auto& v : p) v = (uint16_t)(rng() % ((uint32_t)maxv + 1));
    return p;
}

} // namespace

// P-S1-1/P-S1-2: the MED family IS the production MED stream.
TEST(S1Family, MedMatchesProductionByteForByte) {
    const uint16_t maxes[] = {255, 65535};
    for (uint32_t seed = 1; seed <= 5; ++seed) {
        for (int m = 0; m < 2; ++m) {
            for (auto shape : std::vector<std::pair<uint32_t, uint32_t>>{
                     {1, 1}, {1, 7}, {9, 1}, {2, 2}, {5, 8}, {16, 16}}) {
                auto plane = random_plane(shape.first * shape.second, seed * 31 + m,
                                          maxes[m]);
                auto prod = prism::codec::compute_residuals(
                    plane, shape.second, shape.first, prism::codec::PredId::MED);
                auto fam = prism::codec::compute_residuals_family(
                    plane, shape.second, shape.first,
                    prism::codec::PredFamily::MED, m == 0 ? 8 : 16);
                ASSERT_EQ(prod.size(), fam.size());
                EXPECT_EQ(prod, fam) << "seed " << seed << " shape "
                                     << shape.first << "x" << shape.second;
            }
        }
    }
}

// P-S1-3 amendment A4: pinned GAP vectors, all five threshold branches.
TEST(S1Family, GapPinnedVectors) {
    namespace pc = prism::codec;
    // Plain branch (|diff| <= t32): dhat = sym_round_div(2W+2N+NE-NW, 4).
    //   dh=90, dv=50 -> num=620 -> dhat=155.
    EXPECT_EQ(pc::gap_reduced_predict(200, 190, 150, 220, 140, 130, 8), 178);
    // t80 horizontal: pred = W.
    EXPECT_EQ(pc::gap_reduced_predict(200, 100, 200, 100, 255, 200, 8), 200);
    // t80 vertical: pred = N.
    EXPECT_EQ(pc::gap_reduced_predict(100, 100, 100, 400, 100, 0, 8), 100);
    // t32 tilt toward W: dhat' = sym_round_div(dhat + W, 2)
    //   (dh=110, dv=60, num=780 -> dhat=195 -> (195+200)/2 = 198).
    EXPECT_EQ(pc::gap_reduced_predict(200, 150, 200, 180, 160, 200, 8), 198);
    // t32 tilt toward N: (dh=100, dv=140, num=300 -> dhat=75 -> 88).
    EXPECT_EQ(pc::gap_reduced_predict(100, 100, 100, 200, 100, 60, 8), 88);
    // BD scaling pins the t80/t32 shifts: identical geometry crosses the
    // t80-vertical branch at BD8 (pred = N) but lands in the plain branch
    // at BD16 where the thresholds are 256x wider (dhat = 25).
    EXPECT_EQ(pc::gap_reduced_predict(100, 100, 100, 400, 100, 0, 8), 100);
    EXPECT_EQ(pc::gap_reduced_predict(100, 100, 100, 400, 100, 0, 16), 25);
    // Full-plane pinned stream (3x3, hand-computed under A4):
    // [10,15,20, 5,5,17, 32,8,20].
    std::vector<uint16_t> plane = {10, 20, 30, 15, 28, 41, 47, 52, 60};
    auto res = pc::compute_residuals_family(plane, 3, 3, pc::PredFamily::GAP, 8);
    EXPECT_EQ(res, (std::vector<int32_t>{10, 15, 20, 5, 5, 17, 32, 8, 20}));
    // Replicated-edge border (P-S1-2) on a 2x2: WW replicates L and NN
    // replicates T at every sample that lacks the farther neighbor.
    std::vector<uint16_t> q = {10, 20, 30, 40};
    auto rq = pc::compute_residuals_family(q, 2, 2, pc::PredFamily::GAP, 8);
    EXPECT_EQ(rq, (std::vector<int32_t>{10, 15, 20, 17}));
}

// P-S1-6: decoder-mirror step equality - updating from the coded residual
// (decoder side) reproduces updating from actual - pred (encoder side),
// step by step.
TEST(S1Family, WEnsembleDecoderMirrorSteps) {
    namespace pc = prism::codec;
    auto plane = random_plane(13 * 11, 777, 65535);
    const int bd = 16;
    const int64_t maxval = 65535;
    auto res = pc::compute_residuals_family(plane, 13, 11,
                                            pc::PredFamily::WENS, bd);
    pc::WEnsemble enc_side, dec_side;
    enc_side.reset();
    dec_side.reset();
    for (uint32_t y = 0; y < 11; ++y) {
        for (uint32_t x = 0; x < 13; ++x) {
            const size_t idx = y * 13 + x;
            const int32_t L = (x > 0) ? (int32_t)plane[idx - 1] : 0;
            const int32_t T = (y > 0) ? (int32_t)plane[idx - 13] : 0;
            const int32_t TL =
                (x > 0 && y > 0) ? (int32_t)plane[idx - 13 - 1] : 0;
            int32_t wp_enc[4], wp_dec[4];
            const int64_t pe = enc_side.weighted_mean(L, T, TL, maxval, wp_enc);
            const int64_t pd = dec_side.weighted_mean(L, T, TL, maxval, wp_dec);
            ASSERT_EQ(pe, pd);
            int64_t pc_l = pe;
            if (pc_l < 0) pc_l = 0;
            if (pc_l > maxval) pc_l = maxval;
            const int32_t actual = (int32_t)plane[idx];
            enc_side.update(wp_enc, pc_l, (int64_t)(actual - (int32_t)pc_l));
            dec_side.update(wp_dec, pc_l, (int64_t)res[idx]);   // err == r
            ASSERT_EQ(enc_side.w[0], dec_side.w[0]);
            ASSERT_EQ(enc_side.w[1], dec_side.w[1]);
            ASSERT_EQ(enc_side.w[2], dec_side.w[2]);
            ASSERT_EQ(enc_side.w[3], dec_side.w[3]);
        }
    }
}

// P-S1-6: weight clamps hold under adversarial error sequences.
TEST(S1Family, WeightClampsHold) {
    namespace pc = prism::codec;
    pc::WEnsemble ens;
    ens.reset();
    // Sub-predictor error zero for i=0..2 (p_i == pred): no drift there;
    // i=3 disagrees maximally and drives its weight to the ceiling.
    int32_t up[4] = {0, 0, 0, 65535};
    for (int i = 0; i < 100; ++i) ens.update(up, 0, 65535);
    EXPECT_TRUE(ens.weights_in_bounds());
    EXPECT_EQ(ens.w[0], 65536);
    EXPECT_EQ(ens.w[3], 1048576);
    for (int i = 0; i < 50; ++i) ens.update(up, 0, 65535);
    EXPECT_EQ(ens.w[3], 1048576);   // ceiling held exactly
    // Every sub-predictor far ABOVE the clamped pred with err < 0: all four
    // weights driven to the floor.
    int32_t down[4] = {65535, 65535, 65535, 65535};
    for (int i = 0; i < 100; ++i) ens.update(down, 0, -65535);
    EXPECT_TRUE(ens.weights_in_bounds());
    EXPECT_EQ(ens.w[0], 16384);
    EXPECT_EQ(ens.w[1], 16384);
    EXPECT_EQ(ens.w[2], 16384);
    EXPECT_EQ(ens.w[3], 16384);
}

// Bijection + per-plane state reset across shapes and bit depths.
TEST(S1Family, FamilyBijectionAndPlaneReset) {
    namespace pc = prism::codec;
    for (int fam_i = 0; fam_i < 3; ++fam_i) {
        const auto fam = (pc::PredFamily)fam_i;
        for (int bd : {8, 16}) {
            const uint16_t maxv = bd == 8 ? 255 : 65535;
            auto p1 = random_plane(7 * 5, 101 + fam_i, maxv);
            auto p2 = random_plane(7 * 5, 202 + fam_i, maxv);
            auto r1 = pc::compute_residuals_family(p1, 7, 5, fam, bd);
            auto r2_after = pc::compute_residuals_family(p2, 7, 5, fam, bd);
            auto r2_fresh = pc::compute_residuals_family(p2, 7, 5, fam, bd);
            EXPECT_EQ(r2_after, r2_fresh) << "state must reset per plane";
            auto back1 = pc::reconstruct_plane_family(r1, 7, 5, fam, bd);
            auto back2 = pc::reconstruct_plane_family(r2_after, 7, 5, fam, bd);
            EXPECT_EQ(back1, p1);
            EXPECT_EQ(back2, p2);
            // Degenerate shapes too.
            for (auto shape : std::vector<std::pair<uint32_t, uint32_t>>{
                     {1, 1}, {1, 9}, {9, 1}}) {
                auto pz = random_plane(shape.first * shape.second, 303, maxv);
                auto rz = pc::compute_residuals_family(pz, shape.second,
                                                       shape.first, fam, bd);
                EXPECT_EQ(pc::reconstruct_plane_family(rz, shape.second,
                                                       shape.first, fam, bd),
                          pz);
            }
        }
    }
}

