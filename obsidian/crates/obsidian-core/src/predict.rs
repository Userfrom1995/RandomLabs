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

/// Predictor identities (0..=7), mirrored in the model's predictor map bytes.
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
}

pub const PREDICTOR_COUNT: usize = 8;

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
/// clamp to the nearest valid pixel; the top row uses `T = TL = TR = I[x][0]`).
pub fn neighbors(plane: &[i16], x: usize, y: usize, width: usize, _height: usize) -> Neighbors {
    let at = |xx: usize, yy: usize| plane[yy * width + xx] as i32;
    let lx = x.saturating_sub(1);
    let rx = (x + 1).min(width - 1);
    if y == 0 {
        let self_v = plane[x] as i32;
        Neighbors {
            l: at(lx, 0),
            t: self_v,
            tl: self_v,
            tr: self_v,
        }
    } else {
        let ly = y - 1;
        Neighbors {
            l: at(lx, y),
            t: at(x, ly),
            tl: at(lx, ly),
            tr: at(rx, ly),
        }
    }
}

/// Compute the prediction for a pixel given its neighborhood. The caller
/// clamps to the plane's value range.
pub fn predict(id: PredictorId, n: &Neighbors, w: Option<&WeightVec>) -> i32 {
    match id {
        PredictorId::Left => n.l,
        PredictorId::Top => n.t,
        PredictorId::Tl => n.tl,
        PredictorId::Tr => n.tr,
        PredictorId::Avg => (n.l + n.t) >> 1,
        PredictorId::Med => med(n),
        PredictorId::GapLite => gap_lite(n),
        PredictorId::Weighted => {
            let w = match w {
                Some(w) => w,
                None => return n.l,
            };
            weighted(n, w)
        }
    }
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

/// A CALIC-GAP-inspired gradient blend over the four causal neighbors
/// (simplified; constants tuned on Kodak in later iterations).
fn gap_lite(n: &Neighbors) -> i32 {
    let dh = (n.l - n.tl).abs();
    let dv = (n.t - n.tl).abs();
    let dd = (n.tr - n.tl).abs();
    if dv - dh > 80 {
        // Strong vertical edge: predict from above.
        return n.t;
    }
    if dh - dv > 80 {
        // Strong horizontal edge: predict from the left.
        return n.l;
    }
    let mut pred = (n.l + n.t) >> 1;
    let dmin = dh.min(dv);
    if dmin > 32 {
        // Textured: plain average is safer.
        return pred;
    }
    if dmin > 8 {
        // Mildly textured: soften the average.
        pred = (pred + n.l + n.t + 2) >> 2;
    }
    // Diagonal hint from the previous row.
    if dd < 16 {
        let diag = (n.tl + n.tr) >> 1;
        if (dh - dv).abs() < 24 {
            pred = (pred + diag) >> 1;
        } else if dh > dv {
            pred = (pred + n.t + 1) >> 1;
        } else {
            pred = (pred + n.l + 1) >> 1;
        }
    }
    pred
}

fn weighted(n: &Neighbors, w: &WeightVec) -> i32 {
    let acc = (w.wl as i32) * n.l + (w.wt as i32) * n.t + (w.wtl as i32) * n.tl + (w.wtr as i32) * n.tr;
    let shift = w.shift as u32;
    let half = 1i32 << (shift - 1);
    (acc + half) >> shift
}

/// Predict a single sample with clamping to the plane range.
pub fn predict_clamped(
    id: PredictorId,
    n: &Neighbors,
    w: Option<&WeightVec>,
    range: PlaneRange,
) -> i32 {
    range.clamp(predict(id, n, w))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn med_hand_vectors() {
        let n = Neighbors {
            l: 100,
            t: 90,
            tl: 95,
            tr: 0,
        };
        // tl(95) between min(90,100)=90 and max=100 -> L+T-TL = 100+90-95 = 95
        assert_eq!(predict(PredictorId::Med, &n, None), 95);
        let n2 = Neighbors {
            l: 200,
            t: 10,
            tl: 250,
            tr: 0,
        };
        // tl >= max(200,10) -> min = 10
        assert_eq!(predict(PredictorId::Med, &n2, None), 10);
        let n3 = Neighbors {
            l: 200,
            t: 10,
            tl: 0,
            tr: 0,
        };
        // tl <= min -> max = 200
        assert_eq!(predict(PredictorId::Med, &n3, None), 200);
    }

    #[test]
    fn border_rules() {
        // 1x1 image.
        let p = vec![42i16];
        let n = neighbors(&p, 0, 0, 1, 1);
        assert_eq!((n.l, n.t, n.tl, n.tr), (42, 42, 42, 42));

        // Top row, x=3 of width 5.
        let w = 5;
        let p: Vec<i16> = (0..w * 2).map(|i| i as i16).collect();
        let n = neighbors(&p, 3, 0, w, 2);
        assert_eq!(n.t, p[3] as i32);
        assert_eq!(n.tl, p[3] as i32);
        assert_eq!(n.tr, p[3] as i32);
        assert_eq!(n.l, p[2] as i32);

        // Left column, y=1: L clamps to itself at the same row (I[0][1]),
        // T/TL come from the row above.
        let n = neighbors(&p, 0, 1, w, 2);
        assert_eq!(n.l, p[5] as i32);
        assert_eq!(n.tl, p[0] as i32);
        assert_eq!(n.t, p[0] as i32);

        // Right column TR clamp: TR = I[w-1][y-1], T = I[w-1][0].
        let n = neighbors(&p, 4, 1, w, 2);
        assert_eq!(n.tr, p[4] as i32);
        assert_eq!(n.t, p[4] as i32);
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
        assert_eq!(predict(PredictorId::Weighted, &n, Some(&w)), 15);
        assert_eq!(predict(PredictorId::Weighted, &n, None), 10);
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
        assert_eq!(predict_clamped(PredictorId::Avg, &n, None, range), 255);
        let range2 = PlaneRange::U8;
        assert_eq!(predict_clamped(PredictorId::Avg, &n, None, range2), 255);
    }
}
