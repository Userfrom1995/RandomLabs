#include "prism/codec/matree_builder.h"
#include <algorithm>
#include <limits>
#include <numeric>
#include <functional>
#include <cmath>

namespace prism::codec {

uint8_t quant_llc(uint16_t val, uint8_t bit_depth) {
    if (bit_depth == 16) return (uint8_t)(val >> 14); // 0..3 (top 2 bits)
    return (uint8_t)(val >> 6); // 0..3 for 8-bit (256>>6=4)
}
uint8_t quant_sibling(int16_t val) {
    int a = std::abs((int)val);
    if (a < 4) return 0;
    if (a < 16) return 1;
    if (a < 64) return 2;
    return 3;
}
uint8_t quant_qg(int32_t L, int32_t T, int32_t TL, int32_t TR) {
    int g = std::abs(L - TL) + std::abs(T - TL) + std::abs(T - TR);
    if (g < 8) return 0;
    if (g < 32) return 1;
    if (g < 128) return 2;
    return 3;
}
uint8_t quant_neighbor_mag(int32_t L, int32_t T, int32_t TL, int32_t TR) {
    int a = std::max({std::abs(L), std::abs(T), std::abs(TL), std::abs(TR)});
    if (a < 4) return 0;
    if (a < 16) return 1;
    if (a < 64) return 2;
    if (a < 128) return 3;
    if (a < 256) return 4;
    if (a < 512) return 5;
    if (a < 1024) return 6;
    return 7;
}
uint8_t quant_prev_coeff_mag(int32_t val) {
    int a = std::abs(val);
    if (a < 4) return 0;
    if (a < 16) return 1;
    if (a < 64) return 2;
    if (a < 128) return 3;
    if (a < 256) return 4;
    if (a < 512) return 5;
    if (a < 1024) return 6;
    return 7;
}

namespace {
struct BuildNode {
    bool is_leaf = true;
    PropId prop = PropId::QG;
    uint16_t thresh = 0;
    int left = -1;
    int right = -1;
    int depth = 0;
    uint16_t leaf_id = 0;
    std::vector<size_t> idxs;
};

inline double leaf_bits(const std::vector<size_t>& idxs, const std::vector<int32_t>& residuals) {
    if (idxs.empty()) return 0;
    // Compute actual entropy of the zigzag-coded symbol distribution.
    // Use a small-stack histogram: count nonzero symbols, compute -sum p*log2(p).
    // For the induction subsample (<=32K), a flat array over the observed range is fast.
    int32_t lo = INT32_MAX, hi = INT32_MIN;
    for (size_t i : idxs) {
        int32_t e = residuals[i];
        if (e < lo) lo = e;
        if (e > hi) hi = e;
    }
    // Zigzag range: 0..2*max(|lo|,|hi|)
    uint32_t max_sym = (uint32_t)std::max((int64_t)std::llabs(lo), (int64_t)std::llabs(hi));
    uint32_t sym_range = 2 * max_sym + 1;
    if (sym_range > 131072) {
        // Fallback to mean-based heuristic for very wide distributions
        uint64_t sum = 0;
        for (size_t i : idxs) {
            int32_t e = residuals[i];
            sum += (uint64_t)(e < 0 ? -e : e);
            if (e != 0) sum += 1;
        }
        double mean = (double)sum / (double)idxs.size();
        double bps;
        if (mean < 0.5) bps = 0.5;
        else if (mean < 1.0) bps = 0.8;
        else bps = std::log2(mean + 1.0) + 1.2;
        return (double)idxs.size() * bps;
    }
    std::vector<uint32_t> hist(sym_range, 0);
    for (size_t i : idxs) {
        int32_t e = residuals[i];
        uint32_t s = (e == 0) ? 0 : ((e > 0) ? (uint32_t)(2 * e - 1) : (uint32_t)(-2 * e));
        hist[s]++;
    }
    double n = (double)idxs.size();
    double bits = 0;
    for (uint32_t s = 0; s < sym_range; ++s) {
        if (hist[s] == 0) continue;
        double p = (double)hist[s] / n;
        bits -= p * std::log2(p);
    }
    return n * bits;
}
inline bool eval_prop(const Feature& f, PropId p, uint16_t thr) {
    switch(p) {
        case PropId::QG: return f.qg < thr;
        case PropId::BandClass: return f.band_class == (uint8_t)thr;
        case PropId::LlcClass: return f.llc_class < (uint8_t)thr;
        case PropId::ResDiff: return f.res_diff < thr;
        case PropId::SiblingClass: return f.sibling_class < (uint8_t)thr;
        case PropId::Activity: return f.activity < (uint8_t)thr;
        case PropId::PositionY: return f.position_y < (uint8_t)thr;
        case PropId::PositionX: return f.position_x < (uint8_t)thr;
        case PropId::NeighborMag: return f.neighbor_mag < (uint8_t)thr;
        case PropId::PrevCoeffMag: return f.prev_coeff_mag < (uint8_t)thr;
        case PropId::LeftMag: return f.left_mag < (uint16_t)thr;
        case PropId::PrevResMag: return f.prev_res_mag < (uint8_t)thr;
        case PropId::NWMag: return f.nw_mag < (uint16_t)thr;
        case PropId::NEMag: return f.ne_mag < (uint16_t)thr;
        case PropId::ParentMag: return f.parent_mag < (uint8_t)thr;
        case PropId::GrandparentMag: return f.grandparent_mag < (uint8_t)thr;
    }
    return false;
}

// Feature value extractor shared by the candidate generator.
inline uint32_t prop_value(const Feature& f, PropId p) {
    switch(p) {
        case PropId::QG: return f.qg;
        case PropId::BandClass: return f.band_class;
        case PropId::LlcClass: return f.llc_class;
        case PropId::ResDiff: return f.res_diff;
        case PropId::SiblingClass: return f.sibling_class;
        case PropId::Activity: return f.activity;
        case PropId::PositionY: return f.position_y;
        case PropId::PositionX: return f.position_x;
        case PropId::NeighborMag: return f.neighbor_mag;
        case PropId::PrevCoeffMag: return f.prev_coeff_mag;
        case PropId::LeftMag: return f.left_mag;
        case PropId::PrevResMag: return f.prev_res_mag;
        case PropId::NWMag: return f.nw_mag;
        case PropId::NEMag: return f.ne_mag;
        case PropId::ParentMag: return f.parent_mag;
        case PropId::GrandparentMag: return f.grandparent_mag;
    }
    return 0;
}

struct Cand { PropId prop; uint16_t thr; };

// C2 candidate set: 16-quantile thresholds of the node's own value distribution,
// deduplicated and ascending. BandClass keeps its four equality candidates.
// Quantile ranks are computed on a sorted copy with fixed rank formulas, so
// the resulting threshold list is deterministic for a given node dataset.
// Using 16 quantiles (vs 8) gives the tree finer-grained split points,
// especially important for u16 features like left_mag and nw_mag where
// the distribution can have long tails.
void push_quantile_cands(std::vector<Cand>& cands, PropId p,
                         const std::vector<Feature>& feats,
                         const std::vector<size_t>& idxs) {
    if (idxs.size() < 4) return;
    std::vector<uint32_t> vals;
    vals.reserve(idxs.size());
    for (size_t i : idxs) vals.push_back(prop_value(feats[i], p));
    std::sort(vals.begin(), vals.end());
    constexpr int kQuantiles = 16;
    uint32_t last = UINT32_MAX;
    for (int q = 1; q < kQuantiles; ++q) {
        size_t rank = (size_t)((double)(vals.size() - 1) * q / kQuantiles + 0.5);
        uint32_t v = vals[rank];
        if (v != last && v > 0) { // thr == 0 never splits (< thr empty)
            cands.push_back({p, (uint16_t)v});
            last = v;
        }
    }
}
} // namespace

MATree build_matree_greedy(const std::vector<Feature>& feats,
                           const std::vector<int32_t>& residuals,
                           const MatreeBuildParams& params) {
    if (feats.empty() || residuals.empty() || feats.size()!=residuals.size()) {
        return MATree::single_leaf();
    }
    std::vector<BuildNode> nodes;
    nodes.reserve(2*params.max_leaves);
    BuildNode root;
    root.is_leaf = true;
    root.depth = 0;
    root.leaf_id = 0;
    // C2: induce on a strided subsample when the dataset exceeds the cap.
    // Stride keeps spatial coverage uniform; the mapping is a pure function
    // of the input size, so it is deterministic on both runs of the encoder.
    size_t total = feats.size();
    size_t stride = (total + MATREE_INDUCTION_CAP - 1) / MATREE_INDUCTION_CAP;
    if (stride < 1) stride = 1;
    root.idxs.reserve(total / stride + 1);
    for (size_t i = 0; i < total; i += stride) root.idxs.push_back(i);
    nodes.push_back(std::move(root));

    int num_leaves = 1;
    while (num_leaves < params.max_leaves) {
        int best_leaf = -1;
        Cand best_cand{PropId::QG,0};
        double best_gain = 0;
        std::vector<size_t> best_left, best_right;
        for (size_t ni=0; ni<nodes.size(); ++ni) {
            if (!nodes[ni].is_leaf) continue;
            if (nodes[ni].depth >= params.max_depth) continue;
            if ((int)nodes[ni].idxs.size() < 2 * params.min_samples_per_leaf) continue; // cannot yield two valid children
            double parentCost = leaf_bits(nodes[ni].idxs, residuals);
            // Candidate set per leaf: BandClass equality first (prop order),
            // then octile quantiles of the node's own distribution.
            std::vector<Cand> cands;
            for (uint16_t t=0; t<=3; ++t) cands.push_back({PropId::BandClass, t});
            push_quantile_cands(cands, PropId::QG, feats, nodes[ni].idxs);
            push_quantile_cands(cands, PropId::LlcClass, feats, nodes[ni].idxs);
            push_quantile_cands(cands, PropId::ResDiff, feats, nodes[ni].idxs);
            push_quantile_cands(cands, PropId::SiblingClass, feats, nodes[ni].idxs);
            push_quantile_cands(cands, PropId::Activity, feats, nodes[ni].idxs);
            push_quantile_cands(cands, PropId::PositionY, feats, nodes[ni].idxs);
            push_quantile_cands(cands, PropId::PositionX, feats, nodes[ni].idxs);
            push_quantile_cands(cands, PropId::NeighborMag, feats, nodes[ni].idxs);
            push_quantile_cands(cands, PropId::PrevCoeffMag, feats, nodes[ni].idxs);
            push_quantile_cands(cands, PropId::LeftMag, feats, nodes[ni].idxs);
            push_quantile_cands(cands, PropId::PrevResMag, feats, nodes[ni].idxs);
            push_quantile_cands(cands, PropId::NWMag, feats, nodes[ni].idxs);
            push_quantile_cands(cands, PropId::NEMag, feats, nodes[ni].idxs);
            push_quantile_cands(cands, PropId::ParentMag, feats, nodes[ni].idxs);
            push_quantile_cands(cands, PropId::GrandparentMag, feats, nodes[ni].idxs);
            for (auto cc : cands) {
                std::vector<size_t> left, right;
                left.reserve(nodes[ni].idxs.size()/2);
                right.reserve(nodes[ni].idxs.size()/2);
                for (size_t idx : nodes[ni].idxs) {
                    if (eval_prop(feats[idx], cc.prop, cc.thr)) left.push_back(idx);
                    else right.push_back(idx);
                }
                if (left.empty() || right.empty()) continue;
                // C2 min-samples rule: both children must keep at least
                // min_samples_per_leaf induction samples.
                if ((int)left.size() < params.min_samples_per_leaf ||
                    (int)right.size() < params.min_samples_per_leaf) continue;
                double lc = leaf_bits(left, residuals);
                double rc = leaf_bits(right, residuals);
                double gain = parentCost - (lc+rc);
                // Strict improvement only: ties keep the earlier candidate in
                // (property id, threshold ascending) scan order, so the split
                // choice is a deterministic function of the dataset.
                if (gain > best_gain) {
                    best_gain = gain;
                    best_leaf = (int)ni;
                    best_cand = cc;
                    best_left = std::move(left);
                    best_right = std::move(right);
                }
            }
        }
        if (best_leaf < 0 || best_gain <= 1.0) break;
        // split best_leaf
        BuildNode& leaf = nodes[best_leaf];
        // create children
        BuildNode leftNode, rightNode;
        leftNode.is_leaf = true; leftNode.depth = leaf.depth + 1; leftNode.idxs = std::move(best_left);
        rightNode.is_leaf = true; rightNode.depth = leaf.depth + 1; rightNode.idxs = std::move(best_right);
        int leftIdx = (int)nodes.size();
        nodes.push_back(std::move(leftNode));
        int rightIdx = (int)nodes.size();
        nodes.push_back(std::move(rightNode));
        leaf.is_leaf = false;
        leaf.prop = best_cand.prop;
        leaf.thresh = best_cand.thr;
        leaf.left = leftIdx;
        leaf.right = rightIdx;
        leaf.idxs.clear();
        leaf.idxs.shrink_to_fit();
        num_leaves++;
    }
    // collect leaves and assign leaf_id in left-to-right order (preorder)
    std::vector<int> leafNodes;
    std::function<void(int)> collect = [&](int idx){
        if (nodes[idx].is_leaf) leafNodes.push_back(idx);
        else { collect(nodes[idx].left); collect(nodes[idx].right); }
    };
    collect(0);
    for (size_t i=0;i<leafNodes.size();++i) nodes[leafNodes[i]].leaf_id = (uint16_t)i;

    // Build MATree nodes in pre-order
    MATree tree;
    tree.max_depth = (uint8_t)params.max_depth;
    tree.num_leaves = (uint16_t)leafNodes.size();
    // preorder traversal to emit MANodes
    std::function<void(int)> emit = [&](int idx){
        const auto& bn = nodes[idx];
        MANode mn;
        mn.is_leaf = bn.is_leaf;
        if (bn.is_leaf) {
            mn.leaf_id = bn.leaf_id;
            mn.left = -1; mn.right = -1;
        } else {
            mn.prop = bn.prop;
            mn.threshold = bn.thresh;
            mn.left = bn.left;
            mn.right = bn.right;
        }
        tree.nodes.push_back(mn);
        if (!bn.is_leaf) {
            emit(bn.left);
            emit(bn.right);
        }
    };
    emit(0);
    // Fix left/right indices to reflect positions in pre-order vector.
    // Our BuildNode left/right were indices in nodes vector, not in tree.nodes preorder.
    // We emitted preorder, so we need to map old idx -> new position.
    // Rebuild mapping.
    std::vector<int> old_to_new(nodes.size(), -1);
    // We can recompute mapping by traversing again and assigning positions.
    // Simpler: after emit, the nodes vector's order already is preorder, but left/right still point to old BuildNode indices.
    // We need to translate: find position of each old node in preorder order.
    // Let's recompute preorder order list of old indices.
    std::vector<int> preorder_old;
    std::function<void(int)> collectOld = [&](int idx){ preorder_old.push_back(idx); if (!nodes[idx].is_leaf){ collectOld(nodes[idx].left); collectOld(nodes[idx].right);} };
    collectOld(0);
    for (size_t i=0;i<preorder_old.size();++i) old_to_new[preorder_old[i]] = (int)i;
    for (auto& n : tree.nodes) {
        if (!n.is_leaf) {
            // n.left/n.right currently hold old BuildNode indices (from emit). Need to translate via old_to_new.
            // But we stored old indices directly; they are BuildNode indices. Convert.
            int oldL = n.left;
            int oldR = n.right;
            n.left = old_to_new[oldL];
            n.right = old_to_new[oldR];
        }
    }
    return tree;
}

} // namespace prism::codec
