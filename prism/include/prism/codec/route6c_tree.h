// Route 6C (issue #130, lever C): per-fine-context transmitted P(0) histograms.
//
// R6-B blended a model COARSER than the cold-starting EMA (12 subband classes),
// so blending could only hurt (it landed +6% worse than the pure-EMA floor).
// R6-C instead transmits ONE P(0) value per FINE-CONTEXT CLUSTER: a bounded
// partition of the adaptive model's ~1.84M raw contexts produced by a FIXED,
// baked property tree. The cluster id is a pure function of the learned feature
// vector `LCFeat`, so it is computed identically at encode and decode time and
// costs ZERO transmitted bytes; only the K per-cluster P(0)*M values (the
// `r6c_p0` vector) are sent (invariant I29 preserved).
//
// Because the cluster partition is at least as fine as the EMA's own context
// key, the transmitted backbone is finer-or-equal to the cold-starting EMA
// everywhere: populated clusters carry the whole-image exact P(0) (far better
// than the EMA for the many rarely-visited contexts); empty clusters get the
// neutral M/2 so the blend degenerates to pure EMA. R6-C is therefore
// structurally incapable of repeating R6-B's loss.
//
// R6-C0 (this build): a fixed coarse quantization of the LCFeat that yields
// exactly K0 = 648 clusters (symtype3 x orient4 x parent_sig2 x fc3 x dg3 x
// level3). A baked property tree (R6-C1, K1 = 1024) replaces r6c_cluster_id in
// a later phase without changing this interface.
#pragma once
#include "prism/codec/learned_ctx.h"
#include <cstdint>

namespace prism::codec {

// Number of transmitted clusters for the active mode. R6-C0 = 648 (fixed coarse
// quant), R6-C1 = 1024 (baked tree). The domain size equals the number of
// entries in the transmitted `r6c_p0` vector.
inline uint32_t r6c_K() { return 648u; }

// Cluster id in [0, r6c_K()) for a learned feature vector. FIXED function of
// `f`, identical at encode/decode, so it is never transmitted.
inline uint32_t r6c_cluster_id(const LCFeat& f) {
    // R6-C0 fixed coarse quantization (symmetric at both ends).
    uint32_t t = (uint32_t)(f.symtype % 3);
    uint32_t o = (uint32_t)(f.orient % 4);
    uint32_t ps = f.parent_sig ? 1u : 0u;
    uint32_t fc = (uint32_t)std::min<int>(f.fc, 2);
    uint32_t dg = (uint32_t)std::min<int>(f.dg, 2);
    uint32_t lv = (uint32_t)std::min<int>(f.level, 2);
    uint32_t id = (((((t * 4u + o) * 2u + ps) * 3u + fc) * 3u + dg) * 3u + lv);
    return id;
}

// Blend weight W between the transmitted per-cluster static P(0) backbone and
// the learned adaptive model (EMA + MLP). 0 = pure learned, 1 = pure
// transmitted. Default 0.6 (frozen by addendum-27); overridable at runtime via
// `prism wavelet-r6c --w W` / `bench-r6c --w W` without rebuild.
float r6c_w();
void set_r6c_w(float v);

} // namespace prism::codec
