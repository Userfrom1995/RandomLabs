//! Context model: quantized causal gradients with sign symmetry, an activity
//! class, border-dedicated contexts, and the signed zigzag residual mapping.

use crate::predict::Neighbors;

/// Gradient quantization thresholds (9 bins from the 7 threshold boundaries).
pub const GRAD_THRESHOLDS: [i32; 7] = [-16, -4, -1, 0, 1, 4, 16];

/// Quantize a signed gradient to a bin in `0..=8`.
pub fn quantize_gradient(g: i32) -> usize {
    if g < GRAD_THRESHOLDS[0] {
        0
    } else if g < GRAD_THRESHOLDS[1] {
        1
    } else if g < GRAD_THRESHOLDS[2] {
        2
    } else if g < GRAD_THRESHOLDS[3] {
        3
    } else if g == GRAD_THRESHOLDS[3] {
        4
    } else if g <= GRAD_THRESHOLDS[4] {
        5
    } else if g <= GRAD_THRESHOLDS[5] {
        6
    } else if g <= GRAD_THRESHOLDS[6] {
        7
    } else {
        8
    }
}

/// Sign-symmetry LUT: maps a 729-value `(q1,q2,q3)` triple index to a reduced
/// context id in `0..365` (JPEG-LS style: `Q(-g) = flip(Q(g))`, triples and
/// their negation share a context).
pub struct SignSymmetryLut {
    reduced: [u16; 729],
}

impl SignSymmetryLut {
    pub fn new() -> SignSymmetryLut {
        let mut reduced = [0u16; 729];
        let mut seen = [false; 729];
        let mut counter = 0u16;
        for id in 0..729u16 {
            if seen[id as usize] {
                continue;
            }
            let (q1, q2, q3) = unpack(id);
            let mirror = pack(flip(q1), flip(q2), flip(q3));
            reduced[id as usize] = counter;
            seen[id as usize] = true;
            reduced[mirror as usize] = counter;
            seen[mirror as usize] = true;
            counter += 1;
        }
        debug_assert_eq!(counter, 365);
        SignSymmetryLut { reduced }
    }

    pub fn reduce(&self, id: usize) -> usize {
        self.reduced[id] as usize
    }
}

fn unpack(id: u16) -> (usize, usize, usize) {
    let q1 = (id / 81) as usize;
    let q2 = ((id % 81) / 9) as usize;
    let q3 = (id % 9) as usize;
    (q1, q2, q3)
}

fn pack(q1: usize, q2: usize, q3: usize) -> u16 {
    (q1 * 81 + q2 * 9 + q3) as u16
}

fn flip(q: usize) -> usize {
    8 - q
}

/// Context model parameters (fixed in v1; tunable in later iterations).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ContextParams {
    /// How many bits to shift the 365 base context ids (`base >> base_shift`).
    pub base_shift: u8,
    /// Number of activity classes.
    pub activity_classes: u8,
    /// Activity threshold scale (activity = min(classes-1, |g1|+|g2|+|g3| / scale)).
    pub activity_scale: u32,
}

impl Default for ContextParams {
    fn default() -> Self {
        ContextParams {
            base_shift: 3,
            activity_classes: 2,
            activity_scale: 64,
        }
    }
}

impl ContextParams {
    /// Number of interior contexts: `(1 + (364 >> base_shift)) * activity_classes`.
    /// The +1 covers base ids in `[0, 364]`, whose top bucket can reach
    /// `364 >> base_shift`.
    pub fn interior_count(&self) -> usize {
        ((364usize >> self.base_shift) + 1) * self.activity_classes as usize
    }

    /// Total context count including the three border contexts.
    pub fn context_count(&self) -> usize {
        self.interior_count() + BORDER_COUNT
    }
}

/// Border regions: top-left corner, top row (non-corner), left column
/// (non-corner). Interior pixels use the gradient contexts.
pub const BORDER_COUNT: usize = 3;

/// Border region id for a pixel (0 = interior). Returns `None` for interior.
pub fn border_region(x: usize, y: usize) -> Option<usize> {
    if x == 0 && y == 0 {
        Some(0)
    } else if y == 0 {
        Some(1)
    } else if x == 0 {
        Some(2)
    } else {
        None
    }
}

/// A reusable per-plane context indexer.
pub struct ContextModel {
    pub params: ContextParams,
    lut: SignSymmetryLut,
}

impl ContextModel {
    pub fn new(params: ContextParams) -> ContextModel {
        ContextModel {
            params,
            lut: SignSymmetryLut::new(),
        }
    }

    /// The default per-plane context count used when no analysis is performed.
    pub fn default_context_count(&self) -> usize {
        self.params.context_count()
    }

    /// Interior context id for the given gradients.
    pub fn interior_context(&self, g1: i32, g2: i32, g3: i32) -> usize {
        let q1 = quantize_gradient(g1);
        let q2 = quantize_gradient(g2);
        let q3 = quantize_gradient(g3);
        let base = self.lut.reduce(pack(q1, q2, q3) as usize);
        let activity = self.activity_class(g1, g2, g3);
        ((base >> self.params.base_shift) * self.params.activity_classes as usize) + activity
    }

    fn activity_class(&self, g1: i32, g2: i32, g3: i32) -> usize {
        let s = (g1.abs() + g2.abs() + g3.abs()) as u32;
        let scale = self.params.activity_scale.max(1);
        let c = (s / scale) as usize;
        c.min(self.params.activity_classes as usize - 1)
    }

    /// Final context id for a pixel: interior contexts for interior pixels,
    /// reserved border ids otherwise.
    pub fn context_id(&self, n: &Neighbors, x: usize, y: usize) -> usize {
        if let Some(br) = border_region(x, y) {
            return self.params.interior_count() + br;
        }
        let g1 = n.t - n.l;
        let g2 = n.l - n.tl;
        let g3 = n.tl - n.t;
        self.interior_context(g1, g2, g3)
    }
}

/// Signed zigzag: residual `r` (any i32 in a bounded range) -> non-negative
/// symbol. `r >= 0` -> `2r` (even), `r < 0` -> `2|r| - 1` (odd). Exact inverse
/// of `unzigzag`.
pub fn zigzag(r: i32) -> u32 {
    if r >= 0 {
        (r as u32) << 1
    } else {
        (((-r) as u32) << 1) - 1
    }
}

/// Inverse of `zigzag`.
pub fn unzigzag(u: u32) -> i32 {
    if u & 1 == 0 {
        (u >> 1) as i32
    } else {
        -(((u + 1) >> 1) as i32)
    }
}

/// A residual-symbol alphabet descriptor: the number of rANS symbols needed.
/// For a plane whose samples live in `[min, max]` with predictions clamped to
/// the same range, the residual range is `[min - max, max - min]`, so the
/// symbol range is `[0, 2*(max - min)]`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Alphabet {
    pub size: usize,
    pub max_symbol: u32,
}

impl Alphabet {
    pub fn for_range(min: i32, max: i32) -> Alphabet {
        let span = max - min;
        let max_symbol = 2 * span as u32;
        // Round up to a power of two so rANS table sizing stays simple.
        let mut size = 1;
        while size <= max_symbol as usize {
            size <<= 1;
        }
        Alphabet { size, max_symbol }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn gradient_bins_symmetric() {
        for g in -300..=300 {
            assert_eq!(quantize_gradient(-g), flip(quantize_gradient(g)));
        }
    }

    #[test]
    fn sign_symmetry_lut_reduces_to_365() {
        let lut = SignSymmetryLut::new();
        let mut set = std::collections::BTreeSet::new();
        for q1 in 0..9 {
            for q2 in 0..9 {
                for q3 in 0..9 {
                    set.insert(lut.reduce(pack(q1, q2, q3) as usize));
                }
            }
        }
        assert_eq!(set.len(), 365);
        // Negation maps to the same context.
        for q1 in 0..9 {
            for q2 in 0..9 {
                for q3 in 0..9 {
                    let a = lut.reduce(pack(q1, q2, q3) as usize);
                    let b = lut.reduce(pack(flip(q1), flip(q2), flip(q3)) as usize);
                    assert_eq!(a, b);
                }
            }
        }
    }

    #[test]
    fn zigzag_bijection() {
        for r in -600..=600 {
            let u = zigzag(r);
            assert_eq!(unzigzag(u), r);
        }
        // Small residuals map to small symbols.
        assert_eq!(zigzag(0), 0);
        assert_eq!(zigzag(1), 2);
        assert_eq!(zigzag(-1), 1);
        assert_eq!(zigzag(255), 510);
        assert_eq!(zigzag(-255), 509);
    }

    #[test]
    fn context_borders_distinct() {
        let m = ContextModel::new(ContextParams::default());
        let n = Neighbors {
            l: 0,
            t: 0,
            tl: 0,
            tr: 0,
        };
        // Interior id must differ from border ids.
        let interior = m.context_id(&n, 5, 5);
        assert!(interior < m.params.interior_count());
        let corner = m.context_id(&n, 0, 0);
        let top = m.context_id(&n, 3, 0);
        let left = m.context_id(&n, 0, 3);
        assert_eq!(corner, m.params.interior_count() + 0);
        assert_eq!(top, m.params.interior_count() + 1);
        assert_eq!(left, m.params.interior_count() + 2);
        assert_ne!(corner, interior);
    }

    #[test]
    fn alphabet_for_ranges() {
        let a8 = Alphabet::for_range(0, 255);
        assert_eq!(a8.max_symbol, 510);
        assert_eq!(a8.size, 512);
        let atr = Alphabet::for_range(-255, 255);
        assert_eq!(atr.max_symbol, 1020);
        assert_eq!(atr.size, 1024);
    }
}
