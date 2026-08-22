#include "prism/prism.h"
#include "prism/crc32.h"
#include "prism/codec/color.h"
#include "prism/codec/predict.h"
#include "prism/codec/rans.h"
#include "prism/codec/container.h"
#include "prism/codec/analyze.h"
#include "prism/codec/matree.h"
#include "prism/codec/squeeze.h"
#include <fstream>
#include <stdexcept>

namespace prism {

using namespace codec;

std::vector<uint8_t> encode(const Raster& raster, const EncodeOpts& opts) {
    if (raster.w==0||raster.h==0) throw EncodeError("empty raster");
    uint8_t bd = (raster.bd==BitDepth::BD16)?16:8;
    uint8_t nc = (uint8_t)raster.num_channels();
    // Analyze
    AnalyzeResult ar = analyze(raster, opts.effort);
    if (!opts.use_ycocg) ar.color_transform_id = 0;

    // Apply color transform
    Raster transformed = raster;
    ColorTransform ct = static_cast<ColorTransform>(ar.color_transform_id);
    if (ct != ColorTransform::None) {
        transformed = apply_color(raster, ct, ar.cfl_scales);
    }

    // Build container
    Container c;
    c.hdr.width = raster.w;
    c.hdr.height = raster.h;
    c.hdr.bit_depth = bd;
    c.hdr.num_channels = nc;
    c.hdr.color_transform_id = ar.color_transform_id;
    c.hdr.flags = 0; // CM/LZP off for M0
    c.hdr.effort = opts.effort;
    c.hdr.cfl_scales = ar.cfl_scales;
    c.hdr.squeeze_levels = ar.squeeze_levels;
    c.trees = ar.trees;
    c.predictor_mode = ar.predictor_mode;
    c.global_pred_id = ar.global_pred_id;
    c.per_leaf_pred = ar.per_leaf_pred;

    // For each plane, apply Squeeze then encode each band (B7)
    c.band_payloads.clear();
    // B5.10/B5.12/B5.14 block mode: precompute per-plane block maps if mode==2 (64) or 3 (32) or 4 (16)
    uint32_t BLOCK = 64;
    if (c.predictor_mode == 3) BLOCK = 32;
    else if (c.predictor_mode == 4) BLOCK = 16;
    std::vector<std::vector<uint8_t>> plane_block_maps;
    if (c.predictor_mode == 2 || c.predictor_mode == 3 || c.predictor_mode == 4) {
        size_t offset = 0;
        for (size_t pi=0; pi< transformed.planes.size(); ++pi) {
            uint32_t nbX = (transformed.w + BLOCK - 1) / BLOCK;
            uint32_t nbY = (transformed.h + BLOCK - 1) / BLOCK;
            size_t nb = (size_t)nbX * nbY;
            std::vector<uint8_t> m;
            m.reserve(nb);
            for (size_t k=0;k<nb && offset+k<c.per_leaf_pred.size();++k) m.push_back(c.per_leaf_pred[offset+k]);
            // pad if short (backward compat)
            if (m.size()<nb) m.resize(nb, c.global_pred_id);
            plane_block_maps.push_back(std::move(m));
            offset += nb;
        }
    }
    // precompute per-band map for squeeze mode 5
    std::vector<std::vector<uint8_t>> plane_per_band_maps;
    if (c.predictor_mode == 5) {
        plane_per_band_maps.resize(transformed.planes.size());
        for (size_t pi=0; pi< transformed.planes.size(); ++pi) {
            size_t off = pi * 4;
            std::vector<uint8_t> m;
            for (size_t k=0;k<4 && off+k < c.per_leaf_pred.size(); ++k) m.push_back(c.per_leaf_pred[off+k]);
            if (m.size()<4) m.resize(4, c.global_pred_id);
            plane_per_band_maps[pi] = std::move(m);
        }
    }
    std::vector<std::vector<uint8_t>> plane_leaf_maps;
    if (c.predictor_mode == 6) {
        plane_leaf_maps.resize(transformed.planes.size());
        for (size_t pi=0; pi< transformed.planes.size(); ++pi) {
            size_t off = pi * 8;
            std::vector<uint8_t> m;
            for (size_t k=0;k<8 && off+k < c.per_leaf_pred.size(); ++k) m.push_back(c.per_leaf_pred[off+k]);
            if (m.size()<8) m.resize(8, c.global_pred_id);
            plane_leaf_maps[pi] = std::move(m);
        }
    }
    for (size_t pi=0; pi< transformed.planes.size(); ++pi) {
        uint8_t levels = (pi < ar.squeeze_levels.size()) ? ar.squeeze_levels[pi] : 0;
        SqueezeResult sr = squeeze_encode_plane(transformed.planes[pi], transformed.w, transformed.h, levels, bd);
        // Squeeze-aware encoding: LL band uses 704 contexts, HF bands use 1408 with llc_class
        // B5.22: HF ModelBank shared across HF bands of same plane to amortize warmup (instead of fresh per band)
        std::vector<uint16_t> ll_for_hf;
        if (sr.levels > 0 && !sr.bands.empty()) ll_for_hf = sr.bands[0].data;
        ModelBank mb_ll = ModelBank::create(704, 16);
        ModelBank mb_hf = ModelBank::create(1408, 16);
        bool use_shared_hf = (sr.levels > 0);
        size_t band_idx = 0;
        for (auto &band : sr.bands) {
            std::vector<int32_t> residuals;
            if ((c.predictor_mode == 2 || c.predictor_mode == 3 || c.predictor_mode == 4) && sr.levels==0) {
                residuals = compute_residuals_blockwise(band.data, band.w, band.h, plane_block_maps[pi], BLOCK);
            } else if (c.predictor_mode == 5 && sr.levels > 0) {
                uint8_t pid = plane_per_band_maps[pi][band_idx % 4];
                PredId pred = static_cast<PredId>(pid);
                if ((uint8_t)pred > 15) pred = PredId::MED;
                residuals = compute_residuals(band.data, band.w, band.h, pred);
            } else if (c.predictor_mode == 6 && sr.levels==0) {
                residuals = compute_residuals_leaves(band.data, band.w, band.h, plane_leaf_maps[pi]);
            } else {
                PredId pred;
                if (c.predictor_mode == 1 && pi < c.per_leaf_pred.size()) {
                    pred = static_cast<PredId>(c.per_leaf_pred[pi]);
                    if ((uint8_t)pred > 15) pred = PredId::MED;
                } else {
                    pred = static_cast<PredId>(c.global_pred_id);
                    if ((uint8_t)pred > 15) pred = PredId::MED;
                }
                residuals = compute_residuals(band.data, band.w, band.h, pred);
            }
            std::vector<uint8_t> bytes;
            if (band.band_class == 0 || sr.levels == 0) {
                // LL or no-squeeze: use dedicated LL bank (fresh per plane forencode determinism)
                // For LL we use mb_ll shared? LL is single band so no difference
                ModelBank mb = mb_ll;
                rans_encode_residuals_auto(residuals, band.w, band.h, mb, bytes);
                mb_ll = mb;
            } else {
                ModelBank &mb = mb_hf;
                rans_encode_residuals_with_llc(residuals, band.w, band.h, ll_for_hf, mb, bytes);
                // mb_hf keeps updated state across HF bands
            }
            c.band_payloads.push_back(std::move(bytes));
            ++band_idx;
        }
    }

    return container_encode(transformed, c);
}

Raster decode(const std::vector<uint8_t>& data) {
    return decode(data.data(), data.size());
}

Raster decode(const uint8_t* data, size_t len) {
    if (len < 4) throw DecodeError("too short");
    // Footer crc
    if (len < 4) throw DecodeError("no footer");
    uint32_t crc_stored = read_u32_le_bytes(data + len - 4);
    uint32_t crc_calc = crc32(data, len - 4);
    if (crc_stored != crc_calc) throw DecodeError("crc32_all mismatch - corrupt payload");
    size_t header_end=0;
    Container c = container_decode_header(data, len - 4, header_end);
    // Parse payload bands
    size_t pos = header_end;
    // Compute expected band count from squeeze_levels
    size_t expected = 0;
    for (uint8_t sl : c.hdr.squeeze_levels) expected += 1 + 3u * sl;
    if (expected==0) expected = c.hdr.num_channels; // fallback
    std::vector<std::vector<uint8_t>> payloads;
    for (size_t i=0;i<expected;++i){
        if (pos + 4 > len - 4) throw DecodeError("payload truncated (band_len)");
        uint32_t blen = read_u32_le_bytes(data + pos); pos+=4;
        if (pos + blen > len - 4) throw DecodeError("payload truncated (band_bytes)");
        std::vector<uint8_t> b(data+pos, data+pos+blen);
        payloads.push_back(std::move(b));
        pos+=blen;
    }
    if (pos != len - 4) throw DecodeError("extra bytes after payload");
    // Reconstruct planes (with Squeeze)
    uint32_t w = c.hdr.width, h = c.hdr.height;
    uint8_t bd = c.hdr.bit_depth;
    Raster out(w,h, static_cast<Channels>(c.hdr.num_channels), bd==16?BitDepth::BD16:BitDepth::BD8);
    if (payloads.size() != expected) {
        throw DecodeError("band count mismatch");
    }
    size_t payload_idx = 0;
    for (size_t pi=0; pi< out.planes.size(); ++pi) {
        uint8_t levels = (pi < c.hdr.squeeze_levels.size()) ? c.hdr.squeeze_levels[pi] : 0;
        uint16_t plane_bd_max = 65535;
        if (levels == 0) plane_bd_max = (c.hdr.color_transform_id != 0) ? 65535 : (bd==8? (uint16_t)255 : (uint16_t)65535);
        size_t band_count = 1 + 3u * levels;
        // compute band dimensions in post-order
        std::vector<std::pair<uint32_t,uint32_t>> band_dims;
        band_dims.reserve(band_count);
        // Reproduce same as squeeze_encode: w2 chain
        uint32_t cur_w=w, cur_h=h;
        std::vector<std::pair<uint32_t,uint32_t>> lvl_dims;
        for(uint8_t l=0;l<levels;++l){
            if(cur_w%2!=0||cur_h%2!=0) break;
            cur_w/=2; cur_h/=2;
            lvl_dims.emplace_back(cur_w,cur_h);
        }
        // actual levels after odd check
        uint8_t actual_levels = (uint8_t)lvl_dims.size();
        if(actual_levels!=levels){
            // fallback: levels mismatch due to odd, adjust band_count
            band_count = 1 + 3u*actual_levels;
            levels = actual_levels;
        }
        // band_dims post-order: first LL deepest
        if(!lvl_dims.empty()){
            band_dims.push_back(lvl_dims.back());
            for(int i=(int)lvl_dims.size()-1;i>=0;--i){
                band_dims.push_back(lvl_dims[i]);
                band_dims.push_back(lvl_dims[i]);
                band_dims.push_back(lvl_dims[i]);
            }
        } else {
            band_dims.emplace_back(w,h);
        }
        if(band_dims.size()!=band_count) throw DecodeError("band dims mismatch");
        // decode each band's residuals (Squeeze-aware with llc_class)
        SqueezeResult sr; sr.levels = levels;
        sr.bands.reserve(band_count);
        std::vector<uint16_t> ll_for_hf_decode;
        // B5.10/B5.12 block maps for this plane if mode==2/3
        std::vector<uint8_t> block_map;
        uint32_t BLOCK_D = 64;
        if (c.predictor_mode == 3) BLOCK_D = 32;
        else if (c.predictor_mode == 4) BLOCK_D = 16;
        if (c.predictor_mode == 2 || c.predictor_mode == 3 || c.predictor_mode == 4) {
            size_t plane_offset = 0;
            for (size_t k=0;k<pi;++k) {
                uint32_t nbXk = (w + BLOCK_D - 1)/BLOCK_D;
                uint32_t nbYk = (h + BLOCK_D - 1)/BLOCK_D;
                plane_offset += (size_t)nbXk*nbYk;
            }
            uint32_t nbX = (w + BLOCK_D -1)/BLOCK_D;
            uint32_t nbY = (h + BLOCK_D -1)/BLOCK_D;
            size_t nb = (size_t)nbX*nbY;
            block_map.reserve(nb);
            for (size_t k=0;k<nb && plane_offset+k<c.per_leaf_pred.size();++k) block_map.push_back(c.per_leaf_pred[plane_offset+k]);
            if (block_map.size()<nb) block_map.resize(nb, c.global_pred_id);
        }
        // B5.35 per-band map for squeeze mode 5
        std::vector<uint8_t> per_band_map;
        if (c.predictor_mode == 5 && levels > 0) {
            size_t off = pi * 4;
            for (size_t k=0;k<4 && off+k < c.per_leaf_pred.size(); ++k) per_band_map.push_back(c.per_leaf_pred[off+k]);
            if (per_band_map.size()<4) per_band_map.resize(4, c.global_pred_id);
        }
        std::vector<uint8_t> leaf_map;
        if (c.predictor_mode == 6 && levels==0) {
            size_t off = pi * 8;
            for (size_t k=0;k<8 && off+k < c.per_leaf_pred.size(); ++k) leaf_map.push_back(c.per_leaf_pred[off+k]);
            if (leaf_map.size()<8) leaf_map.resize(8, c.global_pred_id);
        }
        ModelBank mb_ll_dec = ModelBank::create(704, 16);
        ModelBank mb_hf_dec = ModelBank::create(1408, 16);
        for(size_t bi=0; bi<band_count; ++bi){
            if(payload_idx >= payloads.size()) throw DecodeError("payload underflow");
            auto &pb = payloads[payload_idx++];
            uint32_t bw = band_dims[bi].first;
            uint32_t bh = band_dims[bi].second;
            size_t n = (size_t)bw * bh;
            uint8_t band_class = (bi==0?0: (uint8_t)(1 + (bi-1)%3));
            std::vector<int32_t> residuals;
            if (band_class == 0 || levels == 0) {
                ModelBank &mb = mb_ll_dec;
                rans_decode_residuals_auto(pb, n, bw, bh, mb, residuals);
            } else {
                ModelBank &mb = mb_hf_dec;
                rans_decode_residuals_with_llc(pb, n, bw, bh, ll_for_hf_decode, mb, residuals);
            }
            if(residuals.size()!=n) throw DecodeError("residual count mismatch band");
            std::vector<uint16_t> band_plane;
            if ((c.predictor_mode == 2 || c.predictor_mode == 3 || c.predictor_mode == 4) && levels==0) {
                band_plane = reconstruct_plane_blockwise(residuals, bw, bh, block_map, BLOCK_D, plane_bd_max);
            } else if (c.predictor_mode == 5 && levels > 0) {
                uint8_t pid = per_band_map[bi % 4];
                PredId pred = static_cast<PredId>(pid);
                if ((uint8_t)pred > 15) pred = PredId::MED;
                band_plane = reconstruct_plane(residuals, bw, bh, pred, plane_bd_max);
            } else if (c.predictor_mode == 6 && levels==0) {
                band_plane = reconstruct_plane_leaves(residuals, bw, bh, leaf_map, plane_bd_max);
            } else {
                PredId pred;
                if (c.predictor_mode == 1 && pi < c.per_leaf_pred.size()) {
                    pred = static_cast<PredId>(c.per_leaf_pred[pi]);
                    if ((uint8_t)pred > 15) pred = PredId::MED;
                } else {
                    pred = static_cast<PredId>(c.global_pred_id);
                    if ((uint8_t)pred > 15) pred = PredId::MED;
                }
                band_plane = reconstruct_plane(residuals, bw, bh, pred, plane_bd_max);
            }
            SqueezeResult::Band b; b.w=bw; b.h=bh; b.data=std::move(band_plane);
            b.band_class = band_class;
            sr.bands.push_back(std::move(b));
            if (bi == 0 && levels > 0) ll_for_hf_decode = sr.bands[0].data;
        }
        auto plane = squeeze_decode_plane(sr, w, h);
        out.planes[pi] = std::move(plane);
    }
    // Invert color
    ColorTransform ct = static_cast<ColorTransform>(c.hdr.color_transform_id);
    if (ct != ColorTransform::None) {
        out = invert_color(out, ct, c.hdr.cfl_scales);
    }
    return out;
}

std::vector<uint8_t> read_file(const std::filesystem::path& p){
    std::ifstream f(p, std::ios::binary);
    if (!f) throw std::runtime_error("cannot open "+p.string());
    return std::vector<uint8_t>((std::istreambuf_iterator<char>(f)), std::istreambuf_iterator<char>());
}
void write_file(const std::filesystem::path& p, const std::vector<uint8_t>& data){
    std::ofstream f(p, std::ios::binary);
    if (!f) throw std::runtime_error("cannot write "+p.string());
    f.write((char*)data.data(), data.size());
}
std::vector<uint8_t> encode_file(const std::filesystem::path& in_path, const EncodeOpts& /*opts*/){
    // This is for encoding raw raster files via frontend decode_to_raster path handled by CLI
    auto data = read_file(in_path);
    (void)data;
    throw EncodeError("encode_file: use frontend decode_to_raster then encode()");
}
Raster decode_file(const std::filesystem::path& in_path){
    auto data = read_file(in_path);
    return decode(data);
}

} // namespace prism
