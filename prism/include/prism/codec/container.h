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
    uint8_t flags = 0; // bit0 CM, bit1 LZP
    uint8_t effort = 0;
    std::vector<uint8_t> cfl_scales; // num_chroma
    std::vector<uint8_t> squeeze_levels; // num_channels
    uint32_t model_len = 0;
};

struct Container {
    ContainerHeader hdr;
    std::vector<MATreeGroup> trees;
    uint8_t predictor_mode = 0; // 0 global, 1 per-leaf (per-plane), 2 per-block 64x64 (B5.10), 3 per-block 32x32 (B5.12), 4 per-block 16x16 (B5.14)
    uint8_t global_pred_id = 3; // MED
    std::vector<uint8_t> per_leaf_pred; // if mode==1 (per-plane) or mode==2/3 (per-block flattened)
    // Rice priors omitted for M0
    std::vector<std::vector<uint8_t>> band_payloads; // per band: bytes
};

std::vector<uint8_t> container_encode(const Raster& raster, const Container& c);
Container container_decode_header(const uint8_t* data, size_t len, size_t& header_end);
Raster container_decode_payload(const Container& c, const std::vector<uint8_t>& full_bytes);

} // namespace prism::codec
