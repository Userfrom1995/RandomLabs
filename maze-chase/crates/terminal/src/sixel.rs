//! Sixel tier: true pixel art on Sixel-capable terminals.
//!
//! A minimal, hand-rolled Sixel encoder over [`PixelFrame`] rows: palette
//! registers for the distinct frame colors (our raster uses fewer than 20),
//! six-row bands, run-length repetition, `$` carriage returns within a
//! band and `-` line feeds between bands. Detection is a live DA1 probe
//! (see [`probe_request`] / [`probe_ok`]); the tier only engages after the
//! terminal answers, so unsupported terminals never see Sixel bytes.

use crate::raster::PixelFrame;
use maze_chase_assets::themes::Rgb;

/// Device-attributes request that reveals Sixel support (parameter `4`).
pub fn probe_request() -> &'static str {
    "\x1b[c"
}

/// True when a DA1 reply announces Sixel (a `4` parameter), e.g.
/// `\x1b[?62;4c`. Strictly framed: only a complete `ESC [ ? params c`
/// reply counts, so a stray key (a typed `4`) can never be mistaken for
/// a terminal announcement. Anything unparseable is a "no".
pub fn probe_ok(reply: &str) -> bool {
    let Some(start) = reply.find("\x1b[?") else {
        return false;
    };
    let tail = &reply[start + 3..];
    let end = tail
        .find(|c: char| !(c.is_ascii_digit() || c == ';'))
        .unwrap_or(tail.len());
    if tail.as_bytes().get(end) != Some(&b'c') {
        return false;
    }
    tail[..end].split(';').any(|p| p == "4")
}

fn dist(a: Rgb, b: Rgb) -> u32 {
    let dr = a.0 as i32 - b.0 as i32;
    let dg = a.1 as i32 - b.1 as i32;
    let db = a.2 as i32 - b.2 as i32;
    (dr * dr + dg * dg + db * db) as u32
}

/// Build the palette: distinct frame colors in first-seen order, capped
/// at `max_colors`; overflow maps to the nearest kept color.
fn palette(frame: &PixelFrame, max_colors: usize) -> (Vec<Rgb>, Vec<u8>) {
    let max_colors = max_colors.clamp(2, 256);
    let mut colors: Vec<Rgb> = Vec::new();
    let mut index = vec![0u8; frame.px.len()];
    for (i, &p) in frame.px.iter().enumerate() {
        if let Some(k) = colors.iter().position(|&c| c == p) {
            index[i] = k as u8;
        } else if colors.len() < max_colors {
            index[i] = colors.len() as u8;
            colors.push(p);
        } else {
            let k = colors
                .iter()
                .enumerate()
                .min_by_key(|(_, &c)| dist(c, p))
                .map(|(k, _)| k)
                .unwrap_or(0);
            index[i] = k as u8;
        }
    }
    (colors, index)
}

/// Encode a frame as Sixel bytes (DCS ... ST). Empty frames yield an
/// empty string; callers fall back to the cell renderer instead.
pub fn encode(frame: &PixelFrame, max_colors: usize) -> String {
    if frame.w == 0 || frame.h == 0 || frame.px.is_empty() {
        return String::new();
    }
    let (colors, index) = palette(frame, max_colors);
    let w = frame.w as usize;
    let h = frame.h as usize;
    let mut out = String::from("\x1bPq\"1;1");
    // Color registers: `#n;2;r;g;b` with 0-100 channels.
    for (n, c) in colors.iter().enumerate() {
        let r = (c.0 as u32 * 100 / 255) as u8;
        let g = (c.1 as u32 * 100 / 255) as u8;
        let b = (c.2 as u32 * 100 / 255) as u8;
        out.push_str(&format!("#{};2;{};{};{}", n, r, g, b));
    }
    let bands = h.div_ceil(6);
    for band in 0..bands {
        let mut first = true;
        for (n, _) in colors.iter().enumerate() {
            // Sixel column bytes for this color in this band.
            let mut cols: Vec<u8> = Vec::with_capacity(w);
            let mut any = false;
            for x in 0..w {
                let mut bits = 0u8;
                for b in 0..6 {
                    let y = band * 6 + b;
                    if y < h && index[y * w + x] as usize == n {
                        bits |= 1 << b;
                    }
                }
                if bits != 0 {
                    any = true;
                }
                cols.push(b'?' + bits);
            }
            if !any {
                continue;
            }
            if !first {
                out.push('$');
            }
            first = false;
            out.push_str(&format!("#{}", n));
            // Run-length: `!count byte` for runs of 4+.
            let mut i = 0;
            while i < cols.len() {
                let mut j = i + 1;
                while j < cols.len() && cols[j] == cols[i] {
                    j += 1;
                }
                if j - i >= 4 {
                    out.push_str(&format!("!{}{}", j - i, cols[i] as char));
                } else {
                    for &c in &cols[i..j] {
                        out.push(c as char);
                    }
                }
                i = j;
            }
        }
        if band + 1 < bands {
            out.push('-');
        }
    }
    out.push_str("\x1b\\");
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tiny() -> PixelFrame {
        // 6x1: red, red, blue, blue, blue, red.
        PixelFrame {
            w: 6,
            h: 1,
            px: vec![
                Rgb(255, 0, 0),
                Rgb(255, 0, 0),
                Rgb(0, 0, 255),
                Rgb(0, 0, 255),
                Rgb(0, 0, 255),
                Rgb(255, 0, 0),
            ],
        }
    }

    #[test]
    fn framing_and_registers() {
        let s = encode(&tiny(), 16);
        assert!(s.starts_with("\x1bPq"), "DCS open");
        assert!(s.ends_with("\x1b\\"), "ST close");
        assert!(s.contains("#0;2;100;0;0"), "red register");
        assert!(s.contains("#1;2;0;0;100"), "blue register");
    }

    #[test]
    fn empty_frame_encodes_empty() {
        let f = PixelFrame {
            w: 0,
            h: 0,
            px: vec![],
        };
        assert_eq!(encode(&f, 16), "");
    }

    #[test]
    fn probe_parsing_is_conservative() {
        assert!(probe_ok("\x1b[?62;4c"));
        assert!(probe_ok("\x1b[?63;1;2;4;6c"));
        assert!(!probe_ok("\x1b[?62c"));
        assert!(!probe_ok(""));
        assert!(!probe_ok("garbage"));
        // `14` is not Sixel (`4`): no substring tricks.
        assert!(!probe_ok("\x1b[?62;14c"));
        // Unframed keys can never announce Sixel, even when they happen
        // to spell a parameter sequence.
        assert!(!probe_ok("4"));
        assert!(!probe_ok("4c"));
        assert!(!probe_ok("m4"));
        assert!(!probe_ok("\x1b[?62;4"));
    }

    #[test]
    fn palette_caps_and_maps_overflow() {
        let mut px = Vec::new();
        for i in 0..300u16 {
            px.push(Rgb((i % 256) as u8, 0, 0));
        }
        let f = PixelFrame { w: 300, h: 1, px };
        let (colors, index) = palette(&f, 16);
        assert_eq!(colors.len(), 16);
        assert!(index.iter().all(|&k| k < 16));
        let s = encode(&f, 16);
        assert!(s.starts_with("\x1bPq"));
    }

    #[test]
    fn full_board_encodes_within_budget() {
        use crate::raster;
        use maze_chase_assets::themes;
        use maze_chase_engine::game::Game;
        let g = Game::new(3, 1);
        let f = raster::render(&g, &themes::EMBER_WARREN, 8, 0, true);
        let s = encode(&f, 64);
        assert!(s.len() < 256 * 1024, "len={}", s.len());
    }
}
