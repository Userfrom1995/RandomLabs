//! R10 transforms: JPEG XL-class Squeeze (recursive group transform) and
//! chroma-from-luma (CFL) decorrelation.
//!
//! Both are *reversible pre-processing* applied to the plane samples before the
//! existing per-plane coding loop runs. Squeeze splits a plane into sub-bands
//! (each its own `i16` plane with its own `(w, h)`); the coding loop treats each
//! sub-band as an ordinary coding plane. CFL subtracts a scaled luma prediction
//! from chroma planes in the original plane space, before Squeeze, so it composes
//! transparently: CFL subtract, then Squeeze on encode; unsqueeze, then CFL
//! add-back on decode. Both are gated by the never-expand safety net and are
//! bit-exact round-trip by construction.

/// Minimum sub-band dimension. A sub-band smaller than this stops recursing, so
/// the leaf is the whole remaining plane as a single band.
pub const MIN_SQ: usize = 4;

/// R13-B: which reversible group transform produces the Squeeze/CCDF band geometry.
/// Both share the exact same `(W, H, levels)` 4-band-per-level layout produced by
/// `squeeze_band_layout`, so the banded coder and the decoder are blind to which
/// transform actually generated the bands; only the band *content* differs.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Default)]
pub enum TransformKind {
    /// JPEG XL-class Squeeze (quincunx subsampling + raw LL-interpolated HF
    /// residuals). The default for backward compatibility with every legacy stream.
    #[default]
    Squeeze = 0,
    /// CDF 5/3 lifting wavelet (JPEG 2000 lossless): a genuine PREDICT + UPDATE
    /// step that compacts energy into the LL band, so HF bands are small residuals
    /// and the never-expand net finally *selects* a transform on photographic
    /// content (Squeeze is inert on it). See `cdf53_lift` / `cdf53_unlift`.
    Lift = 1,
}

impl TransformKind {
    pub fn from_u8(b: u8) -> Option<TransformKind> {
        match b {
            0 => Some(TransformKind::Squeeze),
            1 => Some(TransformKind::Lift),
            _ => None,
        }
    }
    pub fn to_u8(self) -> u8 {
        self as u8
    }
}

/// Split a `w x h` plane into the four even/odd quadrants (LL, HL, LH, HH), each
/// `(w/2) x (h/2)`. Halves use integer (floor) division, so an odd trailing row
/// or column is absorbed; the decoder mirrors the exact same split.
/// Split a `w x h` plane into the four even/odd quadrants (LL, HL, LH, HH).
/// `LL` = even row, even col (`ew x eh`); `HL` = even row, odd col (`ow x eh`);
/// `LH` = odd row, even col (`ew x oh`); `HH` = odd row, odd col (`ow x oh`).
/// `ew = ceil(w/2)`, `ow = w/2`, `eh = ceil(h/2)`, `oh = h/2`. Floor (integer)
/// division means an odd trailing row/column is folded into the even group, so
/// the split is total and invertible; the decoder mirrors it exactly.
fn split4(plane: &[i16], w: usize, h: usize) -> (Vec<i16>, Vec<i16>, Vec<i16>, Vec<i16>) {
    let ew = w.div_ceil(2);
    let ow = w / 2;
    let eh = h.div_ceil(2);
    let oh = h / 2;
    let mut ll = vec![0i16; ew * eh];
    let mut hl = vec![0i16; ow * eh];
    let mut lh = vec![0i16; ew * oh];
    let mut hh = vec![0i16; ow * oh];
    for j in 0..eh {
        for i in 0..ew {
            ll[j * ew + i] = plane[(2 * j) * w + (2 * i)];
        }
    }
    for j in 0..eh {
        for i in 0..ow {
            hl[j * ow + i] = plane[(2 * j) * w + (2 * i + 1)];
        }
    }
    for j in 0..oh {
        for i in 0..ew {
            lh[j * ew + i] = plane[(2 * j + 1) * w + (2 * i)];
        }
    }
    for j in 0..oh {
        for i in 0..ow {
            hh[j * ow + i] = plane[(2 * j + 1) * w + (2 * i + 1)];
        }
    }
    (ll, hl, lh, hh)
}

/// Bordered LL sample accessor: out-of-bounds indices clamp to the in-bounds edge
/// so the encoder and decoder agree on the predicted value (border rule from the
/// R10 blueprint: an out-of-bounds LL neighbor is replaced by the in-bounds one).
#[inline]
fn ll_at(ll: &[i16], bw: usize, bh: usize, x: usize, y: usize) -> i32 {
    let cx = x.min(bw.saturating_sub(1));
    let cy = y.min(bh.saturating_sub(1));
    ll[cy * bw + cx] as i32
}

/// JPEG XL-class Squeeze. Returns the sub-bands in post-order: LL's own bands
/// first (because the decoder needs LL before it can predict the HF bands), then
/// the HL, LH, HH residuals of this level. Each band is `(data, bw, bh)`.
///
/// Recurses on the LL band first; stops when `levels == 0` or the plane is at
/// most `MIN_SQ` on a side (the leaf is the whole remaining plane as one band).
pub fn squeeze(plane: &[i16], w: usize, h: usize, levels: u8) -> Vec<(Vec<i16>, usize, usize)> {
    if levels == 0 || w <= MIN_SQ || h <= MIN_SQ {
        return vec![(plane.to_vec(), w, h)];
    }
    let (ll, hl, lh, hh) = split4(plane, w, h);
    let ew = w.div_ceil(2);
    let ow = w / 2;
    let eh = h.div_ceil(2);
    let oh = h / 2;
    // Predict each HF band from the LL band only, with pure integer interpolation
    // (i32 arithmetic; `>> 1` / `>> 2` are floor shifts). Residuals are exact.
    let mut hl_res = vec![0i16; ow * eh];
    let mut lh_res = vec![0i16; ew * oh];
    let mut hh_res = vec![0i16; ow * oh];
    for j in 0..eh {
        for i in 0..ow {
            let pred_hl = (ll_at(&ll, ew, eh, i, j) + ll_at(&ll, ew, eh, i, j + 1)) >> 1;
            hl_res[j * ow + i] = (hl[j * ow + i] as i32 - pred_hl) as i16;
        }
    }
    for j in 0..oh {
        for i in 0..ew {
            let pred_lh = (ll_at(&ll, ew, eh, i, j) + ll_at(&ll, ew, eh, i + 1, j)) >> 1;
            lh_res[j * ew + i] = (lh[j * ew + i] as i32 - pred_lh) as i16;
        }
    }
    for j in 0..oh {
        for i in 0..ow {
            let pred_hh = (ll_at(&ll, ew, eh, i, j)
                + ll_at(&ll, ew, eh, i + 1, j)
                + ll_at(&ll, ew, eh, i, j + 1)
                + ll_at(&ll, ew, eh, i + 1, j + 1))
                >> 2;
            hh_res[j * ow + i] = (hh[j * ow + i] as i32 - pred_hh) as i16;
        }
    }
    // Recurse on LL first (post-order) so LL's bands precede the HF residuals.
    let mut out = squeeze(&ll, ew, eh, levels - 1);
    out.push((hl_res, ow, eh));
    out.push((lh_res, ew, oh));
    out.push((hh_res, ow, oh));
    out
}

/// Mirror of `squeeze`: reconstruct the full `w x h` plane from its sub-bands.
/// Reads the LL subtree first, then adds the LL-based predictions back to the HF
/// bands, then combines the four quadrants. Inverts `squeeze` exactly.
pub fn unsqueeze(bands: &[(Vec<i16>, usize, usize)], w: usize, h: usize, levels: u8) -> Vec<i16> {
    let mut idx = 0usize;
    unsqueeze_rec(bands, &mut idx, w, h, levels)
}

fn unsqueeze_rec(
    bands: &[(Vec<i16>, usize, usize)],
    idx: &mut usize,
    w: usize,
    h: usize,
    levels: u8,
) -> Vec<i16> {
    if levels == 0 || w <= MIN_SQ || h <= MIN_SQ {
        let (data, bw, bh) = &bands[*idx];
        *idx += 1;
        debug_assert_eq!(*bw, w, "squeeze band width mismatch");
        debug_assert_eq!(*bh, h, "squeeze band height mismatch");
        return data.clone();
    }
    let ew = w.div_ceil(2);
    let ow = w / 2;
    let eh = h.div_ceil(2);
    let oh = h / 2;
    // LL subtree first (post-order).
    let ll = unsqueeze_rec(bands, idx, ew, eh, levels - 1);
    let (hl_res, hbw, hbh) = &bands[*idx];
    debug_assert_eq!(*hbw, ow, "squeeze HL band width mismatch");
    debug_assert_eq!(*hbh, eh, "squeeze HL band height mismatch");
    let hl_res = hl_res.clone();
    *idx += 1;
    let (lh_res, lbw, lbh) = &bands[*idx];
    debug_assert_eq!(*lbw, ew, "squeeze LH band width mismatch");
    debug_assert_eq!(*lbh, oh, "squeeze LH band height mismatch");
    let lh_res = lh_res.clone();
    *idx += 1;
    let (hh_res, hbbw, hbbh) = &bands[*idx];
    debug_assert_eq!(*hbbw, ow, "squeeze HH band width mismatch");
    debug_assert_eq!(*hbbh, oh, "squeeze HH band height mismatch");
    let hh_res = hh_res.clone();
    *idx += 1;
    // Add the LL-based predictions back to the HF residuals.
    let mut hl = vec![0i16; ow * eh];
    let mut lh = vec![0i16; ew * oh];
    let mut hh = vec![0i16; ow * oh];
    for j in 0..eh {
        for i in 0..ow {
            let pred_hl = (ll_at(&ll, ew, eh, i, j) + ll_at(&ll, ew, eh, i, j + 1)) >> 1;
            hl[j * ow + i] = (hl_res[j * ow + i] as i32 + pred_hl) as i16;
        }
    }
    for j in 0..oh {
        for i in 0..ew {
            let pred_lh = (ll_at(&ll, ew, eh, i, j) + ll_at(&ll, ew, eh, i + 1, j)) >> 1;
            lh[j * ew + i] = (lh_res[j * ew + i] as i32 + pred_lh) as i16;
        }
    }
    for j in 0..oh {
        for i in 0..ow {
            let pred_hh = (ll_at(&ll, ew, eh, i, j)
                + ll_at(&ll, ew, eh, i + 1, j)
                + ll_at(&ll, ew, eh, i, j + 1)
                + ll_at(&ll, ew, eh, i + 1, j + 1))
                >> 2;
            hh[j * ow + i] = (hh_res[j * ow + i] as i32 + pred_hh) as i16;
        }
    }
    // combine4: interleave LL/HL/LH/HH back into the full plane, honoring odd
    // trailing rows/columns (the even group holds ceil(w/2) / ceil(h/2) samples).
    let mut out = vec![0i16; w * h];
    for j in 0..eh {
        for i in 0..ew {
            out[(2 * j) * w + (2 * i)] = ll[j * ew + i];
        }
    }
    for j in 0..eh {
        for i in 0..ow {
            out[(2 * j) * w + (2 * i + 1)] = hl[j * ow + i];
        }
    }
    for j in 0..oh {
        for i in 0..ew {
            out[(2 * j + 1) * w + (2 * i)] = lh[j * ew + i];
        }
    }
    for j in 0..oh {
        for i in 0..ow {
            out[(2 * j + 1) * w + (2 * i + 1)] = hh[j * ow + i];
        }
    }
    out
}

/// R13-B: one 1-D CDF 5/3 lifting step on a signal `s` of length `n`.
///
/// Returns `(low, high)` where `low.len() = ceil(n/2)` (the low-pass /
/// approximation coefficients) and `high.len() = floor(n/2)` (the high-pass /
/// detail coefficients). The predict step subtracts the midpoint of the two
/// neighboring low samples; the update step adds back a quarter of the
/// neighboring high samples. All arithmetic is integer with floor rounding and
/// symmetric boundary extension, so the inverse is exact.
#[inline]
fn lift1d(s: &[i32]) -> (Vec<i32>, Vec<i32>) {
    let n = s.len();
    let ne = n.div_ceil(2);
    let no = n / 2;
    let mut even = vec![0i32; ne];
    let mut odd = vec![0i32; no];
    for i in 0..ne {
        even[i] = s[2 * i];
    }
    for i in 0..no {
        odd[i] = s[2 * i + 1];
    }
    // PREDICT (high-pass): odd[i] - floor((even[i] + even[i+1]) / 2).
    let mut high = vec![0i32; no];
    for i in 0..no {
        let er = if i + 1 < ne { even[i + 1] } else { even[ne - 1] };
        high[i] = odd[i] - ((even[i] + er) >> 1);
    }
    // UPDATE (low-pass): even[i] + floor((high[i-1] + high[i]) / 4).
    let mut low = vec![0i32; ne];
    for i in 0..ne {
        let hl = if i == 0 { high[0] } else { high[i - 1] };
        let hr = if i < no { high[i] } else { high[no.saturating_sub(1)] };
        low[i] = even[i] + ((hl + hr) >> 2);
    }
    (low, high)
}

/// Inverse of `lift1d`: given `(low, high)` reconstructs the original signal.
#[inline]
fn unlift1d(low: &[i32], high: &[i32]) -> Vec<i32> {
    let ne = low.len();
    let no = high.len();
    let mut even = vec![0i32; ne];
    for i in 0..ne {
        let hl = if i == 0 { high[0] } else { high[i - 1] };
        let hr = if i < no { high[i] } else { high[no.saturating_sub(1)] };
        even[i] = low[i] - ((hl + hr) >> 2);
    }
    let mut odd = vec![0i32; no];
    for i in 0..no {
        let er = if i + 1 < ne { even[i + 1] } else { even[ne - 1] };
        odd[i] = high[i] + ((even[i] + er) >> 1);
    }
    let mut s = vec![0i32; ne + no];
    for i in 0..ne {
        s[2 * i] = even[i];
    }
    for i in 0..no {
        s[2 * i + 1] = odd[i];
    }
    s
}

/// R13-B: genuine CDF 5/3 lifting wavelet. Produces the SAME 4-band-per-level
/// layout as `squeeze` (LL, HL, LH, HH in post-order) so the banded coder and
/// `squeeze_band_layout` geometry are reused unchanged; only the band *content*
/// differs (true low/high-pass instead of raw subsampled residuals).
///
/// The transform is global over the whole plane (not causal per pixel), runs as a
/// pre-pass exactly like `squeeze`, and inverts exactly (`cdf53_unlift`).
pub fn cdf53_lift(plane: &[i16], w: usize, h: usize, levels: u8) -> Vec<(Vec<i16>, usize, usize)> {
    if levels == 0 || w <= MIN_SQ || h <= MIN_SQ {
        return vec![(plane.to_vec(), w, h)];
    }
    // Horizontal pass: each row -> (even col = low, odd col = high), in place.
    let mut tmp = vec![0i16; w * h];
    for y in 0..h {
        let row: Vec<i32> = (0..w).map(|x| plane[y * w + x] as i32).collect();
        let (low, high) = lift1d(&row);
        for i in 0..low.len() {
            tmp[y * w + 2 * i] = low[i] as i16;
        }
        for i in 0..high.len() {
            tmp[y * w + 2 * i + 1] = high[i] as i16;
        }
    }
    // Vertical pass: each column -> (even row = low, odd row = high).
    let mut bp = vec![0i16; w * h];
    for x in 0..w {
        let col: Vec<i32> = (0..h).map(|y| tmp[y * w + x] as i32).collect();
        let (low, high) = lift1d(&col);
        for i in 0..low.len() {
            bp[(2 * i) * w + x] = low[i] as i16;
        }
        for i in 0..high.len() {
            bp[(2 * i + 1) * w + x] = high[i] as i16;
        }
    }
    // bp now holds LL/HL/LH/HH interleaved in the same quadrant geometry as
    // `squeeze`; reuse `split4` (which indexes by even/odd position) to carve the
    // four bands, then recurse on LL exactly like `squeeze`.
    let (ll, hl, lh, hh) = split4(&bp, w, h);
    let ew = w.div_ceil(2);
    let ow = w / 2;
    let eh = h.div_ceil(2);
    let oh = h / 2;
    let mut out = cdf53_lift(&ll, ew, eh, levels - 1);
    out.push((hl, ow, eh));
    out.push((lh, ew, oh));
    out.push((hh, ow, oh));
    out
}

/// Mirror of `cdf53_lift`: reconstruct the full `w x h` plane from its sub-bands
/// (consumed in post-order, LL first). Inverts `cdf53_lift` exactly.
pub fn cdf53_unlift(bands: &[(Vec<i16>, usize, usize)], w: usize, h: usize, levels: u8) -> Vec<i16> {
    let mut idx = 0usize;
    cdf53_unlift_rec(bands, &mut idx, w, h, levels)
}

fn cdf53_unlift_rec(
    bands: &[(Vec<i16>, usize, usize)],
    idx: &mut usize,
    w: usize,
    h: usize,
    levels: u8,
) -> Vec<i16> {
    if levels == 0 || w <= MIN_SQ || h <= MIN_SQ {
        let (data, bw, bh) = &bands[*idx];
        *idx += 1;
        debug_assert_eq!(*bw, w, "cdf53 band width mismatch");
        debug_assert_eq!(*bh, h, "cdf53 band height mismatch");
        return data.clone();
    }
    let ew = w.div_ceil(2);
    let ow = w / 2;
    let eh = h.div_ceil(2);
    let oh = h / 2;
    // LL subtree first (post-order).
    let ll = cdf53_unlift_rec(bands, idx, ew, eh, levels - 1);
    let (hl_res, hbw, hbh) = &bands[*idx];
    debug_assert_eq!(*hbw, ow, "cdf53 HL band width mismatch");
    debug_assert_eq!(*hbh, eh, "cdf53 HL band height mismatch");
    let hl_res = hl_res.clone();
    *idx += 1;
    let (lh_res, lbw, lbh) = &bands[*idx];
    debug_assert_eq!(*lbw, ew, "cdf53 LH band width mismatch");
    debug_assert_eq!(*lbh, oh, "cdf53 LH band height mismatch");
    let lh_res = lh_res.clone();
    *idx += 1;
    let (hh_res, hbbw, hbbh) = &bands[*idx];
    debug_assert_eq!(*hbbw, ow, "cdf53 HH band width mismatch");
    debug_assert_eq!(*hbbh, oh, "cdf53 HH band height mismatch");
    let hh_res = hh_res.clone();
    *idx += 1;
    // Re-interleave the four bands into the (low/high) interleaved plane `bp`.
    let mut bp = vec![0i16; w * h];
    for j in 0..eh {
        for i in 0..ew {
            bp[(2 * j) * w + (2 * i)] = ll[j * ew + i];
        }
    }
    for j in 0..eh {
        for i in 0..ow {
            bp[(2 * j) * w + (2 * i + 1)] = hl_res[j * ow + i];
        }
    }
    for j in 0..oh {
        for i in 0..ew {
            bp[(2 * j + 1) * w + (2 * i)] = lh_res[j * ew + i];
        }
    }
    for j in 0..oh {
        for i in 0..ow {
            bp[(2 * j + 1) * w + (2 * i + 1)] = hh_res[j * ow + i];
        }
    }
    // Vertical unlift (columns -> even row = low, odd row = high).
    let mut tmp = vec![0i16; w * h];
    for x in 0..w {
        let col: Vec<i32> = (0..h).map(|y| bp[y * w + x] as i32).collect();
        // Split the interleaved column back into (low = even rows, high = odd rows).
        let ne = h.div_ceil(2);
        let no = h / 2;
        let mut low = vec![0i32; ne];
        let mut high = vec![0i32; no];
        for i in 0..ne {
            low[i] = col[2 * i];
        }
        for i in 0..no {
            high[i] = col[2 * i + 1];
        }
        let full = unlift1d(&low, &high);
        for (i, v) in full.iter().enumerate() {
            tmp[i * w + x] = *v as i16;
        }
    }
    // Horizontal unlift (rows -> even col = low, odd col = high).
    let mut out = vec![0i16; w * h];
    for y in 0..h {
        let row: Vec<i32> = (0..w).map(|x| tmp[y * w + x] as i32).collect();
        let ne = w.div_ceil(2);
        let no = w / 2;
        let mut low = vec![0i32; ne];
        let mut high = vec![0i32; no];
        for i in 0..ne {
            low[i] = row[2 * i];
        }
        for i in 0..no {
            high[i] = row[2 * i + 1];
        }
        let full = unlift1d(&low, &high);
        for (i, v) in full.iter().enumerate() {
            out[y * w + i] = *v as i16;
        }
    }
    out
}

/// R13-B dispatcher: split a plane into sub-bands using the selected transform,
/// producing the shared 4-band-per-level layout. `Squeeze` calls `squeeze`;
/// `Lift` calls `cdf53_lift`.
pub fn transform_plane(plane: &[i16], w: usize, h: usize, levels: u8, kind: TransformKind) -> Vec<(Vec<i16>, usize, usize)> {
    match kind {
        TransformKind::Squeeze => squeeze(plane, w, h, levels),
        TransformKind::Lift => cdf53_lift(plane, w, h, levels),
    }
}

/// R13-B dispatcher: reconstruct a plane from its sub-bands using the selected
/// transform. Mirror of `transform_plane`; identical `kind` on both sides keeps
/// the round-trip bit-exact.
pub fn untransform_plane(bands: &[(Vec<i16>, usize, usize)], w: usize, h: usize, levels: u8, kind: TransformKind) -> Vec<i16> {
    match kind {
        TransformKind::Squeeze => unsqueeze(bands, w, h, levels),
        TransformKind::Lift => cdf53_unlift(bands, w, h, levels),
    }
}

/// The sub-band layout `(bw, bh)` that `squeeze` would produce, in the same order
/// (so the decoder can allocate and read the right number of bands without any
/// signaled sub-band metadata). The geometry `(W, H, levels)` fully determines it.
pub fn squeeze_band_layout(w: usize, h: usize, levels: u8) -> Vec<(usize, usize)> {
    if levels == 0 || w <= MIN_SQ || h <= MIN_SQ {
        return vec![(w, h)];
    }
    let ew = w.div_ceil(2);
    let ow = w / 2;
    let eh = h.div_ceil(2);
    let oh = h / 2;
    let mut out = squeeze_band_layout(ew, eh, levels - 1);
    out.push((ow, eh));
    out.push((ew, oh));
    out.push((ow, oh));
    out
}

/// CFL prediction: `round(s * luma / 8)` clamped into `[rmin, rmax]` so the
/// subtracted residual stays within the chroma plane's value range. Encoder and
/// decoder call this identical function, so the round-trip is bit-exact.
pub fn cfl_predict(s: u8, luma: i32, rmin: i32, rmax: i32) -> i32 {
    let x = (s as i32) * luma;
    // Round half up. Both encoder and decoder use the same expression, so any
    // rounding convention is fine as long as it is shared.
    let v = (x + 4) >> 3;
    v.clamp(rmin, rmax)
}

/// Maximum Squeeze level allowed for a given image dimension: the smaller of
/// `MAX_SQ_LEVELS = 4` and `log2(min(W, H)) - 1` (so the smallest sub-band stays
/// at least `MIN_SQ` on each side). Always >= 0.
pub fn max_squeeze_levels(w: usize, h: usize) -> u8 {
    let m = w.min(h);
    if m < (1usize << (MIN_SQ.trailing_zeros() + 1)) {
        // MIN_SQ is 4 = 2^2; a level is valid only if the smallest sub-band side
        // (w >> L, h >> L) stays >= MIN_SQ. Solve L <= log2(min) - 2.
        return 0;
    }
    let max_by_dim = (m.ilog2() as i32) - (MIN_SQ.ilog2() as i32);
    let max_by_dim = max_by_dim.max(0) as u8;
    4u8.min(max_by_dim)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn roundtrip_one(w: usize, h: usize, levels: u8) {
        let mut plane: Vec<i16> = (0..w * h).map(|i| ((i * 7 + 13) % 256) as i16).collect();
        // Add some structure so HF residuals are non-trivial.
        for y in 0..h {
            for x in 0..w {
                plane[y * w + x] = ((x as i32 * 3 + y as i32 * 5) % 256) as i16;
            }
        }
        let bands = squeeze(&plane, w, h, levels);
        let layout = squeeze_band_layout(w, h, levels);
        assert_eq!(bands.len(), layout.len(), "band count must match layout");
        for (b, (bw, bh)) in bands.iter().zip(layout.iter()) {
            assert_eq!(b.1, *bw);
            assert_eq!(b.2, *bh);
        }
        let back = unsqueeze(&bands, w, h, levels);
        assert_eq!(back, plane, "squeeze/unsqueeze must invert ({}x{} l{})", w, h, levels);
    }

    #[test]
    fn squeeze_inverts_various_sizes() {
        for &(w, h) in &[(8usize, 8), (16, 12), (7, 5), (1, 1), (4, 4), (32, 24), (64, 64), (5, 9)] {
            for l in 0..=4u8 {
                roundtrip_one(w, h, l);
            }
        }
    }

    #[test]
    fn r13_lifting_inverts_various_sizes() {
        for &(w, h) in &[(8usize, 8), (16, 12), (7, 5), (1, 1), (4, 4), (32, 24), (64, 64), (5, 9), (768, 512)] {
            for l in 0..=4u8 {
                let mut plane: Vec<i16> = (0..w * h).map(|i| ((i * 7 + 13) % 256) as i16).collect();
                for y in 0..h {
                    for x in 0..w {
                        plane[y * w + x] = ((x as i32 * 3 + y as i32 * 5) % 256) as i16;
                    }
                }
                let bands = cdf53_lift(&plane, w, h, l);
                let layout = squeeze_band_layout(w, h, l);
                assert_eq!(bands.len(), layout.len(), "cdf53 band count must match layout");
                for (b, (bw, bh)) in bands.iter().zip(layout.iter()) {
                    assert_eq!(b.1, *bw, "cdf53 band width mismatch");
                    assert_eq!(b.2, *bh, "cdf53 band height mismatch");
                }
                let back = cdf53_unlift(&bands, w, h, l);
                assert_eq!(back, plane, "cdf53 lift/unlift must invert ({}x{} l{})", w, h, l);
            }
        }
    }

    #[test]
    fn r13_lifting_band_geometry_matches_squeeze() {
        // The lifting transform must reuse the identical band geometry so the
        // banded coder and decoder are unchanged.
        let (w, h) = (64usize, 48);
        let levels = 3u8;
        let mut plane: Vec<i16> = (0..w * h).map(|i| ((i * 11 + 5) % 256) as i16).collect();
        for y in 0..h {
            for x in 0..w {
                plane[y * w + x] = ((x as i32 * 7 + y as i32 * 2) % 256) as i16;
            }
        }
        let sb = squeeze(&plane, w, h, levels);
        let lb = cdf53_lift(&plane, w, h, levels);
        assert_eq!(sb.len(), lb.len());
        for (s, l) in sb.iter().zip(lb.iter()) {
            assert_eq!(s.1, l.1, "band width must match squeeze geometry");
            assert_eq!(s.2, l.2, "band height must match squeeze geometry");
        }
        let back = cdf53_unlift(&lb, w, h, levels);
        assert_eq!(back, plane, "lifting round-trip");
    }
}
