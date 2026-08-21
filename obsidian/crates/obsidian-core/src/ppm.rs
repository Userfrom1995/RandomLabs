//! PPM P6 / PGM P5 binary reader and writer - the canonical ground truth I/O.
//!
//! The normalized Kodak PPMs are the byte-identity ground truth for every
//! codec, so this module must be byte-stable: `read(write(image)) == image`,
//! and it must reject malformed files cleanly.

use crate::error::CodecError;
use crate::image::{Channels, Image};

/// Read a PPM P6 (binary RGB, maxval 255) or PGM P5 (binary grayscale,
/// maxval 255) file.
pub fn read(bytes: &[u8]) -> Result<Image, CodecError> {
    let mut pos = 0usize;
    let magic = read_token(bytes, &mut pos)?;
    let (magic_byte, binary) = match magic.as_bytes() {
        b"P6" => (b'6', true),
        b"P5" => (b'5', true),
        b"P3" => (b'3', false),
        _ => {
            return Err(CodecError::InvalidStream(
                "bad PPM magic (expected P6, P5, or P3)".into(),
            ))
        }
    };
    let _ = magic_byte;
    let width = parse_u32(read_token(bytes, &mut pos)?)?;
    let height = parse_u32(read_token(bytes, &mut pos)?)?;
    let maxval = parse_u32(read_token(bytes, &mut pos)?)?;
    if width == 0 || height == 0 {
        return Err(CodecError::InvalidStream("zero dimensions".into()));
    }
    if maxval != 255 {
        return Err(CodecError::InvalidStream(format!(
            "unsupported maxval {maxval} (only 255 is supported)"
        )));
    }
    let channels = match magic.as_bytes() {
        b"P6" | b"P3" => Channels::Rgb,
        b"P5" => Channels::Gray,
        _ => unreachable!(),
    };
    let area = (width as usize)
        .checked_mul(height as usize)
        .ok_or_else(|| CodecError::InvalidStream("dimensions overflow".into()))?;
    let plane_count = channels.plane_count();
    let need = area
        .checked_mul(plane_count)
        .ok_or_else(|| CodecError::InvalidStream("dimensions overflow".into()))?;

    let mut image = Image::new(width, height, channels)?;
    if binary {
        // Exactly one whitespace byte is consumed after maxval; the raster
        // follows. Be tolerant: skip any whitespace, then read the raster.
        skip_ws(bytes, &mut pos);
        if bytes.len().saturating_sub(pos) < need {
            return Err(CodecError::InvalidStream("truncated raster data".into()));
        }
        // P6/P5 raster is interleaved: for each pixel the samples for every
        // channel are stored consecutively (R0 G0 B0 R1 G1 B1 ...).
        for i in 0..area {
            for c in 0..plane_count {
                image.planes[c][i] = bytes[pos];
                pos += 1;
            }
        }
    } else {
        // ASCII P3: whitespace-separated integers.
        for c in 0..plane_count {
            for y in 0..height as usize {
                for x in 0..width as usize {
                    let tok = read_token(bytes, &mut pos)?;
                    let v = parse_u32(tok)?;
                    if v > 255 {
                        return Err(CodecError::InvalidStream(format!(
                            "sample {v} out of range in ASCII PPM"
                        )));
                    }
                    image.planes[c][y * width as usize + x] = v as u8;
                }
            }
        }
    }
    Ok(image)
}

/// Write `image` as a canonical P6/P5 PPM: single space + newline separators,
/// maxval 255, no comments.
pub fn write(image: &Image) -> Vec<u8> {
    let mut out = Vec::with_capacity(16 + image.area() * image.plane_count());
    let magic = match image.channels {
        Channels::Gray => "P5",
        Channels::Rgb | Channels::Rgba => "P6",
    };
    out.extend_from_slice(magic.as_bytes());
    out.push(b'\n');
    out.extend_from_slice(image.width.to_string().as_bytes());
    out.push(b' ');
    out.extend_from_slice(image.height.to_string().as_bytes());
    out.push(b'\n');
    out.extend_from_slice(b"255\n");
    // Standard interleaved raster: every pixel's channels stored consecutively.
    for i in 0..image.area() {
        for c in 0..image.plane_count() {
            out.push(image.planes[c][i]);
        }
    }
    out
}

fn skip_ws(bytes: &[u8], pos: &mut usize) {
    while *pos < bytes.len() && (bytes[*pos] == b' ' || bytes[*pos] == b'\n'
        || bytes[*pos] == b'\t' || bytes[*pos] == b'\r')
    {
        *pos += 1;
    }
}

fn read_token(bytes: &[u8], pos: &mut usize) -> Result<String, CodecError> {
    skip_ws(bytes, pos);
    let start = *pos;
    while *pos < bytes.len()
        && bytes[*pos] != b' '
        && bytes[*pos] != b'\n'
        && bytes[*pos] != b'\t'
        && bytes[*pos] != b'\r'
    {
        *pos += 1;
    }
    let tok = &bytes[start..*pos];
    if tok.is_empty() {
        return Err(CodecError::InvalidStream("unexpected end of PPM header".into()));
    }
    // Comments (# ...) are allowed between tokens in PPM.
    if tok[0] == b'#' {
        while *pos < bytes.len() && bytes[*pos] != b'\n' {
            *pos += 1;
        }
        return read_token(bytes, pos);
    }
    String::from_utf8(tok.to_vec())
        .map_err(|_| CodecError::InvalidStream("non-ASCII token in PPM header".into()))
}

fn parse_u32(tok: String) -> Result<u32, CodecError> {
    tok.trim()
        .parse::<u32>()
        .map_err(|_| CodecError::InvalidStream(format!("bad integer token '{tok}'")))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_rgb() {
        let mut im = Image::new(8, 5, Channels::Rgb).unwrap();
        for c in 0..3 {
            for i in 0..im.area() {
                im.planes[c][i] = (i.wrapping_mul(17 + c * 3) & 0xFF) as u8;
            }
        }
        let bytes = write(&im);
        let back = read(&bytes).unwrap();
        assert_eq!(im, back);
    }

    #[test]
    fn roundtrip_gray() {
        let mut im = Image::new(13, 7, Channels::Gray).unwrap();
        for i in 0..im.area() {
            im.planes[0][i] = (i * 11 & 0xFF) as u8;
        }
        let back = read(&write(&im)).unwrap();
        assert_eq!(im, back);
    }

    #[test]
    fn rejects_malformed() {
        assert!(read(b"P7\n1 1\n255\nx").is_err());
        assert!(read(b"P6\n1 1\n").is_err()); // truncated
        assert!(read(b"P6\n1 1\n254\nx").is_err()); // maxval != 255
        assert!(read(b"P6\n0 1\n255\n").is_err()); // zero dims
        assert!(read(b"P6\n1 1\n255\nx").is_err()); // truncated raster
        assert!(read(b"garbage").is_err());
    }
}
