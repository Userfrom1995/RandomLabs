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
use crate::predict::{default_weight_codebook, neighbors, predict_clamped, PredictorId, WeightVec};
use crate::rans::RansTable;
use std::io::{Read, Write};

/// Per-plane model: a predictor map over all contexts plus the chosen weight
/// vector index.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PlaneModel {
    pub map: Vec<u8>,
    /// Index into the weight codebook, or `u8::MAX` when no Weighted use.
    pub weight_index: u8,
}

/// The complete signaled model.
pub struct ModelConfig {
    pub transform: TransformChoice,
    pub palette: Option<Palette>,
    pub context: ContextParams,
    pub context_count: usize,
    pub planes: Vec<PlaneModel>,
    pub weight_codebook: Vec<WeightVec>,
    /// Static per-context histograms, `[plane][context]`, when effort >= 6.
    pub static_histograms: Option<Vec<Vec<Option<Vec<(u32, u32)>>>>>,
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
}

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
            let pred = predict_clamped(PredictorId::Med, &nb, None, range);
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
) -> ModelConfig {
    let context_count = context.context_count();
    let cm = ContextModel::new(*context);
    let mut model = ModelConfig {
        transform: TransformChoice::None,
        palette: None,
        context: *context,
        context_count,
        planes: Vec::new(),
        weight_codebook: weight_codebook.to_vec(),
        static_histograms: None,
    };

    let predictors = predictors_for(effort);
    let include_weighted = predictors.contains(&PredictorId::Weighted);

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
                        let pred = predict_clamped(PredictorId::Weighted, &nb, Some(w), range);
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

        // Per-context predictor selection by cost.
        let mut ctx_costs: Vec<Vec<u64>> = vec![vec![0u64; predictors.len()]; context_count];
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
                    let pred = predict_clamped(p, &nb, wv, range);
                    ctx_costs[cid][k] += zigzag(v - pred) as u64;
                }
            }
        }
        let mut best_pred: Vec<u8> = vec![predictors[0].to_u8(); context_count];
        for cid in 0..context_count {
            let mut best_k = 0usize;
            let mut best_c = u64::MAX;
            for (k, &c) in ctx_costs[cid].iter().enumerate() {
                if c < best_c {
                    best_c = c;
                    best_k = k;
                }
            }
            best_pred[cid] = predictors[best_k].to_u8();
        }
        model
            .planes
            .push(PlaneModel {
                map: best_pred,
                weight_index,
            });
    }

    // Static histograms at effort >= 6.
    if effort >= 6 {
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
                    let pred = predict_clamped(p, &nb, wv.as_ref(), range);
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

/// A default model (effort 0): MED everywhere, no analysis.
pub fn default_model(
    planes: &[Vec<i16>],
    context: &ContextParams,
    weight_codebook: &[WeightVec],
) -> ModelConfig {
    let context_count = context.context_count();
    let planes: Vec<PlaneModel> = planes
        .iter()
        .map(|_| PlaneModel {
            map: vec![PredictorId::Med.to_u8(); context_count],
            weight_index: u8::MAX,
        })
        .collect();
    ModelConfig {
        transform: TransformChoice::None,
        palette: None,
        context: *context,
        context_count,
        planes,
        weight_codebook: weight_codebook.to_vec(),
        static_histograms: None,
    }
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

    Ok(ModelConfig {
        transform,
        palette,
        context,
        context_count,
        planes,
        weight_codebook: default_weight_codebook(),
        static_histograms,
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
pub fn plane_ranges(channels: Channels, transform: TransformChoice, palette_max: Option<u32>) -> Vec<PlaneRange> {
    if let Some(mx) = palette_max {
        return vec![PlaneRange::index(mx)];
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
        let model = analyze(&planes, &ranges, width, height, 5, &context, &codebook);
        let mut bytes = Vec::new();
        write_model(&mut bytes, &model).unwrap();
        let sizes = alphabet_sizes(&ranges);
        let back = read_model(&mut std::io::Cursor::new(bytes), &sizes).unwrap();
        assert_eq!(back.transform, model.transform);
        assert_eq!(back.planes, model.planes);
        assert_eq!(back.context_count, model.context_count);
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
        let model = analyze(&[plane], &ranges, width, height, 7, &context, &codebook);
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
}
