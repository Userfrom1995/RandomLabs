// Route 3 two-pass encoder implementation.
// Spec: blueprint section 2.1.3, invariants I15-I17.
//
// R0 implementation: MA-tree cluster assignment, per-cluster ANS coding,
// escape bit encoding/decoding, and model blob with cluster IDs.

#include "prism/codec/multipass.h"
#include <algorithm>
#include <cstring>
#include <stdexcept>
#include <functional>
#include <cmath>

namespace prism::codec::r3 {

// ---- FeatureR3 construction ----

std::vector<FeatureR3> MultiPassEncoder::build_features(
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

// Greedy MA-tree builder (follows the pattern from matree_builder.cpp).
// Uses index-based partitioning with entropy-based split scoring.
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

    // Internal build node with index list.
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

    // Entropy-based cost: negative log-entropy approximation.
    auto leaf_cost = [](const std::vector<size_t>& idxs,
                        const std::vector<FeatureR3>& feats, uint8_t prop) -> double {
        if (idxs.empty()) return 0;
        // Compute variance of the property values.
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

            // Try each property.
            for (uint8_t prop : {0u, 2u, 3u, 4u}) {
                // Collect unique values.
                std::vector<uint32_t> values;
                values.reserve(nodes[ni].idxs.size());
                for (size_t idx : nodes[ni].idxs)
                    values.push_back(prop_value_fn(features[idx], prop));
                std::sort(values.begin(), values.end());
                values.erase(std::unique(values.begin(), values.end()), values.end());
                if (values.size() < 2) continue;

                // Try octile thresholds.
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

// ---- Pass 1: Analyze ----

MultiPassEncoder::AnalysisResult MultiPassEncoder::analyze(
    const std::vector<int32_t>& residuals, uint32_t w, uint32_t h) const {
    AnalysisResult result;
    size_t n = residuals.size();
    result.num_samples = (uint32_t)n;
    result.width = w;
    result.height = h;

    int32_t mx = max_residual(residuals);
    result.alphabet_size = HybridUintProfile::compute_alphabet(T_ESC, mx);

    auto features = build_features(residuals, w, h);
    result.tree = MATreeR3::build_greedy(features, num_clusters, max_depth);

    result.cluster_ids.resize(n);
    for (size_t i = 0; i < n; ++i) {
        result.cluster_ids[i] = result.tree.eval(features[i]);
    }

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

// ---- Pass 2: Code ----

MultiPassEncoder::CodeResult MultiPassEncoder::code(
    const std::vector<int32_t>& residuals,
    const AnalysisResult& analysis) const {
    CodeResult result;

    ANSStaticModel model;
    model.build_from_histograms(analysis.cluster_hists);

    HybridUintProfile profile;
    profile.T_ESC = T_ESC;

    size_t n = residuals.size();
    std::vector<int32_t> symbols(n);

    for (size_t i = 0; i < n; ++i) {
        auto ev = profile.tokenize(residuals[i]);
        symbols[i] = (int32_t)ev.token;
    }

    // Encode tokens via ANS.
    result.payload = model.encode(
        symbols.data(), analysis.cluster_ids.data(), n);

    // Encode escape bits and sign bits as bypass data.
    // Layout per sample:
    //   if token == T_ESC: u8 quotient, u8 rawbits, rawbits bytes of raw value
    //   if nonzero: u8 sign_bit (0 or 1)
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

    // Prepend bypass to payload: 4-byte length prefix + ANS data + bypass bytes.
    // Layout: [bypass_len(4)] [ANS payload] [bypass data]
    uint32_t bypass_len = (uint32_t)bypass.size();
    std::vector<uint8_t> final_payload;
    final_payload.reserve(4 + result.payload.size() + bypass.size());
    final_payload.push_back((uint8_t)(bypass_len & 0xFF));
    final_payload.push_back((uint8_t)((bypass_len >> 8) & 0xFF));
    final_payload.push_back((uint8_t)((bypass_len >> 16) & 0xFF));
    final_payload.push_back((uint8_t)((bypass_len >> 24) & 0xFF));
    final_payload.insert(final_payload.end(), result.payload.begin(), result.payload.end());
    final_payload.insert(final_payload.end(), bypass.begin(), bypass.end());
    result.payload = std::move(final_payload);
    result.payload_len = (uint32_t)result.payload.size();

    // Serialize model blob.
    result.model_blob.clear();
    // Header: alphabet_size(1) + num_clusters(2) + num_samples(4)
    result.model_blob.push_back(analysis.alphabet_size);
    uint16_t nc16 = (uint16_t)analysis.cluster_hists.size();
    result.model_blob.push_back((uint8_t)(nc16 & 0xFF));
    result.model_blob.push_back((uint8_t)((nc16 >> 8) & 0xFF));
    result.model_blob.push_back((uint8_t)((analysis.num_samples >> 0) & 0xFF));
    result.model_blob.push_back((uint8_t)((analysis.num_samples >> 8) & 0xFF));
    result.model_blob.push_back((uint8_t)((analysis.num_samples >> 16) & 0xFF));
    result.model_blob.push_back((uint8_t)((analysis.num_samples >> 24) & 0xFF));

    // MA-tree blob.
    auto tree_blob = analysis.tree.serialize();
    uint32_t tree_len = (uint32_t)tree_blob.size();
    result.model_blob.push_back((uint8_t)(tree_len & 0xFF));
    result.model_blob.push_back((uint8_t)((tree_len >> 8) & 0xFF));
    result.model_blob.insert(result.model_blob.end(), tree_blob.begin(), tree_blob.end());

    // Histograms.
    auto hist_blob = HistogramSerializer::serialize(
        analysis.global_hist, analysis.cluster_hists, nullptr);
    uint32_t hist_len = (uint32_t)hist_blob.size();
    result.model_blob.push_back((uint8_t)(hist_len & 0xFF));
    result.model_blob.push_back((uint8_t)((hist_len >> 8) & 0xFF));
    result.model_blob.insert(result.model_blob.end(), hist_blob.begin(), hist_blob.end());

    // Cluster IDs.
    for (uint16_t cl : analysis.cluster_ids) {
        result.model_blob.push_back((uint8_t)(cl & 0xFF));
        result.model_blob.push_back((uint8_t)((cl >> 8) & 0xFF));
    }

    result.model_len = (uint32_t)result.model_blob.size();
    return result;
}

// ---- Decode ----

std::vector<int32_t> MultiPassEncoder::decode(
    const uint8_t* payload, size_t payload_len,
    const uint8_t* model_blob, size_t model_len,
    size_t num_samples) const {
    if (model_len < 7)
        throw std::runtime_error("MultiPassEncoder::decode: model too short");

    size_t mpos = 0;
    uint8_t alphabet = model_blob[mpos++];
    uint16_t nc = (uint16_t)model_blob[mpos] | ((uint16_t)model_blob[mpos + 1] << 8);
    mpos += 2;
    uint32_t ns = (uint32_t)model_blob[mpos] | ((uint32_t)model_blob[mpos + 1] << 8) |
                  ((uint32_t)model_blob[mpos + 2] << 16) | ((uint32_t)model_blob[mpos + 3] << 24);
    mpos += 4;

    // MA-tree blob.
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
        model_blob + mpos, hist_len, nc, alphabet);
    mpos += hist_len;

    // Cluster IDs.
    std::vector<uint16_t> cluster_ids(ns);
    for (size_t i = 0; i < ns; ++i) {
        if (mpos + 2 > model_len)
            throw std::runtime_error("MultiPassEncoder::decode: truncated cluster ids");
        cluster_ids[i] = (uint16_t)model_blob[mpos] | ((uint16_t)model_blob[mpos + 1] << 8);
        mpos += 2;
    }

    // Build ANS model from deserialized histograms.
    ANSStaticModel model;
    model.build_from_histograms(deser.cluster_hists);

    // Read bypass length from start of payload.
    if (payload_len < 4)
        throw std::runtime_error("MultiPassEncoder::decode: payload too short");
    uint32_t bypass_len = (uint32_t)payload[0] |
                          ((uint32_t)payload[1] << 8) |
                          ((uint32_t)payload[2] << 16) |
                          ((uint32_t)payload[3] << 24);
    size_t ans_len = payload_len - 4 - bypass_len;
    size_t ans_start = 4;

    // Decode ANS symbols.
    std::vector<int32_t> symbols(ns);
    model.decode(payload + ans_start, ans_len, symbols.data(),
                 cluster_ids.data(), ns);

    // Parse bypass data.
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
