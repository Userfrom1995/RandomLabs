#include "prism/codec/matree.h"
#include <stdexcept>

namespace prism::codec {

MATree MATree::single_leaf() {
    MATree t;
    t.max_depth = 0;
    t.num_leaves = 1;
    MANode n;
    n.is_leaf = true;
    n.leaf_id = 0;
    t.nodes.push_back(n);
    return t;
}

uint16_t MATree::eval(const Feature& f) const {
    if (nodes.empty()) return 0;
    size_t idx = 0;
    while (!nodes[idx].is_leaf) {
        const auto& nd = nodes[idx];
        bool go_left = false;
        switch (nd.prop) {
            case PropId::QG: go_left = f.qg < nd.threshold; break;
            case PropId::BandClass: go_left = f.band_class == (uint8_t)nd.threshold; break;
            case PropId::LlcClass: go_left = f.llc_class < (uint8_t)nd.threshold; break;
            case PropId::ResDiff: go_left = f.res_diff < nd.threshold; break;
            case PropId::SiblingClass: go_left = f.sibling_class < (uint8_t)nd.threshold; break;
            case PropId::Activity: go_left = f.activity < (uint8_t)nd.threshold; break;
            case PropId::PositionY: go_left = f.position_y < (uint8_t)nd.threshold; break;
            case PropId::PositionX: go_left = f.position_x < (uint8_t)nd.threshold; break;
            case PropId::NeighborMag: go_left = f.neighbor_mag < (uint8_t)nd.threshold; break;
            case PropId::PrevCoeffMag: go_left = f.prev_coeff_mag < (uint8_t)nd.threshold; break;
            case PropId::LeftMag: go_left = f.left_mag < nd.threshold; break;
            case PropId::PrevResMag: go_left = f.prev_res_mag < (uint8_t)nd.threshold; break;
        }
        // In pre-order with implicit children, left is idx+1, right is left subtree size +1
        // For single-leaf or linear chain, we can compute.
        // For M0 single leaf, never here.
        // For general tree, we need to walk using stack. Simpler: store nodes in BFS and children indices.
        // Our single_leaf avoids this. For future trees, we will store explicit child indices built during deserialize.
        if (go_left) idx = (size_t)nd.left;
        else idx = (size_t)nd.right;
        if (idx >= nodes.size()) return 0;
    }
    return nodes[idx].leaf_id;
}

void MATree::serialize(BitWriter& bw) const {
    bw.write_u8(max_depth);
    bw.write_u16_le(num_leaves);
    for (const auto& n : nodes) {
        bw.write_bits(n.is_leaf ? 1 : 0, 1);
        if (n.is_leaf) {
            bw.write_u16_le(n.leaf_id);
        } else {
            bw.write_bits(static_cast<uint32_t>(n.prop), 8);
            bw.write_u16_le(n.threshold);
        }
    }
}

MATree MATree::deserialize(BitReader& br) {
    MATree t;
    t.max_depth = br.read_u8();
    t.num_leaves = br.read_u16_le();
    size_t num_nodes = t.num_leaves == 0 ? 0 : (size_t)2 * t.num_leaves - 1;
    t.nodes.reserve(num_nodes);
    for (size_t i = 0; i < num_nodes; ++i) {
        MANode n;
        uint32_t is_leaf = br.read_bits(1);
        n.is_leaf = is_leaf != 0;
        if (n.is_leaf) {
            n.leaf_id = br.read_u16_le();
        } else {
            n.prop = static_cast<PropId>(br.read_bits(8));
            n.threshold = br.read_u16_le();
        }
        t.nodes.push_back(n);
    }
    // Reconstruct child indices for eval: pre-order implicit pairing.
    // For node at idx, left child is idx+1, right child is idx + 1 + size_of_left_subtree.
    // Compute subtree sizes via recursion.
    // For leaf, size=1. For internal, size=1+size(left)+size(right).
    // We can compute from leaves count but simpler: walk and assign using stack.
    // For now, assign left=idx+1, and compute right via counting nodes in left subtree.
    // We need to know left subtree node count: it is 2*leaves_in_left -1.
    // Hard without tree structure. Instead build child indices during deserialization by
    // simulating pre-order stack: each internal node expects two children in order.
    // We'll fill left/right by traversing nodes in order and using a stack of pending parents.
    for (auto& n : t.nodes) { n.left = -1; n.right = -1; }
    // Use iterative pre-order reconstruction
    std::vector<int> stack; // pending internal nodes needing children
    for (size_t i = 0; i < t.nodes.size(); ++i) {
        // Find parent that needs a child
        while (!stack.empty() && t.nodes[stack.back()].left != -1 && t.nodes[stack.back()].right != -1) {
            stack.pop_back();
        }
        if (!stack.empty()) {
            auto& parent = t.nodes[stack.back()];
            if (parent.left == -1) parent.left = (int32_t)i;
            else if (parent.right == -1) parent.right = (int32_t)i;
        }
        if (!t.nodes[i].is_leaf) stack.push_back((int)i);
    }
    return t;
}

} // namespace prism::codec
