//! Causal predictor bank with border handling.
//!
//! Predictors operate on a plane of `i16` samples (see `color::PlaneRange`).
//! Every prediction is clamped to the plane's value range so residuals are
//! bounded and the signed zigzag alphabet is exact.

use crate::color::PlaneRange;

/// Causal neighborhood of a pixel in raster order.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Neighbors {
    pub l: i32,
    pub t: i32,
    pub tl: i32,
    pub tr: i32,
}

/// Predictor identities, mirrored in the model's predictor map bytes.
///
/// Ids 0..=7 are the original Obsidian bank (Left/Top/Tl/Tr/Avg/Med/GapLite/
/// Weighted). Ids 8..=16 are the R2.2 WebP/JPEG XL-style expansion (true-motion,
/// half-delta, gradient, and the six clamped add/subtract forms). Id 17 is the
/// R8-A signaling-free adaptive weighted predictor. Id 18 is the R9-B context-tree
/// weighted predictor (per-fine-leaf least-squares weights signaled in the model
/// section). Existing ids are preserved so every previously-produced stream still
/// decodes; the new ids only appear in streams whose analysis pass enabled them
/// (effort >= 4).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum PredictorId {
    Left = 0,
    Top = 1,
    Tl = 2,
    Tr = 3,
    Avg = 4,
    Med = 5,
    GapLite = 6,
    Weighted = 7,
    // ---- R2.2 expanded bank (WebP/JPEG XL-style) ----
    TrueMotion = 8,
    LPlusHalfTLMinusT = 9,
    Gradient2 = 10,
    AddLT = 11,
    AddLTL = 12,
    AddTLT = 13,
    SubLTL = 14,
    SubTLT = 15,
    SubTTR = 16,
    // ---- R8-A signaling-free adaptive weighted predictor (JPEG XL / WebP "weighted") ----
    // Deterministic from the causal neighborhood (no signaled weights), so it is a
    // strict superset of the fixed predictor candidates: the analysis pass selects
    // it per context only where it lowers the summed residual magnitude.
    AdaptiveWeighted = 17,
    // ---- R9-B context-tree weighted predictor (JPEG XL "weighted" at fine granularity) ----
    // Deterministic weight CONTEXT from the causal gradients (so encoder and decoder
    // agree with zero signaled bytes), but the actual 4 weights per leaf ARE
    // signaled in the model section as a tiny per-plane table (O(1) bytes, ~75/plane).
    // The analysis pass solves, per fine leaf, the least-squares optimal weights, so
    // this captures within-coarse-context variation R8-A's single fixed formula
    // cannot. Selected per context only where it lowers the summed residual.
    WeightedTree = 18,
    // ---- R13-A recursive self-correcting adaptive multi-tap predictor (TM-WP) ----
    // A genuine functional-form change over the 4-tap linear bank: the prediction is
    // a linear combination of an extended causal property vector (M=9 properties: the
    // four neighbors, the left-left / top-top longer-range samples, and three causal
    // gradients) whose per-context weights are RECURSIVELY updated online via LMS on
    // the residual. The base weights are a per-fine-leaf least-squares solve over the
    // (M+1)-tuple, signaled exactly like R9-B; the online update adds zero model
    // bytes (the decoder reconstructs the weight trajectory from the residual stream
    // by induction). A strict superset of every fixed/4-tap predictor: with zero
    // online updates it reduces to R9-B, so the never-expand net cannot regress.
    AdaptiveRecursive = 19,
}

pub const PREDICTOR_COUNT: usize = 20;

/// A per-leaf weight tuple for the R9-B `WeightedTree` predictor:
/// `(wL, wT, wTL, wTR, bias, shift)`. The prediction is
/// `round((wL*L + wT*T + wTL*TL + wTR*TR + bias) >> shift)`.
/// The `bias` term lets the fit reproduce smooth gradients (and the constant
/// offset that a pure linear combination of one-step-behind neighbors cannot).
pub type WLeaf = (i16, i16, i16, i16, i16, u8);

/// Number of fine weight-context leaves for `WeightedTree`. Small (JPEG XL uses
/// 8-15), so the per-plane table is ~`WC_LEAVES * 6` bytes (O(1), amortized over
/// millions of pixels) - the decisive difference from the R7-A blowup (which added
/// a codebook index per coarse context, hundreds of bytes/image).
pub const WC_LEAVES: usize = 15;

/// Minimum samples in a leaf before its least-squares solve is trusted; smaller
/// leaves fall back to `UNIT_LEAF` (LOCO-I L+T average) so no leaf diverges.
pub const WC_MIN_SAMPLES: usize = 64;

/// The neutral leaf weight (LOCO-I `L+T` average): `8*L + 8*T + 0 + 0 >> 4`.
pub const UNIT_LEAF: WLeaf = (8, 8, 0, 0, 0, 4);

impl PredictorId {
    pub fn from_u8(v: u8) -> Option<PredictorId> {
        match v {
            0 => Some(PredictorId::Left),
            1 => Some(PredictorId::Top),
            2 => Some(PredictorId::Tl),
            3 => Some(PredictorId::Tr),
            4 => Some(PredictorId::Avg),
            5 => Some(PredictorId::Med),
            6 => Some(PredictorId::GapLite),
            7 => Some(PredictorId::Weighted),
            8 => Some(PredictorId::TrueMotion),
            9 => Some(PredictorId::LPlusHalfTLMinusT),
            10 => Some(PredictorId::Gradient2),
            11 => Some(PredictorId::AddLT),
            12 => Some(PredictorId::AddLTL),
            13 => Some(PredictorId::AddTLT),
            14 => Some(PredictorId::SubLTL),
            15 => Some(PredictorId::SubTLT),
            16 => Some(PredictorId::SubTTR),
            17 => Some(PredictorId::AdaptiveWeighted),
            18 => Some(PredictorId::WeightedTree),
            19 => Some(PredictorId::AdaptiveRecursive),
            _ => None,
        }
    }

    pub fn to_u8(self) -> u8 {
        self as u8
    }

    pub fn name(self) -> &'static str {
        match self {
            PredictorId::Left => "Left",
            PredictorId::Top => "Top",
            PredictorId::Tl => "TL",
            PredictorId::Tr => "TR",
            PredictorId::Avg => "Avg",
            PredictorId::Med => "MED",
            PredictorId::GapLite => "GAP-lite",
            PredictorId::Weighted => "Weighted",
            PredictorId::TrueMotion => "TrueMotion",
            PredictorId::LPlusHalfTLMinusT => "L+(TL-T)/2",
            PredictorId::Gradient2 => "Grad2",
            PredictorId::AddLT => "Add(L,T)",
            PredictorId::AddLTL => "Add(L,TL)",
            PredictorId::AddTLT => "Add(TL,T)",
            PredictorId::SubLTL => "Sub(L,TL)",
            PredictorId::SubTLT => "Sub(TL,T)",
            PredictorId::SubTTR => "Sub(T,TR)",
            PredictorId::AdaptiveWeighted => "AdaptiveWeighted",
            PredictorId::WeightedTree => "WeightedTree",
            PredictorId::AdaptiveRecursive => "AdaptiveRecursive",
        }
    }

    /// Map a human-readable name back to a `PredictorId` (used by the CLI
    /// `--predictor` measurement seam). Returns `None` for unknown names so the
    /// caller can fall back to the default analyzer.
    pub fn from_name(s: &str) -> Option<PredictorId> {
        match s {
            "Left" => Some(PredictorId::Left),
            "Top" => Some(PredictorId::Top),
            "TL" => Some(PredictorId::Tl),
            "TR" => Some(PredictorId::Tr),
            "Avg" => Some(PredictorId::Avg),
            "MED" => Some(PredictorId::Med),
            "GAP-lite" => Some(PredictorId::GapLite),
            "Weighted" => Some(PredictorId::Weighted),
            "TrueMotion" => Some(PredictorId::TrueMotion),
            "L+(TL-T)/2" => Some(PredictorId::LPlusHalfTLMinusT),
            "Grad2" => Some(PredictorId::Gradient2),
            "Add(L,T)" => Some(PredictorId::AddLT),
            "Add(L,TL)" => Some(PredictorId::AddLTL),
            "Add(TL,T)" => Some(PredictorId::AddTLT),
            "Sub(L,TL)" => Some(PredictorId::SubLTL),
            "Sub(TL,T)" => Some(PredictorId::SubTLT),
            "Sub(T,TR)" => Some(PredictorId::SubTTR),
            "AdaptiveWeighted" => Some(PredictorId::AdaptiveWeighted),
            "WeightedTree" => Some(PredictorId::WeightedTree),
            "AdaptiveRecursive" => Some(PredictorId::AdaptiveRecursive),
            _ => None,
        }
    }
}

/// A weight vector for the Weighted predictor: `clamp_round((wL*L + wT*T +
/// wTL*TL + wTR*TR) >> shift)`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct WeightVec {
    pub wl: i16,
    pub wt: i16,
    pub wtl: i16,
    pub wtr: i16,
    pub shift: u8,
}

/// The default weight codebook searched by the analysis pass for the Weighted
/// predictor (effort >= 4). Sums are chosen around 16 so `shift = 4` gives a
/// near-unit scaling.
pub fn default_weight_codebook() -> Vec<WeightVec> {
    let v = |wl: i16, wt: i16, wtl: i16, wtr: i16| WeightVec {
        wl,
        wt,
        wtl,
        wtr,
        shift: 4,
    };
    vec![
        v(8, 8, 0, 0),
        v(10, 6, 0, 0),
        v(6, 10, 0, 0),
        v(12, 4, 0, 0),
        v(4, 12, 0, 0),
        v(9, 9, -2, 0),
        v(11, 7, -2, 0),
        v(7, 11, -2, 0),
        v(8, 8, 0, -2),
        v(10, 6, 0, -2),
        v(6, 10, 0, -2),
        v(9, 9, -2, -2),
        v(12, 8, -4, 0),
        v(8, 12, -4, 0),
        v(14, 6, -4, 0),
        v(6, 14, -4, 0),
    ]
}

/// Compute the causal neighborhood for pixel `(x, y)` in a `width x height`
/// plane, applying the border rules from the spec (out-of-bounds neighbors
/// clamp to the nearest valid pixel). The top row and left column use the
/// spec's "else 0" fallback: a streaming decoder cannot know the current
/// pixel's value before decoding it, so `T = TL = TR = 0` on the top row and
/// `L = 0` on the left column, and the encoder uses the same values to stay
/// in lockstep.
pub fn neighbors(plane: &[i16], x: usize, y: usize, width: usize, _height: usize) -> Neighbors {
    let at = |xx: usize, yy: usize| plane[yy * width + xx] as i32;
    if y == 0 {
        // Top row: nothing decoded above. The left neighbor is known for x > 0.
        let l = if x == 0 { 0 } else { at(x - 1, 0) };
        Neighbors {
            l,
            t: 0,
            tl: 0,
            tr: 0,
        }
    } else if x == 0 {
        // Left column: no decoded left neighbor; T/TL clamp to the pixel above.
        // TR clamps to the nearest valid pixel too: for a width-1 plane there is
        // no column 1, so TR falls back to the pixel directly above (T). Reading
        // `at(1, y - 1)` unbounded would alias index `(y - 1) * width + 1 == y`,
        // i.e. the CURRENT pixel, which the decoder cannot know yet and would
        // break encoder/decoder lockstep.
        let trx = 1.min(width - 1);
        Neighbors {
            l: 0,
            t: at(0, y - 1),
            tl: at(0, y - 1),
            tr: at(trx, y - 1),
        }
    } else {
        let ly = y - 1;
        let rx = (x + 1).min(width - 1);
        Neighbors {
            l: at(x - 1, y),
            t: at(x, ly),
            tl: at(x - 1, ly),
            tr: at(rx, ly),
        }
    }
}

/// Gain (right-shift) for the M3-B online weight update (see `WeightVec::adapt_online`).
/// Chosen so a typical residual/neighbor product (~1e4) yields a per-step
/// weight change of ~1, letting the per-context weight converge to a
/// least-squares-ish optimum without overshooting its small natural scale
/// (the weights sum to ~16 so `shift = 4` gives near-unit scaling).
pub const M3_WP_GAIN: u32 = 13;
/// Clamp bounds for the online-adapted weights (the codebook weights live in
/// roughly [-16, 16], so this leaves generous headroom for convergence).
pub const WEIGHT_MIN: i16 = -48;
pub const WEIGHT_MAX: i16 = 48;

impl WeightVec {
    /// A neutral predictor weight (near the LOCO-I `L+T` average), used to seed
    /// the per-context weight table when a plane has no learned codebook entry.
    pub fn unit() -> WeightVec {
        WeightVec {
            wl: 8,
            wt: 8,
            wtl: 0,
            wtr: 0,
            shift: 4,
        }
    }

    /// M3-B: mirrored online self-correction of the weighted predictor.
    ///
    /// This is a single stochastic-gradient step on the *squared* residual
    /// `r = v - pred` (so the encoder and decoder, which both observe the
    /// identical `r` and neighborhood, evolve the weight vector in lockstep
    /// with zero signaled bytes). The gradient of `0.5 * r^2` w.r.t. `w_k` is
    /// `-r * n_k`, hence the additive update `w_k += lr * r * n_k` (here the
    /// learning rate is the fixed right-shift `M3_WP_GAIN`). Because both sides
    /// start from the same per-plane codebook weight and apply the same update
    /// on the same sequence of residuals, the per-context weights stay equal
    /// throughout the plane and no expansion is possible.
    pub fn adapt_online(&mut self, r: i32, l: i32, t: i32, tl: i32, tr: i32, gain: u32) {
        let upd = |w: i16, n: i32| -> i16 {
            let d = ((r as i64) * (n as i64)) >> gain;
            let s = w as i64 + d;
            s.clamp(WEIGHT_MIN as i64, WEIGHT_MAX as i64) as i16
        };
        self.wl = upd(self.wl, l);
        self.wt = upd(self.wt, t);
        self.wtl = upd(self.wtl, tl);
        self.wtr = upd(self.wtr, tr);
    }
}

/// Compute the prediction for a pixel given its neighborhood. The caller
/// clamps to the plane's value range.
///
/// `wtree` carries the per-plane R9-B weighted-tree table (a `WC_LEAVES`-entry
/// slice of `(wL,wT,wTL,wTR,bias,shift)` tuples). It is only consulted for the
/// `WeightedTree` predictor; all other predictors ignore it. Supplying `None`
/// for `WeightedTree` falls back to the left neighbor (deterministic, so encode
/// and decode still agree - they just both get a useless prediction).
pub fn predict(id: PredictorId, n: &Neighbors, w: Option<&WeightVec>, wtree: Option<&[WLeaf]>) -> i32 {
    match id {
        PredictorId::Left => n.l,
        PredictorId::Top => n.t,
        PredictorId::Tl => n.tl,
        PredictorId::Tr => n.tr,
        PredictorId::Avg => (n.l + n.t) >> 1,
        PredictorId::Med => med(n),
        PredictorId::GapLite => gap_lite(n),
        PredictorId::TrueMotion => n.l + n.t - n.tl,
        PredictorId::LPlusHalfTLMinusT => n.l + (n.tl - n.t) / 2,
        PredictorId::Gradient2 => (n.l + n.t) / 2 + (n.tl - n.tr) / 2,
        // The six clamped add/subtract forms are raw integer arithmetic; the
        // caller's `predict_clamped` clamps the result to the plane's value
        // range, mirroring WebP's `Clip` semantics. The predictor is a function
        // of the causal neighborhood alone, so encoder and decoder agree.
        PredictorId::AddLT => n.l + n.t,
        PredictorId::AddLTL => n.l + n.tl,
        PredictorId::AddTLT => n.tl + n.t,
        PredictorId::SubLTL => n.l - n.tl,
        PredictorId::SubTLT => n.tl - n.t,
        PredictorId::SubTTR => n.t - n.tr,
        PredictorId::AdaptiveWeighted => weighted_adaptive(n),
        PredictorId::Weighted => {
            let w = match w {
                Some(w) => w,
                None => return n.l,
            };
            weighted(n, w)
        }
        PredictorId::WeightedTree => match wtree {
            Some(table) => predict_weighted_tree(n, table),
            None => n.l,
        },
        // R13-A is handled by the coding loops directly via `r13_predict`/`r13_adapt`
        // (it needs the per-context weight state and the plane slice). This defensive
        // fallback keeps `predict` total; the loops never reach it for AdaptiveRecursive.
        PredictorId::AdaptiveRecursive => n.l,
    }
}

/// R9-B: the fine weight context, a pure function of the already-decoded causal
/// neighborhood (so encoder and decoder compute it identically with zero signaled
/// bytes). Three causal gradients, each quantized to 3 tiers (zero / small / large),
/// packed into a 27-cell raw index then folded into `WC_LEAVES` leaves. Identical
/// leaves group pixels with similar local structure, so the per-leaf least-squares
/// weights specialize to the local image statistics.
pub fn weight_context(n: &Neighbors) -> usize {
    let gh = n.l - n.tl; // horizontal gradient
    let gv = n.t - n.tl; // vertical gradient
    let gd = n.tl - n.tr; // diagonal gradient
    let q = |g: i32| -> usize {
        match g.unsigned_abs() {
            0 => 0,
            a if a <= 8 => 1,
            _ => 2,
        }
    };
    let raw = q(gh) * 9 + q(gv) * 3 + q(gd); // 0..26
    raw % WC_LEAVES
}

/// R9-B: predict with the per-leaf weighted-tree table. `wc = weight_context(n)`
/// selects the leaf; the prediction is the (clamped, shifted) dot product of the
/// four causal neighbors with the leaf's weights. Deterministic given `n` and the
/// table, so encoder/decoder lockstep is exact with zero online state.
pub fn predict_weighted_tree(n: &Neighbors, table: &[WLeaf]) -> i32 {
    let wc = weight_context(n) % table.len().max(1);
    let (w0, w1, w2, w3, bias, s) = table[wc];
    let acc = (w0 as i32) * n.l
        + (w1 as i32) * n.t
        + (w2 as i32) * n.tl
        + (w3 as i32) * n.tr
        + bias as i32;
    let shift = s as u32;
    if shift == 0 {
        return acc;
    }
    let half = 1i32 << (shift - 1);
    (acc + half) >> shift
}

/// R9-B: solve the per-leaf least-squares weights from accumulated 5x5 normal
/// equations `S` and RHS `b` (sums of outer products of `(L,T,TL,TR,1)` and of
/// `v*(L,T,TL,TR,1)` respectively), returning an unconstrained integer
/// `(wL,wT,wTL,wTR,bias,shift)` tuple, or `None` if the system is ill-conditioned
/// (caller falls back to `UNIT_LEAF`). The 5th basis term is a constant bias.
///
/// The weights are NOT forced to sum to a power of two: the fit is
/// `v ~ wL*L + wT*T + wTL*TL + wTR*TR + bias`, solved in the natural scale so that
/// `w . n + bias` actually reproduces `v`. The shift `s` is chosen independently so
/// the largest spatial weight sits near `2^10` (preserving fractional precision
/// while staying safely in `i16`); the prediction is `round((w . n + bias) / 2^s)`.
/// A small ridge term keeps the solve stable on near-singular leaves.
pub fn solve_weighted_tree(s: &[[i64; 5]; 5], b: &[i64; 5]) -> Option<WLeaf> {
    const RIDGE: i64 = 8;
    let mut a = *s;
    for i in 0..5 {
        a[i][i] += RIDGE;
    }
    // Gauss-Jordan on f64 for robustness (analysis runs on the host, not the stream).
    let mut m = [[0f64; 5]; 5];
    for i in 0..5 {
        for j in 0..5 {
            m[i][j] = a[i][j] as f64;
        }
    }
    let mut rhs = [0f64; 5];
    for i in 0..5 {
        rhs[i] = b[i] as f64;
    }
    for col in 0..5 {
        let mut piv = col;
        let mut best = m[col][col].abs();
        for r in (col + 1)..5 {
            if m[r][col].abs() > best {
                best = m[r][col].abs();
                piv = r;
            }
        }
        if best < 1e-9 {
            return None;
        }
        m.swap(col, piv);
        rhs.swap(col, piv);
        let d = m[col][col];
        for j in col..5 {
            m[col][j] /= d;
        }
        rhs[col] /= d;
        for r in 0..5 {
            if r != col {
                let f = m[r][col];
                for j in col..5 {
                    m[r][j] -= f * m[col][j];
                }
                rhs[r] -= f * rhs[col];
            }
        }
    }
    let w = rhs; // solution x = m^{-1} b (m is now I)
    let maxw = w[0].abs().max(w[1].abs()).max(w[2].abs()).max(w[3].abs());
    if maxw < 1e-9 {
        return None;
    }
    // Independent shift: scale the largest spatial weight to ~2^10 so fractional
    // is preserved while the stored weights stay within i16.
    let s = ((1024.0 / maxw).ln() / std::f64::consts::LN_2)
        .round()
        .clamp(0.0, 12.0) as u32;
    let scale = (1u64 << s) as f64;
    let wi: Vec<i32> = w
        .iter()
        .map(|x| (x * scale).round().clamp(i32::MIN as f64, i32::MAX as f64) as i32)
        .collect();
    if wi[0] == 0 && wi[1] == 0 && wi[2] == 0 && wi[3] == 0 {
        return None;
    }
    // `wi[4]` is the bias, stored in the same scaled units so it joins the dot
    // product before the shift.
    Some((
        wi[0].clamp(i16::MIN as i32, i16::MAX as i32) as i16,
        wi[1].clamp(i16::MIN as i32, i16::MAX as i32) as i16,
        wi[2].clamp(i16::MIN as i32, i16::MAX as i32) as i16,
        wi[3].clamp(i16::MIN as i32, i16::MAX as i32) as i16,
        wi[4].clamp(i16::MIN as i32, i16::MAX as i32) as i16,
        s as u8,
    ))
}

fn med(n: &Neighbors) -> i32 {
    if n.tl >= n.l.max(n.t) {
        n.l.min(n.t)
    } else if n.tl <= n.l.min(n.t) {
        n.l.max(n.t)
    } else {
        n.l + n.t - n.tl
    }
}

/// LOCO-I gradient-adjusted predictor (GAP), edge-conditioned average form.
///
/// When a strong vertical/horizontal edge is detected the prediction snaps to
/// the orthogonal neighbor; otherwise it blends left, top, and the diagonal
/// (`(L + T) / 2 + (TR - TL) / 4`). This is the textbook GAP that drives
/// JPEG-LS and consistently beats MED on natural imagery.
fn gap_lite(n: &Neighbors) -> i32 {
    let dh = (n.l - n.tl).abs();
    let dv = (n.t - n.tl).abs();
    if dv - dh > 80 {
        return n.t;
    }
    if dh - dv > 80 {
        return n.l;
    }
    (n.l + n.t) / 2 + (n.tr - n.tl) / 4
}

fn weighted(n: &Neighbors, w: &WeightVec) -> i32 {
    let acc = (w.wl as i32) * n.l + (w.wt as i32) * n.t + (w.wtl as i32) * n.tl + (w.wtr as i32) * n.tr;
    let shift = w.shift as u32;
    let half = 1i32 << (shift - 1);
    (acc + half) >> shift
}

// ===== R13-A: recursive self-correcting adaptive multi-tap predictor (TM-WP) =====
//
// A genuine functional-form change over the 4-tap linear bank: the prediction is a
// linear combination of an extended causal property vector (M=9 properties: the four
// neighbors, the left-left / top-top longer-range samples, and three causal gradients)
// whose per-context weights are RECURSIVELY updated online via LMS on the residual.
// The base weights are a per-fine-leaf least-squares solve over the (M+1)-tuple,
// signaled exactly like R9-B; the online update adds zero model bytes (the decoder
// reconstructs the weight trajectory from the residual stream by induction). A strict
// superset of every fixed/4-tap predictor: with zero online updates it reduces to R9-B,
// so the never-expand net cannot regress.

/// Number of causal properties feeding the R13-A predictor (see `r13_properties`).
pub const R13_M: usize = 9;
/// Total weight-vector dimension: `R13_M` property weights plus one bias term.
pub const R13_DIM: usize = R13_M + 1;
/// Fixed right-shift applied to the dot product so stored weights live near unity
/// scale and the residual stays in `i32`. Mirrors JPEG XL's scaled weighted predictor.
pub const R13_SHIFT: u32 = 10;
/// Bias learning scale `SCALE_B` (the bias gradient is `r * R13_SCALED_B`).
pub const R13_SCALED_B: i32 = 1;
/// Online LMS learning-rate right-shift (reuses the M3-B gain schedule as a start).
pub const R13_GAIN: u32 = M3_WP_GAIN;
/// Clamp bounds for the per-context property weights (i16-storable, with headroom for
/// the LMS convergence). Weights live in the `>> R13_SHIFT` scaled domain.
pub const R13_WMIN: i32 = -32767;
pub const R13_WMAX: i32 = 32767;
/// Clamp bounds for the bias term (same scaled domain, i16-storable).
pub const R13_BMIN: i32 = -32767;
pub const R13_BMAX: i32 = 32767;

/// The runtime per-context weight vector (i32 so LMS updates never overflow before the
/// clamp; the signaled base leaf is the i16 `R13Leaf`).
pub type R13State = [i32; R13_DIM];
/// The signaled per-fine-leaf base weight tuple for R13-A: `(w for p1..p9, bias)`.
pub type R13Leaf = [i16; R13_DIM];

/// The neutral R13-A leaf: the LOCO-I `L+T` average extended to the (M+1) basis,
/// `wL = wT = 8 << (R13_SHIFT-4) = 512`, rest 0, bias 0, so `predict = (L+T)/2`.
pub const R13_NEUTRAL: R13Leaf = [512, 512, 0, 0, 0, 0, 0, 0, 0, 0];

/// Compute the R13-A extended causal property vector for pixel `(x,y)` in a
/// `width x height` plane. All nine properties are computable from already-decoded
/// samples (so the decoder reconstructs them identically). Out-of-bounds longer-range
/// samples use the same `0` border rule as `neighbors` (above/left are 0).
pub fn r13_properties(
    n: &Neighbors,
    plane: &[i16],
    x: usize,
    y: usize,
    width: usize,
    _height: usize,
) -> [i32; R13_M] {
    let l2 = if x >= 2 { plane[(x - 2) + y * width] as i32 } else { 0 };
    let t2 = if y >= 2 { plane[x + (y - 2) * width] as i32 } else { 0 };
    [
        n.l,
        n.t,
        n.tl,
        n.tr,
        l2,
        t2,
        n.l - n.tl,
        n.t - n.tl,
        n.tl - n.tr,
    ]
}

/// R13-A prediction from a weight vector: `round((bias + sum w_m*prop_m) >> R13_SHIFT)`,
/// clamped to the plane range.
pub fn predict_recursive(w: &R13State, props: &[i32; R13_M], range: PlaneRange) -> i32 {
    let mut acc: i64 = w[9] as i64;
    for m in 0..R13_M {
        acc += (w[m] as i64) * (props[m] as i64);
    }
    if R13_SHIFT == 0 {
        return range.clamp(acc as i32);
    }
    let half = 1i64 << (R13_SHIFT - 1);
    range.clamp(((acc + half) >> R13_SHIFT) as i32)
}

/// R13-A online LMS weight update (the functional-form change). After each pixel the
/// per-context weights move toward the local least-squares optimum of the held-out
/// stream, tracking local structure. Pure function of `(r, props)`, so encoder and
/// decoder evolve the weight vector identically with zero signaled bytes.
pub fn adapt_recursive(w: &mut R13State, r: i32, props: &[i32; R13_M]) {
    for m in 0..R13_M {
        let d = ((r as i64) * (props[m] as i64)) >> R13_GAIN;
        let s = (w[m] as i64) + d;
        w[m] = s.clamp(R13_WMIN as i64, R13_WMAX as i64) as i32;
    }
    let db = ((r as i64) * (R13_SCALED_B as i64)) >> R13_GAIN;
    let sb = (w[9] as i64) + db;
    w[9] = sb.clamp(R13_BMIN as i64, R13_BMAX as i64) as i32;
}

/// Build the per-fine-leaf seeded R13-A weight state for a plane from a signaled table.
/// `table` is the `WC_LEAVES` base leaves (or `None` when `AdaptiveRecursive` is unused
/// on this plane); the returned state is keyed by `weight_context` leaf.
pub fn r13_seed_state(table: Option<&[R13Leaf]>) -> Vec<R13State> {
    let mut st = Vec::with_capacity(WC_LEAVES);
    for wc in 0..WC_LEAVES {
        let mut leaf = [0i32; R13_DIM];
        if let Some(t) = table {
            for m in 0..R13_DIM {
                leaf[m] = t[wc][m] as i32;
            }
        } else {
            for m in 0..R13_DIM {
                leaf[m] = R13_NEUTRAL[m] as i32;
            }
        }
        st.push(leaf);
    }
    st
}

/// R13-A solve the per-leaf least-squares weights from accumulated `(M+1)x(M+1)` normal
/// equations `S` and RHS `b` (sums of outer products of `(p1..p9, 1)` and of
/// `v*(p1..p9, 1)`), returning an integer `(w1..w9, bias)` tuple in the `>> R13_SHIFT`
/// scaled domain, or `None` if the system is ill-conditioned. Generalizes
/// `solve_weighted_tree` from the 4-tuple to the `(M+1)`-tuple, with a fixed shift.
pub fn solve_r13_least_squares(
    s: &[[i64; R13_DIM]; R13_DIM],
    b: &[i64; R13_DIM],
) -> Option<R13Leaf> {
    let n = R13_DIM;
    let mut a = *s;
    // Ridge (Tikhonov) regularization, scaled to the normal-matrix magnitude. The
    // raw normal equations sum `ns[i]*ns[j]` over every pixel, so their entries
    // reach ~1e9 on photographic content; a fixed small ridge (e.g. 8) is
    // completely drowned and leaves the system ill-conditioned, which makes the
    // least-squares weight direction unstable (tiny feature correlations flip the
    // solution, exploding predictions). Load the diagonal with a fraction of the
    // mean diagonal so the solve stays well-posed regardless of image scale.
    let tr: i64 = (0..n).map(|i| a[i][i]).sum();
    let ridge = (tr / (n as i64)).max(1) / 32 + 8;
    for i in 0..n {
        a[i][i] += ridge;
    }
    let mut m = [[0f64; R13_DIM]; R13_DIM];
    for i in 0..n {
        for j in 0..n {
            m[i][j] = a[i][j] as f64;
        }
    }
    let mut rhs = [0f64; R13_DIM];
    for i in 0..n {
        rhs[i] = b[i] as f64;
    }
    for col in 0..n {
        let mut piv = col;
        let mut best = m[col][col].abs();
        for r in (col + 1)..n {
            if m[r][col].abs() > best {
                best = m[r][col].abs();
                piv = r;
            }
        }
        if best < 1e-9 {
            return None;
        }
        m.swap(col, piv);
        rhs.swap(col, piv);
        let d = m[col][col];
        for j in col..n {
            m[col][j] /= d;
        }
        rhs[col] /= d;
        for r in 0..n {
            if r != col {
                let f = m[r][col];
                for j in col..n {
                    m[r][j] -= f * m[col][j];
                }
                rhs[r] -= f * rhs[col];
            }
        }
    }
    let w = rhs;
    let mut maxw = 0f64;
    for k in 0..R13_DIM {
        maxw = maxw.max(w[k].abs());
    }
    if maxw < 1e-9 {
        return None;
    }
    // Store the weights scaled by `1 << R13_SHIFT` (NOT normalized by `maxw`):
    // the predictor recovers `round((w . n + bias) / 2^s)`, so the leaf must encode
    // the true OLS coefficient magnitude. Dividing by `maxw` here would shrink every
    // weight by the largest single coefficient, and the subsequent `>> R13_SHIFT`
    // would then divide the prediction by `maxw` again, exploding predictions when
    // the optimal weight vector spreads across the near-collinear feature columns
    // (a small `maxw` amplifies the output). OLS coefficients for these features are
    // O(1), so the `1<<SHIFT` scale fits comfortably in `i16`.
    let scale = (1i64 << R13_SHIFT) as f64;
    let mut leaf = [0i16; R13_DIM];
    for k in 0..R13_DIM {
        leaf[k] = (w[k] * scale).round().clamp(i16::MIN as f64, i16::MAX as f64) as i16;
    }
    if leaf[0] == 0 && leaf[1] == 0 && leaf[2] == 0 && leaf[3] == 0 && leaf[9] == 0 {
        return None;
    }
    Some(leaf)
}

// ===== R14: residual-conditioned context tree (RCCT) with a multiplier-additive
// (MA) residual model (the JPEG XL 8.71 gate) =====
//
// Every prior Obsidian predictor predicted the pixel as a function of neighbor
// *pixel values* (and/or refined the entropy *context*). R14 instead predicts the
// *residual* as a function of the decode-available base errors `e0` of the four
// causal neighbors, through an adaptively-partitioned decision tree whose leaves
// carry a small MA linear model `r_pred = a + sum_k b_k * p_k`. The coder emits
// the residual-of-residual `epsilon = r0 - r_pred` (where `r0 = v - P0` is the
// base residual of the existing per-context pixel predictor `P0`) and the decoder
// reconstructs `v = P0 + r_pred + epsilon`. This is exactly the mechanism behind
// JPEG XL's modular mode and FLIF, and it is a strict superset overlay on the
// production predictor: with a depth-0 tree (`r_pred = 0`) the stream is
// byte-identical to the current codec, so the never-expand net cannot regress.

/// Number of causal properties feeding the R14 MA leaf model (see `rcct_properties`).
pub const RCCT_K: usize = 10;
/// Total MA coefficient dimension: `RCCT_K` property weights plus one bias term.
pub const RCCT_DIM: usize = RCCT_K + 1;
/// Max tree depth for the greedy split (research default 6).
pub const RCCT_MAX_DEPTH: usize = 6;
/// Minimum pixels in a leaf before splitting is forbidden (research default 256).
pub const RCCT_MIN_LEAF: usize = 256;
/// Number of threshold candidates (quantiles of the property over the node set).
pub const RCCT_THR_CANDIDATES: usize = 16;
/// Right-shift applied to the MA dot product so stored coefficients live near
/// unity scale; the leaf stores `round((a + sum b_k p_k) >> RCCT_SHIFT)`.
pub const RCCT_SHIFT: u32 = 8;
/// High-bit tag distinguishing a leaf reference from an internal-node reference
/// when traversing the flattened tree (see `rcct_predict`).
pub const RCCT_LEAF_TAG: u32 = 1 << 31;

/// The signaled per-leaf MA coefficient tuple for R14: `(b0..b9, a)` in the
/// `>> RCCT_SHIFT` scaled domain, stored as `i16` (like `R13Leaf`).
pub type RcctLeaf = [i16; RCCT_DIM];

/// An internal RCCT node: split on property `prop` (0..RCCT_K) at threshold `thr`;
/// route left when `prop <= thr`, right otherwise. `le`/`gt` are references to
/// either an internal node (`< RCCT_LEAF_TAG`) or a leaf (`RCCT_LEAF_TAG | index`).
#[derive(Clone)]
pub struct RcctNode {
    pub prop: u8,
    pub thr: i32,
    pub le: u32,
    pub gt: u32,
}

/// A complete per-plane RCCT. `nodes` is the (possibly empty) internal-node list;
/// `leaves` is the leaf list. A depth-0 tree has `nodes = []` and one leaf
/// `(all-zero)` => `r_pred = 0` => byte-identical to the current codec.
#[derive(Clone)]
pub struct RcctTree {
    pub nodes: Vec<RcctNode>,
    pub leaves: Vec<RcctLeaf>,
}

/// Compute the R14 property vector for pixel `i` from its `Neighbors` and the four
/// decode-available base errors `e0 = [e0_L, e0_T, e0_TL, e0_TR]` (read from the
/// `e0buf`, border = 0). All ten are pure functions of already-decoded samples,
/// identical on both sides. `g1,g2,g3` are the existing GAP gradients
/// (`g1 = L - T`, `g2 = T - TL`, `g3 = TL - TR`) reused so the pixel-edge signal
/// matches the existing gradient context.
pub fn rcct_properties(_nb: &Neighbors, e0: &[i32; 4], g1: i32, g2: i32, g3: i32) -> [i32; RCCT_K] {
    [
        e0[0],                                     // p1  e0_L
        e0[1],                                     // p2  e0_T
        e0[2],                                     // p3  e0_TL
        e0[3],                                     // p4  e0_TR
        e0[0] - e0[2],                             // p5  e0_L - e0_TL
        e0[1] - e0[3],                             // p6  e0_T - e0_TR
        e0[2] - e0[3],                             // p7  e0_TL - e0_TR
        (e0[0] + e0[1]) >> 1,                      // p8  (e0_L + e0_T)/2
        g1,                                        // p9  L - T
        (g1 + g2 + g3) >> 1,                       // p10 GAP-style pixel gradient
    ]
}

/// R14 leaf prediction `r_pred = clamp(a + sum b_k p_k, ...) >> RCCT_SHIFT`.
#[inline]
fn rcct_leaf_predict(leaf: &RcctLeaf, props: &[i32; RCCT_K], range: PlaneRange) -> i32 {
    // `leaf[0..RCCT_K]` are the property weights `b_k`; `leaf[RCCT_K]` is the bias `a`.
    let mut acc: i64 = leaf[RCCT_K] as i64;
    for k in 0..RCCT_K {
        acc += (leaf[k] as i64) * (props[k] as i64);
    }
    if RCCT_SHIFT == 0 {
        return range.clamp(acc as i32);
    }
    let half = 1i64 << (RCCT_SHIFT - 1);
    range.clamp(((acc + half) >> RCCT_SHIFT) as i32)
}

/// R14 leaf prediction traversal. With a depth-0 tree (no nodes) the single leaf
/// is used directly. Otherwise traverse the flattened node list to the leaf using
/// the signaled `le`/`gt` references (a tagged `RCCT_LEAF_TAG | idx` means leaf).
#[inline]
pub fn rcct_predict(tree: &RcctTree, props: &[i32; RCCT_K], range: PlaneRange) -> i32 {
    if tree.nodes.is_empty() {
        return rcct_leaf_predict(&tree.leaves[0], props, range);
    }
    let mut cur = 0usize;
    loop {
        let n = &tree.nodes[cur];
        let next = if props[n.prop as usize] <= n.thr {
            n.le
        } else {
            n.gt
        };
        if next & RCCT_LEAF_TAG != 0 {
            return rcct_leaf_predict(&tree.leaves[(next ^ RCCT_LEAF_TAG) as usize], props, range);
        } else {
            cur = next as usize;
        }
    }
}

/// Apply the R14 overlay to a base residual `r0` at pixel `(x, y)` (index `idx`).
///
/// Reads the four decode-available base errors from `e0buf` (already stored for
/// every causal neighbor), computes the R14 property vector, traverses the
/// signaled tree to its leaf, and returns the coded residual `epsilon = r0 -
/// r_pred`. When `tree` is `None` (no RCCT on this plane) the base residual is
/// returned unchanged, so non-RCCT streams are unaffected. The caller is
/// responsible for storing `r0` into `e0buf[idx]` AFTER this call so that future
/// neighbors see the correct base error.
#[inline]
pub fn rcct_apply(
    tree: Option<&RcctTree>,
    r0: i32,
    nb: &Neighbors,
    e0buf: &[i32],
    idx: usize,
    x: usize,
    y: usize,
    width: usize,
    _height: usize,
    range: PlaneRange,
) -> i32 {
    let tree = match tree {
        Some(t) => t,
        None => return r0,
    };
    let e0 = [
        if x > 0 { e0buf[idx - 1] } else { 0 },
        if y > 0 { e0buf[idx - width] } else { 0 },
        if x > 0 && y > 0 { e0buf[idx - width - 1] } else { 0 },
        if x + 1 < width && y > 0 {
            e0buf[idx - width + 1]
        } else {
            0
        },
    ];
    let g1 = nb.l - nb.t;
    let g2 = nb.t - nb.tl;
    let g3 = nb.tl - nb.tr;
    let props = rcct_properties(nb, &e0, g1, g2, g3);
    let r_pred = rcct_predict(tree, &props, range);
    r0 - r_pred
}

/// R14 decoder-side companion to `rcct_apply`: returns only the residual-model
/// correction `r_pred` for a pixel, WITHOUT the `r0` subtract. The decoder has
/// the coded residual `r` already and recovers the base residual as `r0 = r +
/// r_pred`, then reconstructs `v = pred + r0`. `r_pred` depends solely on the
/// decode-available base errors of the causal neighbors (and the spatial
/// neighbors), so it is identical to the encoder's value. `tree` is `None` when
/// R14 is off, yielding `0`.
#[inline]
pub fn rcct_compute_pred(
    tree: Option<&RcctTree>,
    nb: &Neighbors,
    e0buf: &[i32],
    idx: usize,
    x: usize,
    y: usize,
    width: usize,
    _height: usize,
    range: PlaneRange,
) -> i32 {
    let tree = match tree {
        Some(t) => t,
        None => return 0,
    };
    let e0 = [
        if x > 0 { e0buf[idx - 1] } else { 0 },
        if y > 0 { e0buf[idx - width] } else { 0 },
        if x > 0 && y > 0 { e0buf[idx - width - 1] } else { 0 },
        if x + 1 < width && y > 0 {
            e0buf[idx - width + 1]
        } else {
            0
        },
    ];
    let g1 = nb.l - nb.t;
    let g2 = nb.t - nb.tl;
    let g3 = nb.tl - nb.tr;
    let props = rcct_properties(nb, &e0, g1, g2, g3);
    rcct_predict(tree, &props, range)
}

// ===== R15: per-image learned neural residual predictor (NRP) =====
//
// The final predictor-family lever (after nine measured axes, including R14's
// piecewise-linear context tree, all net-negative vs the JPEG XL 8.71 gate).
// R14 conditioned the residual on the decode-available neighbor base-errors
// `e0` but in a *tree* parameterization whose byte cost exceeded its gain. R15
// keeps the exact same signal (`e0`, reused via the R14 `e0buf` ring) and
// switches to a *continuous, globally-shared* residual model: a small integer
// multilayer perceptron. One weight set covers the whole plane, so it expresses
// the smooth curved residual manifold with `O(H*D)` bytes independent of how
// wiggly it is - the parameterization with the best chance of net-winning.
//
// Strict superset / never-regress: an all-zero net yields `f = 0`, so the coded
// residual equals `r0` and the stream is byte-identical to the base codec. Any
// non-trivial fit only lowers the residual SSR, and the never-expand net plus
// per-plane model-byte accounting accept R15 only when it strictly lowers total
// bytes. R15 is an overlay on the existing per-context pixel predictor `P0`
// (GAP / R9-B `WeightedTree`): the single coding-loop change is `r = (v - P0) -
// f_theta(phi)` instead of `r = v - P0`; the entropy backend codes the smaller
// `r` unchanged. The decoder reconstructs `v = P0 + f_theta + r`.

/// Hidden-layer width (compile-time). Research default 8; raise to 16 only if
/// the shallow net plateaus. The full i16 weight count is `H*(D+1) + (H+1)`.
pub const NRP_H: usize = 8;
/// Input feature dimension (see `nrp_features`).
pub const NRP_D: usize = 14;
/// Right-shift applied to the hidden pre-activation so weights live near unity
/// scale (mirrors `RCCT_SHIFT`).
pub const NRP_ACT_SHIFT: u32 = 4;
/// Right-shift applied to the final output sum so `f_theta` lands in the
/// residual magnitude range (mirrors `R13_OUT_SHIFT`).
pub const NRP_OUT_SHIFT: u32 = 8;
/// Clamp bound on the clamped hidden activation `sigma(z)`.
pub const NRP_ACT_CLAMP: i32 = 1 << (NRP_ACT_SHIFT + 3); // 128 in pre-shift units

/// Per-feature fixed divisors (decode-available, identical both sides) that keep
/// the raw causal signals (base errors, neighbor pixels, GAP gradients) in a
/// modest ~[-128, 128] range so the i16 weights stay near unity and the integer
/// forward is numerically stable. The net learns in this scaled domain; the
/// divisors are constant so encoder and decoder agree bit-exactly.
const NRP_E0_DIV: i32 = 8;
const NRP_G_DIV: i32 = 32;
const NRP_PX_DIV: i32 = 32;

/// A complete per-plane NRP: integer 1-hidden-layer MLP weights, all `i16`.
/// `w` is the flat hidden weight matrix `[h*D + d]`; `w_out[h]` is the output
/// weight of hidden neuron `h`; `b[h]` is the hidden bias of neuron `h`;
/// `b_out` is the final bias (last entry of `b`). A zero net (all `0`) yields
/// `f_theta = 0` => byte-identical to base.
#[derive(Clone)]
pub struct NrpNet {
    pub w: Vec<i16>,      // NRP_H * NRP_D
    pub w_out: Vec<i16>,  // NRP_H
    pub b: Vec<i16>,      // NRP_H + 1 (b_out is last)
}

/// Build the R15 `D=14` input vector from the decoded neighborhood. Reuses the
/// R14 `K=10` properties (the four base errors, their gradients, and the GAP
/// gradient) and appends the four raw centered causal pixels. All entries are
/// pure functions of already-decoded samples + `e0buf`, identical on both sides.
/// `D` is a compile-time const, so widening it never breaks lockstep.
pub fn nrp_features(_nb: &Neighbors, e0: &[i32; 4], g1: i32, g2: i32, g3: i32) -> [i32; NRP_D] {
    [
        e0[0] / NRP_E0_DIV,                       // p1  e0_L
        e0[1] / NRP_E0_DIV,                       // p2  e0_T
        e0[2] / NRP_E0_DIV,                       // p3  e0_TL
        e0[3] / NRP_E0_DIV,                       // p4  e0_TR
        (e0[0] - e0[2]) / NRP_E0_DIV,             // p5  e0_L - e0_TL
        (e0[1] - e0[3]) / NRP_E0_DIV,             // p6  e0_T - e0_TR
        (e0[2] - e0[3]) / NRP_E0_DIV,             // p7  e0_TL - e0_TR
        ((e0[0] + e0[1]) >> 1) / NRP_E0_DIV,      // p8  (e0_L + e0_T)/2
        g1 / NRP_G_DIV,                           // p9  L - T
        ((g1 + g2 + g3) >> 1) / NRP_G_DIV,        // p10 GAP-style pixel gradient
        (_nb.l - 2048) / NRP_PX_DIV,              // p11 L - 2048
        (_nb.t - 2048) / NRP_PX_DIV,              // p12 T - 2048
        (_nb.tl - 2048) / NRP_PX_DIV,             // p13 TL - 2048
        (_nb.tr - 2048) / NRP_PX_DIV,             // p14 TR - 2048
    ]
}

/// Integer MLP forward pass. `sigma(z) = clamp(z >> NRP_ACT_SHIFT, -CLAMP,
/// CLAMP)`. `f = (b_out + sum_h w_out[h]*sigma(b_h + sum_d W[h*D+d]*phi[d])) >>
/// NRP_OUT_SHIFT`, clamped to the plane range. Deterministic, side-effect free
/// => identical on encoder and decoder (weights come from the signaled model).
pub fn nrp_forward(net: &NrpNet, phi: &[i32; NRP_D], range: PlaneRange) -> i32 {
    let mut hidden = [0i32; NRP_H];
    for h in 0..NRP_H {
        let mut acc: i64 = net.b[h] as i64;
        let base = h * NRP_D;
        for d in 0..NRP_D {
            acc += (net.w[base + d] as i64) * (phi[d] as i64);
        }
        // Arithmetic right shift keeps negative activations exact on both sides.
        let shifted = acc >> NRP_ACT_SHIFT as i64;
        let c = shifted
            .max(-(NRP_ACT_CLAMP as i64))
            .min(NRP_ACT_CLAMP as i64) as i32;
        hidden[h] = c;
    }
    let mut out: i64 = net.b[NRP_H] as i64; // b_out
    for h in 0..NRP_H {
        out += (net.w_out[h] as i64) * (hidden[h] as i64);
    }
    let half = 1i64 << (NRP_OUT_SHIFT - 1);
    range.clamp(((out + half) >> NRP_OUT_SHIFT as i64) as i32)
}

/// Apply the R15 overlay to a base residual `r0` at pixel `(x, y)` (index
/// `idx`). Reads the four decode-available base errors from `e0buf`, computes
/// the R15 feature vector, runs the MLP, and returns the coded residual
/// `epsilon = r0 - f`. When `net` is `None` the base residual is returned
/// unchanged. The caller stores `r0` into `e0buf[idx]` AFTER this call.
#[inline]
pub fn nrp_apply(
    net: Option<&NrpNet>,
    r0: i32,
    nb: &Neighbors,
    e0buf: &[i32],
    idx: usize,
    x: usize,
    y: usize,
    width: usize,
    _height: usize,
    range: PlaneRange,
) -> i32 {
    let net = match net {
        Some(t) => t,
        None => return r0,
    };
    let e0 = [
        if x > 0 { e0buf[idx - 1] } else { 0 },
        if y > 0 { e0buf[idx - width] } else { 0 },
        if x > 0 && y > 0 { e0buf[idx - width - 1] } else { 0 },
        if x + 1 < width && y > 0 {
            e0buf[idx - width + 1]
        } else {
            0
        },
    ];
    let g1 = nb.l - nb.t;
    let g2 = nb.t - nb.tl;
    let g3 = nb.tl - nb.tr;
    let phi = nrp_features(nb, &e0, g1, g2, g3);
    let f = nrp_forward(net, &phi, range);
    r0 - f
}

/// R15 decoder-side companion to `nrp_apply`: returns only the residual-model
/// correction `f` for a pixel (without the `r0` subtract). The decoder has the
/// coded residual `r` already and recovers the base residual as `r0 = r + f`,
/// then reconstructs `v = pred + r0`. `f` depends solely on the decode-available
/// base errors of the causal neighbors, so it is identical to the encoder's
/// value. `net` is `None` when R15 is off, yielding `0`.
#[inline]
pub fn nrp_compute_pred(
    net: Option<&NrpNet>,
    nb: &Neighbors,
    e0buf: &[i32],
    idx: usize,
    x: usize,
    y: usize,
    width: usize,
    _height: usize,
    range: PlaneRange,
) -> i32 {
    let net = match net {
        Some(t) => t,
        None => return 0,
    };
    let e0 = [
        if x > 0 { e0buf[idx - 1] } else { 0 },
        if y > 0 { e0buf[idx - width] } else { 0 },
        if x > 0 && y > 0 { e0buf[idx - width - 1] } else { 0 },
        if x + 1 < width && y > 0 {
            e0buf[idx - width + 1]
        } else {
            0
        },
    ];
    let g1 = nb.l - nb.t;
    let g2 = nb.t - nb.tl;
    let g3 = nb.tl - nb.tr;
    let phi = nrp_features(nb, &e0, g1, g2, g3);
    nrp_forward(net, &phi, range)
}

/// Generic MA (multiplier-additive) least-squares solver over `D` basis terms,
/// generalizing `solve_r13_least_squares` to an arbitrary dimension (R14 uses
/// `D = RCCT_DIM`). Fits `target ~ a + sum b_k p_k` by ridge-regularized
/// Gauss-Jordan on the accumulated `(D)x(D)` normal equations `S` and RHS `b`,
/// returning the integer coefficients in the `>> RCCT_SHIFT` scaled domain.
/// Returns `None` (ill-conditioned) => the caller falls back to a zero leaf.
pub fn solve_ma_least_squares<const D: usize>(
    s: &[[i64; D]; D],
    b: &[i64; D],
) -> Option<[i16; D]> {
    let n = D;
    let mut a = *s;
    // Tiny absolute ridge only for numerical conditioning: it must NOT shrink the
    // fitted coefficients, so it stays well below the feature variance (the bias
    // term has diagonal = sample count, which dominates this constant on real
    // images). A relative ridge would distort the bias feature on large inputs.
    let ridge = 1i64;
    for i in 0..n {
        a[i][i] += ridge;
    }
    let mut m = [[0f64; D]; D];
    for i in 0..n {
        for j in 0..n {
            m[i][j] = a[i][j] as f64;
        }
    }
    let mut rhs = [0f64; D];
    for i in 0..n {
        rhs[i] = b[i] as f64;
    }
    for col in 0..n {
        let mut piv = col;
        let mut best = m[col][col].abs();
        for r in (col + 1)..n {
            if m[r][col].abs() > best {
                best = m[r][col].abs();
                piv = r;
            }
        }
        if best < 1e-9 {
            return None;
        }
        m.swap(col, piv);
        rhs.swap(col, piv);
        let d = m[col][col];
        for j in col..n {
            m[col][j] /= d;
        }
        rhs[col] /= d;
        for r in 0..n {
            if r != col {
                let f = m[r][col];
                for j in col..n {
                    m[r][j] -= f * m[col][j];
                }
                rhs[r] -= f * rhs[col];
            }
        }
    }
    let w = rhs;
    let mut maxw = 0f64;
    for k in 0..n {
        maxw = maxw.max(w[k].abs());
    }
    if maxw < 1e-9 {
        return None;
    }
    // Store the coefficients scaled by `1 << RCCT_SHIFT` (NOT normalized by
    // `maxw`): the predictor recovers `round((a + sum b_k p_k) / 2^SHIFT)`, so the
    // leaf must encode the true OLS coefficient magnitude.
    let scale = (1i64 << RCCT_SHIFT) as f64;
    let mut leaf = [0i16; D];
    for k in 0..n {
        leaf[k] = (w[k] * scale)
            .round()
            .clamp(i16::MIN as f64, i16::MAX as f64) as i16;
    }
    // A fully-zero leaf would never lower the residual; treat as ill-conditioned.
    let mut any = false;
    for k in 0..n {
        if leaf[k] != 0 {
            any = true;
        }
    }
    if !any {
        return None;
    }
    Some(leaf)
}

/// R13-A predict step for a coding loop: returns `Some(pred)` when `p` is
/// `AdaptiveRecursive`, reading the per-`weight_context` leaf state `wr`. The caller
/// must run `r13_adapt` with the same `nb` after computing the residual `r`.
pub fn r13_predict(
    p: PredictorId,
    nb: &Neighbors,
    plane: &[i16],
    x: usize,
    y: usize,
    width: usize,
    height: usize,
    range: PlaneRange,
    wr: &R13State,
) -> Option<i32> {
    if p != PredictorId::AdaptiveRecursive {
        return None;
    }
    let props = r13_properties(nb, plane, x, y, width, height);
    Some(predict_recursive(wr, &props, range))
}

/// R13-A adapt step for a coding loop: updates the per-`weight_context` leaf state in
/// place. No-op unless `p` is `AdaptiveRecursive`.
pub fn r13_adapt(
    p: PredictorId,
    nb: &Neighbors,
    plane: &[i16],
    x: usize,
    y: usize,
    width: usize,
    height: usize,
    wr: &mut R13State,
    r: i32,
) {
    if p != PredictorId::AdaptiveRecursive {
        return;
    }
    let props = r13_properties(nb, plane, x, y, width, height);
    adapt_recursive(wr, r, &props);
}

/// R8-A: the JPEG XL / WebP "weighted" predictor, computed deterministically from
/// the causal neighborhood (no signaled weights, so encoder and decoder agree
/// exactly by induction). The weight on each neighbor is an inverse-gradient
/// soft weight: directions with a small gradient (smooth, predictable) get a large
/// weight; directions with a large gradient get a near-zero weight. The prediction
/// is the convex combination of the four neighbors by these weights.
///
/// Because the weights are a pure function of already-decoded neighbors and the
/// result is bounded within `[min neighbor, max neighbor]`, this predictor is a
/// strict superset of the fixed-predictor candidate set: wherever it yields a
/// smaller |residual| over the analysis pass it is selected, otherwise GAP/med
/// remain. It adds zero model bytes (only the existing 1-byte-per-context map id
/// changes, and only where it wins).
fn weighted_adaptive(n: &Neighbors) -> i32 {
    // Three gradients of the causal neighborhood (signed).
    let d_l = n.l - n.tl; // horizontal gradient
    let d_t = n.t - n.tl; // vertical gradient
    let d_tl = n.tl - n.tr; // diagonal gradient

    // Inverse-gradient weight: large |gradient| -> near 0, small -> large.
    // Scaled by `SCALE` and clamped to `[1, WMAX]` so no direction is ever fully
    // discarded and the normalization sum stays strictly positive.
    const SCALE: i32 = 256; // 1 << 8
    const WMAX: i32 = 256;
    let w = |g: i32| -> i32 {
        let a = g.unsigned_abs() as i32;
        ((SCALE / (1 + a)).min(WMAX)).max(1)
    };
    let wl = w(d_l);
    let wt = w(d_t);
    let wtl = w(d_tl);
    let wtr = w(-d_tl); // symmetric diagonal
    let sum = wl + wt + wtl + wtr; // in [4, 4*WMAX], always > 0
    let dot = wl * n.l + wt * n.t + wtl * n.tl + wtr * n.tr;
    (dot + (sum >> 1)) / sum // round to nearest
}

/// Predict a single sample with clamping to the plane range.
pub fn predict_clamped(
    id: PredictorId,
    n: &Neighbors,
    w: Option<&WeightVec>,
    wtree: Option<&[WLeaf]>,
    range: PlaneRange,
) -> i32 {
    range.clamp(predict(id, n, w, wtree))
}

#[cfg(test)]
 mod tests {
     use super::*;

     #[test]
     fn ma_least_squares_recovers_linear() {
         const D: usize = RCCT_DIM;
         let mut s = [[0i64; D]; D];
         let mut b = [0i64; D];
         let mut t2 = 0i64;
         for i in 0..256u32 {
             let p0 = (i % 13) as i32 - 6;
             let p1 = (i % 7) as i32 - 3;
             let p2 = (i % 5) as i32 - 2;
             // Exact synthetic relation: r0 = 4 + 3*p0 - 2*p1 + p2
             let r0 = 4 + 3 * p0 - 2 * p1 + p2;
             let mut feat = [0i64; D];
             let props = [p0, p1, p2];
             for di in 0..D {
                 feat[di] = if di < RCCT_K { props.get(di).copied().unwrap_or(0) as i64 } else { 1 };
             }
             for di in 0..D {
                 b[di] += r0 as i64 * feat[di];
                 for dj in 0..D {
                     s[di][dj] += feat[di] * feat[dj];
                 }
             }
             t2 += (r0 * r0) as i64;
         }
         let coef = solve_ma_least_squares::<D>(&s, &b).expect("solve must succeed");
        // Tiny ridge (1) leaves a rounding error of a few units in the scaled
        // coefficients; assert within tolerance rather than exact equality.
        let tol = 8i16;
        assert!((coef[RCCT_K] - (4 << RCCT_SHIFT)).abs() <= tol, "bias: {}", coef[RCCT_K]);
        assert!((coef[0] - (3 << RCCT_SHIFT)).abs() <= tol, "b0: {}", coef[0]);
        assert!((coef[1] - ((-2) << RCCT_SHIFT)).abs() <= tol, "b1: {}", coef[1]);
        assert!((coef[2] - (1 << RCCT_SHIFT)).abs() <= tol, "b2: {}", coef[2]);
        let _ = t2;
     }

     #[test]
     fn med_hand_vectors() {
        let n = Neighbors {
            l: 100,
            t: 90,
            tl: 95,
            tr: 0,
        };
        // tl(95) between min(90,100)=90 and max=100 -> L+T-TL = 100+90-95 = 95
        assert_eq!(predict(PredictorId::Med, &n, None, None), 95);
        let n2 = Neighbors {
            l: 200,
            t: 10,
            tl: 250,
            tr: 0,
        };
        // tl >= max(200,10) -> min = 10
        assert_eq!(predict(PredictorId::Med, &n2, None, None), 10);
        let n3 = Neighbors {
            l: 200,
            t: 10,
            tl: 0,
            tr: 0,
        };
        // tl <= min -> max = 200
        assert_eq!(predict(PredictorId::Med, &n3, None, None), 200);
    }

    #[test]
    fn border_rules() {
        // 1x1 image: the current pixel is not yet decodable, so all causal
        // neighbors are 0.
        let p = vec![42i16];
        let n = neighbors(&p, 0, 0, 1, 1);
        assert_eq!((n.l, n.t, n.tl, n.tr), (0, 0, 0, 0));

        // Top row, x=3 of width 5: left neighbor known, nothing above.
        let w = 5;
        let p: Vec<i16> = (0..w * 2).map(|i| i as i16).collect();
        let n = neighbors(&p, 3, 0, w, 2);
        assert_eq!(n.t, 0);
        assert_eq!(n.tl, 0);
        assert_eq!(n.tr, 0);
        assert_eq!(n.l, p[2] as i32);

        // Left column, y=1: no left neighbor; T/TL come from the row above.
        let n = neighbors(&p, 0, 1, w, 2);
        assert_eq!(n.l, 0);
        assert_eq!(n.tl, p[0] as i32);
        assert_eq!(n.t, p[0] as i32);

        // Right column TR clamp: TR = I[w-1][y-1], T = I[w-1][0].
        let n = neighbors(&p, 4, 1, w, 2);
        assert_eq!(n.tr, p[4] as i32);
        assert_eq!(n.t, p[4] as i32);
    }

    #[test]
    fn width1_left_column_tr_clamps_to_top() {
        // A width-1 plane has no column 1, so the left-column TR must clamp to
        // the pixel above (T), never read the current pixel at index `y`
        // (`(y - 1) * width + 1 == y`). The encoder reads the source plane where
        // that slot holds the current pixel's own value, while the streaming
        // decoder still has 0 there - reading it would break lockstep.
        let p = vec![5i16, 9, 13, 17];
        for y in 1..4usize {
            let n = neighbors(&p, 0, y, 1, 4);
            assert_eq!(n.l, 0);
            assert_eq!(n.t, p[y - 1] as i32);
            assert_eq!(n.tl, p[y - 1] as i32);
            assert_eq!(n.tr, p[y - 1] as i32, "TR clamps to T for width 1");
        }
    }

    #[test]
    fn weighted_rounding() {
        let w = WeightVec {
            wl: 8,
            wt: 8,
            wtl: 0,
            wtr: 0,
            shift: 4,
        };
        let n = Neighbors {
            l: 10,
            t: 20,
            tl: 0,
            tr: 0,
        };
        // (8*10 + 8*20 + 8)/16 = (240+8)/16 = 15
        assert_eq!(predict(PredictorId::Weighted, &n, Some(&w), None), 15);
        assert_eq!(predict(PredictorId::Weighted, &n, None, None), 10);
    }

    #[test]
    fn r22_expanded_predictors() {
        // A smooth-ish neighborhood where the expansions should differ from the
        // base bank, exercising the new ids 8..=16.
        let n = Neighbors {
            l: 100,
            t: 120,
            tl: 110,
            tr: 90,
        };
        // TrueMotion = L + T - TL = 100 + 120 - 110 = 110
        assert_eq!(predict(PredictorId::TrueMotion, &n, None, None), 110);
        // L + (TL - T)/2 = 100 + (110 - 120)/2 = 100 - 5 = 95
        assert_eq!(predict(PredictorId::LPlusHalfTLMinusT, &n, None, None), 95);
        // Gradient2 = (L + T)/2 + (TL - TR)/2 = 110 + 10 = 120
        assert_eq!(predict(PredictorId::Gradient2, &n, None, None), 120);
        assert_eq!(predict(PredictorId::AddLT, &n, None, None), 220);
        assert_eq!(predict(PredictorId::AddLTL, &n, None, None), 210);
        assert_eq!(predict(PredictorId::AddTLT, &n, None, None), 230);
        assert_eq!(predict(PredictorId::SubLTL, &n, None, None), -10);
        assert_eq!(predict(PredictorId::SubTLT, &n, None, None), -10);
        assert_eq!(predict(PredictorId::SubTTR, &n, None, None), 30);
    }

    #[test]
    fn r22_predictor_count_and_ids() {
        assert_eq!(PREDICTOR_COUNT, 20);
        for id in 0..20u8 {
            assert!(PredictorId::from_u8(id).is_some(), "id {id} must map");
        }
        assert!(PredictorId::from_u8(20).is_none());
    }

    #[test]
    fn r8_adaptive_weighted_deterministic_and_bounded() {
        // A flat neighborhood (all equal): all gradients zero, all weights equal, so
        // the prediction equals the common value (convex combination).
        let flat = Neighbors {
            l: 120,
            t: 120,
            tl: 120,
            tr: 120,
        };
        assert_eq!(predict(PredictorId::AdaptiveWeighted, &flat, None, None), 120);

        // A structured neighborhood: the smoother (horizontal) direction should get
        // more weight than the steep vertical direction.
        let n = Neighbors {
            l: 100,
            t: 160,
            tl: 100,
            tr: 100,
        };
        // d_l = 0 -> wl = 256; d_t = 60 -> wt = 256/61 ~= 4; d_tl = 0 -> wtl = 256;
        // wtr = 256. sum = 772. dot = 256*100 + 4*160 + 256*100 + 256*100 = 76864.
        // pred = round(76864/772) = round(99.56) = 100.
        let p = predict(PredictorId::AdaptiveWeighted, &n, None, None);
        assert_eq!(p, 100, "smooth horizontal direction dominates");
        // Result lies within [min, max] of the neighbors (convex combination).
        assert!((80..=180).contains(&p));

        // Deterministic: same neighborhood -> same prediction on both "sides".
        let n2 = Neighbors {
            l: 40,
            t: 200,
            tl: 40,
            tr: 40,
        };
        assert_eq!(
            predict(PredictorId::AdaptiveWeighted, &n2, None, None),
            predict(PredictorId::AdaptiveWeighted, &n2, None, None)
        );
    }

    #[test]
    fn r8_adaptive_weighted_roundtrip_bit_exact() {
        use crate::model::analyze;
        use crate::context::{ContextParams, ContextModel};
        use crate::color::PlaneRange;

        let range = PlaneRange::U8;
        let w = 16u32;
        let h = 12u32;
        let mut plane: Vec<i16> = Vec::with_capacity((w * h) as usize);
        for i in 0..(w * h) {
            plane.push(((i.wrapping_mul(73) ^ (i >> 2)) % 256) as i16);
        }
        let planes = vec![plane];
        let ctx = ContextParams::default();
        let codebook = super::default_weight_codebook();
        let model = analyze(&planes, &[range], w as usize, h as usize, 4, &ctx, &codebook, false, false, None);
        // With AdaptiveWeighted in the candidate set, every per-context predictor id
        // must be a valid id (encoder and decoder agree on the map).
        for &id in &model.planes[0].map {
            assert!(PredictorId::from_u8(id).is_some(), "pred id {id} must map");
        }
        // Build the predicted plane using the model's chosen predictors and confirm
        // it reconstructs the original losslessly given the residual (sanity check of
        // the deterministic prediction path used by both encode and decode).
        let cm = ContextModel::new(ctx);
        let mut recon = vec![0i16; (w * h) as usize];
        for y in 0..h as usize {
            for x in 0..w as usize {
                let idx = y * w as usize + x;
                let nb = neighbors(&recon, x, y, w as usize, h as usize);
                let cid = cm.context_id(&nb, x, y) % model.context_count;
                let p = model.predictor(0, cid);
                let pred = predict_clamped(
                    p,
                    &nb,
                    model.weight_for(0).as_ref(),
                    model.weighted_tree_for(0),
                    range,
                );
                let r = planes[0][idx] as i32 - pred;
                recon[idx] = (pred + r) as i16;
            }
        }
        assert_eq!(recon, planes[0], "lossless reconstruction via chosen predictors");
    }

    #[test]
    fn predict_clamped_range() {
        let range = PlaneRange { min: -255, max: 255 };
        let n = Neighbors {
            l: 300,
            t: 300,
            tl: 0,
            tr: 0,
        };
        assert_eq!(predict_clamped(PredictorId::Avg, &n, None, None, range), 255);
        let range2 = PlaneRange::U8;
        assert_eq!(predict_clamped(PredictorId::Avg, &n, None, None, range2), 255);
    }

    #[test]
    fn r9b_weighted_tree_predict_and_solve() {
        // `weight_context` is a deterministic function of the neighborhood.
        let n = Neighbors { l: 10, t: 20, tl: 5, tr: 8 };
        assert_eq!(weight_context(&n), weight_context(&n));

        // A neutral table modelling the L+T average (8,8,0,0,0,4) predicts (8*10+8*20)/16.
        let table: Vec<WLeaf> = vec![(8, 8, 0, 0, 0, 4); WC_LEAVES];
        let p = predict_weighted_tree(&n, &table);
        assert_eq!(p, (8 * 10 + 8 * 20) >> 4);

        // Solve on data where v = (L+T)/2 exactly: the per-leaf least-squares fit
        // (with bias) should learn weights concentrated on L and T with near-zero
        // diagonal terms and a positive bias.
        let mut s = [[0i64; 5]; 5];
        let mut b = [0i64; 5];
        for l in 0..8i64 {
            for t in 0..8i64 {
                let v = (l + t) / 2;
                let ns = [l, t, 0i64, 0i64, 1i64];
                for i in 0..5 {
                    for j in 0..5 {
                        s[i][j] += ns[i] * ns[j];
                    }
                    b[i] += v * ns[i];
                }
            }
        }
        let leaf = solve_weighted_tree(&s, &b).expect("solve succeeds on well-conditioned data");
        let (w0, w1, w2, w3, _bias, sh) = leaf;
        assert!(w2.abs() <= 2 && w3.abs() <= 2, "diagonal weights ~0 for v=(L+T)/2, got {leaf:?}");
        assert!(w0 > 0 && w1 > 0, "L and T weights positive, got {leaf:?}");
        assert!((0u32..=12).contains(&(sh as u32)));
        // The learned leaf must reproduce `v = (L+T)/2` on its own training data.
        let table: Vec<WLeaf> = vec![leaf; WC_LEAVES];
        for l in 0..8i32 {
            for t in 0..8i32 {
                let n = Neighbors { l, t, tl: 0, tr: 0 };
                let pred = predict_weighted_tree(&n, &table);
                assert_eq!(pred, (l + t) / 2, "leaf {leaf:?} on l={l} t={t}");
            }
        }

        // Ill-conditioned system (all-identical inputs) must return None, not panic.
        let s2 = [[0i64; 5]; 5];
        let b2 = [0i64; 5];
        assert!(solve_weighted_tree(&s2, &b2).is_none());
    }

    #[test]
    fn nrp_zero_net_is_base() {
        // An all-zero NrpNet yields f = 0 for any pixel, so the coded residual
        // equals the base residual r0 (strict-superset / never-regress contract).
        let net = NrpNet {
            w: vec![0i16; NRP_H * NRP_D],
            w_out: vec![0i16; NRP_H],
            b: vec![0i16; NRP_H + 1],
        };
        let nb = Neighbors { l: 1234, t: 2100, tl: 1800, tr: 1500 };
        let e0 = [10i32, -20, 5, 7];
        let g1 = nb.l - nb.t;
        let g2 = nb.t - nb.tl;
        let g3 = nb.tl - nb.tr;
        let phi = nrp_features(&nb, &e0, g1, g2, g3);
        let range = PlaneRange { min: 0, max: 4095 };
        assert_eq!(nrp_forward(&net, &phi, range), 0);
        // nrp_apply must return r0 unchanged for a zero net.
        let e0buf = vec![0i32; 64];
        let r0 = 37;
        assert_eq!(
            nrp_apply(Some(&net), r0, &nb, &e0buf, 10, 3, 2, 8, 8, range),
            r0
        );
        assert_eq!(
            nrp_compute_pred(Some(&net), &nb, &e0buf, 10, 3, 2, 8, 8, range),
            0
        );
    }

    #[test]
    fn nrp_forward_deterministic_and_in_range() {
        // The integer forward is a pure function of its inputs, so encoder and
        // decoder compute the identical f per pixel (bit-exact lockstep).
        let mut w = vec![3i16; NRP_H * NRP_D];
        // Keep magnitudes bounded so activations do not all saturate.
        for (i, x) in w.iter_mut().enumerate() {
            *x = ((i % 5) as i16) - 2;
        }
        let w_out = vec![-7i16; NRP_H];
        let b = vec![5i16; NRP_H + 1];
        let net = NrpNet { w, w_out, b };
        let nb = Neighbors { l: 2000, t: 1500, tl: 1700, tr: 1900 };
        let e0 = [64i32, -32, 16, -8];
        let g1 = nb.l - nb.t;
        let g2 = nb.t - nb.tl;
        let g3 = nb.tl - nb.tr;
        let phi = nrp_features(&nb, &e0, g1, g2, g3);
        let range = PlaneRange { min: 0, max: 255 };
        let a = nrp_forward(&net, &phi, range);
        let b2 = nrp_forward(&net, &phi, range);
        assert_eq!(a, b2);
        assert!((0..=255).contains(&a));
    }

    #[test]
    fn nrp_features_decode_available_shape() {
        // nrp_features is a pure function of the decoded neighborhood + e0buf
        // (border reads = 0), so the decoder can reproduce the encoder's vector.
        let nb = Neighbors { l: 1000, t: 1200, tl: 1100, tr: 900 };
        let e0 = [1i32, 2, 3, 4];
        let g1 = nb.l - nb.t;
        let g2 = nb.t - nb.tl;
        let g3 = nb.tl - nb.tr;
        let phi = nrp_features(&nb, &e0, g1, g2, g3);
        assert_eq!(phi.len(), NRP_D);
        // Centered raw pixels: L - 2048.
        assert_eq!(phi[10], (nb.l - 2048) / NRP_PX_DIV);
        // Base-error gradient feature.
        assert_eq!(phi[4], (e0[0] - e0[2]) / NRP_E0_DIV);
    }
}
