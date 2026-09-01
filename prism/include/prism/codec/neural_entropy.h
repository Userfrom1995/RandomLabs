#pragma once
#include <cstdint>
#include <vector>

namespace prism::codec {

// Entropy coding for the neural codec (E1-E, issue #226).
//
// Y_q is coded conditioned on sigma (re-derived from Z_q on decode).
// Z_q is coded with a fixed Laplacian model.
// Residual is coded with existing rANS (rans_encode_plane).
//
// Coding scheme:
// - Sign bit at P(0) = 0.5
// - Magnitude as geometric code: k zeros then a 1, each bit P(0) = lambda
// - lambda depends on sigma for Y_q, fixed for Z_q
//
// The payload does NOT contain sigma. On decode, sigma is re-derived from Z_q
// by running h_s (neural_hyper_synthesis_decode). This saves 2 bytes per
// latent value (the raw int16 sigma).

struct NeuralEntropyEncoder {
    // Encode Y_q conditioned on sigma.
    // sigma: [N * yh * yw] int16 (Q=1024 scale)
    // Returns rANS-encoded bitstream.
    static std::vector<uint8_t> encode_yq(const int8_t* yq, const int16_t* sigma,
                                           int n, int yh, int yw);

    // Encode Z_q with fixed Laplacian model.
    static std::vector<uint8_t> encode_zq(const int8_t* zq, int m, int zh, int zw);
};

struct NeuralEntropyDecoder {
    // Decode Y_q conditioned on sigma.
    // sigma must be re-derived from Z_q before calling.
    static std::vector<int8_t> decode_yq(const std::vector<uint8_t>& bytes,
                                          const int16_t* sigma, int n, int yh, int yw);

    // Decode Z_q.
    static std::vector<int8_t> decode_zq(const std::vector<uint8_t>& bytes,
                                          int m, int zh, int zw);
};

} // namespace prism::codec
