//! The decoder: mirror pipeline of the encoder, single pass, O(n), no panics
//! on untrusted input (every failure is a `CodecError`).

use crate::color::{
    ycocgr_inverse_planes, PlaneRange, TransformChoice,
};
use crate::context::{unzigzag, ContextModel};
use crate::crc32::crc32;
use crate::error::CodecError;
use crate::header::Header;
use crate::image::{Channels, Image};
use crate::model::{
    alphabet_sizes, build_static_tables, plane_ranges, read_model, ModelConfig,
};
use crate::predict::{neighbors, predict_clamped};
use crate::rans::{RansDecoder, RansTable, BitReader, GrState, GR_K_INIT, gr_read_symbol};
use std::io::Read;

/// Maximum supported dimension per side. Far above any practical image
/// (Kodak is 768x512) while keeping single-dimension corruption bounded.
const MAX_DIM: u32 = 1 << 20;
/// Maximum supported pixel area, bounding the worst-case allocation even when
/// both dimensions are at the per-side cap.
const MAX_AREA: u64 = 1 << 25;

/// Decode a container into an image, verifying the header CRC.
pub fn decode(bytes: &[u8]) -> Result<Image, CodecError> {
    let mut cur = std::io::Cursor::new(bytes);
    let header = Header::read(&mut cur)?;
    let channels = header.channels()?;
    let transform = if header.transform_flag() {
        TransformChoice::YCoCgR
    } else {
        TransformChoice::None
    };
    let palette_flag = header.palette_flag();

    // Bound the claimed dimensions before any dimension-proportional
    // allocation. A valid stream's pixel volume can far exceed the file size
    // (static tables compress flat regions to a few bytes per thousand
    // pixels), so a ratio against `bytes.len()` would reject legitimate
    // streams. Instead an absolute cap on each side and on the pixel area
    // keeps a corrupt width/height from triggering an OOM-sized allocation.
    let width = header.width as usize;
    let height = header.height as usize;
    if width > MAX_DIM as usize || height > MAX_DIM as usize {
        return Err(CodecError::InvalidStream("dimensions exceed maximum".into()));
    }
    let area = (width as u64) * (height as u64);
    if area > MAX_AREA {
        return Err(CodecError::InvalidStream("dimensions exceed maximum".into()));
    }
    let area = area as usize;

    let mut model_len = [0u8; 4];
    cur.read_exact(&mut model_len)?;
    let model_len = u32::from_le_bytes(model_len) as usize;
    let model_start = cur.position() as usize;
    let model_end = model_start
        .checked_add(model_len)
        .ok_or_else(|| CodecError::InvalidStream("model length overflow".into()))?;
    if model_end > bytes.len() {
        return Err(CodecError::InvalidStream("model section truncated".into()));
    }

    // Determine plane layout before reading the model.
    let palette_chan_count = if palette_flag { 1 } else { channels.plane_count() };
    let eff_channels = if palette_flag {
        Channels::Gray
    } else {
        channels
    };
    let ranges = if palette_flag {
        // The palette colors are read as part of the model.
        vec![PlaneRange::U8; palette_chan_count]
    } else {
        plane_ranges(channels, transform, None)
    };
    let sizes = alphabet_sizes(&ranges);
    let model = read_model(&mut cur, &sizes)?;
    if cur.position() as usize != model_end {
        return Err(CodecError::InvalidStream("model length mismatch".into()));
    }

    // The palette colors come from the model; fix the index plane range and
    // recompute the alphabet sizes. The pre-model placeholder (`PlaneRange::U8`)
    // only fixed the plane COUNT; the encoder sizes its rANS tables from the
    // actual palette depth (`PlaneRange::index`), and adaptive tables require
    // matching alphabet sizes, so the sizes must track the corrected range.
    let ranges = match &model.palette {
        Some(pal) if pal.colors.len() >= 1 => vec![PlaneRange::index(pal.colors.len() as u32 - 1)],
        _ => ranges,
    };
    let sizes = alphabet_sizes(&ranges);
    let eff_channels = if model.palette.is_some() { Channels::Gray } else { eff_channels };
    let _ = eff_channels;

    // Payload: per-plane lengths then streams.
    let plane_count = sizes.len();
    let mut lens = vec![0u32; plane_count];
    let mut lbuf = [0u8; 4];
    for l in lens.iter_mut() {
        cur.read_exact(&mut lbuf)?;
        *l = u32::from_le_bytes(lbuf);
    }
    let payload_start = cur.position() as usize;
    let mut stream_start = payload_start;
    let mut payloads: Vec<&[u8]> = Vec::with_capacity(plane_count);
    for l in &lens {
        let end = stream_start
            .checked_add(*l as usize)
            .ok_or_else(|| CodecError::InvalidStream("payload length overflow".into()))?;
        if end > bytes.len() {
            return Err(CodecError::InvalidStream("payload truncated".into()));
        }
        payloads.push(&bytes[stream_start..end]);
        stream_start = end;
    }

    // Build per-plane tables.
    let context = model.context;
    let cm = ContextModel::new(context);
    let entropy_gr = header.entropy_gr();

    // Decode planes.
    let mut decoded: Vec<Vec<i16>> = Vec::with_capacity(plane_count);
    for pi in 0..plane_count {
        let alphabet = sizes[pi];
        let wv = model.weight_for(pi);
        let mut plane = vec![0i16; area];
        if entropy_gr {
            // Design A: per-context adaptive Golomb-Rice, forward raster order.
            // Both sides adapt `k` from the decoded symbols, so no model bytes
            // are needed for the entropy state. Any shortfall (truncated stream)
            // surfaces as `InvalidStream` from the bit reader, never a panic.
            let mut br = BitReader::new(payloads[pi]);
            let mut gr: Vec<GrState> = (0..model.context_count)
                .map(|_| GrState::new(GR_K_INIT))
                .collect();
            for y in 0..height {
                for x in 0..width {
                    let idx = y * width + x;
                    let nb = neighbors(&plane, x, y, width, height);
                    let cid = cm.context_id(&nb, x, y) % model.context_count;
                    let p = model.predictor(pi, cid);
                    let pred = predict_clamped(p, &nb, wv.as_ref(), ranges[pi]);
                    let r = gr_read_symbol(&mut br, &mut gr[cid])?;
                    plane[idx] = (pred + r) as i16;
                }
            }
        } else {
            let mut dec = RansDecoder::new(payloads[pi])?;
            let mut adaptive_tables: Vec<RansTable> = Vec::new();
            let mut static_tables: Vec<Option<RansTable>> = Vec::new();
            if let Some(hist) = &model.static_histograms {
                let built = build_static_tables(hist, &sizes);
                static_tables = built.into_iter().nth(pi).unwrap();
            } else {
                adaptive_tables = (0..model.context_count)
                    .map(|_| RansTable::new_adaptive(alphabet))
                    .collect();
            }
            let use_static = !static_tables.is_empty();
            for y in 0..height {
                for x in 0..width {
                    let idx = y * width + x;
                    let nb = neighbors(&plane, x, y, width, height);
                    let cid = cm.context_id(&nb, x, y) % model.context_count;
                    let p = model.predictor(pi, cid);
                    let pred = predict_clamped(p, &nb, wv.as_ref(), ranges[pi]);
                    let sym = if use_static {
                        let table = static_tables[cid].as_mut().ok_or_else(|| {
                            CodecError::InvalidStream(format!("missing static table for context {cid}"))
                        })?;
                        dec.get(table)?
                    } else {
                        dec.get(&mut adaptive_tables[cid])?
                    };
                    let r = unzigzag(sym as u32);
                    plane[idx] = (pred + r) as i16;
                }
            }
        }
        decoded.push(plane);
    }

    // Inverse transform.
    if model.transform == TransformChoice::YCoCgR && !palette_flag {
        ycocgr_inverse_planes(&mut decoded);
    }

    // Palette expand or assemble the image.
    let image = if let Some(pal) = &model.palette {
        crate::color::palette_expand(pal, &decode_u8(&decoded[0]), width as u32, height as u32)?
    } else {
        let mut img = Image::new(header.width, header.height, channels)?;
        for (c, plane) in decoded.iter().enumerate() {
            for i in 0..area {
                img.planes[c][i] = plane[i] as u8;
            }
        }
        img
    };

    // CRC verification.
    let raw = image.raw_bytes();
    if crc32(&raw) != header.crc32 {
        return Err(CodecError::CrcMismatch);
    }
    Ok(image)
}

fn decode_u8(plane: &[i16]) -> Vec<u8> {
    plane.iter().map(|&v| v as u8).collect()
}

/// Parse a container's header and model without decoding (used by `check`).
pub fn inspect(bytes: &[u8]) -> Result<(Header, ModelConfig, usize), CodecError> {
    let mut cur = std::io::Cursor::new(bytes);
    let header = Header::read(&mut cur)?;
    let channels = header.channels()?;
    let transform = if header.transform_flag() {
        TransformChoice::YCoCgR
    } else {
        TransformChoice::None
    };
    let palette_flag = header.palette_flag();
    let mut model_len = [0u8; 4];
    cur.read_exact(&mut model_len)?;
    let model_len = u32::from_le_bytes(model_len) as usize;
    let model_start = cur.position() as usize;
    let model_end = model_start + model_len;
    if model_end > bytes.len() {
        return Err(CodecError::InvalidStream("model section truncated".into()));
    }
    let eff_channels = if palette_flag { Channels::Gray } else { channels };
    let ranges = if palette_flag {
        vec![PlaneRange::U8]
    } else {
        plane_ranges(channels, transform, None)
    };
    let sizes = alphabet_sizes(&ranges);
    let model = read_model(&mut cur, &sizes)?;
    let _ = eff_channels;
    Ok((header, model, model_end))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::encoder::{encode, fuzz_gate, FuzzGen};

    #[test]
    fn decode_matches_encode() {
        let mut img = Image::new(20, 15, Channels::Rgb).unwrap();
        for c in 0..3 {
            for i in 0..img.area() {
                img.planes[c][i] = (i.wrapping_mul(11) & 0xFF) as u8;
            }
        }
        let (bytes, _) = encode(&img, 4).unwrap();
        let back = decode(&bytes).unwrap();
        assert_eq!(back, img);
    }

    #[test]
    fn decode_rejects_garbage() {
        assert!(decode(b"OBSD\x01\x01\x08\x04").is_err());
        assert!(decode(&[]).is_err());
        let mut junk = vec![0x4F, 0x42, 0x53, 0x44, 0x01];
        junk.extend_from_slice(&[0; 30]);
        assert!(decode(&junk).is_err());
    }

    #[test]
    fn decode_rejects_inflated_dimensions() {
        let mut img = Image::new(4, 4, Channels::Rgb).unwrap();
        for c in 0..3 {
            for i in 0..img.area() {
                img.planes[c][i] = (i * 13) as u8;
            }
        }
        let (bytes, _) = encode(&img, 0).unwrap();
        // Flip the upper two bytes of the width field (offsets 10-11): the
        // claimed dimensions now exceed the caps, which must be rejected
        // before any allocation is attempted (the OOM abort seen pre-fix).
        for off in [10usize, 11] {
            let mut corrupt = bytes.clone();
            corrupt[off] ^= 0xFF;
            let err = decode(&corrupt).unwrap_err();
            assert!(
                err.to_string().contains("dimensions exceed maximum"),
                "got: {err}"
            );
        }
    }

    #[test]
    fn decode_accepts_large_flat_stream() {
        // A flat image must compress (never expand) at every effort, so the
        // dimension guard must not be a ratio against the input size (that
        // would reject legitimate streams). With the Golomb-Rice entropy
        // backend the only non-zero residuals are the border pixels, so the
        // size floor below reflects GR behavior rather than rANS's tighter
        // few-symbol bound.
        let mut img = Image::new(512, 512, Channels::Rgb).unwrap();
        for c in 0..3 {
            for i in 0..img.area() {
                img.planes[c][i] = 128;
            }
        }
        for e in [0u8, 7] {
            let (bytes, _) = encode(&img, e).unwrap();
            assert!(
                bytes.len() < img.raw_bytes().len() / 4,
                "flat image should compress hard at effort {e}: {} vs {}",
                bytes.len(),
                img.raw_bytes().len() / 4
            );
            assert_eq!(decode(&bytes).unwrap(), img);
        }
    }

    #[test]
    fn fuzz_all_efforts() {
        let mut gen = FuzzGen::new(1234);
        for _ in 0..8 {
            let img = gen.random_image();
            for e in 0..=7u8 {
                let (bytes, _) = encode(&img, e).unwrap();
                let back = decode(&bytes).unwrap();
                assert_eq!(back, img);
            }
        }
    }

    #[test]
    fn fuzz_gate_basic() {
        assert!(fuzz_gate(5, &[0, 4, 7]).is_ok());
    }
}
