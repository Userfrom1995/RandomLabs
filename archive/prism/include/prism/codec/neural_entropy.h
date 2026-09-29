#pragma once
#include <cstdint>
#include <vector>

namespace prism::codec {

// Gaussian entropy model for the neural codec latent Y_q.
//
// Each latent symbol y_q[i] is modeled as drawn from N(0, sigma[i]^2),
// where sigma[i] is the scale parameter from the hyper-synthesis network h_s.
// The probability mass for the integer symbol is computed via the rounded
// Gaussian CDF: P(y) = Phi((y+0.5)/sigma) - Phi((y-0.5)/sigma).
//
// The coder uses per-symbol non-adaptive CDF tables indexed by quantized sigma.
// This is LIFO-safe because the CDF is fixed (not accumulated from decoded symbols).

// Number of quantized sigma bins for the CDF lookup table.
constexpr int SIGMA_BINS = 256;
constexpr float SIGMA_SCALE = 16.0f;

// Maximum alphabet size for the latent symbols (int8 range [-128, 127]).
constexpr int LATENT_ALPHABET = 256;

// CDF table entry: for a given sigma bin, cumulative probability * 65536.
struct GaussianCDFTable {
    // cdf[sigma_bin * LATENT_ALPHABET + symbol] = cumulative freq * 65536
    std::vector<uint32_t> cdf;
    // freq[sigma_bin * LATENT_ALPHABET + symbol]
    std::vector<uint32_t> freq;
};

// Build the Gaussian CDF lookup table.
GaussianCDFTable build_gaussian_cdf_table(int sigma_bins = SIGMA_BINS);

// Quantize a sigma value (int16 Q=1024 from neural codec) to a table index.
inline int quantize_sigma(int16_t sigma_q1024) {
    float sigma_f = static_cast<float>(sigma_q1024) / 1024.0f;
    int bin = static_cast<int>(sigma_f * SIGMA_SCALE);
    if (bin < 0) bin = 0;
    if (bin >= SIGMA_BINS) bin = SIGMA_BINS - 1;
    return bin;
}

// Encode a plane of latent symbols (int8) conditioned on sigma (int16 Q=1024).
// Uses rANS with per-symbol CDF from the table.
std::vector<uint8_t> neural_rans_encode(const int8_t* symbols, const int16_t* sigma,
                                         int count, const GaussianCDFTable& table);

// Decode a plane of latent symbols.
std::vector<int8_t> neural_rans_decode(const std::vector<uint8_t>& bytes, int count,
                                        const int16_t* sigma, const GaussianCDFTable& table);

// Entropy estimation: compute the Shannon entropy of a latent plane under the model.
double neural_entropy_estimate(const int8_t* symbols, const int16_t* sigma,
                                int count, const GaussianCDFTable& table);

} // namespace prism::codec
