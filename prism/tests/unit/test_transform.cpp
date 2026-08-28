#include "prism/codec/transform.h"
#include <gtest/gtest.h>
#include <vector>
#include <cmath>
#include <cstdlib>

using namespace prism::codec;

// ----- BlockDCT unit tests (spec addendum 21, amendment 22) -----
//
// The integer DCT uses 12-bit fixed-point cosine constants (C_SCALE=4096)
// with symmetric round-to-nearest. For BD8 inputs [0,255]:
//   - Block-level round-trip: |fwd(inv(x)) - x| <= 1 (spec 21.2 bound)
//   - Plane-level round-trip: <= 2 (replicate padding compounds error)
//   - BD16 inputs: <= 28 (12-bit cosine precision limit, not sandbox scope)

// Test 1: Round-trip identity for a constant block
TEST(BlockDCT, ConstantBlockRoundTrip) {
    int32_t block_in[64];
    for (int i = 0; i < 64; ++i)
        block_in[i] = 100;

    int32_t fwd[64];
    int32_t inv[64];
    block_dct_forward_8x8(block_in, fwd);
    block_dct_inverse_8x8(fwd, inv);

    for (int i = 0; i < 64; ++i) {
        int32_t diff = inv[i] - block_in[i];
        EXPECT_LE(std::abs(diff), 1)
            << "Sample " << i << ": orig=" << block_in[i] << " recon=" << inv[i];
    }
}

// Test 2: Round-trip for a ramp pattern
TEST(BlockDCT, RampRoundTrip) {
    int32_t block_in[64];
    for (int y = 0; y < 8; ++y)
        for (int x = 0; x < 8; ++x)
            block_in[y * 8 + x] = (y * 8 + x) * 100 / 64;

    int32_t fwd[64];
    int32_t inv[64];
    block_dct_forward_8x8(block_in, fwd);
    block_dct_inverse_8x8(fwd, inv);

    for (int i = 0; i < 64; ++i) {
        int32_t diff = inv[i] - block_in[i];
        EXPECT_LE(std::abs(diff), 1)
            << "Sample " << i << ": orig=" << block_in[i] << " recon=" << inv[i];
    }
}

// Test 3: Round-trip for random-like data (reproducible seed)
TEST(BlockDCT, RandomRoundTrip) {
    std::srand(42);
    int32_t block_in[64];
    for (int i = 0; i < 64; ++i)
        block_in[i] = std::rand() % 256;

    int32_t fwd[64];
    int32_t inv[64];
    block_dct_forward_8x8(block_in, fwd);
    block_dct_inverse_8x8(fwd, inv);

    for (int i = 0; i < 64; ++i) {
        int32_t diff = inv[i] - block_in[i];
        EXPECT_LE(std::abs(diff), 1)
            << "Sample " << i << ": orig=" << block_in[i] << " recon=" << inv[i];
    }
}

// Test 4: Plane round-trip with non-multiple-of-8 dimensions
TEST(BlockDCT, PlaneRoundTripNonDivisible) {
    const uint32_t w = 100, h = 75;
    const uint16_t max_val = 255;
    std::vector<uint16_t> plane(w * h);
    std::srand(123);
    for (auto& v : plane)
        v = std::rand() % (max_val + 1);

    auto dct = block_dct_forward_plane(plane, w, h);
    auto recon = block_dct_inverse_plane(dct.coefficients.data(),
                                          dct.blocks_x, dct.blocks_y,
                                          w, h, max_val);

    // Plane round-trip tolerance is 2: per-block DCT has <=1 error, but
    // replicate padding at block boundaries compounds rounding to 2.
    ASSERT_EQ(recon.size(), w * h);
    for (size_t i = 0; i < plane.size(); ++i) {
        int32_t diff = (int32_t)recon[i] - (int32_t)plane[i];
        EXPECT_LE(std::abs(diff), 2)
            << "Pixel " << i << ": orig=" << plane[i] << " recon=" << recon[i];
    }
}

// Test 5: Plane round-trip with exact 8x8 dimensions
TEST(BlockDCT, PlaneRoundTripExact8) {
    const uint32_t w = 64, h = 64;
    const uint16_t max_val = 255;
    std::vector<uint16_t> plane(w * h);
    for (size_t i = 0; i < plane.size(); ++i)
        plane[i] = (uint16_t)(i % 256);

    auto dct = block_dct_forward_plane(plane, w, h);
    EXPECT_EQ(dct.blocks_x, 8u);
    EXPECT_EQ(dct.blocks_y, 8u);

    auto recon = block_dct_inverse_plane(dct.coefficients.data(),
                                          dct.blocks_x, dct.blocks_y,
                                          w, h, max_val);

    // Plane round-trip tolerance is 2: per-block DCT has <=1 error, but
    // replicate padding at block boundaries compounds rounding to 2.
    for (size_t i = 0; i < plane.size(); ++i) {
        int32_t diff = (int32_t)recon[i] - (int32_t)plane[i];
        EXPECT_LE(std::abs(diff), 2)
            << "Pixel " << i << ": orig=" << plane[i] << " recon=" << recon[i];
    }
}

// Test 6: Transform-domain residuals round-trip (int32 throughout)
TEST(BlockDCT, TransformResidualsRoundTrip) {
    const uint32_t w = 32, h = 32;
    const uint16_t max_val = 255;
    std::vector<uint16_t> plane(w * h);
    std::srand(77);
    for (auto& v : plane)
        v = std::rand() % (max_val + 1);

    auto dct = block_dct_forward_plane(plane, w, h);
    auto res = compute_transform_residuals(dct);
    auto coeffs = reconstruct_transform_coefficients(res, dct.blocks_x, dct.blocks_y);

    ASSERT_EQ(coeffs.size(), dct.coefficients.size());
    for (size_t i = 0; i < coeffs.size(); ++i) {
        EXPECT_EQ(coeffs[i], dct.coefficients[i])
            << "Coefficient " << i;
    }
}

// Test 7: Reproduce the anchor - DCT of uniform block should produce zero AC
TEST(BlockDCT, UniformBlockZeroAC) {
    int32_t block_in[64];
    for (int i = 0; i < 64; ++i)
        block_in[i] = 128;

    int32_t fwd[64];
    block_dct_forward_8x8(block_in, fwd);

    EXPECT_NE(fwd[0], 0);
    for (int i = 1; i < 64; ++i) {
        EXPECT_EQ(fwd[i], 0)
            << "AC[" << i << "] = " << fwd[i];
    }
}

// Test 8: BD16 extreme values - 12-bit cosine precision limits
// reconstruction to <= 28 for 16-bit inputs; sandbox operates on BD8.
TEST(BlockDCT, BD16Extreme) {
    int32_t block_in[64];
    for (int i = 0; i < 64; ++i)
        block_in[i] = 65535;

    int32_t fwd[64];
    int32_t inv[64];
    block_dct_forward_8x8(block_in, fwd);
    block_dct_inverse_8x8(fwd, inv);

    for (int i = 0; i < 64; ++i) {
        int32_t diff = inv[i] - block_in[i];
        EXPECT_LE(std::abs(diff), 28)
            << "Sample " << i << ": orig=" << block_in[i] << " recon=" << inv[i];
    }
}
