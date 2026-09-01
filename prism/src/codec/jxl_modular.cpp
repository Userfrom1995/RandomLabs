// True JXL-Modular multi-pass encoder (issue #130).
//
// M3 closure attempt: uses the production build_matree_greedy with all 8
// Feature properties (quantile-based thresholds) and richer per-coefficient
// features (level, orient, magnitude, gradient, position).
//
// Table-economics (I12) is eliminated by construction: the MA-tree and
// histograms are transmitted as part of the format, not as payable side-info.
//
// Real encoder/decoder: 7-feature MA-tree (res_diff = abs(c_hat), symmetric
// at encode/decode) + 2048-symbol rANS with per-cluster transmitted CDFs.

#include "prism/codec/jxl_modular.h"
#include "prism/codec/wavelet.h"
#include "prism/codec/predict.h"
#include "prism/codec/predictor.h"
#include "prism/codec/color.h"
#include "prism/codec/matree_builder.h"
#include "prism/frontend/frontend.h"
#include "prism/bitstream.h"
#include <algorithm>
#include <numeric>
#include <cmath>
#include <cstring>
#include <stdexcept>
#include <filesystem>
#include <array>

namespace prism::codec {

// ---- Utility functions ----

static inline uint8_t jxl_activity(int32_t L, int32_t T, int32_t TL, int32_t TR) {
    int g = std::abs(L - TL) + std::abs(T - TL) + std::abs(T - TR);
    if (g < 8) return 0;
    if (g < 32) return 1;
    if (g < 128) return 2;
    return 3;
}

// Bijection residual -> symbol: 0->0, +1->1, -1->2, +2->3, -2->4, ...
static inline uint32_t res_to_sym(int32_t e) {
    if (e == 0) return 0;
    return (uint32_t)((e > 0) ? (2 * e - 1) : (-2 * e));
}

// Inverse symbol -> residual
static inline int32_t sym_to_res(uint32_t s) {
    if (s == 0) return 0;
    if (s & 1) return (int32_t)((s + 1) >> 1);
    return -(int32_t)(s >> 1);
}

static constexpr int kAnsAlphabet = 2048;

// ---- Theoretical estimator (existing, unchanged) ----

static double ans_bits_for_hist(const std::array<uint32_t, kAnsAlphabet>& counts, uint32_t total) {
    if (total == 0) return 0;
    double bits = 0;
    for (int i = 0; i < kAnsAlphabet; ++i) {
        if (counts[i] == 0) continue;
        double p = (double)counts[i] / (double)total;
        bits -= (double)counts[i] * std::log2(p);
    }
    return bits;
}

static size_t header_overhead_bytes(
    int num_leaves,
    const std::vector<std::array<uint32_t, kAnsAlphabet>>& cluster_hists,
    const std::vector<uint32_t>& cluster_totals) {

    size_t tree_bytes = (size_t)(2 * num_leaves - 1) * 5;

    size_t hist_bytes = 0;
    for (int c = 0; c < num_leaves; ++c) {
        if (cluster_totals[c] == 0) continue;
        size_t nonzero = 0;
        for (int s = 0; s < kAnsAlphabet; ++s) {
            if (cluster_hists[c][s] > 0) nonzero++;
        }
        hist_bytes += nonzero * 2;
        hist_bytes += 4;
    }

    return 12 + tree_bytes + hist_bytes;
}

// Build Feature for the 8-feature theoretical estimator (res_diff = actual residual).
static Feature build_sample_feature_8f(
    int level, int orient,
    int32_t coeff, int32_t L, int32_t T, int32_t TL, int32_t TR,
    int x, int y, int w, int h) {

    Feature f;
    f.qg = quant_qg(L, T, TL, TR);
    f.band_class = (uint8_t)orient;
    f.llc_class = (uint8_t)std::min(4, level);
    f.res_diff = (uint16_t)std::min(255, (int)std::abs(coeff));
    f.sibling_class = quant_sibling((int16_t)T);
    f.activity = jxl_activity(L, T, TL, TR);
    f.position_y = (uint8_t)std::min(7, y * 8 / std::max(1, h));
    f.position_x = (uint8_t)std::min(7, x * 8 / std::max(1, w));
    f.neighbor_mag = quant_neighbor_mag(L, T, TL, TR);
    return f;
}

// Build Feature for the7-feature real encoder (res_diff = abs(c_hat), decode-time symmetric).
static Feature build_sample_feature_7f(
    int level, int orient,
    int32_t predicted, int32_t L, int32_t T, int32_t TL, int32_t TR,
    int x, int y, int w, int h) {

    Feature f;
    f.qg = quant_qg(L, T, TL, TR);
    f.band_class = (uint8_t)orient;
    f.llc_class = (uint8_t)std::min(4, level);
    f.res_diff = (uint16_t)std::min(255, (int)std::abs(predicted));
    f.sibling_class = quant_sibling((int16_t)T);
    f.activity = jxl_activity(L, T, TL, TR);
    f.position_y = (uint8_t)std::min(7, y * 8 / std::max(1, h));
    f.position_x = (uint8_t)std::min(7, x * 8 / std::max(1, w));
    f.neighbor_mag = quant_neighbor_mag(L, T, TL, TR);
    return f;
}

static double estimate_jxl_modular_size(
    const std::vector<Feature>& features,
    const std::vector<int32_t>& residuals,
    int K) {

    if (features.empty()) return 0;

    MatreeBuildParams params;
    params.max_depth = 10;
    params.max_leaves = K;
    params.min_samples_per_leaf = 32;

    MATree tree = build_matree_greedy(features, residuals, params);

    int num_clusters = tree.num_leaves;
    std::vector<uint16_t> cluster_ids(features.size());
    for (size_t i = 0; i < features.size(); ++i) {
        cluster_ids[i] = tree.eval(features[i]);
    }

    std::vector<std::array<uint32_t, kAnsAlphabet>> cluster_hists(num_clusters);
    for (auto& h : cluster_hists) h.fill(0);
    std::vector<uint32_t> cluster_totals(num_clusters, 0);

    for (size_t i = 0; i < residuals.size(); ++i) {
        uint16_t cid = cluster_ids[i];
        if (cid >= (uint16_t)num_clusters) cid = 0;
        uint32_t s = res_to_sym(residuals[i]);
        if (s < (uint32_t)kAnsAlphabet) {
            cluster_hists[cid][s]++;
            cluster_totals[cid]++;
        } else {
            cluster_hists[cid][kAnsAlphabet - 1]++;
            cluster_totals[cid]++;
        }
    }

    double total_bits = 0;
    for (int c = 0; c < num_clusters; ++c) {
        total_bits += ans_bits_for_hist(cluster_hists[c], cluster_totals[c]);
    }

    total_bits += (double)header_overhead_bytes(num_clusters, cluster_hists, cluster_totals) * 8.0;

    return total_bits;
}

static int find_optimal_K(const std::vector<Feature>& features,
                           const std::vector<int32_t>& residuals,
                           int k_target) {
    if (k_target > 0) return k_target;

    int best_K = 1;
    double best_bits = 1e30;

    for (int K : {8, 16, 32, 48, 64, 128}) {
        double bits = estimate_jxl_modular_size(features, residuals, K);
        if (bits < best_bits) {
            best_bits = bits;
            best_K = K;
        }
    }
    return best_K;
}

// ---- Theoretical estimator (existing API, unchanged) ----

JXLModularResult jxl_modular_encode(const Raster& raster, int k_target) {
    JXLModularResult result;

    ColorTransform ct = (raster.bd == BitDepth::BD8) ? ColorTransform::YCoCgR
                                                      : ColorTransform::None;
    Raster t = apply_color(raster, ct);

    WaveletLift lift;
    WaveletParams p{WaveletFilter::LeGall53, 5};
    CoefficientPredictor pred;

    double total_bits = 0;
    int total_clusters = 0;

    for (size_t pi = 0; pi < t.planes.size(); ++pi) {
        std::vector<int32_t> plane(t.planes[pi].begin(), t.planes[pi].end());
        auto subs = lift.forward(plane, t.w, t.h, p);

        std::vector<int> order, parent, sib1, sib2;
        CoefficientPredictor::build_topology(subs, order, parent, sib1, sib2);
        std::vector<std::vector<int32_t>> recon(subs.size());
        for (size_t si = 0; si < subs.size(); ++si) recon[si] = subs[si].coeffs;

        std::vector<Subband> R(subs.size());
        for (size_t si = 0; si < subs.size(); ++si) {
            R[si].orient = subs[si].orient; R[si].level = subs[si].level;
            R[si].w = subs[si].w; R[si].h = subs[si].h;
            R[si].coeffs.assign((size_t)subs[si].w * subs[si].h, 0);
        }
        for (int si : order) {
            const Subband& s = subs[si];
            for (int y = 0; y < s.h; ++y)
                for (int x = 0; x < s.w; ++x) {
                    int32_t c = s.coeffs[(size_t)y * s.w + x];
                    int32_t c_hat = pred.predict(recon, subs, parent, sib1, sib2, si, x, y);
                    R[si].coeffs[(size_t)y * s.w + x] = c - c_hat;
                }
        }

        std::vector<int32_t> all_residuals;
        std::vector<Feature> all_features;

        for (size_t si = 0; si < R.size(); ++si) {
            const auto& s = R[si];
            for (int y = 0; y < s.h; ++y) {
                for (int x = 0; x < s.w; ++x) {
                    int32_t e = s.coeffs[(size_t)y * s.w + x];
                    all_residuals.push_back(e);

                    int32_t L = (x > 0) ? s.coeffs[(size_t)y * s.w + x - 1] : 0;
                    int32_t T = (y > 0) ? s.coeffs[(size_t)(y - 1) * s.w + x] : 0;
                    int32_t TL = (x > 0 && y > 0) ? s.coeffs[(size_t)(y - 1) * s.w + x - 1] : 0;
                    int32_t TR = (y > 0 && x + 1 < s.w) ? s.coeffs[(size_t)(y - 1) * s.w + x + 1] : 0;

                    all_features.push_back(build_sample_feature_8f(
                        s.level, (int)s.orient,
                        s.coeffs[(size_t)y * s.w + x],
                        L, T, TL, TR, x, y, s.w, s.h));
                }
            }
        }

        int K = find_optimal_K(all_features, all_residuals, k_target);
        total_clusters = std::max(total_clusters, K);

        double plane_bits = estimate_jxl_modular_size(all_features, all_residuals, K);
        total_bits += plane_bits;
    }

    result.total_bytes = (size_t)std::ceil(total_bits / 8.0);
    result.num_clusters = total_clusters;
    result.per_sample_bpp = (float)total_bits / (float)(t.w * t.h * 3);
    result.summed_bpp = result.per_sample_bpp * 3.0f;
    result.byte_exact = false;

    return result;
}

// ---- 512-symbol rANS static coder ----

namespace jxl_ans {

static constexpr uint32_t SCALE = 4096;    // 12-bit normalization
static constexpr uint32_t RANS_L = 1u << 22;
using RansState = uint32_t;

struct ClusterCDF {
    std::array<uint32_t, kAnsAlphabet + 1> cum_freq{};
    std::array<uint32_t, kAnsAlphabet> freq{};
};

static inline RansState RansEncRenorm(RansState x, uint8_t*& ptr, uint32_t freq) {
    uint32_t x_max = ((RANS_L >> 12) << 8) * freq;
    if (x >= x_max) {
        do {
            *--ptr = static_cast<uint8_t>(x & 0xff);
            x >>= 8;
        } while (x >= x_max);
    }
    return x;
}

static inline void RansEncFlush(RansState r, uint8_t*& ptr) {
    ptr -= 4;
    ptr[0] = static_cast<uint8_t>(r >> 0);
    ptr[1] = static_cast<uint8_t>(r >> 8);
    ptr[2] = static_cast<uint8_t>(r >> 16);
    ptr[3] = static_cast<uint8_t>(r >> 24);
}

static inline RansState RansDecInit(uint8_t*& ptr) {
    uint32_t x;
    x  = static_cast<uint32_t>(ptr[0]);
    x |= static_cast<uint32_t>(ptr[1]) << 8;
    x |= static_cast<uint32_t>(ptr[2]) << 16;
    x |= static_cast<uint32_t>(ptr[3]) << 24;
    ptr += 4;
    return x;
}

static inline RansState RansDecAdvance(RansState x, uint8_t*& ptr,
                                        uint32_t start, uint32_t freq) {
    uint32_t mask = SCALE - 1;
    x = freq * (x >> 12) + (x & mask) - start;
    if (x < RANS_L) {
        do x = (x << 8) | *ptr++; while (x < RANS_L);
    }
    return x;
}

// Normalize raw counts to CDF with sum = SCALE using largest-remainder method.
static ClusterCDF build_cdf(const uint32_t counts[kAnsAlphabet], uint32_t total) {
    ClusterCDF cdf;
    if (total == 0) {
        // Uniform distribution
        uint32_t base = SCALE / kAnsAlphabet;
        uint32_t rem = SCALE % kAnsAlphabet;
        cdf.cum_freq[0] = 0;
        for (int i = 0; i < kAnsAlphabet; ++i) {
            cdf.freq[i] = base + ((uint32_t)i < rem ? 1 : 0);
            cdf.cum_freq[i + 1] = cdf.cum_freq[i] + cdf.freq[i];
        }
        return cdf;
    }

    // Largest-remainder method
    for (int i = 0; i < kAnsAlphabet; ++i) {
        uint64_t product = (uint64_t)counts[i] * SCALE;
        uint32_t base = (uint32_t)(product / total);
        cdf.freq[i] = base;
    }

    // Distribute remainders by fractional part (descending), then index (ascending)
    struct Entry { int idx; uint64_t frac; };
    std::vector<Entry> entries;
    entries.reserve(kAnsAlphabet);
    for (int i = 0; i < kAnsAlphabet; ++i) {
        uint64_t product = (uint64_t)counts[i] * SCALE;
        uint64_t base = product / total;
        uint64_t frac = product - base * total;
        entries.push_back({i, frac});
    }
    std::sort(entries.begin(), entries.end(), [](const Entry& a, const Entry& b) {
        if (a.frac != b.frac) return a.frac > b.frac;
        return a.idx < b.idx;
    });

    // Floor each to at least 1 when total > 0 (only for observed symbols)
    for (int i = 0; i < kAnsAlphabet; ++i) {
        if (counts[i] > 0 && cdf.freq[i] < 1) cdf.freq[i] = 1;
    }

    // Re-check sum after floors
    uint32_t sum = 0;
    for (int i = 0; i < kAnsAlphabet; ++i) sum += cdf.freq[i];

    // If sum exceeds SCALE due to floors, reduce largest entries
    while (sum > SCALE) {
        int best = 0;
        for (int i = 1; i < kAnsAlphabet; ++i) {
            if (cdf.freq[i] > cdf.freq[best]) best = i;
        }
        if (cdf.freq[best] > 1) {
            cdf.freq[best]--;
            sum--;
        } else {
            break;
        }
    }

    // Distribute remaining slots
    uint32_t deficit = SCALE - sum;
    for (uint32_t k = 0; k < deficit && k < entries.size(); ++k) {
        cdf.freq[entries[k].idx]++;
    }

    // Build cumulative frequencies
    cdf.cum_freq[0] = 0;
    for (int i = 0; i < kAnsAlphabet; ++i) {
        cdf.cum_freq[i + 1] = cdf.cum_freq[i] + cdf.freq[i];
    }
    cdf.cum_freq[kAnsAlphabet] = SCALE;

    return cdf;
}

// Encode symbol stream in REVERSE order (rANS is LIFO).
static std::vector<uint8_t> encode(
    const uint32_t* symbols,
    const uint16_t* cluster_ids,
    size_t count,
    const std::vector<ClusterCDF>& cdfs) {

    if (count == 0) return {};
    std::vector<uint8_t> buf(count * 4 + 64, 0);
    uint8_t* ptr = buf.data() + buf.size();
    RansState state = RANS_L;

    for (size_t i = count; i-- > 0; ) {
        uint32_t sym = symbols[i];
        uint16_t cl = cluster_ids[i];
        if (cl >= cdfs.size()) cl = 0;
        const ClusterCDF& cdf = cdfs[cl];

        state = RansEncRenorm(state, ptr, cdf.freq[sym]);
        state = ((state / cdf.freq[sym]) << 12) + (state % cdf.freq[sym]) + cdf.cum_freq[sym];
    }

    RansEncFlush(state, ptr);
    return std::vector<uint8_t>(ptr, buf.data() + buf.size());
}

// Decode a single symbol under a given cluster's CDF.
static uint32_t decode_symbol_single(
    RansState& state,
    uint8_t*& ptr,
    const ClusterCDF& cdf) {

    uint32_t slot = state & (SCALE - 1);
    uint32_t symbol = 0;
    // Binary search for symbol
    int lo = 0, hi = kAnsAlphabet - 1;
    while (lo < hi) {
        int mid = (lo + hi) / 2;
        if (cdf.cum_freq[mid + 1] <= slot) lo = mid + 1;
        else hi = mid;
    }
    symbol = (uint32_t)lo;

    state = RansDecAdvance(state, ptr, cdf.cum_freq[symbol], cdf.freq[symbol]);
    return symbol;
}

} // namespace jxl_ans

// ---- Container format ----
//
// Layout (all multi-byte values little-endian):
//   "JXLM" (4B magic)
//   u32 width
//   u32 height
//   u8  num_planes
//   u8  bit_depth
//   u8  color_xform (0=None, 1=YCoCgR)
//   u8  wavelet_filter (1=LeGall53)
//   u8  wavelet_levels
//   u16 num_clusters
//   u32 tree_len, tree_bytes[tree_len]
//   u32 hist_len, hist_bytes[hist_len]
//   u32 ans_len, ans_bytes[ans_len]

static constexpr uint8_t JXL_MAGIC[4] = {'J', 'X', 'L', 'M'};

struct JXLContainerHeader {
    uint32_t width = 0, height = 0;
    uint8_t num_planes = 0, bit_depth = 0;
    uint8_t color_xform = 0, wavelet_filter = 1, wavelet_levels = 5;
    uint16_t num_clusters = 0;
};

static std::vector<uint8_t> serialize_container(
    const JXLContainerHeader& hdr,
    const std::vector<uint8_t>& tree_bytes,
    const std::vector<uint8_t>& hist_bytes,
    const std::vector<uint8_t>& ans_bytes) {

    std::vector<uint8_t> out;
    out.insert(out.end(), JXL_MAGIC, JXL_MAGIC + 4);
    write_u32_le_vec(out, hdr.width);
    write_u32_le_vec(out, hdr.height);
    out.push_back(hdr.num_planes);
    out.push_back(hdr.bit_depth);
    out.push_back(hdr.color_xform);
    out.push_back(hdr.wavelet_filter);
    out.push_back(hdr.wavelet_levels);
    write_u16_le_vec(out, hdr.num_clusters);

    write_u32_le_vec(out, (uint32_t)tree_bytes.size());
    out.insert(out.end(), tree_bytes.begin(), tree_bytes.end());

    write_u32_le_vec(out, (uint32_t)hist_bytes.size());
    out.insert(out.end(), hist_bytes.begin(), hist_bytes.end());

    write_u32_le_vec(out, (uint32_t)ans_bytes.size());
    out.insert(out.end(), ans_bytes.begin(), ans_bytes.end());

    return out;
}

static bool deserialize_container_header(
    const uint8_t* data, size_t len,
    JXLContainerHeader& hdr, size_t& pos) {

    if (len < 20) return false;
    if (data[0] != 'J' || data[1] != 'X' || data[2] != 'L' || data[3] != 'M') return false;
    pos = 4;
    hdr.width = read_u32_le_bytes(data + pos); pos += 4;
    hdr.height = read_u32_le_bytes(data + pos); pos += 4;
    hdr.num_planes = data[pos++];
    hdr.bit_depth = data[pos++];
    hdr.color_xform = data[pos++];
    hdr.wavelet_filter = data[pos++];
    hdr.wavelet_levels = data[pos++];
    hdr.num_clusters = read_u16_le_bytes(data + pos); pos += 2;
    return true;
}

// Serialize per-cluster CDFs as compact histograms.
// Format: for each cluster: u16 num_nonzero, then (u16 sym, u16 freq) pairs.
static std::vector<uint8_t> serialize_histograms(
    const std::vector<jxl_ans::ClusterCDF>& cdfs,
    const std::vector<uint32_t>& cluster_totals) {

    std::vector<uint8_t> out;
    uint16_t num_clusters = (uint16_t)cdfs.size();
    write_u16_le_vec(out, num_clusters);

    for (uint16_t c = 0; c < num_clusters; ++c) {
        if (cluster_totals[c] == 0) {
            write_u16_le_vec(out, 0); // no nonzero symbols
            continue;
        }
        // Count nonzero entries
        uint16_t count = 0;
        for (int s = 0; s < kAnsAlphabet; ++s) {
            if (cdfs[c].freq[s] > 0) count++;
        }
        write_u16_le_vec(out, count);
        for (int s = 0; s < kAnsAlphabet; ++s) {
            if (cdfs[c].freq[s] > 0) {
                write_u16_le_vec(out, (uint16_t)s);
                write_u16_le_vec(out, (uint16_t)cdfs[c].freq[s]);
            }
        }
    }
    return out;
}

static std::vector<jxl_ans::ClusterCDF> deserialize_histograms(
    const uint8_t* data, size_t len, size_t& pos) {

    if (pos + 2 > len) throw std::runtime_error("histogram: cluster count truncated");
    uint16_t num_clusters = read_u16_le_bytes(data + pos); pos += 2;

    std::vector<jxl_ans::ClusterCDF> cdfs(num_clusters);
    for (uint16_t c = 0; c < num_clusters; ++c) {
        auto& cdf = cdfs[c];
        cdf.cum_freq.fill(0);
        cdf.freq.fill(0);

        if (pos + 2 > len) throw std::runtime_error("histogram truncated");
        uint16_t count = read_u16_le_bytes(data + pos); pos += 2;

        for (uint16_t j = 0; j < count; ++j) {
            if (pos + 4 > len) throw std::runtime_error("histogram entry truncated");
            uint16_t sym = read_u16_le_bytes(data + pos); pos += 2;
            uint16_t freq = read_u16_le_bytes(data + pos); pos += 2;
            if (sym < kAnsAlphabet) cdf.freq[sym] = freq;
        }

        // Rebuild cumulative frequencies
        cdf.cum_freq[0] = 0;
        for (int i = 0; i < kAnsAlphabet; ++i) {
            cdf.cum_freq[i + 1] = cdf.cum_freq[i] + cdf.freq[i];
        }
    }
    return cdfs;
}

// ---- Real encoder ----

JXLModularResult jxl_modular_encode_real(const Raster& raster, int k_target) {
    JXLModularResult result;

    ColorTransform ct = (raster.bd == BitDepth::BD8) ? ColorTransform::YCoCgR
                                                      : ColorTransform::None;
    Raster t = apply_color(raster, ct);

    WaveletLift lift;
    WaveletParams wp{WaveletFilter::LeGall53, 5};
    CoefficientPredictor pred;

    // Collect all residuals, features, and cluster assignments across all planes.
    struct PlaneData {
        std::vector<int32_t> residuals;
        std::vector<Feature> features;
        std::vector<Subband> subs;
        std::vector<int> order;
        std::vector<int> parent, sib1, sib2;
    };
    std::vector<PlaneData> plane_data(t.planes.size());

    // Pass 1: compute wavelet, predictions, residuals, 7-feature vectors
    // CRITICAL: encoder must mirror decoder's progressive reconstruction.
    // recon starts as zeros and fills with c_hat + e (= original if lossless),
    // so predictions and features are identical at encode and decode time.
    for (size_t pi = 0; pi < t.planes.size(); ++pi) {
        auto& pd = plane_data[pi];
        std::vector<int32_t> plane(t.planes[pi].begin(), t.planes[pi].end());
        pd.subs = lift.forward(plane, t.w, t.h, wp);

        CoefficientPredictor::build_topology(pd.subs, pd.order, pd.parent, pd.sib1, pd.sib2);

        // Recon starts as ZEROS (matching decoder initialization)
        std::vector<std::vector<int32_t>> recon(pd.subs.size());
        for (size_t si = 0; si < pd.subs.size(); ++si)
            recon[si].assign(pd.subs[si].coeffs.size(), 0);

        // Single-pass: compute residual, feature, and update recon simultaneously
        for (int si : pd.order) {
            const auto& s = pd.subs[si];
            for (int y = 0; y < s.h; ++y) {
                for (int x = 0; x < s.w; ++x) {
                    int32_t c = s.coeffs[(size_t)y * s.w + x];
                    int32_t c_hat = pred.predict(recon, pd.subs, pd.parent, pd.sib1, pd.sib2, si, x, y);
                    int32_t e = c - c_hat;
                    pd.residuals.push_back(e);

                    // L,T,TL,TR from recon (matching decoder's causal window)
                    int32_t L = (x > 0) ? recon[si][(size_t)y * s.w + x - 1] : 0;
                    int32_t T = (y > 0) ? recon[si][(size_t)(y - 1) * s.w + x] : 0;
                    int32_t TL = (x > 0 && y > 0) ? recon[si][(size_t)(y - 1) * s.w + x - 1] : 0;
                    int32_t TR = (y > 0 && x + 1 < s.w) ? recon[si][(size_t)(y - 1) * s.w + x + 1] : 0;

                    pd.features.push_back(build_sample_feature_7f(
                        s.level, (int)s.orient,
                        c_hat,
                        L, T, TL, TR, x, y, s.w, s.h));

                    // Update recon (matches decoder: c_hat + e = c)
                    recon[si][(size_t)y * s.w + x] = c_hat + e;
                }
            }
        }
    }

    // Find optimal K across all planes combined
    // (use first plane for K estimation to avoid combining huge datasets)
    int K = k_target;
    if (K <= 0 && !plane_data.empty()) {
        K = find_optimal_K(plane_data[0].features, plane_data[0].residuals, 0);
    }
    if (K <= 0) K = 32;

    // Pass 2: build MA-tree, assign clusters, build histograms, ANS-encode
    // We build one tree per plane and encode each plane separately.
    std::vector<uint8_t> all_ans_bytes;
    std::vector<jxl_ans::ClusterCDF> all_cdfs;
    std::vector<uint32_t> all_cluster_totals;
    std::vector<uint8_t> all_tree_bytes;
    std::vector<jxl_ans::ClusterCDF> all_plane_cdfs; // for header
    int max_clusters = 0;

    // Serialize per-plane: tree + histograms + ANS payload
    std::vector<uint8_t> all_plane_data;

    for (size_t pi = 0; pi < plane_data.size(); ++pi) {
        auto& pd = plane_data[pi];

        // Build MA-tree
        MatreeBuildParams params;
        params.max_depth = 10;
        params.max_leaves = K;
        params.min_samples_per_leaf = 32;
        MATree tree = build_matree_greedy(pd.features, pd.residuals, params);

        int num_clusters = tree.num_leaves;
        max_clusters = std::max(max_clusters, num_clusters);

        // Assign clusters
        std::vector<uint16_t> cluster_ids(pd.features.size());
        for (size_t i = 0; i < pd.features.size(); ++i) {
            cluster_ids[i] = tree.eval(pd.features[i]);
        }

        // Build per-cluster histograms
        std::vector<uint32_t> counts(num_clusters * kAnsAlphabet, 0);
        std::vector<uint32_t> totals(num_clusters, 0);
        for (size_t i = 0; i < pd.residuals.size(); ++i) {
            uint16_t cid = cluster_ids[i];
            if (cid >= (uint16_t)num_clusters) cid = 0;
            uint32_t s = res_to_sym(pd.residuals[i]);
            if (s >= (uint32_t)kAnsAlphabet) {
                throw std::runtime_error("jxl_modular_encode_real: residual " + std::to_string(pd.residuals[i]) + " exceeds alphabet " + std::to_string(kAnsAlphabet));
            }
            counts[(size_t)cid * kAnsAlphabet + s]++;
            totals[cid]++;
        }

        // Build CDFs
        std::vector<jxl_ans::ClusterCDF> cdfs(num_clusters);
        for (int c = 0; c < num_clusters; ++c) {
            cdfs[c] = jxl_ans::build_cdf(&counts[(size_t)c * kAnsAlphabet], totals[c]);
        }

        // Serialize tree
        BitWriter tree_bw;
        tree.serialize(tree_bw);
        auto tree_blob = tree_bw.flush();

        // Serialize histograms
        auto hist_blob = serialize_histograms(cdfs, totals);

        // ANS-encode residuals
        std::vector<uint32_t> symbols(pd.residuals.size());
        for (size_t i = 0; i < pd.residuals.size(); ++i) {
            uint32_t s = res_to_sym(pd.residuals[i]);
            if (s >= (uint32_t)kAnsAlphabet) {
                throw std::runtime_error("jxl_modular_encode_real: residual " + std::to_string(pd.residuals[i]) + " exceeds alphabet " + std::to_string(kAnsAlphabet));
            }
            symbols[i] = s;
        }
        auto ans_blob = jxl_ans::encode(symbols.data(), cluster_ids.data(),
                                        symbols.size(), cdfs);

        // Write plane section: tree_len + tree + hist_len + hist + ans_len + ans
        std::vector<uint8_t> plane_section;
        write_u32_le_vec(plane_section, (uint32_t)tree_blob.size());
        plane_section.insert(plane_section.end(), tree_blob.begin(), tree_blob.end());
        write_u32_le_vec(plane_section, (uint32_t)hist_blob.size());
        plane_section.insert(plane_section.end(), hist_blob.begin(), hist_blob.end());
        write_u32_le_vec(plane_section, (uint32_t)ans_blob.size());
        plane_section.insert(plane_section.end(), ans_blob.begin(), ans_blob.end());

        write_u32_le_vec(all_plane_data, (uint32_t)plane_section.size());
        all_plane_data.insert(all_plane_data.end(), plane_section.begin(), plane_section.end());
    }

    // Build container
    JXLContainerHeader hdr;
    hdr.width = t.w;
    hdr.height = t.h;
    hdr.num_planes = (uint8_t)t.planes.size();
    hdr.bit_depth = to_u8(t.bd);
    hdr.color_xform = (uint8_t)ct;
    hdr.wavelet_filter = 1; // LeGall53
    hdr.wavelet_levels = 5;
    hdr.num_clusters = (uint16_t)max_clusters;

    // The container is: header + per-plane sections
    std::vector<uint8_t> container;
    container.reserve(32 + all_plane_data.size());
    container.insert(container.end(), JXL_MAGIC, JXL_MAGIC + 4);
    write_u32_le_vec(container, hdr.width);
    write_u32_le_vec(container, hdr.height);
    container.push_back(hdr.num_planes);
    container.push_back(hdr.bit_depth);
    container.push_back(hdr.color_xform);
    container.push_back(hdr.wavelet_filter);
    container.push_back(hdr.wavelet_levels);
    write_u16_le_vec(container, hdr.num_clusters);
    write_u32_le_vec(container, (uint32_t)t.planes.size()); // num_planes_sections
    container.insert(container.end(), all_plane_data.begin(), all_plane_data.end());

    result.encoded_bytes = std::move(container);
    result.total_bytes = result.encoded_bytes.size();
    result.num_clusters = max_clusters;
    size_t total_samples = (size_t)t.w * t.h * t.num_channels();
    result.per_sample_bpp = (float)((double)result.total_bytes * 8.0 / (double)total_samples);
    result.summed_bpp = result.per_sample_bpp * (float)t.num_channels();
    result.byte_exact = true;

    return result;
}

// ---- Real decoder ----

Raster jxl_modular_decode_real(const uint8_t* data, size_t len) {
    if (!data || len < 20) throw std::runtime_error("jxl_modular_decode_real: data too short");

    size_t pos = 0;
    JXLContainerHeader hdr;
    if (!deserialize_container_header(data, len, hdr, pos))
        throw std::runtime_error("jxl_modular_decode_real: bad header");

    // Parse num plane sections
    if (pos + 4 > len) throw std::runtime_error("jxl_modular_decode_real: truncated");
    uint32_t num_plane_sections = read_u32_le_bytes(data + pos); pos += 4;

    // Determine color transform
    ColorTransform ct = (ColorTransform)hdr.color_xform;

    // Create output raster
    Raster out(hdr.width, hdr.height, Channels::RGB,
               hdr.bit_depth == 16 ? BitDepth::BD16 : BitDepth::BD8);

    WaveletLift lift;
    WaveletParams wp{WaveletFilter::LeGall53, hdr.wavelet_levels};
    CoefficientPredictor pred;

    for (uint32_t ps = 0; ps < num_plane_sections && ps < (uint32_t)hdr.num_planes; ++ps) {
        if (pos + 4 > len) throw std::runtime_error("jxl_modular_decode_real: plane section truncated");
        uint32_t section_len = read_u32_le_bytes(data + pos); pos += 4;
        if (pos + section_len > len) throw std::runtime_error("jxl_modular_decode_real: plane section data truncated");

        const uint8_t* section_start = data + pos;
        size_t spos = 0;

        // Read tree
        if (spos + 4 > section_len) throw std::runtime_error("jxl_modular_decode_real: tree len truncated");
        uint32_t tree_len = read_u32_le_bytes(section_start + spos); spos += 4;
        if (spos + tree_len > section_len) throw std::runtime_error("jxl_modular_decode_real: tree truncated");
        BitReader tree_br(section_start + spos, tree_len);
        MATree tree = MATree::deserialize(tree_br);
        spos += tree_len;

        // Read histograms
        if (spos + 4 > section_len) throw std::runtime_error("jxl_modular_decode_real: hist len truncated");
        uint32_t hist_len = read_u32_le_bytes(section_start + spos); spos += 4;
        if (spos + hist_len > section_len) throw std::runtime_error("jxl_modular_decode_real: hist truncated");
        size_t hpos = 0;
        auto cdfs = deserialize_histograms(section_start + spos, hist_len, hpos);
        spos += hist_len;

        // Read ANS payload
        if (spos + 4 > section_len) throw std::runtime_error("jxl_modular_decode_real: ans len truncated");
        uint32_t ans_len = read_u32_le_bytes(section_start + spos); spos += 4;
        if (spos + ans_len > section_len) throw std::runtime_error("jxl_modular_decode_real: ans payload truncated");
        const uint8_t* ans_data = section_start + spos;

        // Reconstruct wavelet subbands (forward to get the layout)
        std::vector<int32_t> empty_plane((size_t)hdr.width * hdr.height, 0);
        auto subs = lift.forward(empty_plane, hdr.width, hdr.height, wp);

        std::vector<int> order, parent, sib1, sib2;
        CoefficientPredictor::build_topology(subs, order, parent, sib1, sib2);

        // Reconstructed coefficients per subband (all zeros initially)
        std::vector<std::vector<int32_t>> recon(subs.size());
        for (size_t si = 0; si < subs.size(); ++si)
            recon[si].assign(subs[si].coeffs.size(), 0);

        // Init ANS decoder state
        if (ans_len < 4) throw std::runtime_error("jxl_modular_decode_real: ANS payload too short");
        uint8_t* ans_ptr = const_cast<uint8_t*>(ans_data);
        auto ans_state = jxl_ans::RansDecInit(ans_ptr);

        // Single-pass decode: for each sample, compute feature, evaluate tree,
        // ANS-decode one symbol, reconstruct coefficient. This mirrors the encoder's
        // progressive recon fill exactly.
        for (int si : order) {
            const auto& s = subs[si];
            for (int y = 0; y < s.h; ++y) {
                for (int x = 0; x < s.w; ++x) {
                    int32_t c_hat = pred.predict(recon, subs, parent, sib1, sib2, si, x, y);
                    int32_t L = (x > 0) ? recon[si][(size_t)y * s.w + x - 1] : 0;
                    int32_t T = (y > 0) ? recon[si][(size_t)(y - 1) * s.w + x] : 0;
                    int32_t TL = (x > 0 && y > 0) ? recon[si][(size_t)(y - 1) * s.w + x - 1] : 0;
                    int32_t TR = (y > 0 && x + 1 < s.w) ? recon[si][(size_t)(y - 1) * s.w + x + 1] : 0;
                    Feature feat = build_sample_feature_7f(
                        s.level, (int)s.orient, c_hat, L, T, TL, TR, x, y, s.w, s.h);
                    uint16_t cid = tree.eval(feat);
                    if (cid >= cdfs.size()) cid = 0;

                    // ANS decode one symbol
                    uint32_t sym = jxl_ans::decode_symbol_single(ans_state, ans_ptr, cdfs[cid]);
                    int32_t e = sym_to_res(sym);

                    recon[si][(size_t)y * s.w + x] = c_hat + e;
                }
            }
        }

        // Collect reconstructed coefficients into output plane
        // The wavelet inverse expects the subband layout
        // We need to build the subband vector with reconstructed coeffs
        std::vector<Subband> recon_subs = subs;
        for (size_t si = 0; si < recon_subs.size(); ++si) {
            recon_subs[si].coeffs = std::move(recon[si]);
        }

        // Inverse wavelet to get pixel values
        auto pixels = lift.inverse(recon_subs, hdr.width, hdr.height, wp);

        // Store in output raster
        if (ps < out.planes.size()) {
            out.planes[ps].resize(pixels.size());
            for (size_t i = 0; i < pixels.size(); ++i) {
                out.planes[ps][i] = (uint16_t)std::max(0, std::min(65535, (int)pixels[i]));
            }
        }

        pos += section_len;
    }

    // Inverse color transform
    out = invert_color(out, ct);

    return out;
}

// ---- Legacy stub (kept for backwards compatibility) ----

Raster jxl_modular_decode(const uint8_t* data, size_t len) {
    return jxl_modular_decode_real(data, len);
}

// ---- Probe ----

JXLModularProbeResult jxl_modular_probe_kodak(const std::string& kodak_dir) {
    JXLModularProbeResult result;

    namespace fs = std::filesystem;
    std::vector<fs::path> imgs;
    for (const auto& entry : fs::directory_iterator(kodak_dir)) {
        if (entry.path().extension() == ".ppm") {
            imgs.push_back(entry.path());
        }
    }
    std::sort(imgs.begin(), imgs.end());

    result.num_images = (int)imgs.size();
    result.all_byte_exact = false;

    for (const auto& img : imgs) {
        Raster r = frontend::decode_to_raster(img);
        auto res = jxl_modular_encode(r);

        result.per_image.push_back(res);
        result.mean_per_sample_bpp += res.per_sample_bpp;
        result.mean_summed_bpp += res.summed_bpp;
    }

    if (result.num_images > 0) {
        result.mean_per_sample_bpp /= (float)result.num_images;
        result.mean_summed_bpp /= (float)result.num_images;
    }

    return result;
}

} // namespace prism::codec
