#pragma once
#include "prism/types.h"
#include "prism/bitstream.h"
#include <vector>
#include <cstdint>

namespace prism::codec {

// Property ids per architecture.md Section 4.1
enum class PropId : uint8_t {
    QG = 0,
    BandClass = 1,
    LlcClass = 2,
    ResDiff = 3,
    SiblingClass = 4,
    Activity = 5
};

struct MANode {
    bool is_leaf = true;
    uint16_t leaf_id = 0; // valid if leaf
    PropId prop = PropId::QG;
    uint16_t threshold = 0; // valid if internal
    // children indices in nodes vector; -1 if leaf
    int32_t left = -1;
    int32_t right = -1;
};

struct MATree {
    uint8_t max_depth = 0;
    uint16_t num_leaves = 0;
    std::vector<MANode> nodes; // pre-order

    // Evaluate feature to leaf id
    uint16_t eval(const Feature& f) const;

    // Build a trivial single-leaf tree (M0)
    static MATree single_leaf();

    // Serialization per architecture.md 4.2
    void serialize(BitWriter& bw) const;
    static MATree deserialize(BitReader& br);
};

struct MATreeGroup {
    uint8_t group_id = 0; // plane group
    uint8_t band_class = 0;
    MATree tree;
};

} // namespace prism::codec
