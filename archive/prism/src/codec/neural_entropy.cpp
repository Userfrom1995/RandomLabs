// Neural codec Gaussian entropy model and conditional rANS coder (E1-E, issue #226).

#include "prism/codec/neural_entropy.h"
#include <cmath>
#include <algorithm>
#include <stdexcept>
#include <cstring>

namespace prism::codec {

namespace {
constexpr uint32_t RANS_BYTE_L = 1u << 23;
constexpr uint32_t RANS_M = 1u << 16;
constexpr uint32_t RANS_SCALE_BITS = 16;
constexpr uint32_t RANS_MASK = RANS_M - 1;
using RansState = uint32_t;

static inline void RansEncInit(RansState* r) { *r = RANS_BYTE_L; }

static inline RansState RansEncRenorm(RansState x, uint8_t** pptr, uint32_t freq) {
    uint32_t x_max = ((RANS_BYTE_L >> RANS_SCALE_BITS) << 8) * freq;
    if (x >= x_max) {
        uint8_t* ptr = *pptr;
        do {
            *--ptr = static_cast<uint8_t>(x & 0xff);
            x >>= 8;
        } while (x >= x_max);
        *pptr = ptr;
    }
    return x;
}

static inline void RansEncPut(RansState* r, uint8_t** pptr, uint32_t start, uint32_t freq) {
    RansState x = RansEncRenorm(*r, pptr, freq);
    *r = ((x / freq) << RANS_SCALE_BITS) + (x % freq) + start;
}

static inline void RansEncFlush(RansState* r, uint8_t** pptr) {
    uint32_t x = *r;
    uint8_t* ptr = *pptr;
    ptr -= 4;
    ptr[0] = static_cast<uint8_t>(x >> 0);
    ptr[1] = static_cast<uint8_t>(x >> 8);
    ptr[2] = static_cast<uint8_t>(x >> 16);
    ptr[3] = static_cast<uint8_t>(x >> 24);
    *pptr = ptr;
}

static inline void RansDecInit(RansState* r, uint8_t** pptr) {
    uint32_t x;
    uint8_t* ptr = *pptr;
    x  = static_cast<uint32_t>(ptr[0]);
    x |= static_cast<uint32_t>(ptr[1]) << 8;
    x |= static_cast<uint32_t>(ptr[2]) << 16;
    x |= static_cast<uint32_t>(ptr[3]) << 24;
    ptr += 4;
    *pptr = ptr;
    *r = x;
}

static inline void RansDecAdvance(RansState* r, uint8_t** pptr, uint32_t start, uint32_t freq) {
    uint32_t x = *r;
    x = freq * (x >> RANS_SCALE_BITS) + (x & RANS_MASK) - start;
    if (x < RANS_BYTE_L) {
        uint8_t* ptr = *pptr;
        do x = (x << 8) | *ptr++; while (x < RANS_BYTE_L);
        *pptr = ptr;
    }
    *r = x;
}

// Standard normal CDF approximation (Abramowitz and Stegun).
float standard_normal_cdf(float x) {
    constexpr float a1 =  0.254829592f;
    constexpr float a2 = -0.284496736f;
    constexpr float a3 =  1.421413741f;
    constexpr float a4 = -1.453152027f;
    constexpr float a5 =  1.061405429f;
    constexpr float p  =  0.3275911f;

    float sign = 1.0f;
    if (x < 0) {
        sign = -1.0f;
        x = -x;
    }
    float t = 1.0f / (1.0f + p * x);
    float y = 1.0f - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * std::exp(-x * x * 0.5f);
    return 0.5f * (1.0f + sign * y);
}

float rounded_gaussian_pmf(int k, float sigma) {
    if (sigma < 1e-6f) sigma = 1e-6f;
    float upper = (k + 0.5f) / sigma;
    float lower = (k - 0.5f) / sigma;
    return standard_normal_cdf(upper) - standard_normal_cdf(lower);
}

constexpr float MIN_SIGMA = 0.01f;
} // namespace

GaussianCDFTable build_gaussian_cdf_table(int sigma_bins) {
    GaussianCDFTable table;
    table.cdf.resize(static_cast<size_t>(sigma_bins) * LATENT_ALPHABET);
    table.freq.resize(static_cast<size_t>(sigma_bins) * LATENT_ALPHABET);

    for (int sb = 0; sb < sigma_bins; ++sb) {
        float sigma = static_cast<float>(sb) / SIGMA_SCALE;
        if (sigma < MIN_SIGMA) sigma = MIN_SIGMA;

        // Compute PMF for all 256 symbols.
        double pmf[256];
        double sum = 0.0;
        for (int i = 0; i < 256; ++i) {
            int k = i - 128;
            pmf[i] = static_cast<double>(rounded_gaussian_pmf(k, sigma));
            if (pmf[i] < 1e-15) pmf[i] = 1e-15;
            sum += pmf[i];
        }
        for (int i = 0; i < 256; ++i) {
            pmf[i] /= sum;
        }

        // Allocate frequencies: assign at least 1 to each symbol, then distribute
        // the remaining budget proportionally.
        // Minimum total: 256 (one per symbol). Remaining: 65536 - 256 = 65280.
        constexpr uint32_t TOTAL = RANS_M;
        constexpr uint32_t BASE = 1;
        uint32_t remaining = TOTAL - 256 * BASE;  // 65280

        uint32_t freq_raw[256];
        uint32_t total_assigned = 0;
        for (int i = 0; i < 256; ++i) {
            freq_raw[i] = BASE;
            total_assigned += BASE;
        }

        // Distribute remaining budget proportionally.
        for (int i = 0; i < 256; ++i) {
            uint32_t extra = static_cast<uint32_t>(pmf[i] * remaining + 0.5);
            freq_raw[i] += extra;
            total_assigned += extra;
        }

        // Fix rounding remainder by adjusting the most probable symbol.
        if (total_assigned < TOTAL) {
            // Find the symbol with highest PMF.
            int best = 0;
            for (int i = 1; i < 256; ++i) {
                if (pmf[i] > pmf[best]) best = i;
            }
            freq_raw[best] += (TOTAL - total_assigned);
        } else if (total_assigned > TOTAL) {
            int best = 0;
            for (int i = 1; i < 256; ++i) {
                if (pmf[i] > pmf[best]) best = i;
            }
            freq_raw[best] -= (total_assigned - TOTAL);
        }

        // Build CDF from frequencies.
        uint32_t running = 0;
        for (int i = 0; i < 256; ++i) {
            table.cdf[sb * 256 + i] = running;
            table.freq[sb * 256 + i] = freq_raw[i];
            running += freq_raw[i];
        }
    }

    return table;
}

std::vector<uint8_t> neural_rans_encode(const int8_t* symbols, const int16_t* sigma,
                                         int count, const GaussianCDFTable& table) {
    std::vector<uint8_t> buf(static_cast<size_t>(count) * 4 + 64, 0);
    uint8_t* ptr = buf.data() + buf.size();

    RansState state;
    RansEncInit(&state);

    for (int i = count; i-- > 0; ) {
        int sb = quantize_sigma(sigma[i]);
        int sym_idx = static_cast<int>(static_cast<uint8_t>(symbols[i]));
        uint32_t start = table.cdf[sb * 256 + sym_idx];
        uint32_t freq = table.freq[sb * 256 + sym_idx];

        RansEncPut(&state, &ptr, start, freq);
    }

    RansEncFlush(&state, &ptr);
    return std::vector<uint8_t>(ptr, buf.data() + buf.size());
}

std::vector<int8_t> neural_rans_decode(const std::vector<uint8_t>& bytes, int count,
                                        const int16_t* sigma, const GaussianCDFTable& table) {
    if (bytes.size() < 4) throw std::runtime_error("neural_rans_decode: too short");

    uint8_t* d = const_cast<uint8_t*>(bytes.data());
    RansState state;
    RansDecInit(&state, &d);

    std::vector<int8_t> out(count);

    for (int i = 0; i < count; ++i) {
        int sb = quantize_sigma(sigma[i]);
        uint32_t slot = state & RANS_MASK;

        // Binary search to find the symbol whose CDF range contains slot.
        // cdf[sym] <= slot < cdf[sym] + freq[sym]
        const uint32_t* cdf_row = table.cdf.data() + sb * 256;
        const uint32_t* freq_row = table.freq.data() + sb * 256;

        int lo = 0, hi = 255;
        while (lo < hi) {
            int mid = (lo + hi + 1) / 2;
            if (cdf_row[mid] <= slot) {
                lo = mid;
            } else {
                hi = mid - 1;
            }
        }

        uint32_t start = cdf_row[lo];
        uint32_t freq = freq_row[lo];

        RansDecAdvance(&state, &d, start, freq);

        out[i] = static_cast<int8_t>(static_cast<uint8_t>(lo));
    }

    return out;
}

double neural_entropy_estimate(const int8_t* symbols, const int16_t* sigma,
                                int count, const GaussianCDFTable& table) {
    double total_bits = 0.0;
    for (int i = 0; i < count; ++i) {
        int sb = quantize_sigma(sigma[i]);
        int sym_idx = static_cast<int>(static_cast<uint8_t>(symbols[i]));
        uint32_t freq = table.freq[sb * 256 + sym_idx];
        double p = static_cast<double>(freq) / RANS_M;
        total_bits += -std::log2(p);
    }
    return total_bits / count;
}

} // namespace prism::codec
