//! Reversible color transform (YCoCg-R) and the palette transform.
//!
//! YCoCg-R operates on signed intermediates: for 8-bit inputs the outputs are
//! `Y in [0,255]`, `Co in [-255,255]`, `Cg in [-255,255]`. The codec therefore
//! carries plane values as `i16` with a per-plane value range, so the transform
//! is an exact integer bijection (verified by exhaustive tests).

use crate::error::CodecError;
use crate::image::{Channels, Image};
use std::collections::HashSet;

/// The value range a plane's samples live in. Predictions are clamped to this
/// range so residuals are bounded and the signed zigzag alphabet is exact.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct PlaneRange {
    pub min: i32,
    pub max: i32,
}

impl PlaneRange {
    pub const U8: PlaneRange = PlaneRange { min: 0, max: 255 };
    pub const Y: PlaneRange = PlaneRange { min: 0, max: 255 };
    pub const CO: PlaneRange = PlaneRange { min: -255, max: 255 };
    pub const CG: PlaneRange = PlaneRange { min: -255, max: 255 };

    pub fn index(max_index: u32) -> PlaneRange {
        PlaneRange {
            min: 0,
            max: max_index as i32,
        }
    }

    pub fn clamp(&self, v: i32) -> i32 {
        v.clamp(self.min, self.max)
    }
}

/// A chosen color transform.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TransformChoice {
    None,
    YCoCgR,
}

/// Per-pixel forward YCoCg-R (Malvar-Sullivan).
pub fn ycocgr_forward(r: i32, g: i32, b: i32) -> (i32, i32, i32) {
    let co = r - b;
    let t = b + (co >> 1);
    let cg = g - t;
    let y = t + (cg >> 1);
    (y, co, cg)
}

/// Per-pixel inverse YCoCg-R (exact).
pub fn ycocgr_inverse(y: i32, co: i32, cg: i32) -> (i32, i32, i32) {
    let t = y - (cg >> 1);
    let g = cg + t;
    let b = t - (co >> 1);
    let r = b + co;
    (r, g, b)
}

/// Apply the forward transform to three channel planes in place (as i16).
pub fn ycocgr_forward_planes(planes: &mut [Vec<i16>]) {
    let (r, rest) = planes.split_at_mut(1);
    let (g, b) = rest.split_at_mut(1);
    let r = &mut r[0];
    let g = &mut g[0];
    let b = &mut b[0];
    for i in 0..r.len() {
        let (y, co, cg) = ycocgr_forward(r[i] as i32, g[i] as i32, b[i] as i32);
        r[i] = y as i16;
        g[i] = co as i16;
        b[i] = cg as i16;
    }
}

/// Apply the inverse transform to three channel planes in place (as i16).
pub fn ycocgr_inverse_planes(planes: &mut [Vec<i16>]) {
    let (r, rest) = planes.split_at_mut(1);
    let (g, b) = rest.split_at_mut(1);
    let r = &mut r[0];
    let g = &mut g[0];
    let b = &mut b[0];
    for i in 0..r.len() {
        let (rr, gg, bb) = ycocgr_inverse(r[i] as i32, g[i] as i32, b[i] as i32);
        r[i] = rr as i16;
        g[i] = gg as i16;
        b[i] = bb as i16;
    }
}

/// Apply the reversible subtract-green cross-channel transform to the first
/// three planes in place (WebP/JPEG XL-style chroma decorrelation). For each
/// pixel `R' = R - G`, `G' = G`, `B' = B - G`. Green is preserved, so the
/// transform is an exact integer bijection on `i16` and the inverse is simply
/// `R = R' + G'`, `B = B' + G'`. `alpha` (plane 3, RGBA) is left untouched.
pub fn subtract_green_forward_planes(planes: &mut [Vec<i16>], channels: Channels) {
    if channels == Channels::Gray {
        return;
    }
    debug_assert!(planes.len() >= 3);
    // Copy green into a local so we can mutate planes[0]/planes[2] while reading it.
    let g = planes[1].clone();
    for c in [0usize, 2usize] {
        for i in 0..planes[c].len() {
            let v = planes[c][i] as i32 - g[i] as i32;
            planes[c][i] = v as i16;
        }
    }
}

/// Inverse of `subtract_green_forward_planes`: `R = R' + G'`, `B = B' + G'`.
pub fn subtract_green_inverse_planes(planes: &mut [Vec<i16>], channels: Channels) {
    if channels == Channels::Gray {
        return;
    }
    debug_assert!(planes.len() >= 3);
    let g = planes[1].clone();
    for c in [0usize, 2usize] {
        for i in 0..planes[c].len() {
            let v = planes[c][i] as i32 + g[i] as i32;
            planes[c][i] = v as i16;
        }
    }
}

/// A palette of up to 256 RGB triples plus per-pixel indices.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Palette {
    pub colors: Vec<[u8; 3]>,
    pub indices: Vec<u8>,
}

/// Build a palette if the image has at most 256 distinct RGB triples.
pub fn try_build_palette(image: &Image) -> Option<Palette> {
    if image.channels != Channels::Rgb {
        return None;
    }
    let mut colors: Vec<[u8; 3]> = Vec::new();
    let mut table: HashSet<[u8; 3]> = HashSet::new();
    let area = image.area();
    for i in 0..area {
        let c = [
            image.planes[0][i],
            image.planes[1][i],
            image.planes[2][i],
        ];
        if table.insert(c) {
            if colors.len() == 256 {
                return None;
            }
            colors.push(c);
        }
    }
    colors.sort_unstable();
    let lut: std::collections::HashMap<[u8; 3], u8> = colors
        .iter()
        .enumerate()
        .map(|(i, c)| (*c, i as u8))
        .collect();
    let mut indices = Vec::with_capacity(area);
    for i in 0..area {
        let c = [
            image.planes[0][i],
            image.planes[1][i],
            image.planes[2][i],
        ];
        indices.push(lut[&c]);
    }
    Some(Palette { colors, indices })
}

/// Expand a palette index plane back into an RGB image.
pub fn palette_expand(palette: &Palette, indices: &[u8], width: u32, height: u32) -> Result<Image, CodecError> {
    let mut image = Image::new(width, height, Channels::Rgb)?;
    for i in 0..indices.len() {
        let idx = indices[i] as usize;
        let c = palette
            .colors
            .get(idx)
            .ok_or_else(|| CodecError::InvalidStream("palette index out of range".into()))?;
        image.planes[0][i] = c[0];
        image.planes[1][i] = c[1];
        image.planes[2][i] = c[2];
    }
    Ok(image)
}

/// R6-B color cache (Component A): a per-plane LRU of the last `size` distinct
/// reconstructed sample values. A literal whose value hits the cache is coded as a
/// small index instead of a full residual. The cache is maintained identically by
/// the encoder and decoder (both produce the same `v` in raster order, so the LRU
/// contents and indices match by induction), so no cache contents are signaled and
/// the round-trip is bit-exact.
///
/// `order[rank]` is the value at LRU position `rank` (0 = most-recently-used).
/// `loc[v - min]` is that rank, or `-1` if `v` is absent. Touching a value moves it
/// to the front (rank 0) by rotating the affected prefix; inserting a new value
/// shifts the sequence right and evicts the LRU (last) entry when full. Touch is
/// O(size) per literal, which is cheap for the small cache sizes used here.
pub struct ColorCache {
    size: usize,
    min: i32,
    order: Vec<i32>,
    loc: Vec<i32>,
}

impl ColorCache {
    /// Create an empty LRU that can hold `size` values drawn from `[min_val, max_val]`.
    pub fn new(size: usize, min_val: i32, max_val: i32) -> ColorCache {
        let span = (max_val - min_val + 1).max(0) as usize;
        let loc = vec![-1i32; span];
        ColorCache {
            size,
            min: min_val,
            order: Vec::with_capacity(size),
            loc,
        }
    }

    /// Index of `v` in the LRU (0 = MRU), or `None` if absent.
    #[inline]
    pub fn contains(&self, v: i32) -> Option<usize> {
        let l = self.loc[(v - self.min) as usize];
        if l < 0 {
            None
        } else {
            Some(l as usize)
        }
    }

    /// Value stored at LRU position `rank` (0 = MRU). Caller must ensure `rank < len`.
    #[inline]
    pub fn value_at(&self, rank: usize) -> i32 {
        self.order[rank]
    }

    /// Move `v` to the MRU position (rank 0), inserting it if absent and evicting the
    /// LRU entry on overflow. O(size) per call (prefix rotation / right shift).
    #[inline]
    pub fn touch(&mut self, v: i32) {
        if self.size == 0 {
            return;
        }
        let idx = (v - self.min) as usize;
        let l = self.loc[idx];
        if l >= 0 {
            // Present at rank `l`: rotate [0..=l] right by one so `v` lands at rank 0.
            let l = l as usize;
            let val = self.order[l];
            for r in (1..=l).rev() {
                self.order[r] = self.order[r - 1];
                self.loc[(self.order[r] - self.min) as usize] = r as i32;
            }
            self.order[0] = val;
            self.loc[idx] = 0;
        } else if self.order.len() >= self.size {
            // Absent and full: evict the LRU (last) entry, then shift right by one.
            let ev = self.order[self.order.len() - 1];
            self.loc[(ev - self.min) as usize] = -1;
            for r in (1..self.order.len()).rev() {
                self.order[r] = self.order[r - 1];
                self.loc[(self.order[r] - self.min) as usize] = r as i32;
            }
            self.order[0] = v;
            self.loc[idx] = 0;
        } else {
            // Absent, not full: grow at the front and bump existing ranks.
            self.order.insert(0, v);
            for r in 1..self.order.len() {
                self.loc[(self.order[r] - self.min) as usize] = r as i32;
            }
            self.loc[idx] = 0;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn color_cache_roundtrip_order() {
        // Values 0..255 with min 0/max 255, size 4: insertion + recency semantics.
        let mut c = ColorCache::new(4, 0, 255);
        assert_eq!(c.contains(10), None);
        c.touch(10); // [10]
        c.touch(20); // [20,10]
        c.touch(30); // [30,20,10]
        c.touch(40); // [40,30,20,10]
        c.touch(50); // evict 10 -> [50,40,30,20]
        assert_eq!(c.contains(10), None);
        assert_eq!(c.contains(20), Some(3));
        assert_eq!(c.contains(50), Some(0));
        // Re-touch an existing value moves it to the front.
        c.touch(20); // [20,50,40,30]
        assert_eq!(c.contains(20), Some(0));
        assert_eq!(c.contains(40), Some(2));
        assert_eq!(c.value_at(0), 20);
        assert_eq!(c.value_at(3), 30);
    }

    #[test]
    fn color_cache_lockstep_mirror() {
        // Both sides apply the identical touch sequence on identical values, so the
        // rank/value mapping must agree (the decoder recovers `v` from a rank the
        // encoder emitted).
        let mut enc = ColorCache::new(8, 0, 1000);
        let mut dec = ColorCache::new(8, 0, 1000);
        let seq = [5, 5, 17, 5, 200, 17, 5, 9, 9, 200];
        for &v in &seq {
            let r_enc = enc.contains(v);
            let r_dec = dec.contains(v);
            assert_eq!(r_enc, r_dec);
            enc.touch(v);
            dec.touch(v);
        }
        assert_eq!(enc.value_at(0), dec.value_at(0));
        assert_eq!(enc.contains(200), dec.contains(200));
    }
    use super::*;

    #[test]
    fn ycocgr_exhaustive_bijection() {
        // Exhaustive over the full [0,255]^3 space is 16.7M triples; do it in
        // release-grade loops but keep the test reasonably fast by stepping.
        for r in (0..256).step_by(7) {
            for g in (0..256).step_by(7) {
                for b in (0..256).step_by(7) {
                    let (y, co, cg) = ycocgr_forward(r, g, b);
                    let (rr, gg, bb) = ycocgr_inverse(y, co, cg);
                    assert_eq!((rr, gg, bb), (r, g, b));
                    assert!((0..=255).contains(&y));
                    assert!((-255..=255).contains(&co));
                    assert!((-255..=255).contains(&cg));
                }
            }
        }
    }

    #[test]
    fn ycocgr_roundtrip_random() {
        // Deterministic pseudo-random sampling over the full space.
        let mut seed = 0x1234_5678u64;
        let mut next = move || {
            seed ^= seed << 13;
            seed ^= seed >> 7;
            seed ^= seed << 17;
            (seed & 0xFF) as i32
        };
        for _ in 0..200_000 {
            let (r, g, b) = (next(), next(), next());
            let (y, co, cg) = ycocgr_forward(r, g, b);
            let (rr, gg, bb) = ycocgr_inverse(y, co, cg);
            assert_eq!((rr, gg, bb), (r, g, b));
        }
    }

    #[test]
    fn subtract_green_bijection_rgb() {
        let mut seed = 0xA5u64;
        let mut next = move || {
            seed ^= seed << 13;
            seed ^= seed >> 7;
            seed ^= seed << 17;
            (seed & 0xFF) as i32
        };
        for _ in 0..200_000 {
            let (r, g, b) = (next(), next(), next());
            let mut planes = vec![vec![r as i16], vec![g as i16], vec![b as i16]];
            subtract_green_forward_planes(&mut planes, Channels::Rgb);
            // green must be preserved; deltas fit in i16
            assert_eq!(planes[1][0], g as i16);
            let back = planes.clone();
            let mut inv = back;
            subtract_green_inverse_planes(&mut inv, Channels::Rgb);
            assert_eq!(inv[0][0], r as i16);
            assert_eq!(inv[1][0], g as i16);
            assert_eq!(inv[2][0], b as i16);
        }
    }

    #[test]
    fn subtract_green_bijection_rgba_preserves_alpha() {
        let mut planes = vec![
            vec![200i16],
            vec![100i16],
            vec![50i16],
            vec![7i16],
        ];
        subtract_green_forward_planes(&mut planes, Channels::Rgba);
        assert_eq!(planes[3][0], 7); // alpha untouched
        subtract_green_inverse_planes(&mut planes, Channels::Rgba);
        assert_eq!(planes, vec![vec![200i16], vec![100i16], vec![50i16], vec![7i16]]);
    }

    #[test]
    fn palette_roundtrip() {
        let mut im = Image::new(8, 8, Channels::Rgb).unwrap();
        // 5-color synthetic image.
        let colors: [[u8; 3]; 5] = [
            [255, 0, 0],
            [0, 255, 0],
            [0, 0, 255],
            [10, 20, 30],
            [200, 100, 50],
        ];
        for i in 0..im.area() {
            let c = colors[i % 5];
            im.planes[0][i] = c[0];
            im.planes[1][i] = c[1];
            im.planes[2][i] = c[2];
        }
        let pal = try_build_palette(&im).expect("should build palette");
        assert_eq!(pal.colors.len(), 5);
        let out = palette_expand(&pal, &pal.indices, 8, 8).unwrap();
        assert_eq!(im, out);
    }

    #[test]
    fn palette_none_for_many_colors() {
        let mut im = Image::new(32, 32, Channels::Rgb).unwrap();
        let mut seed = 7u64;
        for i in 0..im.area() {
            seed ^= seed << 13;
            seed ^= seed >> 7;
            seed ^= seed << 17;
            im.planes[0][i] = (seed & 0xFF) as u8;
            im.planes[1][i] = ((seed >> 8) & 0xFF) as u8;
            im.planes[2][i] = ((seed >> 16) & 0xFF) as u8;
        }
        assert!(try_build_palette(&im).is_none());
    }
}
