#include "prism/prism.h"
#include "prism/crc32.h"
#include "prism/codec/color.h"
#include "prism/codec/predict.h"
#include "prism/codec/rans.h"
#include "prism/codec/acoder.h"
#include "prism/codec/container.h"
#include "prism/codec/analyze.h"
#include "prism/codec/matree.h"
#include "prism/codec/matree_builder.h"
#include "prism/codec/squeeze.h"
#include "prism/codec/cm.h"
#include "prism/codec/lzp.h"
#include <fstream>
#include <stdexcept>
#include <algorithm>

namespace prism {

using namespace codec;

static inline int32_t med_pred(int32_t L, int32_t T, int32_t TL){
    if (TL >= std::max(L,T)) return std::min(L,T);
    if (TL <= std::min(L,T)) return std::max(L,T);
    return L + T - TL;
}

// ----- generic band encode with optional CM/LZP -----
static std::vector<uint8_t> encode_band_generic(const std::vector<uint16_t>& data, uint32_t w, uint32_t h,
                                              uint8_t band_class, bool isLL,
                                              const std::vector<uint16_t>* llSrc,
                                              const std::vector<uint16_t>* siblingSrc,
                                              const MATree& tree, int num_leaves,
                                              uint8_t bit_depth,
                                              bool useCM, bool useLZP) {
    if (w==0||h==0) { AEncoder enc; return enc.flush_and_emit(); }
    size_t n = (size_t)w*h;
    // fast plain path without generic overhead -> delegate to original logic if both false
    // but we also handle generic for CM/LZP below
    if (!useCM && !useLZP) {
        // plain path (same as before) - use acoder_encode_plane_leaves path for efficiency
        // replicate original encode_band_leaf plain to avoid double logic
        std::vector<int32_t> residuals; residuals.reserve(n);
        std::vector<uint16_t> leaf_ids; leaf_ids.reserve(n);
        std::vector<int32_t> resHist(n,0);
        for (size_t idx=0; idx<n; ++idx) {
            uint32_t x = (uint32_t)(idx % w);
            uint32_t y = (uint32_t)(idx / w);
            int32_t L=0,T=0,TL=0,TR=0;
            if (isLL) {
                L = (x>0)? (int32_t)data[idx-1]:0;
                T = (y>0)? (int32_t)data[idx-w]:0;
                TL= (x>0&&y>0)?(int32_t)data[idx-w-1]:0;
                TR= (y>0&&x+1<w)?(int32_t)data[idx-w+1]:0;
                int32_t pred = med_pred(L,T,TL);
                int32_t e = (int32_t)data[idx] - pred;
                resHist[idx]=e;
                Feature f{}; f.band_class = band_class; f.qg = quant_qg(L,T,TL,TR);
                if (llSrc) f.llc_class = quant_llc((*llSrc)[idx], bit_depth); else f.llc_class=0;
                int32_t dL=0,dU=0,dUL=0; if(x>0) dL=resHist[idx-1]; if(y>0) dU=resHist[idx-w]; if(x>0&&y>0) dUL=resHist[idx-w-1];
                f.res_diff=(uint16_t)residual_diff_context(dL,dU,dUL);
                if(siblingSrc){ int16_t sv=(int16_t)(*siblingSrc)[idx]; f.sibling_class=quant_sibling(sv);} else f.sibling_class=0;
                int grad=std::abs(L-TL)+std::abs(T-TL); if(grad<4) f.activity=0; else if(grad<16) f.activity=1; else if(grad<64) f.activity=2; else f.activity=3;
                uint16_t leaf=tree.eval(f); if(leaf >= (uint16_t)num_leaves) leaf=0;
                residuals.push_back(e); leaf_ids.push_back(leaf);
            } else {
                int16_t sv=(int16_t)data[idx];
                int16_t l=(x>0)?(int16_t)data[idx-1]:0;
                int16_t t=(y>0)?(int16_t)data[idx-w]:0;
                int16_t tl=(x>0&&y>0)?(int16_t)data[idx-w-1]:0;
                int16_t tr=(y>0&&x+1<w)?(int16_t)data[idx-w+1]:0;
                L=l; T=t; TL=tl; TR=tr;
                int32_t pred=med_pred(L,T,TL);
                int32_t e=(int32_t)sv - pred; resHist[idx]=e;
                Feature f{}; f.band_class=band_class; f.qg=quant_qg(L,T,TL,TR);
                if(llSrc) f.llc_class=quant_llc((*llSrc)[idx],bit_depth); else f.llc_class=0;
                int32_t dL=0,dU=0,dUL=0; if(x>0) dL=resHist[idx-1]; if(y>0) dU=resHist[idx-w]; if(x>0&&y>0) dUL=resHist[idx-w-1];
                f.res_diff=(uint16_t)residual_diff_context(dL,dU,dUL);
                if(siblingSrc){ int16_t ssv=(int16_t)(*siblingSrc)[idx]; f.sibling_class=quant_sibling(ssv);} else f.sibling_class=0;
                int grad=std::abs(L-TL)+std::abs(T-TL); if(grad<4) f.activity=0; else if(grad<16) f.activity=1; else if(grad<64) f.activity=2; else f.activity=3;
                uint16_t leaf=tree.eval(f); if(leaf>=(uint16_t)num_leaves) leaf=0;
                residuals.push_back(e); leaf_ids.push_back(leaf);
            }
        }
        return acoder_encode_plane_leaves(residuals, leaf_ids, num_leaves);
    }
    // CM and/or LZP path
    int effCtx = useCM ? cm_expanded_leaves(num_leaves) : num_leaves;
    if (effCtx<=0) effCtx=1;
    if (effCtx>64) effCtx=64;
    ACModels models(effCtx);
    AEncoder enc;
    uint16_t flagProb = 32768;
    std::vector<int32_t> lzp_tbl;
    if (useLZP) lzp_tbl.assign(LZP_TABLE_SIZE, LZP_EMPTY);
    std::vector<int32_t> resHist(n,0);
    for (size_t idx=0; idx<n; ++idx) {
        uint32_t x = (uint32_t)(idx % w);
        uint32_t y = (uint32_t)(idx / w);
        int32_t L=0,T=0,TL=0,TR=0;
        int32_t e=0;
        Feature f{};
        f.band_class = band_class;
        if (isLL) {
            L = (x>0)? (int32_t)data[idx-1]:0;
            T = (y>0)? (int32_t)data[idx-w]:0;
            TL= (x>0&&y>0)?(int32_t)data[idx-w-1]:0;
            TR= (y>0&&x+1<w)?(int32_t)data[idx-w+1]:0;
            int32_t pred = med_pred(L,T,TL);
            e = (int32_t)data[idx] - pred;
            f.qg = quant_qg(L,T,TL,TR);
            if (llSrc) f.llc_class = quant_llc((*llSrc)[idx], bit_depth); else f.llc_class=0;
            int32_t dL=0,dU=0,dUL=0; if(x>0) dL=resHist[idx-1]; if(y>0) dU=resHist[idx-w]; if(x>0&&y>0) dUL=resHist[idx-w-1];
            f.res_diff=(uint16_t)residual_diff_context(dL,dU,dUL);
            if(siblingSrc){ int16_t sv=(int16_t)(*siblingSrc)[idx]; f.sibling_class=quant_sibling(sv);} else f.sibling_class=0;
            int grad=std::abs(L-TL)+std::abs(T-TL); if(grad<4) f.activity=0; else if(grad<16) f.activity=1; else if(grad<64) f.activity=2; else f.activity=3;
        } else {
            int16_t sv=(int16_t)data[idx];
            int16_t l=(x>0)?(int16_t)data[idx-1]:0;
            int16_t t=(y>0)?(int16_t)data[idx-w]:0;
            int16_t tl=(x>0&&y>0)?(int16_t)data[idx-w-1]:0;
            int16_t tr=(y>0&&x+1<w)?(int16_t)data[idx-w+1]:0;
            L=l; T=t; TL=tl; TR=tr;
            int32_t pred=med_pred(L,T,TL);
            e=(int32_t)sv - pred;
            f.qg=quant_qg(L,T,TL,TR);
            if(llSrc) f.llc_class=quant_llc((*llSrc)[idx],bit_depth); else f.llc_class=0;
            int32_t dL=0,dU=0,dUL=0; if(x>0) dL=resHist[idx-1]; if(y>0) dU=resHist[idx-w]; if(x>0&&y>0) dUL=resHist[idx-w-1];
            f.res_diff=(uint16_t)residual_diff_context(dL,dU,dUL);
            if(siblingSrc){ int16_t ssv=(int16_t)(*siblingSrc)[idx]; f.sibling_class=quant_sibling(ssv);} else f.sibling_class=0;
            int grad=std::abs(L-TL)+std::abs(T-TL); if(grad<4) f.activity=0; else if(grad<16) f.activity=1; else if(grad<64) f.activity=2; else f.activity=3;
        }
        uint16_t leaf = tree.eval(f);
        if (leaf >= (uint16_t)num_leaves) leaf=0;
        int ctx = leaf;
        if (useCM) ctx = cm_context(leaf, f.activity, num_leaves);
        if (ctx >= effCtx) ctx %= effCtx;
        if (ctx<0) ctx=0;
        if (useLZP) {
            int32_t dL_for_hash = LZP_EMPTY;
            if (idx>0) dL_for_hash = resHist[idx-1];
            else if (x>0) dL_for_hash = resHist[idx-1];
            int h = lzp_hash(leaf, f.activity, dL_for_hash);
            int32_t predLzp = lzp_tbl[h];
            bool hit = (predLzp != LZP_EMPTY && predLzp == e);
            enc.put_bin(flagProb, hit);
            if (!hit) enc.encode_residual(models, ctx, e);
            lzp_tbl[h]=e;
        } else {
            enc.encode_residual(models, ctx, e);
        }
        resHist[idx]=e;
    }
    return enc.flush_and_emit();
}

// Encode a single band using leaf contexts derived from tree.
// llSrc and siblingSrc may be null (for LL or first HF).
static std::vector<uint8_t> encode_band_leaf(const std::vector<uint16_t>& data, uint32_t w, uint32_t h,
                                              uint8_t band_class, bool isLL,
                                              const std::vector<uint16_t>* llSrc,
                                              const std::vector<uint16_t>* siblingSrc,
                                              const MATree& tree, int num_leaves,
                                              uint8_t bit_depth) {
    return encode_band_generic(data,w,h,band_class,isLL,llSrc,siblingSrc,tree,num_leaves,bit_depth,false,false);
}

static std::vector<uint16_t> decode_band_generic(const std::vector<uint8_t>& bytes, uint32_t w, uint32_t h,
                                               uint8_t band_class, bool isLL,
                                               const std::vector<uint16_t>* llSrc,
                                               const std::vector<uint16_t>* siblingSrc,
                                               const MATree& tree, int num_leaves,
                                               uint8_t bit_depth, uint16_t bd_max,
                                               bool useCM, bool useLZP) {
    if (w==0||h==0) return {};
    size_t n=(size_t)w*h;
    if (bytes.empty()) throw DecodeError("empty band bytes for leaf decode");
    if (!useCM && !useLZP) {
        // plain path
        ACModels models(num_leaves<=0?1:num_leaves);
        ADecoder dec; dec.init(bytes);
        std::vector<uint16_t> out(n);
        std::vector<int32_t> residuals(n,0);
        for (size_t idx=0; idx<n; ++idx) {
            uint32_t x=(uint32_t)(idx % w);
            uint32_t y=(uint32_t)(idx / w);
            int32_t L=0,T=0,TL=0,TR=0;
            if (isLL) {
                L = (x>0)? (int32_t)out[idx-1]:0;
                T = (y>0)? (int32_t)out[idx-w]:0;
                TL= (x>0&&y>0)?(int32_t)out[idx-w-1]:0;
                TR= (y>0&&x+1<w)?(int32_t)out[idx-w+1]:0;
                int32_t pred = med_pred(L,T,TL);
                Feature f{}; f.band_class = band_class; f.qg = quant_qg(L,T,TL,TR);
                if (llSrc) f.llc_class = quant_llc((*llSrc)[idx], bit_depth); else f.llc_class=0;
                int32_t dL=0,dU=0,dUL=0; if(x>0) dL=residuals[idx-1]; if(y>0) dU=residuals[idx-w]; if(x>0&&y>0) dUL=residuals[idx-w-1];
                f.res_diff=(uint16_t)residual_diff_context(dL,dU,dUL);
                if(siblingSrc){ int16_t sv=(int16_t)(*siblingSrc)[idx]; f.sibling_class=quant_sibling(sv);} else f.sibling_class=0;
                int grad=std::abs(L-TL)+std::abs(T-TL); if(grad<4) f.activity=0; else if(grad<16) f.activity=1; else if(grad<64) f.activity=2; else f.activity=3;
                uint16_t leaf=tree.eval(f); if(leaf >= (uint16_t)num_leaves) leaf=0;
                int32_t e = dec.decode_residual(models, leaf);
                residuals[idx]=e;
                int32_t s = pred + e;
                if (s<0) s=0; if (s>bd_max) s=bd_max;
                out[idx]=(uint16_t)s;
            } else {
                int16_t l = (x>0)? (int16_t)out[idx-1]:0;
                int16_t t = (y>0)? (int16_t)out[idx-w]:0;
                int16_t tl= (x>0&&y>0)?(int16_t)out[idx-w-1]:0;
                int16_t tr= (y>0&&x+1<w)?(int16_t)out[idx-w+1]:0;
                L=l; T=t; TL=tl; TR=tr;
                int32_t pred = med_pred(L,T,TL);
                Feature f{}; f.band_class = band_class; f.qg = quant_qg(L,T,TL,TR);
                if (llSrc) f.llc_class = quant_llc((*llSrc)[idx], bit_depth); else f.llc_class=0;
                int32_t dL=0,dU=0,dUL=0; if(x>0) dL=residuals[idx-1]; if(y>0) dU=residuals[idx-w]; if(x>0&&y>0) dUL=residuals[idx-w-1];
                f.res_diff=(uint16_t)residual_diff_context(dL,dU,dUL);
                if(siblingSrc){int16_t sv=(int16_t)(*siblingSrc)[idx]; f.sibling_class=quant_sibling(sv);} else f.sibling_class=0;
                int grad=std::abs(L-TL)+std::abs(T-TL); if(grad<4) f.activity=0; else if(grad<16) f.activity=1; else if(grad<64) f.activity=2; else f.activity=3;
                uint16_t leaf=tree.eval(f); if(leaf >= (uint16_t)num_leaves) leaf=0;
                int32_t e = dec.decode_residual(models, leaf);
                residuals[idx]=e;
                int32_t sv = pred + e;
                if (sv < -32768) sv=-32768; if (sv>32767) sv=32767;
                out[idx]=(uint16_t)(int16_t)sv;
            }
        }
        return out;
    }
    // CM/LZP path
    int effCtx = useCM ? cm_expanded_leaves(num_leaves) : num_leaves;
    if (effCtx<=0) effCtx=1;
    if (effCtx>64) effCtx=64;
    ACModels models(effCtx);
    ADecoder dec; dec.init(bytes);
    std::vector<uint16_t> out(n);
    std::vector<int32_t> residuals(n,0);
    uint16_t flagProb=32768;
    std::vector<int32_t> lzp_tbl;
    if (useLZP) lzp_tbl.assign(LZP_TABLE_SIZE, LZP_EMPTY);
    for (size_t idx=0; idx<n; ++idx) {
        uint32_t x=(uint32_t)(idx % w);
        uint32_t y=(uint32_t)(idx / w);
        int32_t L=0,T=0,TL=0,TR=0;
        if (isLL) {
            L = (x>0)? (int32_t)out[idx-1]:0;
            T = (y>0)? (int32_t)out[idx-w]:0;
            TL= (x>0&&y>0)?(int32_t)out[idx-w-1]:0;
            TR= (y>0&&x+1<w)?(int32_t)out[idx-w+1]:0;
            int32_t pred = med_pred(L,T,TL);
            Feature f{}; f.band_class=band_class; f.qg=quant_qg(L,T,TL,TR);
            if(llSrc) f.llc_class=quant_llc((*llSrc)[idx],bit_depth); else f.llc_class=0;
            int32_t dL=0,dU=0,dUL=0; if(x>0) dL=residuals[idx-1]; if(y>0) dU=residuals[idx-w]; if(x>0&&y>0) dUL=residuals[idx-w-1];
            f.res_diff=(uint16_t)residual_diff_context(dL,dU,dUL);
            if(siblingSrc){ int16_t sv=(int16_t)(*siblingSrc)[idx]; f.sibling_class=quant_sibling(sv);} else f.sibling_class=0;
            int grad=std::abs(L-TL)+std::abs(T-TL); if(grad<4) f.activity=0; else if(grad<16) f.activity=1; else if(grad<64) f.activity=2; else f.activity=3;
            uint16_t leaf=tree.eval(f); if(leaf >= (uint16_t)num_leaves) leaf=0;
            int ctx = leaf; if(useCM) ctx=cm_context(leaf,f.activity,num_leaves); if(ctx>=effCtx) ctx%=effCtx;
            int32_t e=0;
            if (useLZP) {
                int32_t dL_for_hash = LZP_EMPTY;
                if (idx>0) dL_for_hash=residuals[idx-1];
                int h=lzp_hash(leaf,f.activity,dL_for_hash);
                bool hit=dec.get_bin(flagProb);
                if (hit) e=lzp_tbl[h];
                else e=dec.decode_residual(models, ctx);
                if (e==LZP_EMPTY) e=0; // shouldn't happen for hit on empty, but decoder would have hit only if encoder had hit, which requires table not empty
                lzp_tbl[h]=e;
            } else {
                e=dec.decode_residual(models, ctx);
            }
            residuals[idx]=e;
            int32_t s = pred + e;
            if(s<0) s=0; if(s>bd_max) s=bd_max;
            out[idx]=(uint16_t)s;
        } else {
            int16_t l = (x>0)? (int16_t)out[idx-1]:0;
            int16_t t = (y>0)? (int16_t)out[idx-w]:0;
            int16_t tl= (x>0&&y>0)?(int16_t)out[idx-w-1]:0;
            int16_t tr= (y>0&&x+1<w)?(int16_t)out[idx-w+1]:0;
            L=l; T=t; TL=tl; TR=tr;
            int32_t pred = med_pred(L,T,TL);
            Feature f{}; f.band_class=band_class; f.qg=quant_qg(L,T,TL,TR);
            if(llSrc) f.llc_class=quant_llc((*llSrc)[idx],bit_depth); else f.llc_class=0;
            int32_t dL=0,dU=0,dUL=0; if(x>0) dL=residuals[idx-1]; if(y>0) dU=residuals[idx-w]; if(x>0&&y>0) dUL=residuals[idx-w-1];
            f.res_diff=(uint16_t)residual_diff_context(dL,dU,dUL);
            if(siblingSrc){int16_t sv=(int16_t)(*siblingSrc)[idx]; f.sibling_class=quant_sibling(sv);} else f.sibling_class=0;
            int grad=std::abs(L-TL)+std::abs(T-TL); if(grad<4) f.activity=0; else if(grad<16) f.activity=1; else if(grad<64) f.activity=2; else f.activity=3;
            uint16_t leaf=tree.eval(f); if(leaf >= (uint16_t)num_leaves) leaf=0;
            int ctx=leaf; if(useCM) ctx=cm_context(leaf,f.activity,num_leaves); if(ctx>=effCtx) ctx%=effCtx;
            int32_t e=0;
            if(useLZP){
                int32_t dL_for_hash = LZP_EMPTY;
                if(idx>0) dL_for_hash=residuals[idx-1];
                int h=lzp_hash(leaf,f.activity,dL_for_hash);
                bool hit=dec.get_bin(flagProb);
                if(hit) e=lzp_tbl[h];
                else e=dec.decode_residual(models, ctx);
                lzp_tbl[h]=e;
            } else {
                e=dec.decode_residual(models, ctx);
            }
            residuals[idx]=e;
            int32_t sv = pred + e;
            if(sv<-32768) sv=-32768; if(sv>32767) sv=32767;
            out[idx]=(uint16_t)(int16_t)sv;
        }
    }
    return out;
}

static std::vector<uint16_t> decode_band_leaf(const std::vector<uint8_t>& bytes, uint32_t w, uint32_t h,
                                               uint8_t band_class, bool isLL,
                                               const std::vector<uint16_t>* llSrc,
                                               const std::vector<uint16_t>* siblingSrc,
                                               const MATree& tree, int num_leaves,
                                               uint8_t bit_depth, uint16_t bd_max) {
    return decode_band_generic(bytes,w,h,band_class,isLL,llSrc,siblingSrc,tree,num_leaves,bit_depth,bd_max,false,false);
}

std::vector<uint8_t> encode(const Raster& raster, const EncodeOpts& opts) {
    if (raster.w==0||raster.h==0) throw EncodeError("empty raster");
    uint8_t bd = (raster.bd==BitDepth::BD16)?16:8;
    uint8_t nc = (uint8_t)raster.num_channels();
    AnalyzeResult ar = analyze(raster, opts.effort);
    if (!opts.use_ycocg) ar.color_transform_id = 0;
    Raster transformed = raster;
    ColorTransform ct = static_cast<ColorTransform>(ar.color_transform_id);
    transformed = apply_color(raster, ct, ar.cfl_scales);
    Container c;
    c.hdr.width = raster.w;
    c.hdr.height = raster.h;
    c.hdr.bit_depth = bd;
    c.hdr.num_channels = nc;
    c.hdr.color_transform_id = ar.color_transform_id;
    uint8_t flags = 0;
    bool use_acoder = (opts.effort >= 1);
    if (use_acoder) flags |= 0x04;
    c.hdr.flags = flags;
    c.hdr.effort = opts.effort;
    c.hdr.cfl_scales = ar.cfl_scales;
    c.hdr.squeeze_levels = ar.squeeze_levels;
    c.trees = ar.trees;
    c.predictor_mode = ar.predictor_mode;
    c.global_pred_id = ar.global_pred_id;
    c.per_leaf_pred = ar.per_leaf_pred;
    c.band_payloads.clear();
    PredId pred = static_cast<PredId>(c.global_pred_id);
    if ((uint8_t)pred > 8) pred = PredId::MED;
    uint16_t bd_max = (bd==8)?255:65535;
    bool hasSqueeze = false;
    for (auto v: c.hdr.squeeze_levels) if (v>0) hasSqueeze=true;
    MATree tree = c.trees.empty()? MATree::single_leaf() : c.trees[0].tree;
    int num_leaves = tree.num_leaves>0? tree.num_leaves:1;

    // B8: determine global CM/LZP flags via never-expand comparison
    bool wantCM = (opts.effort >= 4 && use_acoder);
    bool wantLZP = (opts.effort >= 7 && use_acoder);
    // Evaluate candidates globally (plain vs CM vs LZP vs CM+LZP)
    struct Cand { bool cm=false; bool lzp=false; size_t total=SIZE_MAX; };
    std::vector<Cand> candList;
    candList.push_back({false,false,0});
    if (wantCM) candList.push_back({true,false,0});
    if (wantLZP) candList.push_back({false,true,0});
    if (wantCM && wantLZP) candList.push_back({true,true,0});

    // If multiple candidates, measure total size for each via trial encode
    if (candList.size()>1 && hasSqueeze) {
        for (auto &cand : candList) {
            size_t tot=0;
            for (size_t pi=0; pi< transformed.planes.size(); ++pi) {
                const auto& plane = transformed.planes[pi];
                uint8_t L = (pi < c.hdr.squeeze_levels.size())? c.hdr.squeeze_levels[pi]:0;
                if (!hasSqueeze || L==0) {
                    auto residuals = compute_residuals(plane, transformed.w, transformed.h, pred);
                    std::vector<uint8_t> bytes;
                    if (use_acoder) {
                        // For non-squeezed planes, use plain acoder only (CM/LZP for squeezed bands gives most gain)
                        // But to keep comparison fair, if cand uses CM/LZP we still use plain for non-squeezed (no band context)
                        // So bytes size is same across cands -> no effect.
                        bytes = acoder_encode_plane(residuals, transformed.w, transformed.h, 343);
                    } else bytes = rans_encode_plane(residuals, 1);
                    tot += bytes.size();
                } else {
                    SqueezeResult sr = squeeze_encode_plane(plane, transformed.w, transformed.h, L, bd);
                    std::vector<std::vector<uint16_t>> llPlanes;
                    {
                        std::vector<uint16_t> cur = plane;
                        uint32_t curW = transformed.w, curH = transformed.h;
                        for (uint8_t lvl=0; lvl<L; ++lvl) {
                            if ((curW &1)||(curH&1)) break;
                            uint32_t w2=curW/2, h2=curH/2;
                            std::vector<uint16_t> ll(w2*h2);
                            for (uint32_t y=0;y<h2;++y) for(uint32_t x=0;x<w2;++x){ size_t i00=(size_t)(y*2)*curW+(x*2); ll[y*w2+x]=cur[i00];}
                            llPlanes.push_back(ll);
                            cur = ll; curW=w2; curH=h2;
                        }
                    }
                    for (size_t bi=0; bi< sr.bands.size(); ++bi) {
                        const auto& band = sr.bands[bi];
                        bool isLL = (bi==0);
                        uint8_t band_class = band.band_class;
                        uint8_t lvl = band_class >> 2;
                        const std::vector<uint16_t>* llSrc = nullptr;
                        if (!isLL && lvl < llPlanes.size()) llSrc = &llPlanes[lvl];
                        const std::vector<uint16_t>* sibSrc = nullptr;
                        if (!isLL) {
                            uint8_t type = band_class & 3;
                            if (type==2 && bi>=1) sibSrc = &sr.bands[bi-1].data;
                            else if (type==3 && bi>=1) sibSrc = &sr.bands[bi-1].data;
                        }
                        auto bytes = encode_band_generic(band.data, band.w, band.h, band_class, isLL, llSrc, sibSrc, tree, num_leaves, bd, cand.cm, cand.lzp);
                        tot += bytes.size();
                    }
                }
            }
            cand.total = tot;
        }
        // pick minimal
        size_t best = candList[0].total;
        size_t bestIdx=0;
        for (size_t i=1;i<candList.size();++i) if (candList[i].total < best) { best=candList[i].total; bestIdx=i; }
        // never-expand: if best is not plain, use it; else stay plain
        bool useCM = candList[bestIdx].cm;
        bool useLZP = candList[bestIdx].lzp;
        if (useCM) flags |= CM_FLAG;
        if (useLZP) flags |= LZP_FLAG;
        c.hdr.flags = flags;
        // Now do actual encode with chosen flags
        bool finalCM = useCM;
        bool finalLZP = useLZP;
        for (size_t pi=0; pi< transformed.planes.size(); ++pi) {
            const auto& plane = transformed.planes[pi];
            uint8_t L = (pi < c.hdr.squeeze_levels.size())? c.hdr.squeeze_levels[pi]:0;
            if (!hasSqueeze || L==0) {
                auto residuals = compute_residuals(plane, transformed.w, transformed.h, pred);
                std::vector<uint8_t> bytes;
                if (use_acoder) bytes = acoder_encode_plane(residuals, transformed.w, transformed.h, 343);
                else bytes = rans_encode_plane(residuals, 1);
                c.band_payloads.push_back(std::move(bytes));
            } else {
                SqueezeResult sr = squeeze_encode_plane(plane, transformed.w, transformed.h, L, bd);
                std::vector<std::vector<uint16_t>> llPlanes;
                {
                    std::vector<uint16_t> cur = plane;
                    uint32_t curW = transformed.w, curH = transformed.h;
                    for (uint8_t lvl=0; lvl<L; ++lvl) {
                        if ((curW &1)||(curH&1)) break;
                        uint32_t w2=curW/2, h2=curH/2;
                        std::vector<uint16_t> ll(w2*h2);
                        for (uint32_t y=0;y<h2;++y) for(uint32_t x=0;x<w2;++x){ size_t i00=(size_t)(y*2)*curW+(x*2); ll[y*w2+x]=cur[i00];}
                        llPlanes.push_back(ll);
                        cur = ll; curW=w2; curH=h2;
                    }
                }
                for (size_t bi=0; bi< sr.bands.size(); ++bi) {
                    const auto& band = sr.bands[bi];
                    bool isLL = (bi==0);
                    uint8_t band_class = band.band_class;
                    uint8_t lvl = band_class >> 2;
                    const std::vector<uint16_t>* llSrc = nullptr;
                    if (!isLL && lvl < llPlanes.size()) llSrc = &llPlanes[lvl];
                    const std::vector<uint16_t>* sibSrc = nullptr;
                    if (!isLL) {
                        uint8_t type = band_class & 3;
                        if (type==2 && bi>=1) sibSrc = &sr.bands[bi-1].data;
                        else if (type==3 && bi>=1) sibSrc = &sr.bands[bi-1].data;
                    }
                    auto bytes = encode_band_generic(band.data, band.w, band.h, band_class, isLL, llSrc, sibSrc, tree, num_leaves, bd, finalCM, finalLZP);
                    c.band_payloads.push_back(std::move(bytes));
                }
            }
        }
        return container_encode(transformed, c);
    }

    // Fallback: no Squeeze or single candidate -> plain logic (no CM/LZP)
    for (size_t pi=0; pi< transformed.planes.size(); ++pi) {
        const auto& plane = transformed.planes[pi];
        uint8_t L = (pi < c.hdr.squeeze_levels.size())? c.hdr.squeeze_levels[pi]:0;
        if (!hasSqueeze || L==0) {
            auto residuals = compute_residuals(plane, transformed.w, transformed.h, pred);
            std::vector<uint8_t> bytes;
            if (use_acoder) bytes = acoder_encode_plane(residuals, transformed.w, transformed.h, 343);
            else bytes = rans_encode_plane(residuals, 1);
            c.band_payloads.push_back(std::move(bytes));
        } else {
            SqueezeResult sr = squeeze_encode_plane(plane, transformed.w, transformed.h, L, bd);
            // build llPlanes for llc
            std::vector<std::vector<uint16_t>> llPlanes;
            {
                std::vector<uint16_t> cur = plane;
                uint32_t curW = transformed.w, curH = transformed.h;
                for (uint8_t lvl=0; lvl<L; ++lvl) {
                    if ((curW &1)||(curH&1)) break;
                    uint32_t w2=curW/2, h2=curH/2;
                    std::vector<uint16_t> ll(w2*h2);
                    for (uint32_t y=0;y<h2;++y) for(uint32_t x=0;x<w2;++x){ size_t i00=(size_t)(y*2)*curW+(x*2); ll[y*w2+x]=cur[i00];}
                    llPlanes.push_back(ll);
                    cur = ll; curW=w2; curH=h2;
                }
            }
            for (size_t bi=0; bi< sr.bands.size(); ++bi) {
                const auto& band = sr.bands[bi];
                bool isLL = (bi==0);
                uint8_t band_class = band.band_class;
                uint8_t lvl = band_class >> 2;
                const std::vector<uint16_t>* llSrc = nullptr;
                if (!isLL && lvl < llPlanes.size()) llSrc = &llPlanes[lvl];
                const std::vector<uint16_t>* sibSrc = nullptr;
                if (!isLL) {
                    uint8_t type = band_class & 3;
                    if (type==2 && bi>=1) sibSrc = &sr.bands[bi-1].data;
                    else if (type==3 && bi>=1) sibSrc = &sr.bands[bi-1].data;
                }
                auto bytes = encode_band_leaf(band.data, band.w, band.h, band_class, isLL, llSrc, sibSrc, tree, num_leaves, bd);
                c.band_payloads.push_back(std::move(bytes));
            }
        }
    }
    return container_encode(transformed, c);
}

Raster decode(const std::vector<uint8_t>& data) {
    return decode(data.data(), data.size());
}

Raster decode(const uint8_t* data, size_t len) {
    if (len < 4) throw DecodeError("too short");
    if (len < 4) throw DecodeError("no footer");
    uint32_t crc_stored = read_u32_le_bytes(data + len - 4);
    uint32_t crc_calc = crc32(data, len - 4);
    if (crc_stored != crc_calc) throw DecodeError("crc32_all mismatch - corrupt payload");
    size_t header_end=0;
    Container c = container_decode_header(data, len - 4, header_end);
    size_t pos = header_end;
    size_t expected = 0;
    for (uint8_t sl : c.hdr.squeeze_levels) expected += 1 + 3u * sl;
    if (expected==0) expected = c.hdr.num_channels;
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
    uint32_t w = c.hdr.width, h = c.hdr.height;
    uint8_t bd = c.hdr.bit_depth;
    uint16_t bd_max = (bd==8)?255:65535;
    PredId pred = static_cast<PredId>(c.global_pred_id);
    if ((uint8_t)pred > 8) pred = PredId::MED;
    Raster out(w,h, static_cast<Channels>(c.hdr.num_channels), bd==16?BitDepth::BD16:BitDepth::BD8);
    if (payloads.size() != expected) throw DecodeError("band count mismatch");
    bool use_acoder = (c.hdr.flags & 0x04) != 0;
    bool useCM = (c.hdr.flags & CM_FLAG) != 0;
    bool useLZP = (c.hdr.flags & LZP_FLAG) != 0;
    MATree tree = c.trees.empty()? MATree::single_leaf() : c.trees[0].tree;
    int num_leaves = tree.num_leaves>0? tree.num_leaves:1;
    bool hasSqueeze=false;
    for(auto v:c.hdr.squeeze_levels) if(v>0) hasSqueeze=true;
    size_t payload_idx=0;
    for (size_t pi=0; pi< out.planes.size(); ++pi) {
        uint8_t L = (pi < c.hdr.squeeze_levels.size())? c.hdr.squeeze_levels[pi]:0;
        if (!hasSqueeze || L==0) {
            const auto& b = payloads[payload_idx++];
            size_t n = (size_t)w * h;
            std::vector<int32_t> residuals;
            if (use_acoder) residuals = acoder_decode_plane(b, n, w, h, 343);
            else residuals = rans_decode_plane(b, n, 1);
            if (residuals.size() != n) throw DecodeError("residual count mismatch");
            auto plane = reconstruct_plane(residuals, w, h, pred, bd_max);
            out.planes[pi] = std::move(plane);
        } else {
            // build band infos
            std::vector<uint32_t> ws(L+1), hs(L+1);
            ws[0]=w; hs[0]=h;
            for (uint8_t l=0;l<L;++l){ ws[l+1]=ws[l]/2; hs[l+1]=hs[l]/2; }
            struct BandInfo{ uint32_t w,h; uint8_t band_class; bool isLL;};
            std::vector<BandInfo> infos;
            infos.reserve(1+3*L);
            infos.push_back({ws[L], hs[L], (uint8_t)(L<<2), true});
            for (int l=(int)L-1;l>=0;--l){
                infos.push_back({ws[l+1], hs[l+1], (uint8_t)((l<<2)|1), false});
                infos.push_back({ws[l+1], hs[l+1], (uint8_t)((l<<2)|2), false});
                infos.push_back({ws[l+1], hs[l+1], (uint8_t)((l<<2)|3), false});
            }
            if (infos.size() != (size_t)(1+3*L)) throw DecodeError("band info mismatch");
            std::vector<std::vector<uint16_t>> decodedBands;
            decodedBands.reserve(infos.size());
            std::vector<std::vector<uint16_t>> levelLL(L);
            {
                const auto& inf = infos[0];
                const auto& pay = payloads[payload_idx++];
                auto bandData = decode_band_generic(pay, inf.w, inf.h, inf.band_class, true, nullptr, nullptr, tree, num_leaves, bd, bd_max, useCM, useLZP);
                decodedBands.push_back(std::move(bandData));
            }
            std::vector<uint16_t> curLL = decodedBands[0];
            uint32_t curW = infos[0].w, curH = infos[0].h;
            if (L>0) levelLL[L-1]=curLL;
            size_t infoIdx=1;
            for (int lvl=(int)L-1; lvl>=0; --lvl) {
                std::vector<std::vector<uint16_t>> hf(3);
                for (int t=0; t<3; ++t) {
                    const auto& inf = infos[infoIdx];
                    const auto& pay = payloads[payload_idx++];
                    const std::vector<uint16_t>* llSrc = nullptr;
                    if ((size_t)lvl < levelLL.size() && !levelLL[lvl].empty()) llSrc = &levelLL[lvl];
                    else llSrc = &curLL;
                    const std::vector<uint16_t>* sibSrc = nullptr;
                    if (t==1) sibSrc = &hf[0];
                    else if (t==2) sibSrc = &hf[1];
                    bool isLLBand=false;
                    auto bdData = decode_band_generic(pay, inf.w, inf.h, inf.band_class, isLLBand, llSrc, sibSrc, tree, num_leaves, bd, bd_max, useCM, useLZP);
                    hf[t]=std::move(bdData);
                    decodedBands.push_back(hf[t]);
                    infoIdx++;
                }
                uint32_t parentW = curW*2, parentH = curH*2;
                std::vector<uint16_t> parent(parentW*parentH);
                for (uint32_t y=0;y<curH;++y) for(uint32_t x=0;x<curW;++x){
                    size_t j=(size_t)y*curW+x;
                    int a = (int)curLL[j];
                    int hh = (int)(int16_t)hf[0][j];
                    int vv = (int)(int16_t)hf[1][j];
                    int dd = (int)(int16_t)hf[2][j];
                    int b=a+hh, c=a+vv, d=a+dd;
                    size_t i00=(size_t)(y*2)*parentW+(x*2);
                    parent[i00]=(uint16_t)a;
                    parent[i00+1]=(uint16_t)(b<0?0:(b>65535?65535:b));
                    parent[i00+parentW]=(uint16_t)(c<0?0:(c>65535?65535:c));
                    parent[i00+parentW+1]=(uint16_t)(d<0?0:(d>65535?65535:d));
                }
                curLL = std::move(parent);
                curW = parentW; curH = parentH;
                if (lvl>0) levelLL[lvl-1]=curLL;
            }
            if (curLL.size() != (size_t)w*h) throw DecodeError("squeeze reconstruct size mismatch");
            out.planes[pi]=std::move(curLL);
        }
    }
    ColorTransform ct = static_cast<ColorTransform>(c.hdr.color_transform_id);
    out = invert_color(out, ct, c.hdr.cfl_scales);
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
    auto data = read_file(in_path);
    (void)data;
    throw EncodeError("encode_file: use frontend decode_to_raster then encode()");
}
Raster decode_file(const std::filesystem::path& in_path){
    auto data = read_file(in_path);
    return decode(data);
}

} // namespace prism
