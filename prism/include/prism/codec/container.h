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
    // bit0 CM, bit1 LZP, bit2 ACODER adaptive (FIFO), bit3 ACODER backend v2
    // (zero-flag-first binarization + dual-rate class-prior adaptation).
    // Unknown bits are a hard decode error; v1 streams (bit2 without bit3)
    // stay decodable for legacy results CSVs.
    uint8_t flags = 0;
    uint8_t effort = 0;
    std::vector<uint8_t> cfl_scales; // num_chroma
    std::vector<uint8_t> squeeze_levels; // num_channels
    uint32_t model_len = 0;
};

// Container flags (issue #130 C1 names bit3).
constexpr uint8_t ACODER_FLAG = 0x04;     // adaptive FIFO range coder (v1 or v2)
constexpr uint8_t ACODER_V2_FLAG = 0x08;  // backend v2 binarization + models

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
