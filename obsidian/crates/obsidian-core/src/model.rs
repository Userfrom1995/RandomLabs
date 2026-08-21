//! The learned model: per-context predictor maps, weight selection, static
//! histograms, and model serialization.
//!
//! The analysis pass (effort >= 1) runs once over the transformed planes and
//! picks, for every context, the predictor that minimizes the summed residual
//! magnitude. At effort >= 4 the Weighted predictor is enabled with a
//! per-plane weight vector chosen from a small codebook. At effort >= 6 the
//! pass also collects per-context symbol histograms for static rANS tables.

use crate::color::{Palette, PlaneRange, TransformChoice};
use crate::context::{zigzag, Alphabet, ContextModel, ContextParams};
use crate::error::CodecError;
use crate::image::Channels;
use crate::predict::{
    default_weight_codebook, neighbors, nrp_features, nrp_forward, predict_clamped, predict_recursive,
    r13_properties, rcct_properties, rcct_predict, solve_ma_least_squares, solve_r13_least_squares,
    solve_weighted_tree, weight_context, NrpNet, NRP_ACT_CLAMP, NRP_ACT_SHIFT, NRP_D, NRP_H,
    NRP_OUT_SHIFT, PredictorId, R13Leaf, R13_DIM, R13_M, R13_NEUTRAL, RCCT_DIM, RCCT_K,
    RCCT_LEAF_TAG, RCCT_MAX_DEPTH, RCCT_MIN_LEAF, RCCT_THR_CANDIDATES, RcctLeaf, RcctNode,
    RcctTree, WLeaf, WC_LEAVES, WC_MIN_SAMPLES, UNIT_LEAF, WeightVec,
};
use crate::rans::{RansTable, CAPPED_SYMBOLS, CAPPED_ALPHABET};
use std::io::{Read, Write};

/// Per-plane model: a predictor map over all contexts plus the chosen weight
/// vector index.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PlaneModel {
    pub map: Vec<u8>,
    /// Index into the weight codebook, or `u8::MAX` when no Weighted use.
    pub weight_index: u8,
}

/// Entropy backend selector signaled in the model section. The 8-bit header
/// `flags` byte is exhausted (channels/transform/palette + ENTROPY_GR, GR_M2,
/// GR_CM, GR_LZ), so the fine-grained entropy mode lives here instead of as a
/// header flag. The decoder reads it and routes the per-plane residual pass.
pub const ENTROPY_MODE_GR: u8 = 0;
/// M3.5 Design B: per-context adaptive rANS over a capped residual alphabet with
/// an escape-to-Golomb-Rice fallback for large residuals (capped-and-escaped
/// static/adaptive rANS, `obsidian/docs/entropy-architecture.md` section 7).
pub const ENTROPY_MODE_CAPPED: u8 = 1;
/// R1 CMARC: context-modeled adaptive binary range coder (the WebP/JPEG XL
/// backend). Replaces the single-k GR *symbol* coder with a per-`(cid, bin)`
/// binary range coder so the cost is `H(p) + epsilon` rather than `H(p) + O(1)`.
/// Signaled via `entropy_mode` (not a header flag), so every legacy stream
/// decodes unchanged. See `obsidian/docs/architect-cmarc-blueprint.md`.
pub const ENTROPY_MODE_CARC: u8 = 2;
/// R1 + R2.3: CMARC literals with an LZ77 match layer (match flag/length coded
/// by CMARC bins). Planned (R2); reserved here so streams decode.
pub const ENTROPY_MODE_CARC_LZ: u8 = 3;
/// R1 + R2.1/2.2 + R2.4: CMARC + cross-channel + expanded predictor bank +
/// logistic mixing. Planned (R2); reserved here so streams decode.
pub const ENTROPY_MODE_CARC_MIX: u8 = 4;
/// R6-B color cache (Component A): CMARC residuals with a per-plane LRU color
/// cache of reconstructed sample values. A literal whose value hits the cache is
/// coded as a `cache_flag` (1) plus a small cache-index code, instead of the full
/// residual, exploiting the repeated-value redundancy WebP/JPEG XL use. Signaled
/// via `entropy_mode` (no header flag bit), so every legacy stream still decodes.
/// See `obsidian/docs/architect-r6-corrected-blueprint.md` Component A.
pub const ENTROPY_MODE_CARC_CACHE: u8 = 6;

/// The complete signaled model.
#[derive(Clone)]
pub struct ModelConfig {
    pub transform: TransformChoice,
    /// R2.1 cross-channel subtract-green decorrelation (`R'=R-G, G'=G, B'=B-G`)
    /// applied to the first three planes before `transform`. Signaled in the
    /// model section (zero extra header bit); the decoder applies the inverse
    /// after the inverse color transform. Mirrored: both sides read it from the
    /// model, so no cross-process env must be set.
    pub cross_channel: bool,
    pub palette: Option<Palette>,
    pub context: ContextParams,
    pub context_count: usize,
    pub planes: Vec<PlaneModel>,
    pub weight_codebook: Vec<WeightVec>,
    /// Static per-context histograms, `[plane][context]`, when effort >= 6.
    pub static_histograms: Option<Vec<Vec<Option<Vec<(u32, u32)>>>>>,
    /// Selected entropy backend (see `ENTROPY_MODE_*` constants). 0 = Golomb-Rice.
    pub entropy_mode: u8,
    /// Per-context histograms over the capped residual alphabet (`CAPPED_SYMBOLS`)
    /// for the M3.5 Design B capped-and-escaped rANS backend. Built from the same
    /// analysis residuals as the coding pass and signaled in the model section so
    /// the decoder rebuilds identical static tables; `None` when Design B is off.
    pub capped_histograms: Option<Vec<Vec<Option<Vec<(u32, u32)>>>>>,
    /// R1-c static per-`(cid, bin)` Laplace priors for the CMARC binary coder.
    /// Sparse `[plane][cid]` -> list of `(bin, n1, n0)` count pairs (only
    /// contexts/bins with counts present). Signaled in the model section so the
    /// decoder seeds its `BinModel`s from `BinModel::from_counts`; `None` when the
    /// CMARC priors are off (the coder still works from the uniform prior).
    pub cmarc_priors: Option<Vec<Vec<Option<Vec<(u32, u32, u32)>>>>>,
    /// R3-A JPEG-LS DIFF residual context for the CMARC coding context. When set,
    /// the CMARC coding context is the quantized neighboring-residual context
    /// (see `context::residual_context`) instead of the gradient context. Signaled
    /// in the model section (zero extra header bit); the per-image selection
    /// (computed in `analyze`) keeps it on only when it actually wins so a
    /// regression can never ship. Mirrored: both sides read it from the model.
    pub cmarc_residual_ctx: bool,
    /// R3-C JPEG-LS-style run mode for the CMARC coder. When set, near-constant
    /// regions (both causal neighbor residuals quantize to ~0) are coded as a
    /// single run length instead of per-pixel residuals. Signaled in the model
    /// section; the never-expand safety net keeps it on only when it actually
    /// wins, so a regression can never ship. Mirrored: both sides read it from
    /// the model (zero extra header bit).
    pub cmarc_run: bool,
    /// R11-D MA-tree-lite: when set, the CMARC coding context folds a coarse
    /// local-gradient bucket into the residual-DIFF context (see
    /// `context::combined_ma_context`), so the binary coder conditions on both
    /// the neighboring residual pattern and the local gradient structure (the
    /// JPEG XL MA "property"). Signaled in the model section (zero extra header
    /// bit); the per-image auto-selection (computed in the encoder safety net)
    /// keeps it on only when it actually wins, so a regression can never ship.
    /// Mirrored: both sides read it from the model.
    pub cmarc_ma_context: bool,
    /// R6-B color cache (Component A): per-plane LRU of reconstructed sample values.
    /// When set, the CMARC coding pass maintains the LRU and codes a literal whose
    /// value hits the cache as a `cache_flag` + small index instead of the full
    /// residual. Signaled in the model section; the never-expand safety net keeps
    /// it on only when it actually wins, so a regression can never ship. Mirrored:
    /// both sides read it from the model (zero extra header bit).
    pub cmarc_use_color_cache: bool,
    /// R9-B context-tree weighted predictor: per-plane (optional) table of
    /// `WC_LEAVES` weight tuples `(wL,wT,wTL,wTR,bias,shift)` solved per fine leaf in
    /// `analyze`. Tiny (O(1) bytes/plane, ~75), so it does not regress like the
    /// R7-A per-coarse-context codebook. Entry is `None` for planes that do not
    /// use `WeightedTree` (so no model bytes are wasted). The whole field is
    /// `None` when `WeightedTree` is not enabled/used on this image. Both encoder
    /// and decoder read it from the model, so lockstep is exact with zero online
    /// state.
    pub weighted_wc_table: Option<Vec<Option<Vec<WLeaf>>>>,
    /// R13-A recursive self-correcting adaptive multi-tap predictor: per-plane
    /// (optional) table of `WC_LEAVES` base weight tuples `(w for p1..p9, bias)` (each
    /// an `R13Leaf = [i16; R13_M+1]`) solved per fine leaf in `analyze` over the
    /// extended `(M+1)`-property system. Mirrors `weighted_wc_table` in size class
    /// (`WC_LEAVES * (M+1) * 2` bytes/plane, O(1)) and is signaled only when
    /// `AdaptiveRecursive` is actually used on a plane. The online LMS weight update
    /// adds zero model bytes (the decoder reconstructs the trajectory from the
    /// residual stream by induction), so a regression can never ship: with zero online
    /// updates R13-A reduces to R9-B. Both encoder and decoder read it from the model.
    pub weighted_r13_table: Option<Vec<Option<Vec<R13Leaf>>>>,
    /// R10-A JPEG XL-class Squeeze (recursive group transform) level per plane.
    /// `0` (the default) means the plane is coded as a single band (no Squeeze);
    /// a value `L >= 1` means the plane is split recursively `L` times into
    /// sub-bands before coding. Signal in the model section; both sides read it
    /// so no extra header bits are needed. Chosen per plane by the never-expand
    /// safety net, so enabling Squeeze can never regress the file.
    pub squeeze_levels: Vec<u8>,
    /// R13-B: which reversible group transform produces the sub-band geometry.
    /// `Squeeze` (default, legacy) is the quincunx subsampling; `Lift` (CDF 5/3,
    /// R13-B) is a genuine energy-compacting wavelet. Both share the band layout
    /// produced by `squeeze_band_layout`, so the banded coder is unchanged. Signal
    /// a single byte in the model section (last, so legacy readers decode it as
    /// the default `Squeeze` when absent); both sides read it so lockstep is exact.
    pub transform_kind: crate::transforms::TransformKind,
    /// R10-B chroma-from-luma (CFL) scale per plane. `None` (the default, and the
    /// value for the luma plane) means no CFL; `Some(s)` with `s in 0..=7` means
    /// the chroma plane is pre-subtracted by `round(s * luma / 8)` before coding
    /// and added back on decode. Scale 0 is the identity, so CFL is a strict
    /// superset and provably cannot regress. Signal in the model section; both
    /// sides read it so lockstep is exact.
    pub cfl_scale: Vec<Option<u8>>,
    /// R10: per-band value range. A Squeeze sub-band (or CFL-pre-subtracted
    /// plane) can hold values outside the original plane's `[min, max]`, so each
    /// coded band is clamped/reconstructed against its OWN range. Indexed by
    /// band (stream) order, which matches `squeeze_band_layout` plane-major.
    /// Length is `total_bands`; empty only for legacy streams (decoder falls
    /// back to the per-plane range).
    pub band_ranges: Vec<PlaneRange>,
    /// R12-A per-band predictor maps (one `context_count`-byte map per coding
    /// band). `Some` only when Squeeze is present (any level != 0); `None` on the
    /// non-squeezed path so the per-plane map is used and legacy streams decode
    /// byte-identically. The decoder mirrors the encoder by reading the same
    /// signaled maps, so lockstep is exact with zero online state.
    pub band_maps: Option<Vec<Vec<u8>>>,
    /// R12-A per-band weighted-tree tables (one `Option<Vec<WLeaf>>` per coding
    /// band), mirrored from the R9-B per-plane table. Indexed by the global band
    /// index, matching `band_maps`. `None` on the non-squeezed path; when `Some`
    /// the banded coder prefers the per-band table over the per-plane fallback,
    /// so each Squeeze sub-band gets its own least-squares optimum (the JPEG XL
    /// per-band decorrelation edge the R11 escalation named as missing).
    pub band_wc_table: Option<Vec<Option<Vec<WLeaf>>>>,
    /// R14: per-plane residual-conditioned context tree with MA leaf model. `Some`
    /// only when R14 is selected for the plane (effort >= `RCCT_EFFORT` and the
    /// never-expand net accepts it, or forced via `OBSIDIAN_R14_FORCE` /
    /// `EncodeOpts::rcct`). `None` on the legacy/non-RCCT path so every stream
    /// without R14 decodes byte-identically. The overlay is a strict superset: a
    /// depth-0 tree (`r_pred = 0`) is byte-identical to the current codec, so the
    /// never-expand net cannot regress.
    pub rcct: Option<Vec<Option<crate::predict::RcctTree>>>,
    /// R15: per-plane learned neural residual predictor (NRP). `Some` only when
    /// R15 is selected for the plane (effort >= `NRP_EFFORT` and the never-expand
    /// net accepts it, or forced via `OBSIDIAN_R15_FORCE` / `EncodeOpts::nrp`).
    /// `None` on the legacy/non-NRP path so every stream without R15 decodes
    /// byte-identically. The overlay is a strict superset: a zero net (`f = 0`)
    /// is byte-identical to the current codec, so the never-expand net cannot
    /// regress. See `obsidian/docs/architect-r15-nrp-blueprint.md`.
    pub nrp: Option<Vec<Option<crate::predict::NrpNet>>>,
}

impl ModelConfig {
    /// Predictor for a plane/context pair.
    pub fn predictor(&self, plane: usize, context: usize) -> PredictorId {
        PredictorId::from_u8(self.planes[plane].map[context]).unwrap_or(PredictorId::Med)
    }

    pub fn weight_for(&self, plane: usize) -> Option<WeightVec> {
        let idx = self.planes[plane].weight_index;
        if idx == u8::MAX {
            None
        } else {
            self.weight_codebook.get(idx as usize).copied()
        }
    }

    /// The R9-B weighted-tree table for a plane, if `WeightedTree` is in use.
    pub fn weighted_tree_for(&self, plane: usize) -> Option<&[WLeaf]> {
        self.weighted_wc_table
            .as_ref()
            .and_then(|v| v.get(plane).and_then(|o| o.as_ref()).map(|x| x.as_slice()))
    }

    /// R12-A: per-band predictor map lookup. When `band_maps` is set (Squeeze
    /// present), the map for the specific coding band `band` is used; otherwise
    /// the per-plane map of `parent_plane` is used (legacy/non-squeezed path,
    /// byte-identical).
    pub fn predictor_for_band(&self, band: usize, parent_plane: usize, cid: usize) -> PredictorId {
        if let Some(maps) = &self.band_maps {
            PredictorId::from_u8(maps[band][cid]).unwrap_or(PredictorId::Med)
        } else {
            self.predictor(parent_plane, cid)
        }
    }

    /// R12-A: per-band weighted-tree table lookup (mirror of `predictor_for_band`).
    pub fn weighted_tree_for_band(&self, band: usize, parent_plane: usize) -> Option<&[WLeaf]> {
        if let Some(tables) = &self.band_wc_table {
            if let Some(t) = tables.get(band).and_then(|o| o.as_ref()) {
                return Some(t.as_slice());
            }
        }
        self.weighted_tree_for(parent_plane)
    }

    /// R13-A: the base R13 leaf table for a plane, if `AdaptiveRecursive` is in use.
    pub fn r13_table_for(&self, plane: usize) -> Option<&[R13Leaf]> {
        self.weighted_r13_table
            .as_ref()
            .and_then(|v| v.get(plane).and_then(|o| o.as_ref()).map(|x| x.as_slice()))
    }

    /// R13-A: per-band R13 leaf table lookup (mirror of `weighted_tree_for_band`).
    pub fn r13_table_for_band(&self, band: usize, parent_plane: usize) -> Option<&[R13Leaf]> {
        if let Some(tables) = &self.weighted_r13_table {
            if let Some(t) = tables.get(band).and_then(|o| o.as_ref()) {
                return Some(t.as_slice());
            }
        }
        self.r13_table_for(parent_plane)
    }

    /// R14: the residual-conditioned context tree for a plane, if R14 is in use.
    /// `parent_plane` is the owning original plane (so banded coding falls back to
    /// `rcct_for` indexes the tree list by the *band* index `plane` (the same
    /// index `build_rcct_trees` assigns: one `RcctTree` per coding band, in band
    /// order). Squeeze/CFL can produce many bands per original plane, so the band
    /// index, not `parent_plane`, is the correct key. `None` when R14 is off for
    /// this band, so the coding loop takes the base path and decodes
    /// byte-identically.
    pub fn rcct_for(&self, plane: usize, _parent_plane: usize) -> Option<&crate::predict::RcctTree> {
        self.rcct
            .as_ref()
            .and_then(|v| v.get(plane).and_then(|o| o.as_ref()))
    }

    /// R15: the learned neural residual predictor for a plane, if R15 is in use.
    /// `parent_plane` is the owning original plane (so banded coding falls back to
    /// the per-plane net when `nrp` was built per original plane); the band index
    /// `plane` is the correct key (one `NrpNet` per coding band, in band order).
    /// `None` when R15 is off for this band, so the coding loop takes the base
    /// path and decodes byte-identically.
    pub fn nrp_for(&self, plane: usize, _parent_plane: usize) -> Option<&crate::predict::NrpNet> {
        self.nrp
            .as_ref()
            .and_then(|v| v.get(plane).and_then(|o| o.as_ref()))
    }
}

/// Effort at or above which R15 (learned neural residual predictor) becomes a
/// candidate in the never-expand safety net. Kept above any production effort so
/// R15 is OFF by default (the cipher stays on the verified pre-R15 path); the
/// `OBSIDIAN_R15_FORCE` seam enables it for direct measurement against the
/// JPEG XL 8.71 gate. See `obsidian/docs/architect-r15-nrp-blueprint.md`.
pub const NRP_EFFORT: u8 = 255;

/// R15 training budget: full-batch SGD epochs over the plane. Small (the per-plane
/// residual is fit once in the analysis pass); kept modest so effort-4 stays fast.
pub const NRP_ITERS: usize = 60;
/// R15 SGD learning rate (full-batch gradient descent with momentum).
const NRP_LR: f64 = 0.03;
/// R15 SGD momentum coefficient.
const NRP_MOMENTUM: f64 = 0.85;

/// Effort at or above which R14 (RCCT + MA residual model) becomes a candidate
/// in the never-expand safety net. Kept above any production effort so R14 is
/// OFF by default (the cipher stays on the verified pre-R14 path); the
/// `OBSIDIAN_R14_FORCE` seam enables it for direct measurement against the
/// JPEG XL 8.71 gate. See `obsidian/docs/architect-r14-rcct-ma-blueprint.md`.
pub const RCCT_EFFORT: u8 = 255;

/// The set of predictor candidates for an effort level.
pub fn predictors_for(effort: u8) -> Vec<PredictorId> {
    if effort == 0 {
        return vec![PredictorId::Med];
    }
    if effort <= 3 {
        return vec![
            PredictorId::Left,
            PredictorId::Top,
            PredictorId::Tl,
            PredictorId::Tr,
            PredictorId::Avg,
            PredictorId::Med,
            PredictorId::GapLite,
        ];
    }
    vec![
        PredictorId::Left,
        PredictorId::Top,
        PredictorId::Tl,
        PredictorId::Tr,
        PredictorId::Avg,
        PredictorId::Med,
        PredictorId::GapLite,
        PredictorId::Weighted,
        // R2.2 expanded WebP/JPEG XL-style bank (effort >= 4): true-motion,
        // half-delta, gradient, and the six clamped add/subtract forms. The
        // per-context analysis pass picks among all candidates by summed residual
        // cost, so the best predictor per context is encoded in the model map at
        // zero per-symbol cost (and, once selected, already partitions the CMARC
        // residual distribution per spatial context).
        PredictorId::TrueMotion,
        PredictorId::LPlusHalfTLMinusT,
        PredictorId::Gradient2,
        PredictorId::AddLT,
        PredictorId::AddLTL,
        PredictorId::AddTLT,
        PredictorId::SubLTL,
        PredictorId::SubTLT,
        PredictorId::SubTTR,
        // R8-A: signaling-free adaptive weighted predictor (JPEG XL / WebP "weighted").
        // Deterministic from the causal neighborhood, so it adds no model bytes and is
        // only ever selected where it lowers the summed residual magnitude.
        PredictorId::AdaptiveWeighted,
        // R9-B: context-tree weighted predictor (per-fine-leaf least-squares weights,
        // signaled as a tiny per-plane table). A strict superset of every fixed
        // candidate, so it is selected per context only where it lowers |residual|.
        PredictorId::WeightedTree,
        // R13-A (recursive self-correcting adaptive multi-tap predictor, TM-WP) is
        // implemented end-to-end (9-feature least-squares base table signaled like
        // R9-B + per-`weight_context`-leaf online LMS, bit-exact lockstep verified)
        // but is intentionally KEPT OUT of the auto-candidate set for now. On real
        // Kodak (effort 4) the analysis sum-of-zigzag proxy over-selects it: the wider
        // 9-feature LMS fit drives a lower *training* residual RSS while producing
        // fatter-tailed residuals, so auto-selecting it REGRESSES the file (9.90 bpp
        // vs the 9.52 baseline; forced-standalone is ~11.18 bpp). The per-context
        // 4-tap linear bank is already near-optimal for this content. It remains
        // available via `EncodeOpts::forced_predictor` / `--predictor AdaptiveRecursive`
        // for measurement and as the R13-B lifting groundwork. Re-enable here only
        // once the selection proxy or the real-bit cost model accounts for its
        // residual distribution (see progress/68-obsidian-lossless-image-codec.md).
    ]
}

/// Quick per-plane cost estimate (sum of zigzag-symbol magnitudes of MED
/// residuals). Used for transform and palette selection; monotone in coded
/// size, cheap to compute.
pub fn estimate_cost(plane: &[i16], range: PlaneRange, width: usize, height: usize) -> u64 {
    let mut total: u64 = 0;
    let n = width * height;
    if n == 0 {
        return 0;
    }
    for y in 0..height {
        for x in 0..width {
            let nb = neighbors(plane, x, y, width, height);
            let pred = predict_clamped(PredictorId::Med, &nb, None, None, range);
            let r = plane[y * width + x] as i32 - pred;
            total += zigzag(r) as u64;
        }
    }
    total
}

/// The analysis pass. Returns per-plane predictor maps and, when `collect
/// histograms` is set, per-context static histograms.
pub fn analyze(
    planes: &[Vec<i16>],
    ranges: &[PlaneRange],
    width: usize,
    height: usize,
    effort: u8,
    context: &ContextParams,
    weight_codebook: &[WeightVec],
    entropy_gr: bool,
    _rcct: bool,
    forced: Option<PredictorId>,
) -> ModelConfig {
    let n_planes = planes.len();
    let context_count = context.context_count();
    let cm = ContextModel::new(*context);
    let mut model = ModelConfig {
        transform: TransformChoice::None,
        cross_channel: false,
        palette: None,
        context: *context,
        context_count,
        planes: Vec::new(),
        weight_codebook: weight_codebook.to_vec(),
        static_histograms: None,
        entropy_mode: ENTROPY_MODE_GR,
        capped_histograms: None,
        cmarc_priors: None,
        cmarc_residual_ctx: false,
        cmarc_run: false,
        cmarc_ma_context: false,
        cmarc_use_color_cache: false,
        weighted_wc_table: None,
        weighted_r13_table: None,
        squeeze_levels: vec![0u8; n_planes],
        transform_kind: crate::transforms::TransformKind::Squeeze,
        cfl_scale: vec![None; n_planes],
        band_ranges: Vec::new(),
        band_maps: None,
        band_wc_table: None,
        rcct: None,
        nrp: None,
    };

    let predictors = match forced {
        Some(p) => vec![p],
        None => predictors_for(effort),
    };
    let include_weighted = predictors.contains(&PredictorId::Weighted);
    let include_tree = predictors.contains(&PredictorId::WeightedTree);
    let include_r13 = predictors.contains(&PredictorId::AdaptiveRecursive);
    let mut wtables: Vec<Option<Vec<WLeaf>>> = Vec::new();
    let mut r13tables: Vec<Option<Vec<R13Leaf>>> = Vec::new();

    for (pi, plane) in planes.iter().enumerate() {
        let range = ranges[pi];
        // Choose the per-plane weight vector (effort >= 4) by total cost.
        let mut weight_index = u8::MAX;
        if include_weighted {
            let mut best_cost: u64 = u64::MAX;
            let mut best: u8 = 0;
            for (wi, w) in weight_codebook.iter().enumerate() {
                let mut cost: u64 = 0;
                for y in 0..height {
                    for x in 0..width {
                        let nb = neighbors(plane, x, y, width, height);
                        let pred = predict_clamped(PredictorId::Weighted, &nb, Some(w), None, range);
                        let r = plane[y * width + x] as i32 - pred;
                        cost += zigzag(r) as u64;
                    }
                }
                if cost < best_cost {
                    best_cost = cost;
                    best = wi as u8;
                }
            }
            weight_index = best;
        }

        // R9-B: build the per-fine-leaf weighted-tree table for this plane (only when
        // the `WeightedTree` predictor is a candidate, i.e. effort >= 4). Accumulate
        // the 4x4 normal equations per leaf over (L,T,TL,TR) and the value v, solve
        // the least-squares weights, and keep the table only if some context actually
        // selects `WeightedTree` (so no model bytes are wasted when it does not help).
        let wt_table: Vec<WLeaf> = if include_tree {
            let mut s_leaf: Vec<[[i64; 5]; 5]> = vec![[[0i64; 5]; 5]; WC_LEAVES];
            let mut b_leaf: Vec<[i64; 5]> = vec![[0i64; 5]; WC_LEAVES];
            let mut cnt: Vec<i64> = vec![0i64; WC_LEAVES];
            for y in 0..height {
                for x in 0..width {
                    let idx = y * width + x;
                    let n = neighbors(plane, x, y, width, height);
                    let wc = weight_context(&n);
                    let ns = [n.l as i64, n.t as i64, n.tl as i64, n.tr as i64, 1i64];
                    for i in 0..5 {
                        for j in 0..5 {
                            s_leaf[wc][i][j] += ns[i] * ns[j];
                        }
                        b_leaf[wc][i] += (plane[idx] as i64) * ns[i];
                    }
                    cnt[wc] += 1;
                }
            }
            let mut table = Vec::with_capacity(WC_LEAVES);
            for lc in 0..WC_LEAVES {
                let leaf = if cnt[lc] >= WC_MIN_SAMPLES as i64 {
                    solve_weighted_tree(&s_leaf[lc], &b_leaf[lc]).unwrap_or(UNIT_LEAF)
                } else {
                    UNIT_LEAF
                };
                table.push(leaf);
            }
            table
        } else {
            Vec::new()
        };

        // R13-A: build the per-fine-leaf base weight table for this plane (only when
        // `AdaptiveRecursive` is a candidate, i.e. effort >= 4). Accumulate the
        // `(M+1)x(M+1)` normal equations per `weight_context` leaf over the extended
        // property vector `(p1..p9, 1)` and the value `v`, solve the least-squares
        // weights, and keep the table only if some context actually selects
        // `AdaptiveRecursive` (so no model bytes are wasted when it does not help).
        let r13_table: Vec<R13Leaf> = if include_r13 {
            let mut s_leaf: Vec<[[i64; R13_DIM]; R13_DIM]> =
                vec![[[0i64; R13_DIM]; R13_DIM]; WC_LEAVES];
            let mut b_leaf: Vec<[i64; R13_DIM]> = vec![[0i64; R13_DIM]; WC_LEAVES];
            let mut cnt: Vec<i64> = vec![0i64; WC_LEAVES];
            for y in 0..height {
                for x in 0..width {
                    let idx = y * width + x;
                    let n = neighbors(plane, x, y, width, height);
                    let wc = weight_context(&n);
                    let props = r13_properties(&n, plane, x, y, width, height);
                    let mut ns = [0i64; R13_DIM];
                    for m in 0..R13_M {
                        ns[m] = props[m] as i64;
                    }
                    ns[R13_M] = 1i64;
                    for i in 0..R13_DIM {
                        for j in 0..R13_DIM {
                            s_leaf[wc][i][j] += ns[i] * ns[j];
                        }
                        b_leaf[wc][i] += (plane[idx] as i64) * ns[i];
                    }
                    cnt[wc] += 1;
                }
            }
            let mut table = Vec::with_capacity(WC_LEAVES);
            for lc in 0..WC_LEAVES {
                let leaf = if cnt[lc] >= WC_MIN_SAMPLES as i64 {
                    solve_r13_least_squares(&s_leaf[lc], &b_leaf[lc]).unwrap_or(R13_NEUTRAL)
                } else {
                    R13_NEUTRAL
                };
                table.push(leaf);
            }
            table
        } else {
            Vec::new()
        };

        // Per-context predictor selection by cost.
        let mut ctx_costs: Vec<Vec<u64>> = vec![vec![0u64; predictors.len()]; context_count];
        // R13-A base weight state (i32) for the cost estimate; the online LMS update is
        // applied only during the coding pass, so the analysis uses the static base
        // weights (an upper bound on the true residual, since adaptation only lowers it).
        let r13_state: Vec<[i32; R13_DIM]> = r13_table
            .iter()
            .map(|leaf| {
                let mut s = [0i32; R13_DIM];
                for m in 0..R13_DIM {
                    s[m] = leaf[m] as i32;
                }
                s
            })
            .collect();
        for y in 0..height {
            for x in 0..width {
                let idx = y * width + x;
                let nb = neighbors(plane, x, y, width, height);
                let cid = cm.context_id(&nb, x, y);
                let wv = if include_weighted {
                    weight_codebook.get(weight_index as usize)
                } else {
                    None
                };
                let v = plane[idx] as i32;
                for (k, &p) in predictors.iter().enumerate() {
                    let pred = if p == PredictorId::AdaptiveRecursive {
                        let wc = weight_context(&nb);
                        let props = r13_properties(&nb, plane, x, y, width, height);
                        predict_recursive(&r13_state[wc], &props, range)
                    } else {
                        let wtree = if p == PredictorId::WeightedTree {
                            Some(wt_table.as_slice())
                        } else {
                            None
                        };
                        predict_clamped(p, &nb, wv, wtree, range)
                    };
                    ctx_costs[cid][k] += zigzag(v - pred) as u64;
                }
            }
        }
        let mut best_pred: Vec<u8> = vec![predictors[0].to_u8(); context_count];
        for cid in 0..context_count {
            let mut best_k = 0usize;
            let mut best_c = u64::MAX;
            let mut best_non_r13_k = 0usize;
            let mut best_non_r13_c = u64::MAX;
            for (k, &c) in ctx_costs[cid].iter().enumerate() {
                let p = predictors[k];
                let is_r13 = p == PredictorId::AdaptiveRecursive;
                // `WeightedTree` is a strict superset of every fixed predictor (it
                // can emulate any of them via its per-leaf table), so when its
                // summed residual ties or beats a fixed candidate it wins the
                // context - this is what lets it displace the simpler predictors
                // on structured content without costing extra per-symbol bits.
                // `AdaptiveRecursive` (R13-A) is likewise a strict superset, but its
                // analysis cost is only a sum-of-zigzag proxy: the 9-feature LMS fit
                // drives a lower *training* RSS while producing fatter-tailed
                // residuals, so the proxy over-selects it and regresses the real
                // file. It is therefore only accepted when it strictly beats the
                // best non-R13 predictor by a margin (R13_SELECT_MARGIN).
                if c < best_c || (c == best_c && p == PredictorId::WeightedTree && !is_r13) {
                    best_c = c;
                    best_k = k;
                }
                if !is_r13 && c < best_non_r13_c {
                    best_non_r13_c = c;
                    best_non_r13_k = k;
                }
            }
            // R13_SELECT_MARGIN: require R13 to be at least 0.1% cheaper than the
            // best non-R13 candidate, else fall back to that candidate. When R13 is
            // the only candidate (forced), `best_non_r13_c` stays `u64::MAX` and the
            // guard is skipped so forced measurement still engages it.
            const R13_SELECT_MARGIN: u128 = 1001;
            let chosen_k = if predictors[best_k] == PredictorId::AdaptiveRecursive
                && best_non_r13_c != u64::MAX
                && (best_c as u128) * 1000 >= (best_non_r13_c as u128) * R13_SELECT_MARGIN
            {
                best_non_r13_k
            } else {
                best_k
            };
            best_pred[cid] = predictors[chosen_k].to_u8();
        }
        // Keep the table only if this plane actually uses `WeightedTree` somewhere.
        let used_tree = best_pred.iter().any(|&p| p == PredictorId::WeightedTree.to_u8());
        wtables.push(if used_tree { Some(wt_table) } else { None });
        // Keep the R13-A table only if this plane actually uses `AdaptiveRecursive`.
        let used_r13 = best_pred.iter().any(|&p| p == PredictorId::AdaptiveRecursive.to_u8());
        r13tables.push(if used_r13 { Some(r13_table) } else { None });
        model.planes.push(PlaneModel {
            map: best_pred,
            weight_index,
        });
    }
    model.weighted_wc_table = if wtables.iter().any(|o| o.is_some()) {
        Some(wtables)
    } else {
        None
    };
    model.weighted_r13_table = if r13tables.iter().any(|o| o.is_some()) {
        Some(r13tables)
    } else {
        None
    };

    // R14 (residual-conditioned context tree): the per-plane tree is NOT built
    // here. It must be fit on the exact transform/representation that is finally
    // encoded (the winning Squeeze/CFL/Lift config), so `encode_with` builds it
    // after the never-expand winner is chosen (see the R14 net there). Building it
    // here, on the untransformed analysis planes, would mispredict at encode time
    // and expand the file. A depth-0 tree is byte-identical to the base codec, so
    // the never-expand net cannot regress.

    // Static histograms at effort >= 6. Skipped under the Golomb-Rice backend
    // (M0/M1), where per-context k is implicit mirrored state and the histogram
    // pass would be wasted work and memory; `static_histograms` stays `None`.
    if effort >= 6 && !entropy_gr {
        let mut per_plane: Vec<Vec<Option<Vec<(u32, u32)>>>> = Vec::new();
        for (pi, plane) in planes.iter().enumerate() {
            let range = ranges[pi];
            let alphabet = Alphabet::for_range(range.min, range.max);
            let mut hist: Vec<Vec<u64>> = vec![vec![0u64; alphabet.size]; context_count];
            let wv = model.weight_for(pi);
            for y in 0..height {
                for x in 0..width {
                    let idx = y * width + x;
                    let nb = neighbors(plane, x, y, width, height);
                    let cid = cm.context_id(&nb, x, y);
                    let p = model.predictor(pi, cid);
                    let pred = predict_clamped(p, &nb, wv.as_ref(), model.weighted_tree_for(pi), range);
                    let r = plane[idx] as i32 - pred;
                    hist[cid][zigzag(r) as usize] += 1;
                }
            }
            let mut contexts: Vec<Option<Vec<(u32, u32)>>> = Vec::new();
            for h in hist {
                let mut sparse: Vec<(u32, u32)> = Vec::new();
                for (s, &c) in h.iter().enumerate() {
                    if c > 0 {
                        sparse.push((s as u32, c as u32));
                    }
                }
                if sparse.is_empty() {
                    contexts.push(None);
                } else {
                    contexts.push(Some(sparse));
                }
            }
            per_plane.push(contexts);
        }
        model.static_histograms = Some(per_plane);
    }

    model
}

/// R12-A: fit a SEPARATE predictor map + weighted-tree table per coding band (the
/// JPEG XL per-band decorrelation edge). Mirrors the per-plane analysis loop in
/// `analyze` but iterates the already-banded planes, so each Squeeze sub-band
/// gets its own least-squares optimum instead of the single full-res map/table
/// that `analyze` reuses for every band. Runs ONCE up front (in `code_banded`),
/// not inside the never-expand candidate loop, so it does NOT reproduce R11-A's
/// 45x slowdown. Returns `(band_maps, per_band_weighted_tables)` indexed by the
/// global band index. The per-band table is `None` for bands whose per-band map
/// never selects `WeightedTree` (no wasted model bytes).
pub fn analyze_bands(
    banded_planes: &[Vec<i16>],
    banded_dims: &[(usize, usize)],
    band_ranges: &[PlaneRange],
    parents: &[usize],
    base_model: &ModelConfig,
    effort: u8,
    forced: Option<PredictorId>,
) -> (Vec<Vec<u8>>, Vec<Option<Vec<WLeaf>>>) {
    let context = &base_model.context;
    let context_count = base_model.context_count;
    let cm = ContextModel::new(*context);
    let predictors = match forced {
        Some(p) => vec![p],
        None => predictors_for(effort),
    };
    let include_tree = predictors.contains(&PredictorId::WeightedTree);
    let mut band_maps: Vec<Vec<u8>> = Vec::with_capacity(banded_planes.len());
    let mut band_tables: Vec<Option<Vec<WLeaf>>> = Vec::with_capacity(banded_planes.len());
    for (pi, plane) in banded_planes.iter().enumerate() {
        let (width, height) = banded_dims[pi];
        let range = band_ranges[pi];
        let parent = parents[pi];
        // Per-band weighted-tree table (R9-B least-squares over the band's own
        // (L,T,TL,TR) samples), identical machinery to `analyze`.
        let wt_table: Vec<WLeaf> = if include_tree {
            let mut s_leaf: Vec<[[i64; 5]; 5]> = vec![[[0i64; 5]; 5]; WC_LEAVES];
            let mut b_leaf: Vec<[i64; 5]> = vec![[0i64; 5]; WC_LEAVES];
            let mut cnt: Vec<i64> = vec![0i64; WC_LEAVES];
            for y in 0..height {
                for x in 0..width {
                    let idx = y * width + x;
                    let n = neighbors(plane, x, y, width, height);
                    let wc = weight_context(&n);
                    let ns = [n.l as i64, n.t as i64, n.tl as i64, n.tr as i64, 1i64];
                    for i in 0..5 {
                        for j in 0..5 {
                            s_leaf[wc][i][j] += ns[i] * ns[j];
                        }
                        b_leaf[wc][i] += (plane[idx] as i64) * ns[i];
                    }
                    cnt[wc] += 1;
                }
            }
            let mut table = Vec::with_capacity(WC_LEAVES);
            for lc in 0..WC_LEAVES {
                let leaf = if cnt[lc] >= WC_MIN_SAMPLES as i64 {
                    solve_weighted_tree(&s_leaf[lc], &b_leaf[lc]).unwrap_or(UNIT_LEAF)
                } else {
                    UNIT_LEAF
                };
                table.push(leaf);
            }
            table
        } else {
            Vec::new()
        };
        // Per-context predictor selection over the band (prefers `WeightedTree` on
        // ties, exactly like `analyze`). R13-A (when a candidate) reuses the parent
        // plane's R13 base table (its analysis solve is per full-res plane; banded
        // sub-bands share it), so the cost estimate uses the parent's static weights.
        let wv = base_model.weight_for(parent);
        let parent_r13 = base_model
            .r13_table_for(parent)
            .map(|t| crate::predict::r13_seed_state(Some(t)));
        let mut ctx_costs: Vec<Vec<u64>> = vec![vec![0u64; predictors.len()]; context_count];
        for y in 0..height {
            for x in 0..width {
                let idx = y * width + x;
                let nb = neighbors(plane, x, y, width, height);
                let cid = cm.context_id(&nb, x, y) % context_count;
                let v = plane[idx] as i32;
                for (k, &p) in predictors.iter().enumerate() {
                    let pred = if p == PredictorId::AdaptiveRecursive {
                        let wc = weight_context(&nb);
                        let props = r13_properties(&nb, plane, x, y, width, height);
                        let st = parent_r13.as_ref().map(|s| &s[wc]).cloned().unwrap_or_else(|| {
                            crate::predict::r13_seed_state(None)[wc]
                        });
                        predict_recursive(&st, &props, range)
                    } else {
                        let wtree = if p == PredictorId::WeightedTree {
                            Some(wt_table.as_slice())
                        } else {
                            None
                        };
                        predict_clamped(p, &nb, wv.as_ref(), wtree, range)
                    };
                    ctx_costs[cid][k] += zigzag(v - pred) as u64;
                }
            }
        }
        let mut best_pred: Vec<u8> = vec![predictors[0].to_u8(); context_count];
        for cid in 0..context_count {
            let mut best_k = 0usize;
            let mut best_c = u64::MAX;
            let mut best_non_r13_k = 0usize;
            let mut best_non_r13_c = u64::MAX;
            for (k, &c) in ctx_costs[cid].iter().enumerate() {
                let p = predictors[k];
                let is_r13 = p == PredictorId::AdaptiveRecursive;
                if c < best_c || (c == best_c && p == PredictorId::WeightedTree && !is_r13) {
                    best_c = c;
                    best_k = k;
                }
                if !is_r13 && c < best_non_r13_c {
                    best_non_r13_c = c;
                    best_non_r13_k = k;
                }
            }
            const R13_SELECT_MARGIN: u128 = 1001;
            let chosen_k = if predictors[best_k] == PredictorId::AdaptiveRecursive
                && best_non_r13_c != u64::MAX
                && (best_c as u128) * 1000 >= (best_non_r13_c as u128) * R13_SELECT_MARGIN
            {
                best_non_r13_k
            } else {
                best_k
            };
            best_pred[cid] = predictors[chosen_k].to_u8();
        }
        let used_tree = best_pred
            .iter()
            .any(|&p| p == PredictorId::WeightedTree.to_u8());
        band_tables.push(if used_tree { Some(wt_table) } else { None });
        band_maps.push(best_pred);
    }
    (band_maps, band_tables)
}

/// A default model (effort 0): MED everywhere over a single global context per
/// plane (architecture section 9: "fixed MED for all contexts"), so all adaptive
/// symbols concentrate in one table and the model section stays tiny.
pub fn default_model(
    planes: &[Vec<i16>],
    context: &ContextParams,
    weight_codebook: &[WeightVec],
) -> ModelConfig {
    let n_planes = planes.len();
    let context_count = 1;
    let planes: Vec<PlaneModel> = planes
        .iter()
        .map(|_| PlaneModel {
            map: vec![PredictorId::Med.to_u8(); context_count],
            weight_index: u8::MAX,
        })
        .collect();
    ModelConfig {
        transform: TransformChoice::None,
        cross_channel: false,
        palette: None,
        context: *context,
        context_count,
        planes,
        weight_codebook: weight_codebook.to_vec(),
        static_histograms: None,
        entropy_mode: ENTROPY_MODE_GR,
        capped_histograms: None,
        cmarc_priors: None,
        cmarc_residual_ctx: false,
        cmarc_run: false,
        cmarc_ma_context: false,
        cmarc_use_color_cache: false,
        weighted_wc_table: None,
        weighted_r13_table: None,
        squeeze_levels: vec![0u8; n_planes],
        transform_kind: crate::transforms::TransformKind::Squeeze,
        cfl_scale: vec![None; n_planes],
        band_ranges: Vec::new(),
        band_maps: None,
        band_wc_table: None,
        rcct: None,
        nrp: None,
    }
}

/// Feature value for the R14 MA leaf model: the first `RCCT_K` entries are the
/// context properties, the last (`RCCT_K == RCCT_DIM - 1`) is the bias (constant 1).
#[inline]
fn rcct_feat(p: &[i32; RCCT_K], di: usize) -> i64 {
    if di < RCCT_K {
        p[di] as i64
    } else {
        1
    }
}

/// Accumulate the MA normal equations `S x = b` (with `t2 = sum target^2`) over a
/// set of pixel indices for plane `pi`, using property vector `props` and target
/// `r0`. Layout matches `solve_ma_least_squares` and `rcct_leaf_predict`.
fn rcct_accumulate(
    indices: &[usize],
    props: &[[i32; RCCT_K]],
    r0: &[i32],
) -> ([[i64; RCCT_DIM]; RCCT_DIM], [i64; RCCT_DIM], i64) {
    let mut s = [[0i64; RCCT_DIM]; RCCT_DIM];
    let mut b = [0i64; RCCT_DIM];
    let mut t2 = 0i64;
    for &i in indices {
        let p = &props[i];
        let target = r0[i] as i64;
        for di in 0..RCCT_DIM {
            let fv = rcct_feat(p, di);
            b[di] += target * fv;
            for dj in 0..RCCT_DIM {
                s[di][dj] += fv * rcct_feat(p, dj);
            }
        }
        t2 += target * target;
    }
    (s, b, t2)
}

/// Fit the MA model over a normal-equation set and return the unshifted
/// `sum-of-squared-residuals` (`t2 - b^T x`, where `x = S^{-1} b`). Returns `None`
/// when the system is singular/ill-conditioned so the caller can skip the split.
fn rcct_ssr(s: &[[i64; RCCT_DIM]; RCCT_DIM], b: &[i64; RCCT_DIM], t2: i64) -> Option<i64> {
    let mut m = [[0f64; RCCT_DIM]; RCCT_DIM];
    let mut v = [0f64; RCCT_DIM];
    for di in 0..RCCT_DIM {
        for dj in 0..RCCT_DIM {
            m[di][dj] = s[di][dj] as f64;
        }
        v[di] = b[di] as f64;
    }
    // Gauss-Jordan, with pivot check for ill-conditioning.
    let mut inv = [[0f64; RCCT_DIM]; RCCT_DIM];
    for di in 0..RCCT_DIM {
        inv[di][di] = 1.0;
    }
    for col in 0..RCCT_DIM {
        let mut piv = col;
        let mut best_abs = 0f64;
        for r in col..RCCT_DIM {
            let a = m[r][col].abs();
            if a > best_abs {
                best_abs = a;
                piv = r;
            }
        }
        if best_abs < 1e-9 {
            return None;
        }
        if piv != col {
            m.swap(piv, col);
            inv.swap(piv, col);
        }
        let d = m[col][col];
        for c in 0..RCCT_DIM {
            m[col][c] /= d;
            inv[col][c] /= d;
        }
        for r in 0..RCCT_DIM {
            if r != col {
                let f = m[r][col];
                if f != 0.0 {
                    for c in 0..RCCT_DIM {
                        m[r][c] -= f * m[col][c];
                        inv[r][c] -= f * inv[col][c];
                    }
                }
            }
        }
    }
    let mut bx = 0f64;
    for di in 0..RCCT_DIM {
        let mut x = 0f64;
        for dj in 0..RCCT_DIM {
            x += inv[di][dj] * v[dj];
        }
        bx += v[di] * x;
    }
    let ssr = t2 as f64 - bx;
    if ssr < 0.0 {
        Some(0)
    } else {
        Some(ssr as i64)
    }
}

/// Recursively grow one RCCT node/leaf over `indices`.
fn rcct_recurse(
    indices: &[usize],
    depth: usize,
    props: &[[i32; RCCT_K]],
    r0: &[i32],
    nodes: &mut Vec<RcctNode>,
    leaves: &mut Vec<RcctLeaf>,
) -> u32 {
    let (s_total, b_total, t2_total) = rcct_accumulate(indices, props, r0);
    let single_ssr = rcct_ssr(&s_total, &b_total, t2_total);

    if indices.len() < RCCT_MIN_LEAF || depth >= RCCT_MAX_DEPTH {
        let li = leaves.len();
        leaves.push(solve_ma_least_squares::<RCCT_DIM>(&s_total, &b_total).unwrap_or([0i16; RCCT_DIM]));
        return RCCT_LEAF_TAG | li as u32;
    }

    let mut best: Option<(usize, i32, usize, i64)> = None; // (prop, thr, left_count, ssr)
    let m = indices.len();
    for k in 0..RCCT_K {
        // Sort pixel indices by this property.
        let mut order: Vec<usize> = indices.to_vec();
        order.sort_by_key(|&i| props[i][k]);
        // Skip properties with no variation.
        if m >= 2 && props[order[0]][k] == props[order[m - 1]][k] {
            continue;
        }
        // Candidate split positions (left-set sizes) at quantile cut points.
        let mut cand: Vec<usize> = Vec::new();
        for c in 1..RCCT_THR_CANDIDATES {
            let pos = (m * c) / RCCT_THR_CANDIDATES;
            if pos > 0 && pos < m {
                cand.push(pos);
            }
        }
        cand.sort_unstable();
        cand.dedup();
        if cand.is_empty() {
            continue;
        }
        // Incremental prefix accumulation up to each candidate position.
        let mut rs = [[0i64; RCCT_DIM]; RCCT_DIM];
        let mut rb = [0i64; RCCT_DIM];
        let mut rt2 = 0i64;
        let mut prev = 0usize;
        for &t in &cand {
            while prev < t {
                let pix = order[prev];
                let p = &props[pix];
                let target = r0[pix] as i64;
                for di in 0..RCCT_DIM {
                    let fv = rcct_feat(p, di);
                    rb[di] += target * fv;
                    for dj in 0..RCCT_DIM {
                        rs[di][dj] += fv * rcct_feat(p, dj);
                    }
                }
                rt2 += target * target;
                prev += 1;
            }
            let lssr = match rcct_ssr(&rs, &rb, rt2) {
                Some(v) => v,
                None => continue,
            };
            // Right side = total minus left prefix.
            let mut rsr = [[0i64; RCCT_DIM]; RCCT_DIM];
            let mut rbr = [0i64; RCCT_DIM];
            for di in 0..RCCT_DIM {
                rsr[di][di] = s_total[di][di] - rs[di][di];
                rbr[di] = b_total[di] - rb[di];
                for dj in 0..di {
                    rsr[di][dj] = s_total[di][dj] - rs[di][dj];
                    rsr[dj][di] = s_total[dj][di] - rs[dj][di];
                }
            }
            let rssr = match rcct_ssr(&rsr, &rbr, t2_total - rt2) {
                Some(v) => v,
                None => continue,
            };
            let sum = lssr.saturating_add(rssr);
            match best {
                Some((_, _, _, bssr)) if sum >= bssr => {}
                _ => best = Some((k, props[order[t - 1]][k], t, sum)),
            }
        }
    }

    let split = match (best, single_ssr) {
        (Some((k, thr, t, sssr)), Some(single)) => {
            // Only split if it strictly improves over a single leaf.
            if sssr < single.saturating_sub(1) {
                Some((k, thr, t))
            } else {
                None
            }
        }
        _ => None,
    };

    match split {
        None => {
            let li = leaves.len();
            leaves.push(
                solve_ma_least_squares::<RCCT_DIM>(&s_total, &b_total).unwrap_or([0i16; RCCT_DIM]),
            );
            RCCT_LEAF_TAG | li as u32
        }
        Some((k, thr, t)) => {
            // Partition `indices` into left (prop[k] <= thr) and right.
            let mut left: Vec<usize> = Vec::with_capacity(t);
            let mut right: Vec<usize> = Vec::with_capacity(m - t);
            for &i in indices {
                if props[i][k] <= thr {
                    left.push(i);
                } else {
                    right.push(i);
                }
            }
            let node_idx = nodes.len();
            nodes.push(RcctNode {
                prop: k as u8,
                thr,
                le: 0,
                gt: 0,
            });
            let le = rcct_recurse(&left, depth + 1, props, r0, nodes, leaves);
            let gt = rcct_recurse(&right, depth + 1, props, r0, nodes, leaves);
            nodes[node_idx] = RcctNode {
                prop: k as u8,
                thr,
                le,
                gt,
            };
            node_idx as u32
        }
    }
}

/// R14: build the residual-conditioned context tree (one `RcctTree` per plane)
/// from the chosen per-context predictor's residual `r0`. The tree is an overlay:
/// a depth-0 (single-leaf) tree yields `r_pred = 0` and decodes byte-identically to
/// the base codec, so the caller's never-expand net can drop R14 without loss.
/// Build RCCT trees from *precomputed base residuals* `r0s[pi]` (and their
/// value `ranges[pi]`). The residuals must be exactly the ones the encoder
/// produces during coding (use `collect_rcct_r0` in the encoder), otherwise
/// the tree is fit on a slightly different signal than the one it sees at
/// encode/decode time and will mispredict. The overlay is then
/// decode-available by construction.
pub fn build_rcct_trees(
    planes: &[Vec<i16>],
    r0s: &[Vec<i32>],
    ranges: &[PlaneRange],
    dims: &[(usize, usize)],
    parents: &[usize],
    model: &ModelConfig,
) -> Vec<Option<RcctTree>> {
    let _ = model;
    let _ = parents;
    let n_planes = planes
        .len()
        .min(r0s.len())
        .min(dims.len())
        .min(ranges.len());
    (0..n_planes)
        .map(|pi| {
            let plane = &planes[pi];
            let (width, height) = dims[pi];
            let n = width * height;
            if n == 0 {
                return None;
            }
            let range = ranges[pi];
            let r0 = &r0s[pi];
            // Property vector per pixel, mixing neighbours' base errors.
            let mut props = vec![[0i32; RCCT_K]; n];
            for y in 0..height {
                for x in 0..width {
                    let idx = y * width + x;
                    let nb = neighbors(plane, x, y, width, height);
                    let e0 = [
                        if x > 0 { r0[idx - 1] } else { 0 },
                        if y > 0 { r0[idx - width] } else { 0 },
                        if x > 0 && y > 0 { r0[idx - width - 1] } else { 0 },
                        if x + 1 < width && y > 0 { r0[idx - width + 1] } else { 0 },
                    ];
                    let g1 = nb.l - nb.t;
                    let g2 = nb.t - nb.tl;
                    let g3 = nb.tl - nb.tr;
                    props[idx] = rcct_properties(&nb, &e0, g1, g2, g3);
                }
            }
            let all: Vec<usize> = (0..n).collect();
            let mut nodes = Vec::new();
            let mut leaves = Vec::new();
            rcct_recurse(&all, 0, &props, r0, &mut nodes, &mut leaves);
            if std::env::var("OBSIDIAN_R14_DEBUG").ok().as_deref() == Some("1") {
                let tree = RcctTree { nodes: nodes.clone(), leaves: leaves.clone() };
                let mut ss_r0 = 0i64;
                let mut ss_eps = 0i64;
                for i in 0..n {
                    let r0v = r0[i];
                    let rp = rcct_predict(&tree, &props[i], range);
                    let eps = r0v - rp;
                    ss_r0 += (r0v as i64) * (r0v as i64);
                    ss_eps += (eps as i64) * (eps as i64);
                }
                eprintln!(
                    "[R14-analyze] plane {} n={} ss_r0={} ss_eps={} ratio={:.3} range=[{},{}]",
                    pi,
                    n,
                    ss_r0,
                    ss_eps,
                    if ss_r0 > 0 { ss_eps as f64 / ss_r0 as f64 } else { 1.0 },
                    range.min,
                    range.max,
                );
            }
            Some(RcctTree { nodes, leaves })
        })
        .collect()
}

/// R15: build the learned neural residual predictor (one `NrpNet` per plane) from
/// the chosen per-context predictor's base residual `r0`. The net is an overlay:
/// a zero net (`f = 0`) decodes byte-identically to the base codec, so the
/// caller's never-expand net can drop R15 without loss. Build nets from
/// *precomputed base residuals* `r0s[pi]` (exactly the ones the encoder produces
/// during coding, captured by the probe pass) so the net is fit on the identical
/// signal it sees at encode/decode time and remains decode-available by
/// construction. `build_nrp_nets` returns `None` for a plane when the quantized
/// integer net does not strictly lower the residual SSR vs the base `r0` (the
/// byte-honest gate), so a plane that cannot be helped simply stays on the base
/// path and never regresses.
pub fn build_nrp_nets(
    planes: &[Vec<i16>],
    r0s: &[Vec<i32>],
    ranges: &[PlaneRange],
    dims: &[(usize, usize)],
) -> Vec<Option<NrpNet>> {
    let n_planes = planes
        .len()
        .min(r0s.len())
        .min(dims.len())
        .min(ranges.len());
    (0..n_planes)
        .map(|pi| {
            let plane = &planes[pi];
            let (width, height) = dims[pi];
            let n = width * height;
            if n == 0 {
                return None;
            }
            let range = ranges[pi];
            let r0 = &r0s[pi];
            let mut phi = vec![[0i32; NRP_D]; n];
            let mut ss_base = 0i64;
            for y in 0..height {
                for x in 0..width {
                    let idx = y * width + x;
                    let nb = neighbors(plane, x, y, width, height);
                    let e0 = [
                        if x > 0 { r0[idx - 1] } else { 0 },
                        if y > 0 { r0[idx - width] } else { 0 },
                        if x > 0 && y > 0 { r0[idx - width - 1] } else { 0 },
                        if x + 1 < width && y > 0 { r0[idx - width + 1] } else { 0 },
                    ];
                    let g1 = nb.l - nb.t;
                    let g2 = nb.t - nb.tl;
                    let g3 = nb.tl - nb.tr;
                    phi[idx] = nrp_features(&nb, &e0, g1, g2, g3);
                    let rv = r0[idx];
                    ss_base += (rv as i64) * (rv as i64);
                }
            }
            let net = train_nrp_plane(&phi, r0, range);
            let mut ss_net = 0i64;
            for i in 0..n {
                let f = nrp_forward(&net, &phi[i], range) as i64;
                let e = r0[i] as i64 - f;
                ss_net += e * e;
            }
            if ss_net < ss_base {
                Some(net)
            } else {
                None
            }
        })
        .collect()
}

/// Deterministic LCG (xorshift-style) for reproducible R15 weight initialization.
struct NrpRng {
    s: u64,
}
impl NrpRng {
    fn new(seed: u64) -> Self {
        NrpRng { s: seed | 1 }
    }
    fn next(&mut self) -> u64 {
        self.s ^= self.s << 13;
        self.s ^= self.s >> 7;
        self.s ^= self.s << 17;
        self.s
    }
}

/// Float MLP trainer for one plane. Minimizes `sum (r0 - f)^2` via full-batch SGD
/// with momentum, using a smooth `tanh` surrogate that mirrors the integer
/// `nrp_forward` math. The final weights are quantized to `i16` and returned as an
/// `NrpNet`; the caller's SSR gate keeps the net only when it strictly helps.
fn train_nrp_plane(phi: &[[i32; NRP_D]], r0: &[i32], _range: PlaneRange) -> NrpNet {
    let h = NRP_H;
    let d = NRP_D;
    let n = phi.len();
    let act_shift = (1u64 << NRP_ACT_SHIFT) as f64;
    let out_shift = (1u64 << NRP_OUT_SHIFT) as f64;
    let clamp = NRP_ACT_CLAMP as f64;
    let mut rng = NrpRng::new(0x9E3779B9 ^ (n as u64).wrapping_mul(0x85EBCA6B));
    let mut w = vec![0f64; h * d];
    let mut w_out = vec![0f64; h];
    let mut b = vec![0f64; h + 1];
    for x in w.iter_mut() {
        *x = ((rng.next() & 0xffff) as f64 / 65535.0 - 0.5) * 0.2;
    }
    for x in w_out.iter_mut() {
        *x = ((rng.next() & 0xffff) as f64 / 65535.0 - 0.5) * 4.0;
    }
    let mut vw = vec![0f64; h * d];
    let mut vwo = vec![0f64; h];
    let mut vb = vec![0f64; h + 1];
    for _it in 0..NRP_ITERS {
        let mut gw = vec![0f64; h * d];
        let mut gwo = vec![0f64; h];
        let mut gb = vec![0f64; h + 1];
        for i in 0..n {
            let mut z = vec![0f64; h];
            let mut hidden = [0f64; NRP_H];
            for hh in 0..h {
                let mut acc = b[hh];
                for dd in 0..d {
                    acc += w[hh * d + dd] * phi[i][dd] as f64;
                }
                z[hh] = acc;
                hidden[hh] = (acc / act_shift).tanh() * clamp;
            }
            let mut out = b[h];
            for hh in 0..h {
                out += w_out[hh] * hidden[hh];
            }
            let f = out / out_shift;
            let err = r0[i] as f64 - f;
            let dloss_df = -2.0 * err / n as f64;
            for hh in 0..h {
                gwo[hh] += dloss_df * hidden[hh] / out_shift;
                let dh = dloss_df * w_out[hh] / out_shift;
                // d hidden[hh] / d z[hh] = (1 - tanh^2(z/act_shift)) / act_shift
                let t = (z[hh] / act_shift).tanh();
                let dz = dh * (1.0 - t * t) / act_shift;
                gb[hh] += dz;
                let base = hh * d;
                for dd in 0..d {
                    gw[base + dd] += dz * phi[i][dd] as f64;
                }
            }
            gb[h] += dloss_df / out_shift;
        }
        for k in 0..h * d {
            vw[k] = NRP_MOMENTUM * vw[k] - NRP_LR * gw[k];
            w[k] += vw[k];
        }
        for k in 0..h {
            vwo[k] = NRP_MOMENTUM * vwo[k] - NRP_LR * gwo[k];
            w_out[k] += vwo[k];
            vb[k] = NRP_MOMENTUM * vb[k] - NRP_LR * gb[k];
            b[k] += vb[k];
        }
        vb[h] = NRP_MOMENTUM * vb[h] - NRP_LR * gb[h];
        b[h] += vb[h];
    }
    let q = |x: f64| x.round().clamp(i16::MIN as f64, i16::MAX as f64) as i16;
    NrpNet {
        w: w.iter().map(|&x| q(x)).collect(),
        w_out: w_out.iter().map(|&x| q(x)).collect(),
        b: b.iter().map(|&x| q(x)).collect(),
    }
}

/// Build per-context histograms over the capped residual alphabet (`CAPPED_SYMBOLS`)
/// for the M3.5 Design B capped-and-escaped rANS backend. Uses the same per-context
/// predictor selection and `zigzag` mapping as the coding pass, so the resulting
/// static tables exactly match what the encoder/decoder will see. Symbols are
/// `min(zigzag(r), CAPPED_ALPHABET)`; residuals larger than the cap take the escape
/// symbol and are coded by the fallback Golomb-Rice stream, so they are not counted
/// here.
pub fn build_capped_histograms(
    planes: &[Vec<i16>],
    ranges: &[PlaneRange],
    width: usize,
    height: usize,
    model: &ModelConfig,
) -> Vec<Vec<Option<Vec<(u32, u32)>>>> {
    let cm = ContextModel::new(model.context);
    let mut per_plane: Vec<Vec<Option<Vec<(u32, u32)>>>> = Vec::with_capacity(planes.len());
    for (pi, plane) in planes.iter().enumerate() {
        let range = ranges[pi];
        let mut hist: Vec<Vec<u64>> = vec![vec![0u64; CAPPED_SYMBOLS]; model.context_count];
            let wv = model.weight_for(pi);
            let area = width * height;
            for i in 0..area {
                let x = i % width;
                let y = i / width;
                let nb = neighbors(plane, x, y, width, height);
                let cid = cm.context_id(&nb, x, y) % model.context_count;
                let p = model.predictor(pi, cid);
                let pred = predict_clamped(p, &nb, wv.as_ref(), model.weighted_tree_for(pi), range);
            let r = plane[i] as i32 - pred;
            let z = zigzag(r) as usize;
            let sym = z.min(CAPPED_ALPHABET);
            hist[cid][sym] += 1;
        }
        let mut contexts: Vec<Option<Vec<(u32, u32)>>> = Vec::with_capacity(model.context_count);
        for h in hist {
            let mut sparse: Vec<(u32, u32)> = Vec::new();
            for (s, &c) in h.iter().enumerate() {
                if c > 0 {
                    sparse.push((s as u32, c as u32));
                }
            }
            if sparse.is_empty() {
                contexts.push(None);
            } else {
                contexts.push(Some(sparse));
            }
        }
        per_plane.push(contexts);
    }
    per_plane
}

/// Serialize the model to `w`.
pub fn write_model(w: &mut impl Write, m: &ModelConfig) -> Result<(), CodecError> {
    w.write_all(&[match m.transform {
        TransformChoice::None => 0,
        TransformChoice::YCoCgR => 1,
    }])?;
    w.write_all(&[m.context.base_shift, m.context.activity_classes])?;
    w.write_all(&m.context.activity_scale.to_le_bytes())?;
    w.write_all(&(m.context_count as u16).to_le_bytes())?;
    for plane in &m.planes {
        w.write_all(&plane.map)?;
        w.write_all(&[plane.weight_index])?;
    }
    match &m.palette {
        None => w.write_all(&[0])?,
        Some(pal) => {
            w.write_all(&[1])?;
            w.write_all(&(pal.colors.len() as u32).to_le_bytes())?;
            for c in &pal.colors {
                w.write_all(c)?;
            }
        }
    }
    match &m.static_histograms {
        None => w.write_all(&[0])?,
        Some(per_plane) => {
            w.write_all(&[1])?;
            for plane_ctx in per_plane {
                // u16 number of non-empty contexts, then each as
                // (u16 ctx, u16 symbol_count, symbol/freq pairs).
                let non_empty: Vec<usize> = plane_ctx
                    .iter()
                    .enumerate()
                    .filter(|(_, o)| o.is_some())
                    .map(|(i, _)| i)
                    .collect();
                w.write_all(&(non_empty.len() as u16).to_le_bytes())?;
                for cid in non_empty {
                    w.write_all(&(cid as u16).to_le_bytes())?;
                    let pairs = plane_ctx[cid].as_ref().unwrap();
                    w.write_all(&(pairs.len() as u16).to_le_bytes())?;
                    for &(sym, f) in pairs {
                        w.write_all(&(sym as u16).to_le_bytes())?;
                        w.write_all(&(f as u16).to_le_bytes())?;
                    }
                }
            }
        }
    }
    match &m.capped_histograms {
        None => w.write_all(&[0])?,
        Some(per_plane) => {
            w.write_all(&[1])?;
            for plane_ctx in per_plane {
                let non_empty: Vec<usize> = plane_ctx
                    .iter()
                    .enumerate()
                    .filter(|(_, o)| o.is_some())
                    .map(|(i, _)| i)
                    .collect();
                w.write_all(&(non_empty.len() as u16).to_le_bytes())?;
                for cid in non_empty {
                    w.write_all(&(cid as u16).to_le_bytes())?;
                    let pairs = plane_ctx[cid].as_ref().unwrap();
                    w.write_all(&(pairs.len() as u16).to_le_bytes())?;
                    for &(sym, f) in pairs {
                        w.write_all(&(sym as u16).to_le_bytes())?;
                        w.write_all(&(f as u16).to_le_bytes())?;
                    }
                }
            }
        }
    }
    // Entropy backend selector (M3.5 Design B). Appended last so older readers
    // that stop earlier still parse the model body; all writers in this build
    // emit it, so the decoder always reads it back.
    w.write_all(&[m.entropy_mode])?;
    // R1 CMARC per-`(cid, bin)` static priors. Appended after `entropy_mode` so
    // legacy readers (and readers that stop at the backend selector) still parse
    // the model body; the decoder seeds `BinModel`s from these counts. `None`
    // when CMARC priors are off.
    match &m.cmarc_priors {
        None => w.write_all(&[0])?,
        Some(per_plane) => {
            w.write_all(&[1])?;
            for plane_ctx in per_plane {
                let non_empty: Vec<usize> = plane_ctx
                    .iter()
                    .enumerate()
                    .filter(|(_, o)| o.is_some())
                    .map(|(i, _)| i)
                    .collect();
                w.write_all(&(non_empty.len() as u16).to_le_bytes())?;
                for cid in non_empty {
                    w.write_all(&(cid as u16).to_le_bytes())?;
                    let pairs = plane_ctx[cid].as_ref().unwrap();
                    w.write_all(&(pairs.len() as u16).to_le_bytes())?;
                    for &(bin, n1, n0) in pairs {
                        w.write_all(&(bin as u16).to_le_bytes())?;
                        w.write_all(&(n1 as u16).to_le_bytes())?;
                        w.write_all(&(n0 as u16).to_le_bytes())?;
                    }
                }
            }
        }
    }
    // R2.1 cross-channel subtract-green flag. Appended last so legacy readers
    // that stop earlier still parse the model body; the decoder applies the
    // inverse after the inverse color transform when this flag is set.
    w.write_all(&[if m.cross_channel { 1 } else { 0 }])?;
    // R3-A JPEG-LS DIFF residual-context flag for CMARC. Appended after the
    // cross-channel flag so legacy readers that stop earlier still parse the
    // model body; the decoder selects the CMARC coding context accordingly.
    w.write_all(&[if m.cmarc_residual_ctx { 1 } else { 0 }])?;
    // R3-C run-mode flag for CMARC. Appended after the residual-context flag;
    // decoder mirrors it to decide whether to read run lengths.
    w.write_all(&[if m.cmarc_run { 1 } else { 0 }])?;
    // R11-D MA-tree-lite flag for CMARC. Appended after the run-mode flag; the
    // decoder mirrors it to decide whether to fold the local gradient into the
    // residual coding context.
    w.write_all(&[if m.cmarc_ma_context { 1 } else { 0 }])?;
    // R6-B color-cache flag for CMARC. Appended after the run-mode flag; the
    // decoder mirrors it to decide whether to maintain the per-plane LRU.
    w.write_all(&[if m.cmarc_use_color_cache { 1 } else { 0 }])?;
    // R9-B weighted-tree table. Appended last so legacy readers still parse the
    // model body. Format: [flag]; if 1, then per plane [flag]; if a plane's flag
    // is 1, [WC_LEAVES as u16] followed by that many (i16,i16,i16,i16,i16,u8) leaves
    // (spatial weights, bias, shift - all little-endian / shift as one byte). The
    // decoder threads the table into the `WeightedTree` prediction so encoder/
    // decoder lockstep is exact.
    match &m.weighted_wc_table {
        None => w.write_all(&[0])?,
        Some(per_plane) => {
            w.write_all(&[1])?;
            for plane in per_plane {
                if let Some(table) = plane {
                    w.write_all(&[1])?;
                    w.write_all(&(table.len() as u16).to_le_bytes())?;
                    for &(w0, w1, w2, w3, bias, s) in table {
                        w.write_all(&w0.to_le_bytes())?;
                        w.write_all(&w1.to_le_bytes())?;
                        w.write_all(&w2.to_le_bytes())?;
                        w.write_all(&w3.to_le_bytes())?;
                        w.write_all(&bias.to_le_bytes())?;
                        w.write_all(&[s])?;
                    }
                } else {
                    w.write_all(&[0])?;
                }
            }
        }
    }
    // R13-A R13 leaf table, appended after the R9-B weighted-tree table (still last
    // for legacy readers). Format mirrors `weighted_wc_table`: [flag]; if 1, then per
    // plane [flag]; if a plane's flag is 1, `WC_LEAVES` `R13Leaf` tuples (each `[i16;
    // R13_DIM]`, the nine property weights then the bias, all little-endian). Decoder
    // threads the table into `AdaptiveRecursive` prediction in lockstep with the encoder.
    match &m.weighted_r13_table {
        None => w.write_all(&[0])?,
        Some(per_plane) => {
            w.write_all(&[1])?;
            for plane in per_plane {
                if let Some(table) = plane {
                    w.write_all(&[1])?;
                    w.write_all(&(table.len() as u16).to_le_bytes())?;
                    for &leaf in table {
                        for m in 0..R13_DIM {
                            w.write_all(&leaf[m].to_le_bytes())?;
                        }
                    }
                } else {
                    w.write_all(&[0])?;
                }
            }
        }
    }
    // R10-A Squeeze levels and R10-B CFL scales, appended last (after the
    // weighted-tree table) so every legacy reader that stops earlier still parses
    // the model body. Lengths are implied by `alphabet_sizes.len()` (= plane
    // count), so no length prefix is needed; both the encoder (writer) and the
    // decoder (reader) always process these trailing bytes in the same build.
    for &lvl in &m.squeeze_levels {
        w.write_all(&[lvl])?;
    }
    for &scale in &m.cfl_scale {
        // `0xFF` encodes `None`; otherwise the 3-bit scale `s in 0..=7`.
        let byte = match scale {
            Some(s) => s,
            None => 0xFF,
        };
        w.write_all(&[byte])?;
    }
    // R10 per-band value ranges, appended after the CFL scales (still last) so
    // every legacy reader that stops earlier still parses the model body. Length
    // is NOT implied by plane count (it equals `total_bands`), so a u32 count
    // prefixes the `(min as i16, max as i16)` pairs in band/stream order.
    w.write_all(&(m.band_ranges.len() as u32).to_le_bytes())?;
    for r in &m.band_ranges {
        w.write_all(&r.min.to_le_bytes())?;
        w.write_all(&r.max.to_le_bytes())?;
    }
    // R12-A per-band model (predictor maps + weighted-tree tables), appended last
    // so legacy readers that stop earlier still parse the model body. Written
    // ONLY when Squeeze is present (any level != 0); when absent a single flag
    // byte 0 is written and the decoder uses the per-plane path (byte-identical
    // legacy decode). Format per band: [map bytes] then [table flag]; if 1, the
    // leaf count followed by the weight tuples (same layout as `weighted_wc_table`).
    let banded = m.band_maps.is_some() && m.band_wc_table.is_some();
    if banded {
        w.write_all(&[1])?;
        let nb = m.band_maps.as_ref().map(|b| b.len()).unwrap_or(0);
        w.write_all(&(nb as u32).to_le_bytes())?;
        let maps = m.band_maps.as_ref().unwrap();
        let tables = m.band_wc_table.as_ref().unwrap();
        for (mi, map) in maps.iter().enumerate() {
            w.write_all(map)?;
            match &tables[mi] {
                Some(table) => {
                    w.write_all(&[1])?;
                    w.write_all(&(table.len() as u16).to_le_bytes())?;
                    for &(w0, w1, w2, w3, bias, s) in table {
                        w.write_all(&w0.to_le_bytes())?;
                        w.write_all(&w1.to_le_bytes())?;
                        w.write_all(&w2.to_le_bytes())?;
                        w.write_all(&w3.to_le_bytes())?;
                        w.write_all(&bias.to_le_bytes())?;
                        w.write_all(&[s])?;
                    }
                }
                None => w.write_all(&[0])?,
            }
        }
    } else {
        w.write_all(&[0])?;
    }
    // R13-B: transform kind byte, appended last (after the R12-A band model) so
    // every legacy reader that stops earlier still parses the model body. A
    // legacy stream has no such byte; `read_model` defaults it to `Squeeze`.
    w.write_all(&[m.transform_kind.to_u8()])?;
    // R14: rcct block, appended after `transform_kind` so legacy readers (which
    // stop at the body) ignore it; an R14 stream with no rcct writes a single 0.
    match &m.rcct {
        None => w.write_all(&[0])?,
        Some(trees) => {
            w.write_all(&[1])?;
            w.write_all(&[trees.len() as u8])?;
            for t in trees {
                match t {
                    None => w.write_all(&[0])?,
                    Some(tree) => {
                        w.write_all(&[1])?;
                        w.write_all(&(tree.nodes.len() as u32).to_le_bytes())?;
                        for n in &tree.nodes {
                            w.write_all(&[n.prop])?;
                            w.write_all(&n.thr.to_le_bytes())?;
                            w.write_all(&n.le.to_le_bytes())?;
                            w.write_all(&n.gt.to_le_bytes())?;
                        }
                        w.write_all(&(tree.leaves.len() as u32).to_le_bytes())?;
                        for l in &tree.leaves {
                            for c in l.iter() {
                                w.write_all(&c.to_le_bytes())?;
                            }
                        }
                    }
                }
            }
        }
    }
    // R15: nrp block, appended after `rcct` so legacy readers (which stop at the
    // body) ignore it; an NRP stream with no nrp writes a single 0.
    match &m.nrp {
        None => w.write_all(&[0])?,
        Some(nets) => {
            w.write_all(&[1])?;
            w.write_all(&[nets.len() as u8])?;
            for net in nets {
                match net {
                    None => w.write_all(&[0])?,
                    Some(net) => {
                        w.write_all(&[1])?;
                        w.write_all(&[crate::predict::NRP_H as u8])?;
                        w.write_all(&[crate::predict::NRP_D as u8])?;
                        for x in &net.w {
                            w.write_all(&x.to_le_bytes())?;
                        }
                        for x in &net.w_out {
                            w.write_all(&x.to_le_bytes())?;
                        }
                        for x in &net.b {
                            w.write_all(&x.to_le_bytes())?;
                        }
                    }
                }
            }
        }
    }
    Ok(())
}

/// Read a model from `r`. `alphabet_sizes` gives the rANS table size per plane.
pub fn read_model(r: &mut impl Read, alphabet_sizes: &[usize]) -> Result<ModelConfig, CodecError> {
    let mut buf = [0u8; 1];
    r.read_exact(&mut buf)?;
    let transform = match buf[0] {
        0 => TransformChoice::None,
        1 => TransformChoice::YCoCgR,
        v => return Err(CodecError::InvalidStream(format!("bad transform {v}"))),
    };
    let mut params = [0u8; 2];
    r.read_exact(&mut params)?;
    let base_shift = params[0];
    let activity_classes = params[1];
    if activity_classes == 0 || base_shift > 8 {
        return Err(CodecError::InvalidStream("bad context params".into()));
    }
    let mut scale = [0u8; 4];
    r.read_exact(&mut scale)?;
    let activity_scale = u32::from_le_bytes(scale);
    let context = ContextParams {
        base_shift,
        activity_classes,
        activity_scale,
    };
    let mut cc = [0u8; 2];
    r.read_exact(&mut cc)?;
    let context_count = u16::from_le_bytes(cc) as usize;
    if context_count > 4096 {
        return Err(CodecError::InvalidStream("context count too large".into()));
    }
    let plane_count = alphabet_sizes.len();
    let mut planes = Vec::with_capacity(plane_count);
    for _ in 0..plane_count {
        let mut map = vec![0u8; context_count];
        r.read_exact(&mut map)?;
        let mut wi = [0u8; 1];
        r.read_exact(&mut wi)?;
        for &p in &map {
            if PredictorId::from_u8(p).is_none() {
                return Err(CodecError::InvalidStream(format!("bad predictor id {p}")));
            }
        }
        planes.push(PlaneModel {
            map,
            weight_index: wi[0],
        });
    }
    let mut pal = [0u8; 1];
    r.read_exact(&mut pal)?;
    let palette = if pal[0] == 1 {
        let mut n = [0u8; 4];
        r.read_exact(&mut n)?;
        let count = u32::from_le_bytes(n) as usize;
        if count == 0 || count > 256 {
            return Err(CodecError::InvalidStream("bad palette size".into()));
        }
        let mut colors = Vec::with_capacity(count);
        let mut triple = [0u8; 3];
        for _ in 0..count {
            r.read_exact(&mut triple)?;
            colors.push(triple);
        }
        Some(Palette {
            colors,
            indices: Vec::new(),
        })
    } else if pal[0] == 0 {
        None
    } else {
        return Err(CodecError::InvalidStream("bad palette flag".into()));
    };

    let mut st = [0u8; 1];
    r.read_exact(&mut st)?;
    let static_histograms = if st[0] == 1 {
        let mut per_plane: Vec<Vec<Option<Vec<(u32, u32)>>>> = Vec::new();
        for _ in 0..plane_count {
            let mut nc = [0u8; 2];
            r.read_exact(&mut nc)?;
            let non_empty = u16::from_le_bytes(nc) as usize;
            if non_empty > context_count {
                return Err(CodecError::InvalidStream("too many static contexts".into()));
            }
            let mut contexts: Vec<Option<Vec<(u32, u32)>>> = vec![None; context_count];
            for _ in 0..non_empty {
                let mut cid = [0u8; 2];
                r.read_exact(&mut cid)?;
                let cid = u16::from_le_bytes(cid) as usize;
                if cid >= context_count {
                    return Err(CodecError::InvalidStream("bad context id".into()));
                }
                let mut sc = [0u8; 2];
                r.read_exact(&mut sc)?;
                let symbol_count = u16::from_le_bytes(sc) as usize;
                if symbol_count == 0 || symbol_count > 2048 {
                    return Err(CodecError::InvalidStream("bad symbol count".into()));
                }
                let mut pairs = Vec::with_capacity(symbol_count);
                for _ in 0..symbol_count {
                    let mut p = [0u8; 4];
                    r.read_exact(&mut p)?;
                    let sym = u16::from_le_bytes([p[0], p[1]]) as u32;
                    let f = u16::from_le_bytes([p[2], p[3]]) as u32;
                    pairs.push((sym, f));
                }
                contexts[cid] = Some(pairs);
            }
            per_plane.push(contexts);
        }
        Some(per_plane)
    } else if st[0] == 0 {
        None
    } else {
        return Err(CodecError::InvalidStream("bad static-tables flag".into()));
    };

    let mut ch = [0u8; 1];
    r.read_exact(&mut ch)?;
    let capped_histograms = if ch[0] == 1 {
        let mut per_plane: Vec<Vec<Option<Vec<(u32, u32)>>>> = Vec::new();
        for _ in 0..plane_count {
            let mut nc = [0u8; 2];
            r.read_exact(&mut nc)?;
            let non_empty = u16::from_le_bytes(nc) as usize;
            if non_empty > context_count {
                return Err(CodecError::InvalidStream("too many capped contexts".into()));
            }
            let mut contexts: Vec<Option<Vec<(u32, u32)>>> = vec![None; context_count];
            for _ in 0..non_empty {
                let mut cid = [0u8; 2];
                r.read_exact(&mut cid)?;
                let cid = u16::from_le_bytes(cid) as usize;
                if cid >= context_count {
                    return Err(CodecError::InvalidStream("bad context id".into()));
                }
                let mut sc = [0u8; 2];
                r.read_exact(&mut sc)?;
                let symbol_count = u16::from_le_bytes(sc) as usize;
                if symbol_count == 0 || symbol_count > 2048 {
                    return Err(CodecError::InvalidStream("bad symbol count".into()));
                }
                let mut pairs = Vec::with_capacity(symbol_count);
                for _ in 0..symbol_count {
                    let mut p = [0u8; 4];
                    r.read_exact(&mut p)?;
                    let sym = u16::from_le_bytes([p[0], p[1]]) as u32;
                    let f = u16::from_le_bytes([p[2], p[3]]) as u32;
                    pairs.push((sym, f));
                }
                contexts[cid] = Some(pairs);
            }
            per_plane.push(contexts);
        }
        Some(per_plane)
    } else if ch[0] == 0 {
        None
    } else {
        return Err(CodecError::InvalidStream("bad capped-tables flag".into()));
    };

    let mut em = [0u8; 1];
    r.read_exact(&mut em)?;
    let entropy_mode = em[0];

    // R1 CMARC per-`(cid, bin)` static priors, appended after `entropy_mode`.
    let mut cp = [0u8; 1];
    r.read_exact(&mut cp)?;
    let cmarc_priors = if cp[0] == 1 {
        let mut per_plane: Vec<Vec<Option<Vec<(u32, u32, u32)>>>> = Vec::new();
        for _ in 0..plane_count {
            let mut nc = [0u8; 2];
            r.read_exact(&mut nc)?;
            let non_empty = u16::from_le_bytes(nc) as usize;
            if non_empty > context_count {
                return Err(CodecError::InvalidStream("too many cmarc contexts".into()));
            }
            let mut contexts: Vec<Option<Vec<(u32, u32, u32)>>> = vec![None; context_count];
            for _ in 0..non_empty {
                let mut cid = [0u8; 2];
                r.read_exact(&mut cid)?;
                let cid = u16::from_le_bytes(cid) as usize;
                if cid >= context_count {
                    return Err(CodecError::InvalidStream("bad cmarc context id".into()));
                }
                let mut sc = [0u8; 2];
                r.read_exact(&mut sc)?;
                let pair_count = u16::from_le_bytes(sc) as usize;
                if pair_count == 0 || pair_count > 8192 {
                    return Err(CodecError::InvalidStream("bad cmarc pair count".into()));
                }
                let mut pairs = Vec::with_capacity(pair_count);
                for _ in 0..pair_count {
                    let mut p = [0u8; 6];
                    r.read_exact(&mut p)?;
                    let bin = u16::from_le_bytes([p[0], p[1]]) as u32;
                    let n1 = u16::from_le_bytes([p[2], p[3]]) as u32;
                    let n0 = u16::from_le_bytes([p[4], p[5]]) as u32;
                    pairs.push((bin, n1, n0));
                }
                contexts[cid] = Some(pairs);
            }
            per_plane.push(contexts);
        }
        Some(per_plane)
    } else if cp[0] == 0 {
        None
    } else {
        return Err(CodecError::InvalidStream("bad cmarc-priors flag".into()));
    };

    // R2.1 cross-channel subtract-green flag, appended last so legacy readers
    // (and readers that stop earlier) still parse the model body.
    let mut xc = [0u8; 1];
    r.read_exact(&mut xc)?;
    let cross_channel = xc[0] != 0;

    // R3-A JPEG-LS DIFF residual-context flag for CMARC, appended after the
    // cross-channel flag so legacy readers still parse the model body.
    let mut rc = [0u8; 1];
    r.read_exact(&mut rc)?;
    let cmarc_residual_ctx = rc[0] != 0;
    let mut rc2 = [0u8; 1];
    r.read_exact(&mut rc2)?;
    let cmarc_run = rc2[0] != 0;

    // R11-D MA-tree-lite flag for CMARC, appended after the run-mode flag so
    // legacy readers still parse the model body.
    let mut rc3 = [0u8; 1];
    r.read_exact(&mut rc3)?;
    let cmarc_ma_context = rc3[0] != 0;

    // R6-B color-cache flag for CMARC, appended after the run-mode flag.
    let mut ccf = [0u8; 1];
    r.read_exact(&mut ccf)?;
    let cmarc_use_color_cache = ccf[0] != 0;

    // R9-B weighted-tree table, appended after the color-cache flag. Format mirrors
    // `write_model`: a flag byte, then per plane a flag byte and (if set) the leaf
    // count followed by the weight tuples.
    let mut wt_flag = [0u8; 1];
    r.read_exact(&mut wt_flag)?;
    let weighted_wc_table = if wt_flag[0] == 1 {
        let mut per_plane: Vec<Option<Vec<WLeaf>>> = Vec::with_capacity(plane_count);
        for _ in 0..plane_count {
            let mut pf = [0u8; 1];
            r.read_exact(&mut pf)?;
            if pf[0] == 1 {
                let mut lc = [0u8; 2];
                r.read_exact(&mut lc)?;
                let n = u16::from_le_bytes(lc) as usize;
                let mut table = Vec::with_capacity(n);
                for _ in 0..n {
                    let mut w0 = [0u8; 2];
                    r.read_exact(&mut w0)?;
                    let mut w1 = [0u8; 2];
                    r.read_exact(&mut w1)?;
                    let mut w2 = [0u8; 2];
                    r.read_exact(&mut w2)?;
                    let mut w3 = [0u8; 2];
                    r.read_exact(&mut w3)?;
                    let mut bias = [0u8; 2];
                    r.read_exact(&mut bias)?;
                    let mut s = [0u8; 1];
                    r.read_exact(&mut s)?;
                    table.push((
                        i16::from_le_bytes(w0),
                        i16::from_le_bytes(w1),
                        i16::from_le_bytes(w2),
                        i16::from_le_bytes(w3),
                        i16::from_le_bytes(bias),
                        s[0],
                    ));
                }
                per_plane.push(Some(table));
            } else if pf[0] == 0 {
                per_plane.push(None);
            } else {
                return Err(CodecError::InvalidStream("bad weighted-tree plane flag".into()));
            }
        }
        Some(per_plane)
    } else if wt_flag[0] == 0 {
        None
    } else {
        return Err(CodecError::InvalidStream("bad weighted-tree flag".into()));
    };

    // R13-A R13 leaf table, appended after the weighted-tree table. Format mirrors
    // `write_model`: a flag byte, then per plane a flag byte and (if set) the leaf
    // count followed by the `[i16; R13_DIM]` tuples.
    let mut r13_flag = [0u8; 1];
    r.read_exact(&mut r13_flag)?;
    let weighted_r13_table = if r13_flag[0] == 1 {
        let mut per_plane: Vec<Option<Vec<R13Leaf>>> = Vec::with_capacity(plane_count);
        for _ in 0..plane_count {
            let mut pf = [0u8; 1];
            r.read_exact(&mut pf)?;
            if pf[0] == 1 {
                let mut lc = [0u8; 2];
                r.read_exact(&mut lc)?;
                let n = u16::from_le_bytes(lc) as usize;
                let mut table = Vec::with_capacity(n);
                for _ in 0..n {
                    let mut leaf = [0i16; R13_DIM];
                    for m in 0..R13_DIM {
                        let mut v = [0u8; 2];
                        r.read_exact(&mut v)?;
                        leaf[m] = i16::from_le_bytes(v);
                    }
                    table.push(leaf);
                }
                per_plane.push(Some(table));
            } else if pf[0] == 0 {
                per_plane.push(None);
            } else {
                return Err(CodecError::InvalidStream("bad r13 plane flag".into()));
            }
        }
        Some(per_plane)
    } else if r13_flag[0] == 0 {
        None
    } else {
        return Err(CodecError::InvalidStream("bad r13 flag".into()));
    };

    // R10-A Squeeze levels and R10-B CFL scales, appended last in `write_model`.
    // `plane_count` (= `alphabet_sizes.len()`) gives the exact number of trailing
    // bytes, so no length prefix is needed.
    let mut squeeze_levels: Vec<u8> = Vec::with_capacity(plane_count);
    for _ in 0..plane_count {
        let mut b = [0u8; 1];
        r.read_exact(&mut b)?;
        squeeze_levels.push(b[0]);
    }
    let mut cfl_scale: Vec<Option<u8>> = Vec::with_capacity(plane_count);
    for _ in 0..plane_count {
        let mut b = [0u8; 1];
        r.read_exact(&mut b)?;
        cfl_scale.push(if b[0] == 0xFF { None } else { Some(b[0]) });
    }

    // R10 per-band value ranges (see `write_model`): a u32 count followed by
    // `(min as i16, max as i16)` pairs in band/stream order. An empty vector is
    // only produced by legacy writers; this build always emits it.
    let mut br_len = [0u8; 4];
    r.read_exact(&mut br_len)?;
    let br_len = u32::from_le_bytes(br_len) as usize;
    let mut band_ranges: Vec<PlaneRange> = Vec::with_capacity(br_len);
    for _ in 0..br_len {
        let mut mn = [0u8; 4];
        r.read_exact(&mut mn)?;
        let mut mx = [0u8; 4];
        r.read_exact(&mut mx)?;
        band_ranges.push(PlaneRange {
            min: i32::from_le_bytes(mn),
            max: i32::from_le_bytes(mx),
        });
    }

    // R12-A per-band model (appended last). A flag byte 0 means the non-squeezed
    // path; flag 1 is followed by a u32 band count, then per band a `context_count`
    // map and a weighted-tree table (flag + leaves), mirroring `write_model`.
    let mut r12_flag = [0u8; 1];
    r.read_exact(&mut r12_flag)?;
    let (band_maps, band_wc_table) = if r12_flag[0] == 1 {
        let mut nbuf = [0u8; 4];
        r.read_exact(&mut nbuf)?;
        let nb = u32::from_le_bytes(nbuf) as usize;
        let mut maps: Vec<Vec<u8>> = Vec::with_capacity(nb);
        let mut tables: Vec<Option<Vec<WLeaf>>> = Vec::with_capacity(nb);
        for _ in 0..nb {
            let mut map = vec![0u8; context_count];
            r.read_exact(&mut map)?;
            maps.push(map);
            let mut pf = [0u8; 1];
            r.read_exact(&mut pf)?;
            if pf[0] == 1 {
                let mut lc = [0u8; 2];
                r.read_exact(&mut lc)?;
                let n = u16::from_le_bytes(lc) as usize;
                let mut table = Vec::with_capacity(n);
                for _ in 0..n {
                    let mut w0 = [0u8; 2];
                    r.read_exact(&mut w0)?;
                    let mut w1 = [0u8; 2];
                    r.read_exact(&mut w1)?;
                    let mut w2 = [0u8; 2];
                    r.read_exact(&mut w2)?;
                    let mut w3 = [0u8; 2];
                    r.read_exact(&mut w3)?;
                    let mut bias = [0u8; 2];
                    r.read_exact(&mut bias)?;
                    let mut s = [0u8; 1];
                    r.read_exact(&mut s)?;
                    table.push((
                        i16::from_le_bytes(w0),
                        i16::from_le_bytes(w1),
                        i16::from_le_bytes(w2),
                        i16::from_le_bytes(w3),
                        i16::from_le_bytes(bias),
                        s[0],
                    ));
                }
                tables.push(Some(table));
            } else if pf[0] == 0 {
                tables.push(None);
            } else {
                return Err(CodecError::InvalidStream("bad r12 band table flag".into()));
            }
        }
        (Some(maps), Some(tables))
    } else if r12_flag[0] == 0 {
        (None, None)
    } else {
        return Err(CodecError::InvalidStream("bad r12 band flag".into()));
    };

    // R13-B: transform kind byte, appended last. Legacy streams (written before
    // this field existed) have no trailing byte; default to `Squeeze` so every
    // prior stream decodes byte-identically.
    let transform_kind = {
        let mut b = [0u8; 1];
        match r.read_exact(&mut b) {
            Ok(()) => {
                crate::transforms::TransformKind::from_u8(b[0]).unwrap_or(crate::transforms::TransformKind::Squeeze)
            }
            Err(_) => crate::transforms::TransformKind::Squeeze,
        }
    };

    // R14: rcct block (after `transform_kind`). A leading 0 means no rcct (legacy
    // or base codec); a 1 precedes the per-plane tree list.
    let mut rcct = None;
    let mut rb = [0u8; 1];
    if r.read_exact(&mut rb).is_ok() && rb[0] == 1 {
        let mut n = [0u8; 1];
        r.read_exact(&mut n)?;
        let mut trees: Vec<Option<RcctTree>> = Vec::with_capacity(n[0] as usize);
        for _ in 0..n[0] {
            let mut present = [0u8; 1];
            r.read_exact(&mut present)?;
            if present[0] == 0 {
                trees.push(None);
                continue;
            }
            let mut ncount = [0u8; 4];
            r.read_exact(&mut ncount)?;
            let nc = u32::from_le_bytes(ncount) as usize;
            let mut nodes = Vec::with_capacity(nc);
            for _ in 0..nc {
                let mut pb = [0u8; 1];
                r.read_exact(&mut pb)?;
                let mut tb = [0u8; 4];
                r.read_exact(&mut tb)?;
                let mut leb = [0u8; 4];
                r.read_exact(&mut leb)?;
                let mut gtb = [0u8; 4];
                r.read_exact(&mut gtb)?;
                nodes.push(RcctNode {
                    prop: pb[0],
                    thr: i32::from_le_bytes(tb),
                    le: u32::from_le_bytes(leb),
                    gt: u32::from_le_bytes(gtb),
                });
            }
            let mut lcount = [0u8; 4];
            r.read_exact(&mut lcount)?;
            let lc = u32::from_le_bytes(lcount) as usize;
            let mut leaves = Vec::with_capacity(lc);
            for _ in 0..lc {
                let mut leaf = [0i16; RCCT_DIM];
                for c in leaf.iter_mut() {
                    let mut cb = [0u8; 2];
                    r.read_exact(&mut cb)?;
                    *c = i16::from_le_bytes(cb);
                }
                leaves.push(leaf);
            }
            trees.push(Some(RcctTree { nodes, leaves }));
        }
        rcct = Some(trees);
    }

    // R15: nrp block (after `rcct`). A leading 0 means no nrp (legacy or base
    // codec); a 1 precedes the per-plane net list.
    let mut nrp: Option<Vec<Option<crate::predict::NrpNet>>> = None;
    let mut nb_flag = [0u8; 1];
    if r.read_exact(&mut nb_flag).is_ok() && nb_flag[0] == 1 {
        let mut n = [0u8; 1];
        r.read_exact(&mut n)?;
        let mut nets: Vec<Option<crate::predict::NrpNet>> = Vec::with_capacity(n[0] as usize);
        for _ in 0..n[0] {
            let mut present = [0u8; 1];
            r.read_exact(&mut present)?;
            if present[0] == 0 {
                nets.push(None);
                continue;
            }
            let mut hd = [0u8; 1];
            let mut dd = [0u8; 1];
            r.read_exact(&mut hd)?;
            r.read_exact(&mut dd)?;
            let h = hd[0] as usize;
            let d = dd[0] as usize;
            let mut w = vec![0i16; h * d];
            for x in w.iter_mut() {
                let mut cb = [0u8; 2];
                r.read_exact(&mut cb)?;
                *x = i16::from_le_bytes(cb);
            }
            let mut w_out = vec![0i16; h];
            for x in w_out.iter_mut() {
                let mut cb = [0u8; 2];
                r.read_exact(&mut cb)?;
                *x = i16::from_le_bytes(cb);
            }
            let mut b = vec![0i16; h + 1];
            for x in b.iter_mut() {
                let mut cb = [0u8; 2];
                r.read_exact(&mut cb)?;
                *x = i16::from_le_bytes(cb);
            }
            nets.push(Some(crate::predict::NrpNet { w, w_out, b }));
        }
        nrp = Some(nets);
    }

    Ok(ModelConfig {
        transform,
        cross_channel,
        palette,
        context,
        context_count,
        planes,
        weight_codebook: default_weight_codebook(),
        static_histograms,
        entropy_mode,
        capped_histograms,
        cmarc_priors,
        cmarc_residual_ctx,
        cmarc_run,
        cmarc_ma_context,
        cmarc_use_color_cache,
        weighted_wc_table,
        weighted_r13_table,
        squeeze_levels,
        transform_kind,
        cfl_scale,
        band_ranges,
        band_maps,
        band_wc_table,
        rcct,
        nrp,
    })
}

/// Build a per-plane, per-context rANS table set from static histograms.
pub fn build_static_tables(
    per_plane: &[Vec<Option<Vec<(u32, u32)>>>],
    alphabet_sizes: &[usize],
) -> Vec<Vec<Option<RansTable>>> {
    per_plane
        .iter()
        .enumerate()
        .map(|(pi, contexts)| {
            let a = alphabet_sizes[pi];
            contexts
                .iter()
                .map(|opt| {
                    opt.as_ref().map(|pairs| {
                        let mut hist = vec![0u32; a];
                        for &(s, f) in pairs {
                            if (s as usize) < a {
                                hist[s as usize] = f;
                            }
                        }
                        RansTable::new_static(&hist)
                    })
                })
                .collect()
        })
        .collect()
}

/// Default context params for a plane count.
pub fn default_context_params() -> ContextParams {
    ContextParams::default()
}

/// The per-plane value ranges for a channel layout and transform choice.
///
/// `cross_channel` is true when subtract-green was applied to the first three
/// planes (`R'=R-G, G'=G, B'=B-G`) before any color transform. With it the
/// plane ranges widen: a bare subtract-green keeps green in `[0,255]` but
/// pushes the two chroma deltas to `[-255,255]`; a subtract-green followed by
/// YCoCg-R stays within `[-1023,1023]` (conservative, exact-bounding). Both
/// encoder and decoder compute these identically from `(channels, transform,
/// cross_channel)`, so the declared ranges are always an upper bound on the
/// real plane values and the predictor clamping stays correct.
pub fn plane_ranges(
    channels: Channels,
    transform: TransformChoice,
    palette_max: Option<u32>,
    cross_channel: bool,
) -> Vec<PlaneRange> {
    if let Some(mx) = palette_max {
        return vec![PlaneRange::index(mx)];
    }
    if cross_channel {
        // Subtract-green widens the chroma-delto planes; we return conservatively
        // bounding ranges so clamping/residual sizing is always correct.
        let mut ranges = vec![
            PlaneRange { min: -1023, max: 1023 },
            PlaneRange { min: -1023, max: 1023 },
            PlaneRange { min: -1023, max: 1023 },
        ];
        if transform == TransformChoice::None {
            // Subtract-green only: green is preserved in [0,255].
            ranges[1] = PlaneRange::U8;
        }
        if channels == Channels::Rgba {
            ranges.push(PlaneRange::U8);
        }
        return ranges;
    }
    match channels {
        Channels::Gray => vec![PlaneRange::U8],
        Channels::Rgb => match transform {
            TransformChoice::None => vec![PlaneRange::U8; 3],
            TransformChoice::YCoCgR => vec![PlaneRange::Y, PlaneRange::CO, PlaneRange::CG],
        },
        Channels::Rgba => match transform {
            TransformChoice::None => vec![PlaneRange::U8; 4],
            TransformChoice::YCoCgR => vec![
                PlaneRange::Y,
                PlaneRange::CO,
                PlaneRange::CG,
                PlaneRange::U8,
            ],
        },
    }
}

/// The rANS alphabet size per plane for a set of plane ranges.
pub fn alphabet_sizes(ranges: &[PlaneRange]) -> Vec<usize> {
    ranges
        .iter()
        .map(|r| Alphabet::for_range(r.min, r.max).size)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn model_roundtrip() {
        let context = ContextParams::default();
        let codebook = default_weight_codebook();
        let ranges = [PlaneRange::U8; 3];
        let width = 16;
        let height = 8;
        let planes: Vec<Vec<i16>> = (0..3)
            .map(|c| {
                (0..width * height)
                    .map(|i| ((i * (c + 3)) % 256) as i16)
                    .collect()
            })
            .collect();
        let model = analyze(&planes, &ranges, width, height, 5, &context, &codebook, false, false, None);
        let mut bytes = Vec::new();
        write_model(&mut bytes, &model).unwrap();
        let sizes = alphabet_sizes(&ranges);
        let back = read_model(&mut std::io::Cursor::new(bytes), &sizes).unwrap();
        assert_eq!(back.transform, model.transform);
        assert_eq!(back.planes, model.planes);
        assert_eq!(back.context_count, model.context_count);
    }

    #[test]
    fn r22_expanded_bank_selected_on_smooth() {
        // A smooth horizontal ramp gives the analysis pass a low-entropy residual
        // where the R2.2 expanded bank (true-motion / gradient / half-delta)
        // can beat the base 8 predictors. At effort >= 4 the chosen predictor
        // map must contain at least one R2.2 id (>= 8).
        let context = ContextParams::default();
        let codebook = default_weight_codebook();
        let range = PlaneRange::U8;
        let width = 64;
        let height = 64;
        let plane: Vec<i16> = (0..width * height)
            .map(|i| {
                let x = (i % width) as i16;
                let y = (i / width) as i16;
                (x + y) % 256
            })
            .collect();
        let model = analyze(
            &[plane],
            &[range],
            width,
            height,
            4,
            &context,
            &codebook,
            false,
            false,
            None,
        );
        let mut saw_expanded = false;
        for &p in &model.planes[0].map {
            if p >= 8 {
                saw_expanded = true;
            }
        }
        assert!(
            saw_expanded,
            "R2.2 expanded predictor bank should be selected somewhere on smooth content"
        );
    }

    #[test]
    fn static_model_roundtrip() {
        let context = ContextParams::default();
        let codebook = default_weight_codebook();
        let ranges = [PlaneRange::U8];
        let width = 32;
        let height = 32;
        let plane: Vec<i16> = (0..width * height)
            .map(|i| ((i * 7) % 256) as i16)
            .collect();
        let model = analyze(&[plane], &ranges, width, height, 7, &context, &codebook, false, false, None);
        assert!(model.static_histograms.is_some());
        let mut bytes = Vec::new();
        write_model(&mut bytes, &model).unwrap();
        let sizes = alphabet_sizes(&ranges);
        let back = read_model(&mut std::io::Cursor::new(bytes), &sizes).unwrap();
        assert!(back.static_histograms.is_some());
        let tables = build_static_tables(
            back.static_histograms.as_ref().unwrap(),
            &sizes,
        );
        assert_eq!(tables.len(), 1);
    }

    #[test]
    fn r9b_weighted_tree_selected_and_table_roundtrips() {
        // R9-B: on smooth structured content the per-fine-leaf least-squares
        // weighted predictor (`WeightedTree`) should be selected somewhere by the
        // analysis pass, and its table (when used) must serialize and deserialize
        // bit-exactly so the encoder and decoder agree on the weights.
        let context = ContextParams::default();
        let codebook = default_weight_codebook();
        let range = PlaneRange::U8;
        let width = 64;
        let height = 64;
        let plane: Vec<i16> = (0..width * height)
            .map(|i| {
                let x = (i % width) as i16;
                let y = (i / width) as i16;
                // Linear (non-wrapping) content: the per-leaf least-squares fit can
                // reproduce `v = x + y` exactly, beating the fixed predictors.
                (x + y) % 256
            })
            .collect();
        let model = analyze(&[plane], &[range], width, height, 4, &context, &codebook, false, false, None);
        let used = model
            .planes
            .iter()
            .flat_map(|p| p.map.iter())
            .any(|&p| p == PredictorId::WeightedTree.to_u8());
        assert!(used, "WeightedTree should be selected somewhere on smooth content");

        let table = model
            .weighted_tree_for(0)
            .expect("weighted-tree table present when WeightedTree is used");
        assert_eq!(table.len(), WC_LEAVES);
        for &(w0, w1, w2, w3, bias, s) in table {
            assert!(
                (-32768..=32767).contains(&w0)
                    && (-32768..=32767).contains(&w1)
                    && (-32768..=32767).contains(&w2)
                    && (-32768..=32767).contains(&w3)
                    && (-32768..=32767).contains(&bias)
            );
            assert!(s <= 12);
        }

        // Serialization round-trip of the full model (including the table).
        let mut bytes = Vec::new();
        write_model(&mut bytes, &model).unwrap();
        let sizes = alphabet_sizes(&[range]);
        let back = read_model(&mut std::io::Cursor::new(bytes), &sizes).unwrap();
        assert_eq!(back.weighted_tree_for(0), model.weighted_tree_for(0));
    }

    #[test]
    fn r9b_weighted_tree_full_roundtrip_bit_exact() {
        // End-to-end: encode then decode a synthetic gradient+edge RGB image at
        // effort 4 (where WeightedTree is a candidate) and confirm the output is
        // bit-exact. This exercises the locked encoder/decoder weighted-tree path.
        use crate::image::{Channels, Image};
        use crate::{decode, encode};
        let w = 48u32;
        let h = 40u32;
        let mut planes = vec![vec![0u8; (w * h) as usize]; 3];
        for y in 0..h as usize {
            for x in 0..w as usize {
                let idx = y * w as usize + x;
                planes[0][idx] = ((x + 2 * y) % 256) as u8;
                planes[1][idx] = ((x.wrapping_mul(3) ^ y) % 256) as u8;
                planes[2][idx] = (((x as i32 - 24).unsigned_abs() as u32 + y as u32) % 256) as u8;
            }
        }
        let img = Image {
            width: w,
            height: h,
            channels: Channels::Rgb,
            planes,
        };
        let (bytes, _stats) = encode(&img, 4).unwrap();
        let out = decode(&bytes).unwrap();
        assert_eq!(out.planes, img.planes, "R9-B WeightedTree roundtrip must be bit-exact");
    }

    #[test]
    fn nrp_training_reduces_ssr_on_learnable_residual() {
        // Verify the R15 trainer actually learns: given a base residual that is a
        // known (near-)linear function of the decode-available features, the
        // quantized integer net must strictly lower the residual SSR vs the base
        // `r0` (so `build_nrp_nets` returns `Some`). This proves the mechanism is
        // live and not inert on photographic content where the residual happens
        // to be near-incompressible.
        let width = 48;
        let height = 32;
        let n = width * height;
        let plane: Vec<i16> = (0..n).map(|i| ((i * 7 + (i / width) * 3) % 256) as i16).collect();
        let ranges = [PlaneRange { min: 0, max: 255 }; 1];
        let dims = [(width, height)];
        // Craft a learnable base residual that is a known function of the
        // neighbor pixels (bounded): r0 = 2*L - T + TL/32 + 5.
        let mut r0s = vec![vec![0i32; n]; 1];
        for y in 0..height {
            for x in 0..width {
                let idx = y * width + x;
                let nb = neighbors(&plane, x, y, width, height);
                let v = 2 * nb.l - nb.t + (nb.tl as i32) / 32 + 5;
                r0s[0][idx] = v;
            }
        }
        let nets = build_nrp_nets(&[plane.clone()], &r0s, &ranges, &dims);
        assert!(nets[0].is_some(), "R15 must learn the synthetic residual");
        // Integer SSR must be below the base (zero-net) SSR.
        let net = nets[0].as_ref().unwrap();
        let mut ss_base = 0i64;
        let mut ss_net = 0i64;
        for y in 0..height {
            for x in 0..width {
                let idx = y * width + x;
                let nb = neighbors(&plane, x, y, width, height);
                let e0 = [
                    if x > 0 { r0s[0][idx - 1] } else { 0 },
                    if y > 0 { r0s[0][idx - width] } else { 0 },
                    if x > 0 && y > 0 { r0s[0][idx - width - 1] } else { 0 },
                    if x + 1 < width && y > 0 { r0s[0][idx - width + 1] } else { 0 },
                ];
                let g1 = nb.l - nb.t;
                let g2 = nb.t - nb.tl;
                let g3 = nb.tl - nb.tr;
                let phi = nrp_features(&nb, &e0, g1, g2, g3);
                let f = nrp_forward(net, &phi, ranges[0]) as i64;
                let rv = r0s[0][idx];
                ss_base += (rv as i64) * (rv as i64);
                ss_net += (rv as i64 - f) * (rv as i64 - f);
            }
        }
        assert!(ss_net < ss_base, "R15 net must lower SSR: base={ss_base} net={ss_net}");
    }
}
