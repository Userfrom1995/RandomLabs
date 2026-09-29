#include "prism/codec/r1_encoder.h"
#include "prism/codec/acoder.h"
#include "prism/codec/matree_builder.h"
#include "prism/codec/predict.h"
#include <algorithm>
#include <cmath>
#include <functional>
#include <stdexcept>

namespace prism::codec::r1 {

static int32_t eval_feature_prop_r1(const FeatureR1& f, uint8_t prop_id) {
    switch (prop_id) {
        case 0: return (int32_t)f.qg;
        case 1: return (int32_t)f.band_class;
        case 2: return (int32_t)f.activity;
        case 3: return (int32_t)f.position_y;
        case 4: return (int32_t)f.position_x;
        default: return 0;
    }
}

uint16_t MATreeR1::eval(const FeatureR1& f) const {
    if (nodes.empty()) return 0;
    size_t idx = 0;
    while (!nodes[idx].is_leaf) {
        const auto& nd = nodes[idx];
        int32_t val = eval_feature_prop_r1(f, nd.prop_id);
        bool go_left = val < (int32_t)nd.threshold;
        if (go_left) idx = (size_t)nd.left;
        else idx = (size_t)nd.right;
        if (idx >= nodes.size()) return 0;
    }
    return nodes[idx].leaf_id;
}

std::vector<uint8_t> MATreeR1::serialize() const {
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

MATreeR1 MATreeR1::deserialize(const uint8_t* data, size_t len) {
    MATreeR1 t;
    if (len < 3) return t;
    size_t pos = 0;
    t.max_depth = data[pos++];
    t.num_leaves = (uint16_t)data[pos] | ((uint16_t)data[pos + 1] << 8);
    pos += 2;
    size_t num_nodes = t.num_leaves == 0 ? 0 : (size_t)2 * t.num_leaves - 1;
    t.nodes.resize(num_nodes);
    for (size_t i = 0; i < num_nodes && pos < len; ++i) {
        MATreeNodeR1& nd = t.nodes[i];
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

// ---- Entropy-based MA-tree builder ----

static constexpr int R1_ENTROPY_BINS = 32;

static double compute_entropy(const std::vector<int32_t>& residuals,
                               const std::vector<size_t>& idxs) {
    if (idxs.empty()) return 0;
    int32_t mn = INT32_MAX, mx = INT32_MIN;
    for (size_t i : idxs) {
        if (residuals[i] < mn) mn = residuals[i];
        if (residuals[i] > mx) mx = residuals[i];
    }
    if (mn == mx) return 0;
    double range = (double)(mx - mn + 1);
    double bin_width = range / R1_ENTROPY_BINS;
    if (bin_width < 1) bin_width = 1;
    std::vector<uint64_t> counts(R1_ENTROPY_BINS, 0);
    for (size_t i : idxs) {
        int bin = (int)((double)(residuals[i] - mn) / bin_width);
        if (bin >= R1_ENTROPY_BINS) bin = R1_ENTROPY_BINS - 1;
        counts[bin]++;
    }
    double entropy = 0;
    double n = (double)idxs.size();
    for (uint64_t c : counts) {
        if (c > 0) {
            double p = (double)c / n;
            entropy -= p * std::log2(p);
        }
    }
    return entropy;
}

MATreeR1 MATreeR1::build_greedy(
    const std::vector<FeatureR1>& features,
    const std::vector<int32_t>& residuals,
    uint16_t num_clusters,
    uint8_t max_depth) {
    MATreeR1 tree;
    if (features.empty() || num_clusters == 0) {
        tree.max_depth = 0;
        tree.num_leaves = 1;
        MATreeNodeR1 leaf;
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

            double parent_entropy = compute_entropy(residuals, nodes[ni].idxs);

            for (uint8_t prop : {0u, 1u, 2u, 3u, 4u}) {
                std::vector<uint32_t> values;
                values.reserve(nodes[ni].idxs.size());
                for (size_t idx : nodes[ni].idxs)
                    values.push_back((uint32_t)eval_feature_prop_r1(features[idx], prop));
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
                        if (eval_feature_prop_r1(features[idx], prop) < (int32_t)thresh)
                            left.push_back(idx);
                        else
                            right.push_back(idx);
                    }
                    if (left.empty() || right.empty()) continue;
                    if (left.size() < 2 || right.size() < 2) continue;

                    double left_entropy = compute_entropy(residuals, left);
                    double right_entropy = compute_entropy(residuals, right);
                    double n = (double)nodes[ni].idxs.size();
                    double gain = parent_entropy
                                  - ((double)left.size() / n * left_entropy
                                     + (double)right.size() / n * right_entropy);

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

        if (best_leaf < 0 || best_gain <= 0.01) break;

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

    std::vector<int> leafNodes;
    std::function<void(int)> collect = [&](int idx) {
        if (nodes[idx].is_leaf) leafNodes.push_back(idx);
        else { collect(nodes[idx].left); collect(nodes[idx].right); }
    };
    collect(0);
    for (size_t i = 0; i < leafNodes.size(); ++i)
        nodes[leafNodes[i]].leaf_id = (uint16_t)i;

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
        MATreeNodeR1 mn;
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

// ---- R1Encoder: Pass 1 (Analysis) ----

R1Encoder::AnalysisResult R1Encoder::analyze(
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
        R1PlaneAnalysis& pa = result.planes[pi];
        pa.num_samples = (uint32_t)plane_pixels[pi].size();

        auto features = r3::MultiPassEncoder::build_features(
            plane_pixels[pi], w, h, (uint8_t)pi, bit_depth);

        pa.tree = MATreeR1::build_greedy(
            features, plane_residuals[pi], num_clusters, max_depth);

        pa.leaf_ids.resize(pa.num_samples);
        for (size_t i = 0; i < pa.num_samples; ++i) {
            pa.leaf_ids[i] = pa.tree.eval(features[i]);
        }
    }

    return result;
}

// ---- R1Encoder: Pass 2 (Adaptive Coding) ----

R1Encoder::CodeResult R1Encoder::code(
    const std::vector<std::vector<int32_t>>& plane_residuals,
    const AnalysisResult& analysis) const {
    CodeResult result;
    uint8_t nc = analysis.num_channels;

    std::vector<uint32_t> plane_payload_sizes(nc);

    for (size_t pi = 0; pi < nc; ++pi) {
        const auto& pa = analysis.planes[pi];
        const auto& residuals = plane_residuals[pi];
        size_t payload_start = result.payload.size();

        auto coded = acoder_encode_plane_leaves_v2(
            residuals, pa.leaf_ids, pa.tree.num_leaves, uniform_priors);

        result.payload.insert(result.payload.end(), coded.begin(), coded.end());
        plane_payload_sizes[pi] = (uint32_t)(result.payload.size() - payload_start);
    }

    result.payload_len = (uint32_t)result.payload.size();

    result.model_blob.clear();
    // R1 adaptive model blob: first byte = nc | 0x80 (high bit distinguishes from R3 ANS).
    result.model_blob.push_back(nc | 0x80);
    for (size_t pi = 0; pi < nc; ++pi) {
        uint32_t plen = plane_payload_sizes[pi];
        result.model_blob.push_back((uint8_t)(plen & 0xFF));
        result.model_blob.push_back((uint8_t)((plen >> 8) & 0xFF));
        result.model_blob.push_back((uint8_t)((plen >> 16) & 0xFF));
        result.model_blob.push_back((uint8_t)((plen >> 24) & 0xFF));
    }
    for (size_t pi = 0; pi < nc; ++pi) {
        const auto& pa = analysis.planes[pi];
        auto tree_blob = pa.tree.serialize();
        uint16_t tree_len = (uint16_t)tree_blob.size();
        result.model_blob.push_back((uint8_t)(tree_len & 0xFF));
        result.model_blob.push_back((uint8_t)((tree_len >> 8) & 0xFF));
        result.model_blob.insert(result.model_blob.end(), tree_blob.begin(), tree_blob.end());
    }

    result.model_len = (uint32_t)result.model_blob.size();
    return result;
}

// ---- R1Encoder: Decode (causal, recomputes features from decoded pixels) ----

static inline int32_t r1_med_pred(int32_t L, int32_t T, int32_t TL) {
    if (TL >= std::max(L, T)) return std::min(L, T);
    if (TL <= std::min(L, T)) return std::max(L, T);
    return L + T - TL;
}

std::vector<std::vector<int32_t>> R1Encoder::decode(
    const uint8_t* payload, size_t payload_len,
    const uint8_t* model_blob, size_t model_len,
    uint32_t w, uint32_t h, uint8_t /*num_channels*/,
    const std::vector<uint16_t>& plane_bd_max) const {
    if (model_len < 1)
        throw std::runtime_error("R1Encoder::decode: model too short");

    size_t mpos = 0;
    uint8_t first_byte = model_blob[mpos++];
    // R1 adaptive model blob: first byte has high bit set (nc | 0x80).
    if (!(first_byte & 0x80))
        throw std::runtime_error("R1Encoder::decode: not an R1 adaptive model blob");
    uint8_t nc = first_byte & 0x7F;

    std::vector<uint32_t> plane_payload_sizes(nc);
    for (size_t pi = 0; pi < nc; ++pi) {
        plane_payload_sizes[pi] = (uint32_t)model_blob[mpos] |
                                  ((uint32_t)model_blob[mpos + 1] << 8) |
                                  ((uint32_t)model_blob[mpos + 2] << 16) |
                                  ((uint32_t)model_blob[mpos + 3] << 24);
        mpos += 4;
    }

    std::vector<MATreeR1> plane_trees(nc);
    for (size_t pi = 0; pi < nc; ++pi) {
        if (mpos + 2 > model_len)
            throw std::runtime_error("R1Encoder::decode: truncated tree length");
        uint16_t tree_len = (uint16_t)model_blob[mpos] | ((uint16_t)model_blob[mpos + 1] << 8);
        mpos += 2;
        if (tree_len > 0 && mpos + tree_len <= model_len) {
            plane_trees[pi] = MATreeR1::deserialize(model_blob + mpos, tree_len);
        }
        mpos += tree_len;
    }

    std::vector<std::vector<int32_t>> all_residuals(nc);
    size_t payload_pos = 0;

    for (size_t pi = 0; pi < nc; ++pi) {
        const auto& tree = plane_trees[pi];
        uint32_t ns = w * h;
        uint32_t plane_len = plane_payload_sizes[pi];

        if (payload_pos + plane_len > payload_len)
            throw std::runtime_error("R1Encoder::decode: payload truncated for plane");

        if (tree.num_leaves == 0) {
            all_residuals[pi].resize(ns, 0);
            payload_pos += plane_len;
            continue;
        }

        // Causal decode: for each sample, compute features from already-decoded
        // pixels, walk the MA-tree to get the leaf_id, decode the residual using
        // ACoderV2 with that leaf context, then reconstruct the pixel.
        int ctx_count = tree.num_leaves;
        ACModelsV2 models(ctx_count, uniform_priors);
        ADecoder dec;
        dec.init(payload + payload_pos, plane_len);

        std::vector<uint16_t> decoded_pixels(ns, 0);
        std::vector<int32_t> residuals(ns);

        for (size_t i = 0; i < ns; ++i) {
            uint32_t x = (uint32_t)(i % w);
            uint32_t y = (uint32_t)(i / w);

            // Compute v1 features causally from already-decoded pixels.
            FeatureR1 f{};
            f.band_class = (uint8_t)pi;

            int32_t L = (x > 0) ? (int32_t)decoded_pixels[i - 1] : 0;
            int32_t T = (y > 0) ? (int32_t)decoded_pixels[i - w] : 0;
            int32_t TL = (x > 0 && y > 0) ? (int32_t)decoded_pixels[i - w - 1] : 0;
            int32_t TR = (y > 0 && x + 1 < w) ? (int32_t)decoded_pixels[i - w + 1] : 0;

            f.qg = quant_qg(L, T, TL, TR);

            int grad = std::abs(L - TL) + std::abs(T - TL);
            if (grad < 4) f.activity = 0;
            else if (grad < 16) f.activity = 1;
            else if (grad < 64) f.activity = 2;
            else f.activity = 3;

            f.position_y = (uint8_t)(y * 255 / (h > 1 ? h - 1 : 1));
            f.position_x = (uint8_t)(x * 255 / (w > 1 ? w - 1 : 1));

            // Walk MA-tree to get leaf_id.
            uint16_t leaf_id = tree.eval(f);
            int cx = leaf_id % ctx_count;

            // Decode residual using ACoderV2.
            residuals[i] = decode_residual_v2(dec, models, cx);

            // Reconstruct pixel.
            int32_t pred = r1_med_pred(L, T, TL);
            int32_t s = pred + residuals[i];
            uint16_t bd_max = (pi < plane_bd_max.size()) ? plane_bd_max[pi] : 255;
            if (s < 0) s = 0;
            if (s > (int32_t)bd_max) s = (int32_t)bd_max;
            decoded_pixels[i] = (uint16_t)s;
        }

        all_residuals[pi] = std::move(residuals);
        payload_pos += plane_len;
    }

    return all_residuals;
}

} // namespace prism::codec::r1
