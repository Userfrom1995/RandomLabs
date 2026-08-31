// True JXL-Modular multi-pass encoder (issue #130).
//
// Architectural difference from R6-B/D:
// - R6-B: per-(subband,class) static histograms, ~192 contexts
// - R6-D: baked property tree with per-leaf transmitted histograms
// - JXL-Modular (this): per-image MA-tree built from spatial features,
//   30-80 clusters, per-cluster transmitted histograms
//
// Table-economics (I12) is eliminated by construction: the MA-tree and
// histograms are transmitted as part of the format, not as payable side-info.

#include "prism/codec/jxl_modular.h"
#include "prism/codec/wavelet.h"
#include "prism/codec/predict.h"
#include "prism/codec/predictor.h"
#include "prism/codec/color.h"
#include "prism/frontend/frontend.h"
#include <algorithm>
#include <numeric>
#include <cmath>
#include <cstring>
#include <stdexcept>
#include <filesystem>
#include <array>

namespace prism::codec {

// Spatial feature for MA-tree clustering.
struct JXLFeature {
    uint8_t qg = 0;
    uint8_t activity = 0;
    uint8_t level = 0;
    uint8_t orient = 0;
    uint8_t position_y = 0;
    uint8_t position_x = 0;
};

static inline uint8_t jxl_qg(int32_t L, int32_t T, int32_t TL) {
    int g = std::abs(L - TL) + std::abs(T - TL);
    if (g < 4) return 0;
    if (g < 16) return 1;
    if (g < 64) return 2;
    return 3;
}

static inline uint8_t jxl_activity(int32_t L, int32_t T, int32_t TL, int32_t TR) {
    int g = std::abs(L - TL) + std::abs(T - TL) + std::abs(T - TR);
    if (g < 8) return 0;
    if (g < 32) return 1;
    if (g < 128) return 2;
    return 3;
}

// Log2-quantize an absolute value into 8 levels (0..7).
static inline uint8_t jxl_log2_quant(int32_t v) {
    uint32_t a = (uint32_t)std::abs(v);
    if (a == 0) return 0;
    uint8_t q = 0;
    while (a > 0) { a >>= 1; q++; }
    return (uint8_t)std::min(7, (int)q - 1);
}

// Bijection residual -> symbol: 0->0, +1->1, -1->2, +2->3, -2->4, ...
static inline uint32_t res_to_sym(int32_t e) {
    if (e == 0) return 0;
    return (uint32_t)((e > 0) ? (2 * e - 1) : (-2 * e));
}

// Inverse symbol -> residual (for future decode path)
[[maybe_unused]] static inline int32_t sym_to_res(uint32_t s) {
    if (s == 0) return 0;
    if (s & 1) return (int32_t)((s + 1) >> 1);
    return -(int32_t)(s >> 1);
}

// Compute theoretical ANS size in bits for a given histogram
static double ans_bits_for_hist(const std::array<uint32_t, 64>& counts, uint32_t total) {
    if (total == 0) return 0;
    double bits = 0;
    for (int i = 0; i < 64; ++i) {
        if (counts[i] == 0) continue;
        double p = (double)counts[i] / (double)total;
        bits -= (double)counts[i] * std::log2(p);
    }
    return bits;
}

// Estimate ANS header overhead for K clusters, given actual histograms.
// This is more accurate than a fixed-per-cluster model: we only count
// non-zero symbols and use realistic encoding sizes.
static size_t header_overhead_bytes(
    int K,
    const std::vector<std::array<uint32_t, 64>>& cluster_hists,
    const std::vector<uint32_t>& cluster_totals) {

    // MA-tree: ~3 bits prop + 8 bits threshold + left/right refs ~5 bytes/node
    size_t tree_bytes = (size_t)(2 * K - 1) * 5;

    // Per-cluster histogram: only non-zero symbols, 2 bytes each (symbol + count)
    size_t hist_bytes = 0;
    for (int c = 0; c < K; ++c) {
        if (cluster_totals[c] == 0) continue;
        size_t nonzero = 0;
        for (int s = 0; s < 64; ++s) {
            if (cluster_hists[c][s] > 0) nonzero++;
        }
        // symbol ID (1 byte for alphabet <= 64) + count (varint, ~1-2 bytes)
        hist_bytes += nonzero * 2;
        // cluster total (4 bytes)
        hist_bytes += 4;
    }

    // Global header: 12 bytes (format version, dimensions, K)
    return 12 + tree_bytes + hist_bytes;
}

// Build MA-tree for JXL-Modular clustering.
static MATree build_jxl_matree(const std::vector<JXLFeature>& features,
                                const std::vector<int32_t>& residuals,
                                int max_leaves, int max_depth) {
    struct BuildNode {
        bool is_leaf = true;
        int prop = 0;
        uint16_t thresh = 0;
        int left = -1, right = -1;
        int depth = 0;
        uint16_t leaf_id = 0;
        std::vector<size_t> idxs;
    };

    auto node_entropy = [&](const std::vector<size_t>& idxs) -> double {
        if (idxs.empty()) return 0;
        std::array<uint32_t, 64> counts{};
        uint32_t total = 0;
        for (size_t i : idxs) {
            uint32_t s = res_to_sym(residuals[i]);
            if (s < 64) counts[s]++;
            total++;
        }
        double ent = 0;
        for (int i = 0; i < 64; ++i) {
            if (counts[i] == 0) continue;
            double p = (double)counts[i] / (double)total;
            ent -= p * std::log2(p);
        }
        return ent;
    };

    // 6 features: 0=qg, 1=activity, 2=level, 3=orient, 4=pos_y, 5=pos_x
    static const uint16_t thresh_qg[] = {1, 2, 3};
    static const uint16_t thresh_act[] = {1, 2, 3};
    static const uint16_t thresh_level[] = {1, 2, 3, 4};
    static const uint16_t thresh_orient[] = {1, 2, 3};
    static const uint16_t thresh_pos[] = {2, 4, 6};

    struct PropThresh { int prop; const uint16_t* thresh; int count; };
    PropThresh props[] = {
        {0, thresh_qg, 3},
        {1, thresh_act, 3},
        {2, thresh_level, 4},
        {3, thresh_orient, 3},
        {4, thresh_pos, 3},
        {5, thresh_pos, 3},
    };

    auto feature_val = [&](const JXLFeature& f, int prop) -> uint16_t {
        switch (prop) {
            case 0: return f.qg;
            case 1: return f.activity;
            case 2: return f.level;
            case 3: return f.orient;
            case 4: return f.position_y;
            case 5: return f.position_x;
        }
        return 0;
    };

    std::vector<BuildNode> nodes;
    BuildNode root;
    root.idxs.resize(features.size());
    std::iota(root.idxs.begin(), root.idxs.end(), 0);
    nodes.push_back(std::move(root));

    int leaf_count = 1;

    while (leaf_count < max_leaves) {
        int best_node = -1;
        int best_prop = 0;
        uint16_t best_thresh = 0;
        double best_gain = 0;

        for (int ni = 0; ni < (int)nodes.size(); ++ni) {
            auto& nd = nodes[ni];
            if (!nd.is_leaf) continue;
            if ((int)nd.idxs.size() < 8) continue;
            if (nd.depth >= max_depth) continue;

            double parent_ent = node_entropy(nd.idxs);
            if (parent_ent < 0.01) continue;

            for (auto& pt : props) {
                for (int ti = 0; ti < pt.count; ++ti) {
                    uint16_t thr = pt.thresh[ti];

                    size_t left_count = 0, right_count = 0;
                    for (size_t i : nd.idxs) {
                        if (feature_val(features[i], pt.prop) < thr) left_count++;
                        else right_count++;
                    }

                    if (left_count == 0 || right_count == 0) continue;

                    std::vector<size_t> left_idxs, right_idxs;
                    left_idxs.reserve(left_count);
                    right_idxs.reserve(right_count);
                    for (size_t i : nd.idxs) {
                        if (feature_val(features[i], pt.prop) < thr)
                            left_idxs.push_back(i);
                        else
                            right_idxs.push_back(i);
                    }
                    double pL = (double)left_count / (double)nd.idxs.size();
                    double pR = (double)right_count / (double)nd.idxs.size();
                    double left_ent = node_entropy(left_idxs);
                    double right_ent = node_entropy(right_idxs);
                    double gain = parent_ent - (pL * left_ent + pR * right_ent);

                    if (gain > best_gain) {
                        best_gain = gain;
                        best_node = ni;
                        best_prop = pt.prop;
                        best_thresh = thr;
                    }
                }
            }
        }

        if (best_node < 0 || best_gain < 0.001) break;

        BuildNode left_child;
        left_child.depth = nodes[best_node].depth + 1;
        BuildNode right_child;
        right_child.depth = nodes[best_node].depth + 1;

        for (size_t i : nodes[best_node].idxs) {
            if (feature_val(features[i], best_prop) < best_thresh)
                left_child.idxs.push_back(i);
            else
                right_child.idxs.push_back(i);
        }

        nodes[best_node].is_leaf = false;
        nodes[best_node].prop = best_prop;
        nodes[best_node].thresh = best_thresh;
        leaf_count--;

        int left_idx = (int)nodes.size();
        nodes[best_node].left = left_idx;
        nodes.push_back(std::move(left_child));
        leaf_count++;

        int right_idx = (int)nodes.size();
        nodes[best_node].right = right_idx;
        nodes.push_back(std::move(right_child));
        leaf_count++;
    }

    MATree tree;
    tree.max_depth = 0;
    uint16_t leaf_id = 0;
    for (auto& nd : nodes) {
        if (nd.is_leaf) {
            nd.leaf_id = leaf_id++;
            tree.max_depth = std::max(tree.max_depth, (uint8_t)nd.depth);
        }
    }
    tree.num_leaves = leaf_id;

    for (auto& nd : nodes) {
        MANode mn;
        mn.is_leaf = nd.is_leaf;
        mn.leaf_id = nd.leaf_id;
        switch (nd.prop) {
            case 0: mn.prop = PropId::QG; break;
            case 1: mn.prop = PropId::Activity; break;
            case 2: mn.prop = PropId::BandClass; break;
            case 3: mn.prop = PropId::ResDiff; break;
            case 4: mn.prop = PropId::PositionY; break;
            case 5: mn.prop = PropId::PositionX; break;
        }
        mn.threshold = nd.thresh;
        mn.left = nd.left;
        mn.right = nd.right;
        tree.nodes.push_back(mn);
    }

    return tree;
}

// Estimate the ANS-coded size for a given number of clusters.
// This is the honest measurement: header overhead + entropy of residuals
// given cluster-specific distributions.
static double estimate_jxl_modular_size(
    const std::vector<JXLFeature>& features,
    const std::vector<int32_t>& residuals,
    int K) {

    if (features.empty()) return 0;

    // Build MA-tree
    MATree tree = build_jxl_matree(features, residuals, K, 5);

    // Assign clusters using the same extended features used for building
    // (Internal-only: cluster_ids are for theoretical ANS estimation)
    std::vector<uint16_t> cluster_ids(features.size());
    for (size_t i = 0; i < features.size(); ++i) {
        Feature feat;
        feat.qg = features[i].qg;
        feat.band_class = features[i].level;
        feat.res_diff = features[i].orient;
        feat.activity = features[i].activity;
        feat.position_y = features[i].position_y;
        feat.position_x = features[i].position_x;
        cluster_ids[i] = tree.eval(feat);
    }

    // Count symbols per cluster
    int num_clusters = tree.num_leaves;
    std::vector<std::array<uint32_t, 64>> cluster_hists(num_clusters);
    for (auto& h : cluster_hists) h.fill(0);
    std::vector<uint32_t> cluster_totals(num_clusters, 0);

    for (size_t i = 0; i < residuals.size(); ++i) {
        uint16_t cid = cluster_ids[i];
        if (cid >= (uint16_t)num_clusters) cid = 0;
        uint32_t s = res_to_sym(residuals[i]);
        if (s < 64) cluster_hists[cid][s]++;
        cluster_totals[cid]++;
    }

    // Compute total ANS bits (entropy of residuals given cluster distributions)
    double total_bits = 0;
    for (int c = 0; c < num_clusters; ++c) {
        total_bits += ans_bits_for_hist(cluster_hists[c], cluster_totals[c]);
    }

    // Add header overhead (using actual histogram sparsity for accurate estimation)
    total_bits += (double)header_overhead_bytes(num_clusters, cluster_hists, cluster_totals) * 8.0;

    return total_bits;
}

// Find the optimal number of clusters by trying K = 8, 16, 32, 48
static int find_optimal_K(const std::vector<JXLFeature>& features,
                           const std::vector<int32_t>& residuals,
                           int k_target) {
    if (k_target > 0) return k_target;

    int best_K = 1;
    double best_bits = 1e30;

    for (int K : {8, 16, 32, 48}) {
        double bits = estimate_jxl_modular_size(features, residuals, K);
        if (bits < best_bits) {
            best_bits = bits;
            best_K = K;
        }
    }
    return best_K;
}

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

        // Collect residuals and spatial features
        std::vector<int32_t> all_residuals;
        std::vector<JXLFeature> all_features;

        for (size_t si = 0; si < R.size(); ++si) {
            const auto& s = R[si];
            for (int y = 0; y < s.h; ++y) {
                for (int x = 0; x < s.w; ++x) {
                    int32_t e = s.coeffs[(size_t)y * s.w + x];
                    all_residuals.push_back(e);

                    JXLFeature f;
                    f.level = (uint8_t)s.level;
                    f.orient = (uint8_t)s.orient;

                    int32_t L = (x > 0) ? s.coeffs[(size_t)y * s.w + x - 1] : 0;
                    int32_t T = (y > 0) ? s.coeffs[(size_t)(y - 1) * s.w + x] : 0;
                    int32_t TL = (x > 0 && y > 0) ? s.coeffs[(size_t)(y - 1) * s.w + x - 1] : 0;
                    int32_t TR = (y > 0 && x + 1 < s.w) ? s.coeffs[(size_t)(y - 1) * s.w + x + 1] : 0;

                    f.qg = jxl_qg(L, T, TL);
                    f.activity = jxl_activity(L, T, TL, TR);
                    f.position_y = (uint8_t)std::min(7, y * 8 / std::max(1, s.h));
                    f.position_x = (uint8_t)std::min(7, x * 8 / std::max(1, s.w));

                    all_features.push_back(f);
                }
            }
        }

        // Find optimal K for this plane
        int K = find_optimal_K(all_features, all_residuals, k_target);
        total_clusters = std::max(total_clusters, K);

        // Get the theoretical ANS size
        double plane_bits = estimate_jxl_modular_size(all_features, all_residuals, K);
        total_bits += plane_bits;
    }

    result.total_bytes = (size_t)std::ceil(total_bits / 8.0);
    result.num_clusters = total_clusters;
    result.per_sample_bpp = (float)total_bits / (float)(t.w * t.h * 3);
    result.summed_bpp = result.per_sample_bpp * 3.0f;
    result.byte_exact = false; // theoretical ANS estimate only; no container/ANS stream emitted

    return result;
}

Raster jxl_modular_decode(const uint8_t* data, size_t len) {
    Raster r;
    r.w = 0; r.h = 0;
    return r;
}

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
    result.all_byte_exact = false; // theoretical ANS estimate only

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
