//! The encoder: transform/palette selection, model analysis, and the rANS
//! coding pass.
//!
//! Effort levels change only how the encoder searches the model (per the
//! spec): the bitstream format is identical for all efforts.

use crate::color::{
    try_build_palette, ycocgr_forward_planes, Palette, PlaneRange, TransformChoice,
};
use crate::context::{zigzag, ContextModel, ContextParams};
use crate::crc32::crc32;
use crate::error::CodecError;
use crate::header::{Header, HEADER_LEN};
use crate::image::{Channels, Image};
use crate::model::{
    alphabet_sizes, analyze, build_static_tables, default_model, estimate_cost, plane_ranges,
    write_model, ModelConfig,
};
use crate::predict::{default_weight_codebook, neighbors, predict_clamped};
use crate::rans::{RansEncoder, RansTable};


/// Static tables are considered at effort >= 6 only for images at least this
/// large (in pixels across all planes); for smaller images the model-section
/// overhead exceeds the coding savings.
pub const STATIC_MIN_PIXELS: usize = 200_000;
/// If the model section exceeds this fraction of total output, the encoder
/// falls back to a simpler model (single global context, no static tables)
/// and re-measures, per the architecture's model-size guard.
pub const MODEL_SIZE_FRACTION: f64 = 0.04;

/// Bits used to pack a dry-run `(freq, cum)` pair into a single `u32`. Max
/// frequency is `M == 4096` (needs 13 bits); cumulative is below `M` (12 bits).
const FREQ_BITS: u32 = 13;
const FREQ_MASK: u32 = (1 << FREQ_BITS) - 1;

/// Statistics for a completed encode.
#[derive(Debug, Clone)]
pub struct EncodeStats {
    pub effort: u8,
    pub transform: TransformChoice,
    pub palette: bool,
    pub model_bytes: usize,
    pub payload_bytes: usize,
    pub total_bytes: usize,
    pub bpp: f64,
    pub encode_ms: f64,
    pub decode_ms: f64,
    pub chosen_predictor_counts: [usize; 8],
    pub planes: usize,
    /// Whether the final model used static tables (false when the model-size
    /// guard fell back to adaptive tables).
    pub static_tables: bool,
}

/// Encode an image at an effort level, returning the container bytes and stats.
pub fn encode(image: &Image, effort: u8) -> Result<(Vec<u8>, EncodeStats), CodecError> {
    if effort > 7 {
        return Err(CodecError::InvalidImage(format!("effort {effort} out of range")));
    }
    let raw = image.raw_bytes();
    let crc = crc32(&raw);

    // Candidate plane sets.
    let area = image.area();
    let mut base_planes: Vec<Vec<i16>> = image
        .planes
        .iter()
        .map(|p| p.iter().map(|&v| v as i16).collect())
        .collect();

    let can_transform = image.channels != Channels::Gray;
    let mut transform = TransformChoice::None;
    if can_transform {
        // Measure MED cost with and without YCoCg-R; pick the cheaper.
        let ranges_none = plane_ranges(image.channels, TransformChoice::None, None);
        let cost_none: u64 = (0..ranges_none.len())
            .map(|c| estimate_cost(&base_planes[c], ranges_none[c], image.width as usize, image.height as usize))
            .sum();
        let mut transformed = base_planes.clone();
        ycocgr_forward_planes(&mut transformed);
        let ranges_tr = plane_ranges(image.channels, TransformChoice::YCoCgR, None);
        let cost_tr: u64 = (0..ranges_tr.len())
            .map(|c| estimate_cost(&transformed[c], ranges_tr[c], image.width as usize, image.height as usize))
            .sum();
        if cost_tr < cost_none {
            transform = TransformChoice::YCoCgR;
            base_planes = transformed;
        }
    }

    // Palette selection at effort >= 7.
    let mut palette: Option<Palette> = None;
    let mut palette_planes: Option<Vec<Vec<i16>>> = None;
    let palette_max = if image.channels == Channels::Rgb && effort >= 7 {
        if let Some(pal) = try_build_palette(image) {
            let idx_planes = vec![pal.indices.iter().map(|&v| v as i16).collect::<Vec<i16>>()];
            let idx_range = PlaneRange::index(pal.colors.len() as u32 - 1);
            let idx_cost = estimate_cost(&idx_planes[0], idx_range, image.width as usize, image.height as usize);
            let rgb_ranges = plane_ranges(image.channels, transform, None);
            let rgb_cost: u64 = (0..rgb_ranges.len())
                .map(|c| estimate_cost(&base_planes[c], rgb_ranges[c], image.width as usize, image.height as usize))
                .sum();
            if idx_cost < rgb_cost {
                palette = Some(pal);
                palette_planes = Some(idx_planes);
            }
        }
        palette.as_ref().map(|p| p.colors.len() as u32 - 1)
    } else {
        None
    };

    let coding_planes: &[Vec<i16>] = if let Some(pp) = &palette_planes {
        pp
    } else {
        &base_planes
    };
    let channels_for_model = if palette.is_some() {
        Channels::Gray
    } else {
        image.channels
    };
    let _ = channels_for_model;

    let ranges = if let Some(mx) = palette_max {
        vec![PlaneRange::index(mx)]
    } else {
        plane_ranges(image.channels, transform, None)
    };
    let sizes = alphabet_sizes(&ranges);
    let width = image.width as usize;
    let height = image.height as usize;
    let context = ContextParams::default();
    let codebook = default_weight_codebook();

    // Build the model.
    let mut model: ModelConfig = if effort == 0 {
        default_model(coding_planes, &context, &codebook)
    } else {
        analyze(
            coding_planes,
            &ranges,
            width,
            height,
            effort,
            &context,
            &codebook,
        )
    };
    model.transform = if palette.is_some() {
        TransformChoice::None
    } else {
        transform
    };
    model.palette = palette.clone();

    // Static tables decision (effort >= 6, large images). The model-size
    // guard is measured AFTER coding, on the actual model and payload sizes:
    // if the static model section exceeds MODEL_SIZE_FRACTION of the total
    // output, the encoder falls back to a simpler single-context adaptive
    // model (architecture: model-size guard) and re-codes.
    let total_pixels = area * coding_planes.len();
    let use_static = effort >= 6
        && total_pixels >= STATIC_MIN_PIXELS
        && model.static_histograms.is_some();

    // Serialize the model (a guard fallback below may rebuild and re-serialize).
    let mut model_bytes = Vec::new();
    write_model(&mut model_bytes, &model)?;

    // Coding pass (shared by the initial attempt and the guard re-code).
    let start = std::time::Instant::now();
    let mut coded = code_planes(coding_planes, &ranges, &sizes, width, height, &model)?;
    if use_static {
        let payload_total: usize = coded.streams.iter().map(|s| s.len()).sum();
        let fixed_overhead = HEADER_LEN + 4 + 4 * coding_planes.len();
        let frac = model_bytes.len() as f64
            / (model_bytes.len() + payload_total + fixed_overhead) as f64;
        if frac > MODEL_SIZE_FRACTION {
            // The static model dominates the output: fall back to a simpler
            // model (one global context per plane, no static tables) and
            // re-code. The roundtrip stays exact because the decoder consumes
            // the serialized (fallback) model.
            model = default_model(coding_planes, &context, &codebook);
            model.transform = if palette.is_some() {
                TransformChoice::None
            } else {
                transform
            };
            model.palette = palette.clone();
            model_bytes.clear();
            write_model(&mut model_bytes, &model)?;
            coded = code_planes(coding_planes, &ranges, &sizes, width, height, &model)?;
        }
    }
    let streams = coded.streams;
    let chosen_counts = coded.chosen_counts;
    let encode_ms = start.elapsed().as_secs_f64() * 1000.0;

    // Assemble the container.
    let mut out = Vec::new();
    let channels_flag = if palette.is_some() {
        Channels::Gray
    } else {
        image.channels
    };
    let mut flags = channels_flag.to_u8();
    if model.transform == TransformChoice::YCoCgR {
        flags |= 0x04;
    }
    if model.palette.is_some() {
        flags |= 0x08;
    }
    let header = Header {
        flags,
        effort,
        width: image.width,
        height: image.height,
        crc32: crc,
    };
    header.write(&mut out)?;
    out.extend_from_slice(&(model_bytes.len() as u32).to_le_bytes());
    out.extend_from_slice(&model_bytes);
    // Payload: per-plane lengths then streams.
    for s in &streams {
        out.extend_from_slice(&(s.len() as u32).to_le_bytes());
    }
    for s in &streams {
        out.extend_from_slice(s);
    }
    let total_bytes = out.len();
    let payload_bytes: usize = streams.iter().map(|s| s.len()).sum::<usize>() + streams.len() * 4;
    let bpp = (total_bytes as f64 * 8.0) / (area as f64);

    Ok((
        out,
        EncodeStats {
            effort,
            transform: model.transform,
            palette: model.palette.is_some(),
            model_bytes: model_bytes.len(),
            payload_bytes,
            total_bytes,
            bpp,
            encode_ms,
            decode_ms: 0.0,
            chosen_predictor_counts: chosen_counts,
            planes: coding_planes.len(),
            static_tables: model.static_histograms.is_some(),
        },
    ))
}

/// Result of the rANS coding pass: the per-plane streams and the predictor
/// usage counts.
struct CodedPlanes {
    streams: Vec<Vec<u8>>,
    chosen_counts: [usize; 8],
}

/// The per-plane rANS coding pass for `model`. Shared by the initial encode
/// and the model-size-guard re-code.
fn code_planes(
    coding_planes: &[Vec<i16>],
    ranges: &[PlaneRange],
    sizes: &[usize],
    width: usize,
    height: usize,
    model: &ModelConfig,
) -> Result<CodedPlanes, CodecError> {
    let cm = ContextModel::new(model.context);
    let mut chosen_counts = [0usize; 8];
    let mut streams: Vec<Vec<u8>> = Vec::with_capacity(coding_planes.len());
    for pi in 0..coding_planes.len() {
        let alphabet = sizes[pi];
        let mut enc = RansEncoder::new();
        let wv = model.weight_for(pi);
        if let Some(static_hist) = &model.static_histograms {
            let built = build_static_tables(static_hist, sizes);
            let mut tables = built.into_iter().nth(pi).unwrap();
            for y in (0..height).rev() {
                for x in (0..width).rev() {
                    let idx = y * width + x;
                    let nb = neighbors(&coding_planes[pi], x, y, width, height);
                    let cid = cm.context_id(&nb, x, y) % model.context_count;
                    let table = tables
                        .get_mut(cid)
                        .and_then(|t| t.as_mut())
                        .ok_or_else(|| {
                            CodecError::InvalidStream(format!("no static table for context {cid}"))
                        })?;
                    let p = model.predictor(pi, cid);
                    let pred = predict_clamped(p, &nb, wv.as_ref(), ranges[pi]);
                    let r = coding_planes[pi][idx] as i32 - pred;
                    enc.put(zigzag(r) as usize, table);
                    chosen_counts[p.to_u8() as usize] += 1;
                }
            }
        } else {
            let mut tables: Vec<RansTable> = (0..model.context_count)
                .map(|_| RansTable::new_adaptive(alphabet))
                .collect();
            // Adaptive lockstep: the decoder evolves its tables forward while
            // decoding, so the encoder cannot adapt live while coding in
            // reverse. Run a forward dry-run pass that evolves the tables
            // exactly as the decoder will and records each symbol's (freq, cum)
            // BEFORE the update; the reverse pass then replays them via put_fc.
            let area = width * height;
            let mut plan: Vec<u32> = Vec::with_capacity(area);
            for y in 0..height {
                for x in 0..width {
                    let idx = y * width + x;
                    let nb = neighbors(&coding_planes[pi], x, y, width, height);
                    let cid = cm.context_id(&nb, x, y) % model.context_count;
                    let p = model.predictor(pi, cid);
                    let pred = predict_clamped(p, &nb, wv.as_ref(), ranges[pi]);
                    let r = coding_planes[pi][idx] as i32 - pred;
                    let sym = zigzag(r) as usize;
                    let (f, c) = tables[cid].lookup(sym);
                    plan.push((c << FREQ_BITS) | f);
                    tables[cid].adapt(sym);
                    chosen_counts[p.to_u8() as usize] += 1;
                }
            }
            for y in (0..height).rev() {
                for x in (0..width).rev() {
                    let idx = y * width + x;
                    let nb = neighbors(&coding_planes[pi], x, y, width, height);
                    let cid = cm.context_id(&nb, x, y) % model.context_count;
                    let p = model.predictor(pi, cid);
                    let pred = predict_clamped(p, &nb, wv.as_ref(), ranges[pi]);
                    let r = coding_planes[pi][idx] as i32 - pred;
                    let packed = plan[idx];
                    let (f, c) = (packed & FREQ_MASK, packed >> FREQ_BITS);
                    enc.put_fc(zigzag(r) as usize, f, c);
                }
            }
        }
        streams.push(enc.finish());
    }
    Ok(CodedPlanes {
        streams,
        chosen_counts,
    })
}

/// Encode then decode, returning the reconstructed image for the fidelity gate.
pub fn roundtrip(
    image: &Image,
    effort: u8,
) -> Result<(Vec<u8>, EncodeStats, Image), CodecError> {
    let (bytes, stats) = encode(image, effort)?;
    let start = std::time::Instant::now();
    let decoded = crate::decoder::decode(&bytes)?;
    let decode_ms = start.elapsed().as_secs_f64() * 1000.0;
    let mut stats = stats;
    stats.decode_ms = decode_ms;
    if &decoded != image {
        return Err(CodecError::InvalidImage(
            "roundtrip fidelity failure".into(),
        ));
    }
    Ok((bytes, stats, decoded))
}

/// Deterministic pseudo-random image generator for the fuzz gate.
pub struct FuzzGen {
    seed: u64,
}

impl FuzzGen {
    pub fn new(seed: u64) -> FuzzGen {
        FuzzGen { seed }
    }

    pub fn next_u64(&mut self) -> u64 {
        self.seed ^= self.seed << 13;
        self.seed ^= self.seed >> 7;
        self.seed ^= self.seed << 17;
        self.seed
    }

    pub fn next_u8(&mut self) -> u8 {
        (self.next_u64() & 0xFF) as u8
    }

    pub fn random_image(&mut self) -> Image {
        let w = 1 + (self.next_u64() % 48) as u32;
        let h = 1 + (self.next_u64() % 48) as u32;
        let mode = self.next_u64() % 6;
        let channels = match self.next_u64() % 3 {
            0 => Channels::Gray,
            1 => Channels::Rgb,
            _ => Channels::Rgba,
        };
        let mut img = Image::new(w, h, channels).unwrap();
        let area = img.area();
        let n = img.plane_count();
        for c in 0..n {
            match mode {
                0 => {
                    // Flat color.
                    let v = self.next_u8();
                    for i in 0..area {
                        img.planes[c][i] = v;
                    }
                }
                1 => {
                    // Horizontal gradient.
                    for y in 0..h as usize {
                        for x in 0..w as usize {
                            img.planes[c][y * w as usize + x] = (x as u8).wrapping_add(self.next_u8() & 0x0F);
                        }
                    }
                }
                2 => {
                    // Vertical stripes.
                    for y in 0..h as usize {
                        for x in 0..w as usize {
                            img.planes[c][y * w as usize + x] = ((y & 1) * 255) as u8;
                        }
                    }
                }
                3 => {
                    // Noise.
                    for i in 0..area {
                        img.planes[c][i] = self.next_u8();
                    }
                }
                4 => {
                    // Checkerboard.
                    for y in 0..h as usize {
                        for x in 0..w as usize {
                            img.planes[c][y * w as usize + x] = if (x + y) % 2 == 0 { 0 } else { 255 };
                        }
                    }
                }
                _ => {
                    // Smooth pseudo-texture.
                    for i in 0..area {
                        img.planes[c][i] = ((i * 3 + c) as u8).wrapping_mul(5).wrapping_add(self.next_u8() & 3);
                    }
                }
            }
        }
        img
    }
}

/// Run the fuzz gate: `count` randomized small images round-tripped bit-exact
/// at the given efforts. Returns the number verified.
pub fn fuzz_gate(count: usize, efforts: &[u8]) -> Result<usize, CodecError> {
    let mut gen = FuzzGen::new(0x0B5EED);
    let mut verified = 0;
    for _ in 0..count {
        let img = gen.random_image();
        for &e in efforts {
            let (_, _, back) = roundtrip(&img, e)?;
            if back != img {
                return Err(CodecError::InvalidImage("fuzz fidelity failure".into()));
            }
            verified += 1;
        }
    }
    Ok(verified)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::decoder::decode;

    #[test]
    fn effort0_roundtrip_small() {
        let mut img = Image::new(17, 13, Channels::Rgb).unwrap();
        for c in 0..3 {
            for i in 0..img.area() {
                img.planes[c][i] = (i.wrapping_mul(29 + c) & 0xFF) as u8;
            }
        }
        for e in [0u8] {
            let (bytes, stats, back) = roundtrip(&img, e).unwrap();
            assert_eq!(back, img);
            assert!(stats.bpp > 0.0);
            assert!(bytes.len() < 17 * 13 * 3 * 2);
        }
    }

    #[test]
    fn all_efforts_roundtrip() {
        let mut img = Image::new(24, 19, Channels::Rgb).unwrap();
        for c in 0..3 {
            for i in 0..img.area() {
                img.planes[c][i] = (i.wrapping_mul(13 + c * 5) & 0xFF) as u8;
            }
        }
        for e in 0..=7u8 {
            let (_, _, back) = roundtrip(&img, e).unwrap();
            assert_eq!(back, img, "effort {e} roundtrip");
        }
    }

    #[test]
    fn gray_roundtrip() {
        let mut img = Image::new(31, 17, Channels::Gray).unwrap();
        for i in 0..img.area() {
            img.planes[0][i] = (i * 7 & 0xFF) as u8;
        }
        for e in [0u8, 4, 7] {
            let (_, _, back) = roundtrip(&img, e).unwrap();
            assert_eq!(back, img);
        }
    }

    #[test]
    fn rgba_roundtrip() {
        let mut img = Image::new(13, 11, Channels::Rgba).unwrap();
        for c in 0..4 {
            for i in 0..img.area() {
                img.planes[c][i] = (i.wrapping_mul(9 + c) & 0xFF) as u8;
            }
        }
        for e in [0u8, 7] {
            let (_, _, back) = roundtrip(&img, e).unwrap();
            assert_eq!(back, img);
        }
    }

    #[test]
    fn palette_roundtrip() {
        let mut img = Image::new(20, 20, Channels::Rgb).unwrap();
        let cols = [[10u8, 20, 30], [200, 100, 50], [0, 0, 255]];
        for i in 0..img.area() {
            let c = cols[i % 3];
            img.planes[0][i] = c[0];
            img.planes[1][i] = c[1];
            img.planes[2][i] = c[2];
        }
        for e in [7u8] {
            let (_, stats, back) = roundtrip(&img, e).unwrap();
            assert_eq!(back, img);
            assert!(stats.palette);
        }
    }

    #[test]
    fn determinism() {
        let mut img = Image::new(32, 32, Channels::Rgb).unwrap();
        for c in 0..3 {
            for i in 0..img.area() {
                img.planes[c][i] = (i.wrapping_mul(7) & 0xFF) as u8;
            }
        }
        for e in [0u8, 4, 7] {
            let (a, _) = encode(&img, e).unwrap();
            let (b, _) = encode(&img, e).unwrap();
            assert_eq!(a, b, "deterministic at effort {e}");
        }
    }

    #[test]
    fn corruption_rejected() {
        let mut img = Image::new(30, 30, Channels::Gray).unwrap();
        for i in 0..img.area() {
            img.planes[0][i] = (i % 251) as u8;
        }
        let (bytes, _) = encode(&img, 4).unwrap();
        // Flip a payload byte.
        let mut corrupt = bytes.clone();
        let mid = corrupt.len() / 2;
        corrupt[mid] ^= 0xFF;
        // Decode must either error or, if it succeeds, fail the CRC.
        let result = decode(&corrupt);
        if let Ok(back) = result {
            assert_ne!(back, img, "corrupted stream must not silently succeed");
        }
        // Truncation must error.
        let truncated = &bytes[..bytes.len() - 3];
        assert!(decode(truncated).is_err());
    }

    #[test]
    fn fuzz_smoke() {
        assert_eq!(fuzz_gate(20, &[0, 4, 7]).unwrap(), 60);
    }

    #[test]
    fn large_flat_compresses() {
        // A flat color image must compress strongly at every effort. Effort 0
        // uses a single adaptive table per plane with no serialized model
        // tables; the uniform-start adaptive tables pay a fixed learning cost
        // per symbol, so the bound is measured against the raw size rather
        // than an absolute byte count.
        let mut img = Image::new(64, 64, Channels::Rgb).unwrap();
        for c in 0..3 {
            for i in 0..img.area() {
                img.planes[c][i] = 128;
            }
        }
        let (bytes, stats) = encode(&img, 0).unwrap();
        let raw = img.raw_bytes();
        assert!(
            bytes.len() < raw.len() / 2,
            "flat image too big: {} vs raw {}",
            bytes.len(),
            raw.len()
        );
        assert!(stats.bpp < 5.0, "flat image bpp too high: {}", stats.bpp);
    }

    #[test]
    fn static_tables_model_size_guard() {
        // A large smooth image has a tiny payload but a large per-context
        // static model. The model-size guard must fall back to a simpler
        // single-context adaptive model so the model section stays within
        // MODEL_SIZE_FRACTION of the total output (roundtrip stays exact).
        let mut img = Image::new(512, 400, Channels::Rgb).unwrap();
        for c in 0..3 {
            for y in 0..400usize {
                for x in 0..512usize {
                    let v = (x / 2 + y / 3 + c * 30) as u8;
                    img.planes[c][y * 512 + x] = v;
                }
            }
        }
        let (bytes, stats, back) = roundtrip(&img, 7).unwrap();
        assert_eq!(back, img);
        let frac = stats.model_bytes as f64 / bytes.len() as f64;
        assert!(frac <= MODEL_SIZE_FRACTION + 0.01, "model frac {frac}");
        // The guard kicked in: the static model dominated the output, so the
        // encoder fell back to adaptive tables (no serialized static section).
        assert!(
            !stats.static_tables,
            "static tables should have been dropped by the model-size guard"
        );
    }
}
