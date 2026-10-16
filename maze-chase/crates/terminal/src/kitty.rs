//! Kitty graphics tier: real pixel frames on Kitty-family terminals.
//!
//! Everything here is hand-rolled std-only: a minimal PNG encoder (8-bit
//! RGB with zlib stored blocks, always valid), a base64 framer, and the
//! Kitty `a=T,f=100` transmit-and-display escape with chunked `m=1`
//! continuation. No image crate, no allocator tricks. Detection is
//! environment-gated (see [`kitty_present`]) so unsupported terminals
//! never see the escape bytes.

use crate::raster::PixelFrame;

const PNG_SIG: [u8; 8] = [137, 80, 78, 71, 13, 10, 26, 10];

fn crc32(data: &[u8]) -> u32 {
    let mut crc: u32 = 0xFFFF_FFFF;
    for &b in data {
        crc ^= b as u32;
        for _ in 0..8 {
            let mask = (crc & 1).wrapping_neg();
            crc = (crc >> 1) ^ (0xEDB8_8320 & mask);
        }
    }
    !crc
}

fn chunk(out: &mut Vec<u8>, tag: &[u8; 4], data: &[u8]) {
    let len = data.len() as u32;
    out.extend_from_slice(&len.to_be_bytes());
    out.extend_from_slice(tag);
    out.extend_from_slice(data);
    let mut c = Vec::with_capacity(4 + data.len());
    c.extend_from_slice(tag);
    c.extend_from_slice(data);
    out.extend_from_slice(&crc32(&c).to_be_bytes());
}

fn adler32(data: &[u8]) -> u32 {
    const MOD: u32 = 65521;
    let (mut a, mut b) = (1u32, 0u32);
    for &byte in data {
        a = (a + byte as u32) % MOD;
        b = (b + a) % MOD;
    }
    (b << 16) | a
}

/// Encode a frame as a valid 8-bit RGB PNG (zlib stored blocks: no
/// compression, always decodable). Panics on empty frames.
pub fn png_encode(frame: &PixelFrame) -> Vec<u8> {
    assert!(frame.w > 0 && frame.h > 0, "empty frame");
    assert_eq!(frame.px.len(), (frame.w * frame.h) as usize);
    let mut raw = Vec::with_capacity((frame.w * frame.h * 3 + frame.h) as usize);
    for y in 0..frame.h {
        raw.push(0); // filter type 0 (None)
        for x in 0..frame.w {
            let p = frame.px[(y * frame.w + x) as usize];
            raw.push(p.0);
            raw.push(p.1);
            raw.push(p.2);
        }
    }
    // zlib wrapper: 0x78 0x01 (32K window, fast) + stored blocks.
    let mut zlib = vec![0x78, 0x01];
    for block in raw.chunks(65_535) {
        let last = block.as_ptr_range().end == raw.as_ptr_range().end;
        zlib.push(if last { 0x01 } else { 0x00 });
        let len = block.len() as u16;
        zlib.extend_from_slice(&len.to_le_bytes());
        zlib.extend_from_slice(&(!len).to_le_bytes());
        zlib.extend_from_slice(block);
    }
    zlib.extend_from_slice(&adler32(&raw).to_be_bytes());

    let mut out = Vec::new();
    out.extend_from_slice(&PNG_SIG);
    let mut ihdr = Vec::new();
    ihdr.extend_from_slice(&frame.w.to_be_bytes());
    ihdr.extend_from_slice(&frame.h.to_be_bytes());
    ihdr.push(8); // bit depth
    ihdr.push(2); // color type: truecolor RGB
    ihdr.push(0); // compression
    ihdr.push(0); // filter
    ihdr.push(0); // interlace
    chunk(&mut out, b"IHDR", &ihdr);
    chunk(&mut out, b"IDAT", &zlib);
    chunk(&mut out, b"IEND", &[]);
    out
}

const B64: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/// Standard base64 with padding.
pub fn base64_encode(data: &[u8]) -> String {
    let mut out = String::with_capacity(data.len().div_ceil(3) * 4);
    for block in data.chunks(3) {
        let mut n: u32 = 0;
        for &b in block {
            n = (n << 8) | b as u32;
        }
        n <<= 8 * (3 - block.len());
        let chars = [
            B64[((n >> 18) & 63) as usize] as char,
            B64[((n >> 12) & 63) as usize] as char,
            if block.len() > 1 {
                B64[((n >> 6) & 63) as usize] as char
            } else {
                '='
            },
            if block.len() > 2 {
                B64[(n & 63) as usize] as char
            } else {
                '='
            },
        ];
        out.extend(chars);
    }
    out
}

/// Kitty transmit-and-display escape for a PNG, sized to `cell_rows` by
/// `cell_cols` terminal cells. Payload ships in 4096-byte `m=1` chunks
/// with a final `m=0` frame (the Kitty chunked protocol).
pub fn display_escape(png: &[u8], cell_rows: u32, cell_cols: u32) -> String {
    display_escape_id(png, cell_rows, cell_cols, None)
}

/// Delete a previously displayed image by id (prevents pile-up when a
/// frame is re-displayed at 20 fps).
pub fn delete_escape(id: u32) -> String {
    format!("\x1b_Ga=d,d=I,i={id}\x1b\\")
}

/// Display escape with a stable image id (`None` behaves like
/// [`display_escape`]). Re-displaying the same id after
/// [`delete_escape`] keeps one live image per frame.
pub fn display_escape_id(png: &[u8], cell_rows: u32, cell_cols: u32, id: Option<u32>) -> String {
    let id_param = id.map(|i| format!(",i={i}")).unwrap_or_default();
    let b64 = base64_encode(png);
    let bytes = b64.as_bytes();
    // At least one frame even for empty payloads.
    let pieces: Vec<&[u8]> = if bytes.is_empty() {
        vec![b""]
    } else {
        bytes.chunks(4096).collect()
    };
    let mut out = String::new();
    for (i, piece) in pieces.iter().enumerate() {
        let more = u8::from(i + 1 < pieces.len());
        let text = core::str::from_utf8(piece).unwrap_or("");
        if i == 0 {
            out.push_str(&format!(
                "\x1b_Ga=T,f=100,r={},c={}{},m={};{}",
                cell_rows, cell_cols, id_param, more, text
            ));
        } else {
            out.push_str(&format!("\x1b_Gm={};{}", more, text));
        }
        out.push_str("\x1b\\");
    }
    out
}

/// True when the environment positively identifies a Kitty-family
/// terminal (Kitty or Ghostty's Kitty-compatible paths). Conservative on
/// purpose: unknown terminals never receive graphics escapes.
pub fn kitty_present(env: &[(String, String)]) -> bool {
    let get = |k: &str| {
        env.iter()
            .find(|(key, _)| key == k)
            .map(|(_, v)| v.as_str())
    };
    if get("KITTY_WINDOW_ID").is_some_and(|v| !v.is_empty()) {
        return true;
    }
    matches!(get("TERM"), Some("xterm-kitty")) || matches!(get("TERM_PROGRAM"), Some("kitty"))
}

/// Collect the process environment as owned pairs (test seam: pass any
/// slice to [`kitty_present`]).
pub fn process_env() -> Vec<(String, String)> {
    std::env::vars().collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use maze_chase_assets::themes::Rgb;

    fn tiny() -> PixelFrame {
        PixelFrame {
            w: 2,
            h: 1,
            px: vec![Rgb(255, 0, 0), Rgb(0, 0, 255)],
        }
    }

    #[test]
    fn png_round_trips_header_and_dimensions() {
        let png = png_encode(&tiny());
        assert_eq!(&png[0..8], &PNG_SIG);
        // IHDR chunk: length 13, tag, then w/h big-endian.
        assert_eq!(&png[8..12], &13u32.to_be_bytes());
        assert_eq!(&png[12..16], b"IHDR");
        assert_eq!(&png[16..20], &2u32.to_be_bytes());
        assert_eq!(&png[20..24], &1u32.to_be_bytes());
        assert_eq!(png[png.len() - 12..png.len() - 8], [0, 0, 0, 0]);
        assert_eq!(&png[png.len() - 8..png.len() - 4], b"IEND");
    }

    #[test]
    fn png_chunk_crcs_verify() {
        // Walk the chunk list and re-verify every CRC.
        let png = png_encode(&tiny());
        let mut i = 8;
        while i < png.len() {
            let len = u32::from_be_bytes(png[i..i + 4].try_into().unwrap()) as usize;
            let tag = &png[i + 4..i + 8];
            let data = &png[i + 8..i + 8 + len];
            let want = u32::from_be_bytes(png[i + 8 + len..i + 12 + len].try_into().unwrap());
            let mut c = Vec::new();
            c.extend_from_slice(tag);
            c.extend_from_slice(data);
            assert_eq!(crc32(&c), want);
            i += 12 + len;
            if tag == b"IEND" {
                break;
            }
        }
        assert_eq!(&png[i - 8..i - 4], b"IEND");
    }

    #[test]
    fn base64_matches_known_vectors() {
        assert_eq!(base64_encode(b""), "");
        assert_eq!(base64_encode(b"f"), "Zg==");
        assert_eq!(base64_encode(b"fo"), "Zm8=");
        assert_eq!(base64_encode(b"foo"), "Zm9v");
        assert_eq!(base64_encode(b"foobar"), "Zm9vYmFy");
    }

    #[test]
    fn display_escape_frames_single_and_chunked() {
        let small = display_escape(&[1, 2, 3], 31, 56);
        assert!(small.starts_with("\x1b_Ga=T,f=100,r=31,c=56,m=0;"));
        assert!(small.ends_with("\x1b\\"));
        // 3075 raw bytes -> 4100 b64 chars: 4096 + 4, so two frames.
        let big = vec![0xabu8; 3075];
        let esc = display_escape(&big, 31, 56);
        assert!(esc.contains(",m=1;"), "first of two frames continues");
        assert!(esc.contains("\x1b_Gm=0;"), "final frame terminates");
        assert!(esc.ends_with("\x1b\\"));
    }

    #[test]
    fn detection_is_conservative() {
        let empty: Vec<(String, String)> = vec![];
        assert!(!kitty_present(&empty));
        assert!(kitty_present(&[("KITTY_WINDOW_ID".into(), "1".into())]));
        assert!(kitty_present(&[("TERM".into(), "xterm-kitty".into())]));
        assert!(kitty_present(&[("TERM_PROGRAM".into(), "kitty".into())]));
        assert!(!kitty_present(&[("TERM_PROGRAM".into(), "ghostty".into())]));
    }
}
