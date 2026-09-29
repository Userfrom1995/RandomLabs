#include <gtest/gtest.h>
#include "prism/codec/rans.h"
#include <random>
#include <cmath>

TEST(Rans, PlaneRoundtrip) {
    std::vector<int32_t> res={0,1,-1,5,-10,0,100,-200, 1000, -1000, 0, 0, 7};
    auto enc = prism::codec::rans_encode_plane(res);
    auto dec = prism::codec::rans_decode_plane(enc, res.size());
    EXPECT_EQ(dec, res);
}

TEST(Rans, RandomRoundtrip) {
    std::mt19937 rng(123);
    for(int t=0;t<100;++t){
        std::vector<int32_t> res(64);
        for(auto& v:res) v = (int) (rng()%2000) - 1000;
        auto enc = prism::codec::rans_encode_plane(res);
        auto dec = prism::codec::rans_decode_plane(enc, res.size());
        EXPECT_EQ(dec,res) << t;
    }
}

TEST(Rans, Empty) {
    std::vector<int32_t> res;
    auto enc = prism::codec::rans_encode_plane(res);
    auto dec = prism::codec::rans_decode_plane(enc, 0);
    EXPECT_EQ(dec, res);
}

// Efficiency gate (Obsidian R4 mandatory): a true rANS coder's coded length
// must approach H(p). For a Bernoulli(p) source the optimal (entropy-reaching)
// fixed model uses prob = P(0)*M. With that fixed probability the coder reaches
// the entropy bound H(p) to within the renorm overhead, and the stream is an
// exact round-trip (a single running adaptive model cannot round-trip under
// rANS LIFO decoding; online causal adaptation is M1).
TEST(Rans, EfficiencyVsEntropy) {
    double p = 0.3; // P(1)
    double H = -(p * std::log2(p) + (1.0 - p) * std::log2(1.0 - p));
    std::mt19937 rng(7);
    std::bernoulli_distribution dist(p);
    const int n = 200000;
    std::vector<uint8_t> bits;
    bits.reserve(n);
    for (int i = 0; i < n; ++i) bits.push_back(dist(rng) ? 1 : 0);
    // Optimal fixed model: prob carries P(0)*M.
    uint16_t prob = (uint16_t)((1.0 - p) * 65536.0);
    auto enc = prism::codec::rans_encode_bits(bits, prob);
    double bits_per_symbol = (double)(enc.size() * 8) / n;
    // Within epsilon of entropy (renorm overhead is a few bytes over 200k syms).
    EXPECT_NEAR(bits_per_symbol, H, 0.05);
    // And strictly better than the 1.0 bit/symbol raw packing it replaced.
    EXPECT_LT(bits_per_symbol, 0.99);
    auto dec = prism::codec::rans_decode_bits(enc, n, prob);
    EXPECT_EQ(dec, bits);
}
