#include "prism/codec/container.h"
#include "prism/crc32.h"
#include "prism/bitstream.h"
#include "prism/codec/predict.h"
#include "prism/codec/rans.h"
#include "prism/codec/color.h"
#include <stdexcept>

namespace prism::codec {

std::vector<uint8_t> container_encode(const Raster& /*raster*/, const Container& c) {
    std::vector<uint8_t> out;
    // Header
    out.push_back('P'); out.push_back('R'); out.push_back('S'); out.push_back('M');
    out.push_back(1); // version
    write_u32_le_vec(out, c.hdr.width);
    write_u32_le_vec(out, c.hdr.height);
    out.push_back(c.hdr.bit_depth);
    out.push_back(c.hdr.num_channels);
    out.push_back(c.hdr.color_transform_id);
    out.push_back(c.hdr.flags);
    out.push_back(c.hdr.effort);
    for (uint8_t v : c.hdr.cfl_scales) out.push_back(v);
    for (uint8_t v : c.hdr.squeeze_levels) out.push_back(v);
    // model_len placeholder
    size_t model_len_pos = out.size();
    write_u32_le_vec(out, 0);

    size_t model_start = out.size();

    // Model section as bit-packed blob
    BitWriter bw;
    // num_trees u16 LE (byte aligned)
    bw.write_u16_le((uint16_t)c.trees.size());
    for (const auto& tg : c.trees) {
        bw.write_u8(tg.group_id);
        bw.write_u8(tg.band_class);
        tg.tree.serialize(bw);
    }
    bw.write_bits(c.predictor_mode, 8);
    if (c.predictor_mode == 0) {
        bw.write_bits(c.global_pred_id, 8);
    } else {
        uint32_t total = (uint32_t)c.per_leaf_pred.size();
        bw.write_u32_le(total);
        for (uint8_t id : c.per_leaf_pred) bw.write_bits(id, 8);
    }
    // Rice priors omitted for M0 (effort<4)
    // crc32_model
    auto model_bytes_before_crc = bw.flush();
    // But we already flushed; need to compute crc before adding it, then append crc.
    // Reconstruct: we flushed to get bytes, now compute crc of those bytes
    uint32_t crc_model = crc32(model_bytes_before_crc.data(), model_bytes_before_crc.size());
    // Append crc to blob
    // We need to extend model_bytes_before_crc with crc LE
    std::vector<uint8_t> model_blob = model_bytes_before_crc;
    write_u32_le_vec(model_blob, crc_model);

    // Patch model_len
    uint32_t model_len = (uint32_t)model_blob.size();
    out[model_len_pos] = uint8_t(model_len & 0xFF);
    out[model_len_pos+1] = uint8_t((model_len>>8)&0xFF);
    out[model_len_pos+2] = uint8_t((model_len>>16)&0xFF);
    out[model_len_pos+3] = uint8_t((model_len>>24)&0xFF);

    out.insert(out.end(), model_blob.begin(), model_blob.end());

    // Payload: per plane, per band in post-order (for M0 one band per plane)
    for (auto& bp : c.band_payloads) {
        write_u32_le_vec(out, (uint32_t)bp.size());
        out.insert(out.end(), bp.begin(), bp.end());
    }

    // Footer crc32_all
    uint32_t crc_all = crc32(out.data(), out.size());
    write_u32_le_vec(out, crc_all);
    (void)model_start;
    return out;
}

// Helper to decode header+model from bytes
Container container_decode_header(const uint8_t* data, size_t len, size_t& header_end) {
    if (len < 18) throw DecodeError("container too short");
    if (data[0]!='P' || data[1]!='R' || data[2]!='S' || data[3]!='M') throw DecodeError("bad magic");
    uint8_t version = data[4];
    if (version != 1) throw DecodeError("unsupported version");
    uint32_t w = read_u32_le_bytes(data+5);
    uint32_t h = read_u32_le_bytes(data+9);
    uint8_t bd = data[13];
    uint8_t nc = data[14];
    uint8_t ct = data[15];
    uint8_t flags = data[16];
    uint8_t effort = data[17];
    if (w==0 || h==0) throw DecodeError("zero dimension");
    if (bd != 8 && bd != 16) throw DecodeError("bad bit depth");
    if (nc <1 || nc>4) throw DecodeError("bad channels");
    size_t pos = 18;
    size_t num_chroma = (nc >= 1) ? nc - 1 : 0;
    if (pos + num_chroma + nc + 4 > len) throw DecodeError("header truncated");
    std::vector<uint8_t> cfl_scales;
    for (size_t i=0;i<num_chroma;++i) cfl_scales.push_back(data[pos++]);
    std::vector<uint8_t> sq;
    for (size_t i=0;i<nc;++i) sq.push_back(data[pos++]);
    uint32_t model_len = read_u32_le_bytes(data+pos); pos+=4;
    if (pos + model_len > len) throw DecodeError("model truncated");
    // Model blob
    const uint8_t* model_ptr = data + pos;
    if (model_len < 4) throw DecodeError("model too small for crc");
    uint32_t crc_stored = read_u32_le_bytes(model_ptr + model_len - 4);
    uint32_t crc_calc = crc32(model_ptr, model_len - 4);
    if (crc_stored != crc_calc) throw DecodeError("crc32_model mismatch - corrupt model");
    // Parse model blob (excluding last 4 crc bytes)
    BitReader br(model_ptr, model_len - 4);
    uint16_t num_trees = br.read_u16_le();
    std::vector<MATreeGroup> trees;
    for (uint16_t i=0;i<num_trees;++i) {
        MATreeGroup g;
        g.group_id = br.read_u8();
        g.band_class = br.read_u8();
        g.tree = MATree::deserialize(br);
        trees.push_back(std::move(g));
    }
    uint8_t predictor_mode = br.read_u8();
    uint8_t global_pred = 3;
    std::vector<uint8_t> per_leaf;
    if (predictor_mode == 0) {
        global_pred = br.read_u8();
    } else if (predictor_mode == 1) {
        uint32_t total = br.read_u32_le();
        per_leaf.resize(total);
        for (uint32_t i=0;i<total;++i) per_leaf[i] = br.read_u8();
    } else {
        throw DecodeError("bad predictor_mode");
    }
    // Rice priors skipped for M0; if effort>=4 would parse but we ignore remaining bits before crc.

    Container c;
    c.hdr.width = w; c.hdr.height = h; c.hdr.bit_depth = bd; c.hdr.num_channels = nc;
    c.hdr.color_transform_id = ct; c.hdr.flags = flags; c.hdr.effort = effort;
    c.hdr.cfl_scales = cfl_scales; c.hdr.squeeze_levels = sq; c.hdr.model_len = model_len;
    c.trees = trees;
    c.predictor_mode = predictor_mode;
    c.global_pred_id = global_pred;
    c.per_leaf_pred = per_leaf;
    // header_end after model blob
    header_end = pos + model_len;
    // Payload will be parsed by caller
    return c;
}

} // namespace prism::codec
