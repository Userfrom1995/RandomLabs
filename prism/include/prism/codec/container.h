#pragma once
#include "prism/types.h"
#include "prism/codec/matree.h"
#include <vector>
#include <cstdint>

namespace prism::codec {

struct ContainerHeader {
    uint32_t width = 0;
    uint32_t height = 0;
    uint8_t bit_depth = 8; // 8 or 16
    uint8_t num_channels = 3;
    uint8_t color_transform_id = 0;
    // bit0 CM, bit1 LZP OR R2_HYBRID (alias, exclusive), bit2 ACODER adaptive (FIFO),
    // bit3 ACODER backend v2 (zero-flag-first binarization + dual-rate class-prior
    // adaptation), bit4 MATREE_FLAT: the MA-tree applies to planes coded at squeeze
    // level 0 (spatial leaf contexts; C2 always-on tree). Requires bit2.
    // bit5 SQUEEZE_LIFT: squeezed planes use true CDC lifting (C4); clear =
    // legacy Stage-S decimation so old streams stay decodable.
    // bit6 XBAND (C5): cross-band prediction is active - for every plane with
    // squeeze level > 0 the header carries three int8 quantized weights
    // (1/16 units; H, V, D) scaling the co-located LL gradient term. Zero
    // weights are the exact identity. Requires bit2 and at least one
    // nonzero squeeze level.
    // bit7 MULTIPASS: Route 3 multi-pass ANS or Route 1 adaptive ACoderV2.
    // All 8 bits are allocated. Unknown bits are a hard decode error;
    // v1 streams (bit2 without bit3) stay decodable for legacy results CSVs.
    uint8_t flags = 0;
    uint8_t effort = 0;
    std::vector<uint8_t> cfl_scales; // num_channels
    std::vector<uint8_t> squeeze_levels; // num_channels
    // C5: three int8 weights (H, V, D) in 1/16 units per squeezing plane,
    // in channel order of planes with squeeze_levels > 0. Present iff bit6.
    std::vector<int8_t> xband_weights;
    uint32_t model_len = 0;
    // Route 2: hybrid-uint escape ladder (4, 8, or 16). Stored iff R2_HYBRID_FLAG.
    uint8_t r2_t_esc = 8;
    // Route 3: multipass model blob (present iff MULTIPASS_FLAG set)
    uint32_t r3_model_len = 0;
    std::vector<uint8_t> r3_model_blob;
};

// Container flags - all 8 bits allocated (issue #130 C1-C5, Route 2, Route 3).
//   bit0 0x01 CM_FLAG        - context mixing / never-expand net (cm.h)
//   bit1 0x02 LZP_FLAG       - Lempel-Ziv predictor pre-filter (lzp.h)
//                          OR R2_HYBRID_FLAG (alias, mutually exclusive with LZP+CM)
//   bit2 0x04 ACODER_FLAG    - adaptive FIFO range coder (v1 or v2)
//   bit3 0x08 ACODER_V2_FLAG - backend v2 binarization + dual-rate class-prior adaptation
//   bit4 0x10 MATREE_FLAT    - MA-tree on level-0 planes (requires bit2)
//   bit5 0x20 SQUEEZE_LIFT   - squeezing uses true CDC lifting (C4)
//   bit6 0x40 XBAND          - cross-band LL-gradient weights present (C5, requires bit2+squeeze)
//   bit7 0x80 MULTIPASS      - Route 3 multi-pass ANS or Route 1 adaptive ACoderV2
constexpr uint8_t ACODER_FLAG = 0x04;     // adaptive FIFO range coder (v1 or v2)
constexpr uint8_t ACODER_V2_FLAG = 0x08;  // backend v2 binarization + models
constexpr uint8_t MATREE_FLAT_FLAG = 0x10; // MA-tree on level-0 planes
constexpr uint8_t SQUEEZE_LIFT_FLAG = 0x20; // squeezing uses true CDC lifting
constexpr uint8_t XBAND_FLAG = 0x40;      // cross-band LL-gradient weights present
constexpr uint8_t MULTIPASS_FLAG = 0x80;  // Route 3 multi-pass ANS or Route 1 adaptive ACoderV2 (bit7)
// Route 2 hybrid-uint flag: reuses bit1 (0x02) aliasing LZP_FLAG.
// When set, the stream uses hybrid-uint tokenization instead of ZFF binarization
// under the same ACoderV2 backend. Requires ACODER_FLAG | ACODER_V2_FLAG.
// Mutually exclusive with LZP, CM, MATREE_FLAT, SQUEEZE_LIFT, XBAND, MULTIPASS.
// Decoder disambiguates via useHybrid guard suppressing LZP/CM interpretation.
// Spec addendum 24 must match this value (0x02, not 0x40).
constexpr uint8_t R2_HYBRID_FLAG = 0x02; // alias LZP_FLAG bit1, exclusive with LZP/CM
// R1 adaptive is distinguished by model_blob[0] high bit (nc | 0x80); no second flags byte.
// ContainerHeader::r3_model_len / r3_model_blob holds the multipass model blob for both routes.

struct Container {
    ContainerHeader hdr;
    std::vector<MATreeGroup> trees;
    uint8_t predictor_mode = 0; // 0 global, 1 per-leaf
    uint8_t global_pred_id = 3; // MED
    std::vector<uint8_t> per_leaf_pred; // if mode==1
    // Rice priors omitted for M0
    std::vector<std::vector<uint8_t>> band_payloads; // per band: bytes
};

std::vector<uint8_t> container_encode(const Raster& raster, const Container& c);
Container container_decode_header(const uint8_t* data, size_t len, size_t& header_end);
Raster container_decode_payload(const Container& c, const std::vector<uint8_t>& full_bytes);

} // namespace prism::codec
