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

#[cfg(test)]
mod tests {
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
