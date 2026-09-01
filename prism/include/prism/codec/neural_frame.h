#pragma once
#include "prism/types.h"
#include "prism/codec/neural_codec.h"
#include <cstdint>
#include <vector>

namespace prism::codec {

// Neural codec filter ID (distinct from wavelet filter IDs 0-10).
constexpr uint8_t NEURAL_FILTER_ID = 20;

// Frame-level neural codec encode: raster -> container bytes.
// Uses wavelet_container with NEURAL_FILTER_ID for serialization.
// The latent Y_q and hyper-latent Z_q are entropy-coded separately.
// The residual R = X - g_s(Y_q) is coded with the existing Prism
// bitplane coder to ensure byte-exact lossless round-trip.
std::vector<uint8_t> frame_neural_encode(const Raster& raster, size_t& net_out);

// Frame-level neural codec decode: container bytes -> raster.
// Inverse of frame_neural_encode.
Raster frame_neural_decode(const std::vector<uint8_t>& bytes);

} // namespace prism::codec
