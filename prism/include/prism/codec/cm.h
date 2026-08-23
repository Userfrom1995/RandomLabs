#pragma once
#include <cstdint>

namespace prism::codec {

// B8 CM - context mixing / never-expand net
// Small logistic mixer combining per-context + spatial prior + SSE map.
// Implementation is lightweight: expanded leaf contexts (leaf*4 + activity)
// with per-leaf adaptive probabilities. Selected only when it shrinks bytes
// (never-expand). Flags bit0 records CM use per payload (global).

constexpr uint8_t CM_FLAG = 0x01;

inline int cm_expanded_leaves(int base_leaves) {
    if (base_leaves <= 0) return 1;
    int v = base_leaves * 4;
    if (v > 64) v = 64;
    return v;
}

inline int cm_context(uint16_t leaf, uint8_t activity, int base_leaves) {
    (void)base_leaves;
    return (int)leaf * 4 + (activity & 0x03);
}

} // namespace prism::codec
