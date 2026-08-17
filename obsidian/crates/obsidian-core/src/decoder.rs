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
use crate::rans::{RansDecoder, RansTable};
use std::io::Read;

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

    // The palette colors come from the model; fix the index plane range.
    let ranges = match &model.palette {
        Some(pal) if pal.colors.len() >= 1 => vec![PlaneRange::index(pal.colors.len() as u32 - 1)],
        _ => ranges,
    };
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

    let width = header.width as usize;
    let height = header.height as usize;
    let area = width * height;

    // Decode planes.
    let mut decoded: Vec<Vec<i16>> = Vec::with_capacity(plane_count);
    for pi in 0..plane_count {
        let alphabet = sizes[pi];
        let wv = model.weight_for(pi);
        let mut plane = vec![0i16; area];
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
                let cid = cm.context_id(&nb, x, y);
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
