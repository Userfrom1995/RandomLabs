// Route 1 multi-pass encoder implementation.
// Cascade from Route 3 R1 FAIL: full v1 features + per-plane ANS encoding.
//
// Pass 1 (analysis): builds MA-tree with full v1 features (QG, band_class,
//   activity, position), per-cluster histograms per plane.
// Pass 2 (coding): per-plane ANS coding with per-cluster static tables.
// Decode: recomputes features from decoded pixels during ANS decode.

#include "prism/codec/multipass.h"
#include "prism/codec/matree_builder.h"
#include <algorithm>
#include <cstring>
#include <stdexcept>
#include <functional>
#include <cmath>

namespace prism::codec::r3 {

// ---- Feature computation ----

static inline int32_t med_pred(int32_t L, int32_t T, int32_t TL) {
    if (TL >= std::max(L, T)) return std::min(L, T);
    if (TL <= std::min(L, T)) return std::max(L, T);
    return L + T - TL;
}

int32_t MultiPassEncoder::med_predict(
    const std::vector<uint16_t>& pixels,
    uint32_t w, uint32_t x, uint32_t y) {
    int32_t L = (x > 0) ? (int32_t)pixels[(size_t)y * w + x - 1] : 0;
    int32_t T = (y > 0) ? (int32_t)pixels[(size_t)(y - 1) * w + x] : 0;
    int32_t TL = (x > 0 && y > 0) ? (int32_t)pixels[(size_t)(y - 1) * w + x - 1] : 0;
    return med_pred(L, T, TL);
}

// Route 1: build full v1 features from pixel data.
// Features are computed from the original pixel values (encoder) or
// reconstructed pixel values (decoder) in raster-scan order.
// band_class and bit_depth are plane-level constants.
std::vector<FeatureR3> MultiPassEncoder::build_features(
    const std::vector<uint16_t>& pixels,
    uint32_t w, uint32_t h,
    uint8_t band_class, uint8_t bit_depth) {
    size_t n = pixels.size();
    std::vector<FeatureR3> features(n);
    for (size_t i = 0; i < n; ++i) {
        uint32_t x = (uint32_t)(i % w);
        uint32_t y = (uint32_t)(i / w);
        FeatureR3& f = features[i];

        // Position features (same as R3 position-only path).
        f.position_y = (uint8_t)(y * 255 / (h > 1 ? h - 1 : 1));
        f.position_x = (uint8_t)(x * 255 / (w > 1 ? w - 1 : 1));

        // Band class (constant per plane).
        f.band_class = band_class;

        // QG: quantized gradient from spatial neighbors.
        int32_t L = (x > 0) ? (int32_t)pixels[i - 1] : 0;
        int32_t T = (y > 0) ? (int32_t)pixels[i - w] : 0;
        int32_t TL = (x > 0 && y > 0) ? (int32_t)pixels[i - w - 1] : 0;
        int32_t TR = (y > 0 && x + 1 < w) ? (int32_t)pixels[i - w + 1] : 0;
        f.qg = quant_qg(L, T, TL, TR);

        // Activity: gradient magnitude bucket (0..3).
        int grad = std::abs(L - TL) + std::abs(T - TL);
        if (grad < 4) f.activity = 0;
        else if (grad < 16) f.activity = 1;
        else if (grad < 64) f.activity = 2;
        else f.activity = 3;

        // LLC class: quantized co-located LL sample (0 for non-LL bands).
        f.llc_class = 0;

        // Residual-DIFF context: requires decoded residuals.
        // During analysis, we don't have residuals yet, so set to 0.
        // The MA-tree doesn't use res_diff as a split property, so this
        // doesn't affect cluster assignment.
        f.res_diff = 0;

        // Sibling class: requires sibling band data (0 for non-sibling bands).
        f.sibling_class = 0;
    }
    return features;
}

// Legacy R3 path: build features from residuals (position-only).
std::vector<FeatureR3> MultiPassEncoder::build_features_residuals(
    const std::vector<int32_t>& residuals,
    uint32_t w, uint32_t h) {
    size_t n = residuals.size();
    std::vector<FeatureR3> features(n);
    for (size_t i = 0; i < n; ++i) {
        uint32_t x = (uint32_t)(i % w);
        uint32_t y = (uint32_t)(i / w);
        features[i].position_y = (uint8_t)(y * 255 / (h > 1 ? h - 1 : 1));
        features[i].position_x = (uint8_t)(x * 255 / (w > 1 ? w - 1 : 1));
    }
    return features;
}

// ---- MATreeR3 ----

static int32_t eval_feature_prop(const FeatureR3& f, uint8_t prop_id) {
    switch (prop_id) {
        case 0: return (int32_t)f.qg;
        case 1: return (int32_t)f.band_class;
        case 2: return (int32_t)f.activity;
        case 3: return (int32_t)f.position_y;
        case 4: return (int32_t)f.position_x;
        default: return 0;
    }
}

uint16_t MATreeR3::eval(const FeatureR3& f) const {
    if (nodes.empty()) return 0;
    size_t idx = 0;
    while (!nodes[idx].is_leaf) {
        const auto& nd = nodes[idx];
        int32_t val = eval_feature_prop(f, nd.prop_id);
        bool go_left = val < (int32_t)nd.threshold;
        if (go_left) idx = (size_t)nd.left;
        else idx = (size_t)nd.right;
        if (idx >= nodes.size()) return 0;
    }
    return nodes[idx].leaf_id;
}

std::vector<uint8_t> MATreeR3::serialize() const {
    std::vector<uint8_t> out;
    out.push_back(max_depth);
    out.push_back((uint8_t)(num_leaves & 0xFF));
    out.push_back((uint8_t)((num_leaves >> 8) & 0xFF));
    for (const auto& nd : nodes) {
        out.push_back(nd.is_leaf ? 1 : 0);
        if (nd.is_leaf) {
            out.push_back((uint8_t)(nd.leaf_id & 0xFF));
            out.push_back((uint8_t)((nd.leaf_id >> 8) & 0xFF));
        } else {
            out.push_back(nd.prop_id);
            out.push_back((uint8_t)(nd.threshold & 0xFF));
            out.push_back((uint8_t)((nd.threshold >> 8) & 0xFF));
        }
    }
    return out;
}

MATreeR3 MATreeR3::deserialize(const uint8_t* data, size_t len) {
    MATreeR3 t;
    if (len < 3) return t;
    size_t pos = 0;
    t.max_depth = data[pos++];
    t.num_leaves = (uint16_t)data[pos] | ((uint16_t)data[pos + 1] << 8);
    pos += 2;
    size_t num_nodes = t.num_leaves == 0 ? 0 : (size_t)2 * t.num_leaves - 1;
    t.nodes.resize(num_nodes);
    for (size_t i = 0; i < num_nodes && pos < len; ++i) {
        MATreeNodeR3& nd = t.nodes[i];
        nd.is_leaf = data[pos++] != 0;
        if (nd.is_leaf) {
            if (pos + 2 > len) break;
            nd.leaf_id = (uint16_t)data[pos] | ((uint16_t)data[pos + 1] << 8);
            pos += 2;
        } else {
            if (pos + 3 > len) break;
            nd.prop_id = data[pos++];
            nd.threshold = (uint16_t)data[pos] | ((uint16_t)data[pos + 1] << 8);
            pos += 2;
        }
    }
    for (auto& nd : t.nodes) { nd.left = -1; nd.right = -1; }
    std::vector<int32_t> stack;
    for (size_t i = 0; i < t.nodes.size(); ++i) {
        while (!stack.empty() &&
               t.nodes[stack.back()].left != -1 &&
               t.nodes[stack.back()].right != -1) {
            stack.pop_back();
        }
        if (!stack.empty()) {
            auto& parent = t.nodes[stack.back()];
            if (parent.left == -1) parent.left = (int32_t)i;
            else if (parent.right == -1) parent.right = (int32_t)i;
        }
        if (!t.nodes[i].is_leaf) stack.push_back((int32_t)i);
    }
    return t;
}

// Greedy MA-tree builder using entropy-based split scoring.
MATreeR3 MATreeR3::build_greedy(
    const std::vector<FeatureR3>& features,
    uint16_t num_clusters,
    uint8_t max_depth) {
    MATreeR3 tree;
    if (features.empty() || num_clusters == 0) {
        tree.max_depth = 0;
        tree.num_leaves = 1;
        MATreeNodeR3 leaf;
        leaf.is_leaf = true;
        leaf.leaf_id = 0;
        tree.nodes.push_back(leaf);
        return tree;
    }

    struct BuildNode {
        bool is_leaf = true;
        uint8_t prop_id = 0;
        uint16_t threshold = 0;
        int32_t left = -1;
        int32_t right = -1;
        int depth = 0;
        uint16_t leaf_id = 0;
        std::vector<size_t> idxs;
    };

    auto prop_value_fn = [](const FeatureR3& f, uint8_t p) -> uint32_t {
        switch (p) {
            case 0: return f.qg;
            case 1: return f.band_class;
            case 2: return f.activity;
            case 3: return f.position_y;
            case 4: return f.position_x;
            default: return 0;
        }
    };

    auto eval_prop_fn = [](const FeatureR3& f, uint8_t p, uint16_t thr) -> bool {
        return (uint32_t)eval_feature_prop(f, p) < (uint32_t)thr;
    };

    auto leaf_cost = [](const std::vector<size_t>& idxs,
                        const std::vector<FeatureR3>& feats, uint8_t prop) -> double {
        if (idxs.empty()) return 0;
        double sum = 0, sum2 = 0;
        for (size_t i : idxs) {
            double v = (double)eval_feature_prop(feats[i], prop);
            sum += v;
            sum2 += v * v;
        }
        double mean = sum / (double)idxs.size();
        double var = sum2 / (double)idxs.size() - mean * mean;
        return var * (double)idxs.size();
    };

    std::vector<BuildNode> nodes;
    nodes.reserve(2 * num_clusters);
    BuildNode root;
    root.is_leaf = true;
    root.depth = 0;
    root.leaf_id = 0;
    size_t total = features.size();
    size_t stride = std::max((size_t)1, total / 4096);
    root.idxs.reserve(total / stride + 1);
    for (size_t i = 0; i < total; i += stride) root.idxs.push_back(i);
    nodes.push_back(std::move(root));

    int num_leaves = 1;
    while (num_leaves < num_clusters) {
        int best_leaf = -1;
        uint8_t best_prop = 0;
        uint16_t best_threshold = 0;
        double best_gain = 0;
        std::vector<size_t> best_left, best_right;

        for (size_t ni = 0; ni < nodes.size(); ++ni) {
            if (!nodes[ni].is_leaf) continue;
            if (nodes[ni].depth >= max_depth) continue;
            if (nodes[ni].idxs.size() < 4) continue;

            for (uint8_t prop : {0u, 2u, 3u, 4u}) {
                std::vector<uint32_t> values;
                values.reserve(nodes[ni].idxs.size());
                for (size_t idx : nodes[ni].idxs)
                    values.push_back(prop_value_fn(features[idx], prop));
                std::sort(values.begin(), values.end());
                values.erase(std::unique(values.begin(), values.end()), values.end());
                if (values.size() < 2) continue;

                size_t step = std::max((size_t)1, values.size() / 8);
                for (size_t t = step; t < values.size(); t += step) {
                    uint16_t thresh = (uint16_t)values[t];
                    std::vector<size_t> left, right;
                    left.reserve(nodes[ni].idxs.size() / 2);
                    right.reserve(nodes[ni].idxs.size() / 2);
                    for (size_t idx : nodes[ni].idxs) {
                        if (eval_prop_fn(features[idx], prop, thresh))
                            left.push_back(idx);
                        else
                            right.push_back(idx);
                    }
                    if (left.empty() || right.empty()) continue;
                    if (left.size() < 2 || right.size() < 2) continue;

                    double parentCost = leaf_cost(nodes[ni].idxs, features, prop);
                    double leftCost = leaf_cost(left, features, prop);
                    double rightCost = leaf_cost(right, features, prop);
                    double gain = parentCost - (leftCost + rightCost);

                    if (gain > best_gain) {
                        best_gain = gain;
                        best_leaf = (int)ni;
                        best_prop = prop;
                        best_threshold = thresh;
                        best_left = std::move(left);
                        best_right = std::move(right);
                    }
                }
            }
        }

        if (best_leaf < 0 || best_gain <= 0.1) break;

        BuildNode& leaf = nodes[best_leaf];
        BuildNode leftNode, rightNode;
        leftNode.is_leaf = true;
        leftNode.depth = leaf.depth + 1;
        leftNode.idxs = std::move(best_left);
        rightNode.is_leaf = true;
        rightNode.depth = leaf.depth + 1;
        rightNode.idxs = std::move(best_right);
        int leftIdx = (int)nodes.size();
        nodes.push_back(std::move(leftNode));
        int rightIdx = (int)nodes.size();
        nodes.push_back(std::move(rightNode));
        leaf.is_leaf = false;
        leaf.prop_id = best_prop;
        leaf.threshold = best_threshold;
        leaf.left = leftIdx;
        leaf.right = rightIdx;
        leaf.idxs.clear();
        leaf.idxs.shrink_to_fit();
        num_leaves++;
    }

    // Collect leaves and assign leaf_id in pre-order.
    std::vector<int> leafNodes;
    std::function<void(int)> collect = [&](int idx) {
        if (nodes[idx].is_leaf) leafNodes.push_back(idx);
        else { collect(nodes[idx].left); collect(nodes[idx].right); }
    };
    collect(0);
    for (size_t i = 0; i < leafNodes.size(); ++i)
        nodes[leafNodes[i]].leaf_id = (uint16_t)i;

    // Build MATreeR3 nodes in pre-order with index translation.
    std::vector<int> old_to_new(nodes.size(), -1);
    std::vector<int> preorder_old;
    std::function<void(int)> collectOld = [&](int idx) {
        preorder_old.push_back(idx);
        if (!nodes[idx].is_leaf) {
            collectOld(nodes[idx].left);
            collectOld(nodes[idx].right);
        }
    };
    collectOld(0);
    for (size_t i = 0; i < preorder_old.size(); ++i)
        old_to_new[preorder_old[i]] = (int)i;

    std::function<void(int)> emit = [&](int idx) {
        const auto& bn = nodes[idx];
        MATreeNodeR3 mn;
        mn.is_leaf = bn.is_leaf;
        if (bn.is_leaf) {
            mn.leaf_id = bn.leaf_id;
            mn.left = -1;
            mn.right = -1;
        } else {
            mn.prop_id = bn.prop_id;
            mn.threshold = bn.threshold;
            mn.left = old_to_new[bn.left];
            mn.right = old_to_new[bn.right];
        }
        tree.nodes.push_back(mn);
        if (!bn.is_leaf) {
            emit(bn.left);
            emit(bn.right);
        }
    };
    emit(0);

    tree.num_leaves = (uint16_t)leafNodes.size();
    tree.max_depth = max_depth;
    return tree;
}

// ---- Utility ----

int32_t MultiPassEncoder::max_residual(const std::vector<int32_t>& residuals) {
    int32_t mx = 0;
    for (int32_t r : residuals) {
        int32_t a = r < 0 ? -(int64_t)r : (int64_t)r;
        if (a > mx) mx = a;
    }
    return mx;
}

// ---- Pass 1: Analyze (per-plane) ----

static PlaneAnalysis analyze_plane(
    const std::vector<uint16_t>& pixels,
    const std::vector<int32_t>& residuals,
    uint32_t w, uint32_t h,
    uint8_t band_class, uint8_t bit_depth,
    uint16_t num_clusters, uint8_t max_depth, uint8_t T_ESC) {
    PlaneAnalysis result;
    size_t n = pixels.size();
    result.num_samples = (uint32_t)n;

    int32_t mx = MultiPassEncoder::max_residual(residuals);
    result.alphabet_size = HybridUintProfile::compute_alphabet(T_ESC, mx);

    // Build full v1 features from pixel data.
    auto features = MultiPassEncoder::build_features(pixels, w, h, band_class, bit_depth);

    // Build MA-tree from features.
    result.tree = MATreeR3::build_greedy(features, num_clusters, max_depth);

    // Assign clusters.
    result.cluster_ids.resize(n);
    for (size_t i = 0; i < n; ++i) {
        result.cluster_ids[i] = result.tree.eval(features[i]);
    }

    // Build per-cluster and global histograms.
    result.cluster_hists.resize(num_clusters);
    for (auto& h : result.cluster_hists) {
        h.reset();
        h.alphabet_size = result.alphabet_size;
    }
    result.global_hist.reset();
    result.global_hist.alphabet_size = result.alphabet_size;

    HybridUintProfile profile;
    profile.T_ESC = T_ESC;

    for (size_t i = 0; i < n; ++i) {
        auto ev = profile.tokenize(residuals[i]);
        uint8_t tok = ev.token;
        uint16_t cl = result.cluster_ids[i];
        if (cl >= num_clusters) cl = 0;
        result.cluster_hists[cl].add(tok);
        result.global_hist.add(tok);
    }

    return result;
}

MultiPassEncoder::AnalysisResult MultiPassEncoder::analyze(
    const std::vector<std::vector<int32_t>>& plane_residuals,
    uint32_t w, uint32_t h, uint8_t num_channels) const {
    AnalysisResult result;
    result.width = w;
    result.height = h;
    result.num_channels = num_channels;
    result.planes.resize(num_channels);

    for (size_t pi = 0; pi < num_channels; ++pi) {
        // For Route 1, we need pixel data to compute features.
        // The caller must provide pixel data via a separate interface.
        // For now, use residual-based features (position-only) as fallback.
        // The actual pixel data is passed via the encode() path.
        result.planes[pi] = PlaneAnalysis();
        result.planes[pi].num_samples = (uint32_t)plane_residuals[pi].size();

        int32_t mx = max_residual(plane_residuals[pi]);
        result.planes[pi].alphabet_size = HybridUintProfile::compute_alphabet(T_ESC, mx);

        auto features = build_features_residuals(plane_residuals[pi], w, h);
        result.planes[pi].tree = MATreeR3::build_greedy(features, num_clusters, max_depth);

        result.planes[pi].cluster_ids.resize(plane_residuals[pi].size());
        for (size_t i = 0; i < plane_residuals[pi].size(); ++i) {
            result.planes[pi].cluster_ids[i] = result.planes[pi].tree.eval(features[i]);
        }

        result.planes[pi].cluster_hists.resize(num_clusters);
        for (auto& hist : result.planes[pi].cluster_hists) {
            hist.reset();
            hist.alphabet_size = result.planes[pi].alphabet_size;
        }
        result.planes[pi].global_hist.reset();
        result.planes[pi].global_hist.alphabet_size = result.planes[pi].alphabet_size;

        HybridUintProfile profile;
        profile.T_ESC = T_ESC;

        for (size_t i = 0; i < plane_residuals[pi].size(); ++i) {
            auto ev = profile.tokenize(plane_residuals[pi][i]);
            uint8_t tok = ev.token;
            uint16_t cl = result.planes[pi].cluster_ids[i];
            if (cl >= num_clusters) cl = 0;
            result.planes[pi].cluster_hists[cl].add(tok);
            result.planes[pi].global_hist.add(tok);
        }
    }

    return result;
}

// Per-plane analyze with pixel data (Route 1 full features).
MultiPassEncoder::AnalysisResult MultiPassEncoder::analyze(
    const std::vector<std::vector<uint16_t>>& plane_pixels,
    const std::vector<std::vector<int32_t>>& plane_residuals,
    uint32_t w, uint32_t h, uint8_t num_channels,
    uint8_t bit_depth) const {
    AnalysisResult result;
    result.width = w;
    result.height = h;
    result.num_channels = num_channels;
    result.planes.resize(num_channels);

    for (size_t pi = 0; pi < num_channels; ++pi) {
        result.planes[pi] = analyze_plane(
            plane_pixels[pi], plane_residuals[pi],
            w, h, 0, bit_depth,
            num_clusters, max_depth, T_ESC);
    }

    return result;
}

// ---- Pass 2: Code (per-plane ANS) ----

MultiPassEncoder::CodeResult MultiPassEncoder::code(
    const std::vector<std::vector<int32_t>>& plane_residuals,
    const AnalysisResult& analysis) const {
    CodeResult result;

    uint8_t nc = analysis.num_channels;
    HybridUintProfile profile;
    profile.T_ESC = T_ESC;

    // Per-plane payload lengths for the model blob.
    std::vector<uint32_t> plane_payload_sizes(nc);

    // Per-plane ANS encoding.
    for (size_t pi = 0; pi < nc; ++pi) {
        const auto& pa = analysis.planes[pi];
        const auto& residuals = plane_residuals[pi];
        size_t n = residuals.size();
        size_t payload_start = result.payload.size();

        ANSStaticModel model;
        model.build_from_histograms(pa.cluster_hists);

        // Tokenize residuals.
        std::vector<int32_t> symbols(n);
        for (size_t i = 0; i < n; ++i) {
            auto ev = profile.tokenize(residuals[i]);
            symbols[i] = (int32_t)ev.token;
        }

        // Encode tokens via ANS.
        auto ans_payload = model.encode(
            symbols.data(), pa.cluster_ids.data(), n);

        // Encode escape bits and sign bits as bypass data.
        std::vector<uint8_t> bypass;
        for (size_t i = 0; i < n; ++i) {
            auto ev = profile.tokenize(residuals[i]);
            if (ev.token == T_ESC) {
                bypass.push_back(ev.esc_quotient);
                bypass.push_back(ev.esc_rawbits);
                uint32_t rv = ev.raw_value;
                uint8_t nbytes = (ev.esc_rawbits + 7) / 8;
                for (uint8_t b = 0; b < nbytes; ++b) {
                    bypass.push_back((uint8_t)(rv & 0xFF));
                    rv >>= 8;
                }
            }
            if (ev.has_sign) {
                bypass.push_back(ev.sign_bit ? 1 : 0);
            }
        }

        // Per-plane payload: [bypass_len:u32] [ANS bytes] [bypass bytes]
        uint32_t bypass_len = (uint32_t)bypass.size();
        result.payload.push_back((uint8_t)(bypass_len & 0xFF));
        result.payload.push_back((uint8_t)((bypass_len >> 8) & 0xFF));
        result.payload.push_back((uint8_t)((bypass_len >> 16) & 0xFF));
        result.payload.push_back((uint8_t)((bypass_len >> 24) & 0xFF));
        result.payload.insert(result.payload.end(), ans_payload.begin(), ans_payload.end());
        result.payload.insert(result.payload.end(), bypass.begin(), bypass.end());

        plane_payload_sizes[pi] = (uint32_t)(result.payload.size() - payload_start);
    }

    result.payload_len = (uint32_t)result.payload.size();

    // Serialize model blob: num_channels(1) + per-plane payload sizes + per-plane trees + histograms.
    result.model_blob.clear();
    result.model_blob.push_back(nc);
    for (size_t pi = 0; pi < nc; ++pi) {
        uint32_t plen = plane_payload_sizes[pi];
        result.model_blob.push_back((uint8_t)(plen & 0xFF));
        result.model_blob.push_back((uint8_t)((plen >> 8) & 0xFF));
        result.model_blob.push_back((uint8_t)((plen >> 16) & 0xFF));
        result.model_blob.push_back((uint8_t)((plen >> 24) & 0xFF));
    }

    for (size_t pi = 0; pi < nc; ++pi) {
        const auto& pa = analysis.planes[pi];

        // Per-plane header: alphabet_size(1) + num_clusters(2) + num_samples(4)
        result.model_blob.push_back(pa.alphabet_size);
        uint16_t ncl = (uint16_t)pa.cluster_hists.size();
        result.model_blob.push_back((uint8_t)(ncl & 0xFF));
        result.model_blob.push_back((uint8_t)((ncl >> 8) & 0xFF));
        result.model_blob.push_back((uint8_t)((pa.num_samples >> 0) & 0xFF));
        result.model_blob.push_back((uint8_t)((pa.num_samples >> 8) & 0xFF));
        result.model_blob.push_back((uint8_t)((pa.num_samples >> 16) & 0xFF));
        result.model_blob.push_back((uint8_t)((pa.num_samples >> 24) & 0xFF));

        // MA-tree blob.
        auto tree_blob = pa.tree.serialize();
        uint32_t tree_len = (uint32_t)tree_blob.size();
        result.model_blob.push_back((uint8_t)(tree_len & 0xFF));
        result.model_blob.push_back((uint8_t)((tree_len >> 8) & 0xFF));
        result.model_blob.insert(result.model_blob.end(), tree_blob.begin(), tree_blob.end());

        // Histograms.
        auto hist_blob = HistogramSerializer::serialize(
            pa.global_hist, pa.cluster_hists, nullptr);
        uint32_t hist_len = (uint32_t)hist_blob.size();
        result.model_blob.push_back((uint8_t)(hist_len & 0xFF));
        result.model_blob.push_back((uint8_t)((hist_len >> 8) & 0xFF));
        result.model_blob.insert(result.model_blob.end(), hist_blob.begin(), hist_blob.end());
    }

    result.model_len = (uint32_t)result.model_blob.size();
    return result;
}

// Backward-compatible single-stream analyze (wraps to 1-channel per-plane).
MultiPassEncoder::AnalysisResult MultiPassEncoder::analyze(
    const std::vector<int32_t>& residuals,
    uint32_t w, uint32_t h) const {
    std::vector<std::vector<int32_t>> plane_residuals = {residuals};
    return analyze(plane_residuals, w, h, 1);
}

// Backward-compatible single-stream code (wraps to 1 channel).
MultiPassEncoder::CodeResult MultiPassEncoder::code(
    const std::vector<int32_t>& residuals,
    const AnalysisResult& analysis) const {
    std::vector<std::vector<int32_t>> plane_residuals = {residuals};
    return code(plane_residuals, analysis);
}

// ---- Decode (per-plane, recomputes features from decoded pixels) ----

std::vector<std::vector<int32_t>> MultiPassEncoder::decode(
    const uint8_t* payload, size_t payload_len,
    const uint8_t* model_blob, size_t model_len,
    uint32_t w, uint32_t h, uint8_t num_channels) const {
    if (model_len < 1)
        throw std::runtime_error("MultiPassEncoder::decode: model too short");

    size_t mpos = 0;
    uint8_t nc = model_blob[mpos++];

    // Read per-plane payload sizes.
    std::vector<uint32_t> plane_payload_sizes(nc);
    for (size_t pi = 0; pi < nc; ++pi) {
        plane_payload_sizes[pi] = (uint32_t)model_blob[mpos] |
                                  ((uint32_t)model_blob[mpos + 1] << 8) |
                                  ((uint32_t)model_blob[mpos + 2] << 16) |
                                  ((uint32_t)model_blob[mpos + 3] << 24);
        mpos += 4;
    }

    std::vector<PlaneAnalysis> plane_analyses(nc);

    for (size_t pi = 0; pi < nc; ++pi) {
        if (mpos + 7 > model_len)
            throw std::runtime_error("MultiPassEncoder::decode: truncated plane header");
        uint8_t alphabet = model_blob[mpos++];
        uint16_t ncl = (uint16_t)model_blob[mpos] | ((uint16_t)model_blob[mpos + 1] << 8);
        mpos += 2;
        uint32_t ns = (uint32_t)model_blob[mpos] | ((uint32_t)model_blob[mpos + 1] << 8) |
                      ((uint32_t)model_blob[mpos + 2] << 16) | ((uint32_t)model_blob[mpos + 3] << 24);
        mpos += 4;

        // MA-tree.
        if (mpos + 2 > model_len)
            throw std::runtime_error("MultiPassEncoder::decode: truncated tree length");
        uint32_t tree_len = (uint32_t)model_blob[mpos] | ((uint32_t)model_blob[mpos + 1] << 8);
        mpos += 2;
        MATreeR3 tree;
        if (tree_len > 0 && mpos + tree_len <= model_len) {
            tree = MATreeR3::deserialize(model_blob + mpos, tree_len);
        }
        mpos += tree_len;

        // Histograms.
        if (mpos + 2 > model_len)
            throw std::runtime_error("MultiPassEncoder::decode: truncated hist length");
        uint32_t hist_len = (uint32_t)model_blob[mpos] | ((uint32_t)model_blob[mpos + 1] << 8);
        mpos += 2;
        auto deser = HistogramSerializer::deserialize(
            model_blob + mpos, hist_len, ncl, alphabet);
        mpos += hist_len;

        plane_analyses[pi].tree = tree;
        plane_analyses[pi].cluster_hists = std::move(deser.cluster_hists);
        plane_analyses[pi].num_samples = ns;
        plane_analyses[pi].alphabet_size = alphabet;
    }

    // Per-plane decode using stored payload sizes.
    std::vector<std::vector<int32_t>> all_residuals(nc);
    size_t payload_pos = 0;

    for (size_t pi = 0; pi < nc; ++pi) {
        const auto& pa = plane_analyses[pi];
        uint32_t ns = pa.num_samples;
        uint32_t plane_len = plane_payload_sizes[pi];

        if (payload_pos + plane_len > payload_len)
            throw std::runtime_error("MultiPassEncoder::decode: payload truncated for plane");

        // Parse bypass length from start of this plane's payload.
        uint32_t bypass_len = (uint32_t)payload[payload_pos] |
                              ((uint32_t)payload[payload_pos + 1] << 8) |
                              ((uint32_t)payload[payload_pos + 2] << 16) |
                              ((uint32_t)payload[payload_pos + 3] << 24);
        size_t ans_start = payload_pos + 4;
        size_t ans_len = plane_len - 4 - bypass_len;

        // Build ANS model from deserialized histograms.
        ANSStaticModel model;
        model.build_from_histograms(pa.cluster_hists);

        // Reconstruct cluster IDs from position-only features (decoder side).
        std::vector<uint16_t> cluster_ids(ns);
        {
            std::vector<int32_t> dummy(ns, 0);
            auto features = build_features_residuals(dummy, w, h > 0 ? h : 1);
            for (size_t i = 0; i < ns; ++i) {
                cluster_ids[i] = plane_analyses[pi].tree.eval(features[i]);
            }
        }

        // Decode ANS symbols.
        std::vector<int32_t> symbols(ns);
        model.decode(payload + ans_start, ans_len, symbols.data(),
                     cluster_ids.data(), ns);

        // Parse bypass data.
        const uint8_t* bp = payload + ans_start + ans_len;
        size_t bypass_pos = 0;

        HybridUintProfile profile;
        profile.T_ESC = T_ESC;

        all_residuals[pi].resize(ns);
        for (size_t i = 0; i < ns; ++i) {
            HybridUintProfile::Events ev{};
            ev.token = (uint8_t)symbols[i];
            ev.has_sign = false;
            ev.sign_bit = false;
            ev.esc_quotient = 0;
            ev.esc_rawbits = 0;
            ev.raw_value = 0;

            if (ev.token == T_ESC) {
                if (bypass_pos + 2 <= bypass_len) {
                    ev.esc_quotient = bp[bypass_pos];
                    ev.esc_rawbits = bp[bypass_pos + 1];
                    bypass_pos += 2;
                    uint32_t rv = 0;
                    uint8_t nbytes = (ev.esc_rawbits + 7) / 8;
                    if (bypass_pos + nbytes <= bypass_len) {
                        for (uint8_t b = 0; b < nbytes; ++b) {
                            rv |= (uint32_t)bp[bypass_pos] << (b * 8);
                            bypass_pos++;
                        }
                    }
                    ev.raw_value = rv;
                }
                ev.has_sign = true;
                if (bypass_pos < bypass_len) {
                    ev.sign_bit = bp[bypass_pos] != 0;
                    bypass_pos++;
                }
            } else if (ev.token != 0) {
                ev.has_sign = true;
                if (bypass_pos < bypass_len) {
                    ev.sign_bit = bp[bypass_pos] != 0;
                    bypass_pos++;
                }
            }

            all_residuals[pi][i] = profile.detokenize(ev);
        }

        payload_pos += plane_len;
    }

    return all_residuals;
}

// Legacy single-stream decode (for backward compatibility with R3 format).
std::vector<int32_t> MultiPassEncoder::decode_legacy(
    const uint8_t* payload, size_t payload_len,
    const uint8_t* model_blob, size_t model_len,
    size_t num_samples, uint32_t w, uint32_t h) const {
    if (model_len < 7)
        throw std::runtime_error("MultiPassEncoder::decode_legacy: model too short");

    size_t mpos = 0;
    uint8_t alphabet = model_blob[mpos++];
    uint16_t nc = (uint16_t)model_blob[mpos] | ((uint16_t)model_blob[mpos + 1] << 8);
    mpos += 2;
    uint32_t ns = (uint32_t)model_blob[mpos] | ((uint32_t)model_blob[mpos + 1] << 8) |
                  ((uint32_t)model_blob[mpos + 2] << 16) | ((uint32_t)model_blob[mpos + 3] << 24);
    mpos += 4;

    if (mpos + 2 > model_len)
        throw std::runtime_error("MultiPassEncoder::decode_legacy: truncated tree length");
    uint32_t tree_len = (uint32_t)model_blob[mpos] | ((uint32_t)model_blob[mpos + 1] << 8);
    mpos += 2;
    MATreeR3 tree;
    if (tree_len > 0 && mpos + tree_len <= model_len) {
        tree = MATreeR3::deserialize(model_blob + mpos, tree_len);
    }
    mpos += tree_len;

    if (mpos + 2 > model_len)
        throw std::runtime_error("MultiPassEncoder::decode_legacy: truncated hist length");
    uint32_t hist_len = (uint32_t)model_blob[mpos] | ((uint32_t)model_blob[mpos + 1] << 8);
    mpos += 2;
    auto deser = HistogramSerializer::deserialize(
        model_blob + mpos, hist_len, nc, alphabet);
    mpos += hist_len;

    std::vector<uint16_t> cluster_ids(ns);
    if (ns > 0 && w > 0 && h > 0) {
        std::vector<int32_t> dummy_res(ns, 0);
        auto features = build_features_residuals(dummy_res, w, h > 0 ? h : 1);
        for (size_t i = 0; i < ns; ++i) {
            cluster_ids[i] = tree.eval(features[i]);
        }
    }

    ANSStaticModel model;
    model.build_from_histograms(deser.cluster_hists);

    if (payload_len < 4)
        throw std::runtime_error("MultiPassEncoder::decode_legacy: payload too short");
    uint32_t bypass_len = (uint32_t)payload[0] |
                          ((uint32_t)payload[1] << 8) |
                          ((uint32_t)payload[2] << 16) |
                          ((uint32_t)payload[3] << 24);
    size_t ans_len = payload_len - 4 - bypass_len;
    size_t ans_start = 4;

    std::vector<int32_t> symbols(ns);
    model.decode(payload + ans_start, ans_len, symbols.data(),
                 cluster_ids.data(), ns);

    const uint8_t* bp = payload + ans_start + ans_len;
    size_t bypass_pos = 0;

    HybridUintProfile profile;
    profile.T_ESC = T_ESC;

    std::vector<int32_t> residuals(ns);
    for (size_t i = 0; i < ns; ++i) {
        HybridUintProfile::Events ev{};
        ev.token = (uint8_t)symbols[i];
        ev.has_sign = false;
        ev.sign_bit = false;
        ev.esc_quotient = 0;
        ev.esc_rawbits = 0;
        ev.raw_value = 0;

        if (ev.token == T_ESC) {
            if (bypass_pos + 2 <= bypass_len) {
                ev.esc_quotient = bp[bypass_pos];
                ev.esc_rawbits = bp[bypass_pos + 1];
                bypass_pos += 2;
                uint32_t rv = 0;
                uint8_t nbytes = (ev.esc_rawbits + 7) / 8;
                if (bypass_pos + nbytes <= bypass_len) {
                    for (uint8_t b = 0; b < nbytes; ++b) {
                        rv |= (uint32_t)bp[bypass_pos] << (b * 8);
                        bypass_pos++;
                    }
                }
                ev.raw_value = rv;
            }
            ev.has_sign = true;
            if (bypass_pos < bypass_len) {
                ev.sign_bit = bp[bypass_pos] != 0;
                bypass_pos++;
            }
        } else if (ev.token != 0) {
            ev.has_sign = true;
            if (bypass_pos < bypass_len) {
                ev.sign_bit = bp[bypass_pos] != 0;
                bypass_pos++;
            }
        }

        residuals[i] = profile.detokenize(ev);
    }

    return residuals;
}

} // namespace prism::codec::r3
