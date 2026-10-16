//! XRGB8888 software framebuffer for the desktop layer.
//!
//! [`Frame`] is what the window backend presents (softbuffer takes
//! `0x00RRGGBB` words): fill, clip-safe set/get, integer-scaled blits of
//! the shared [`maze_chase_terminal::raster::PixelFrame`], 5x7 text from
//! [`crate::font`], and filled-rect / border panels for HUD chrome. All
//! drawing clips to the frame; nothing panics on out-of-range input.

use crate::font;
use maze_chase_assets::themes::Rgb;
use maze_chase_terminal::raster::PixelFrame;

/// Maximum framebuffer allocation in pixels (4096x4096 cap: no huge alloc).
pub const MAX_PIXELS: u64 = 16_777_216;

/// Pack an [`Rgb`] into one `0x00RRGGBB` word.
pub fn pack(c: Rgb) -> u32 {
    ((c.0 as u32) << 16) | ((c.1 as u32) << 8) | (c.2 as u32)
}

/// Software framebuffer, row-major `w`x`h` XRGB words.
#[derive(Clone, PartialEq, Eq, Debug)]
pub struct Frame {
    pub w: u32,
    pub h: u32,
    pub px: Vec<u32>,
}

impl Frame {
    /// Blank frame; `None` on zero/oversized dimensions (no huge alloc).
    pub fn blank(w: u32, h: u32, bg: Rgb) -> Option<Self> {
        if w == 0 || h == 0 {
            return None;
        }
        let n = (w as u64) * (h as u64);
        if n > MAX_PIXELS {
            return None;
        }
        Some(Self {
            w,
            h,
            px: vec![pack(bg); n as usize],
        })
    }

    fn idx(&self, x: i32, y: i32) -> Option<usize> {
        if x < 0 || y < 0 || x >= self.w as i32 || y >= self.h as i32 {
            return None;
        }
        Some((y as u32 * self.w + x as u32) as usize)
    }

    /// Clip-safe pixel write.
    pub fn set(&mut self, x: i32, y: i32, c: Rgb) {
        if let Some(i) = self.idx(x, y) {
            self.px[i] = pack(c);
        }
    }

    /// Clip-safe pixel read (packed word).
    pub fn get(&self, x: i32, y: i32) -> Option<u32> {
        self.idx(x, y).map(|i| self.px[i])
    }

    /// Fill a rectangle, clipped to the frame.
    pub fn rect(&mut self, x: i32, y: i32, w: u32, h: u32, c: Rgb) {
        let v = pack(c);
        for dy in 0..h as i32 {
            for dx in 0..w as i32 {
                if let Some(i) = self.idx(x + dx, y + dy) {
                    self.px[i] = v;
                }
            }
        }
    }

    /// Border outline (`t` px thick), clipped to the frame.
    pub fn border(&mut self, x: i32, y: i32, w: u32, h: u32, t: u32, c: Rgb) {
        if w == 0 || h == 0 || t == 0 {
            return;
        }
        let t = t.min(w).min(h);
        let (w, h) = (w as i32, h as i32);
        let t = t as i32;
        self.rect(x, y, w as u32, t as u32, c);
        self.rect(x, y + h - t, w as u32, t as u32, c);
        self.rect(x, y, t as u32, h as u32, c);
        self.rect(x + w - t, y, t as u32, h as u32, c);
    }

    /// Blit one source pixel as a `scale` square (nearest neighbor).
    fn blit_dot(&mut self, dx: i32, dy: i32, scale: u32, v: u32) {
        let s = scale as i32;
        for oy in 0..s {
            for ox in 0..s {
                if let Some(i) = self.idx(dx + ox, dy + oy) {
                    self.px[i] = v;
                }
            }
        }
    }

    /// Blit a shared-raster board frame at integer `scale`. Returns the
    /// destination footprint `(w, h)` in frame pixels.
    pub fn blit_board(&mut self, src: &PixelFrame, dx: i32, dy: i32, scale: u32) -> (u32, u32) {
        let scale = scale.max(1);
        for sy in 0..src.h as i32 {
            for sx in 0..src.w as i32 {
                let c = src.px[(sy as u32 * src.w + sx as u32) as usize];
                self.blit_dot(
                    dx + sx * scale as i32,
                    dy + sy * scale as i32,
                    scale,
                    pack(c),
                );
            }
        }
        (src.w * scale, src.h * scale)
    }

    /// Draw one glyph cell; `bg` paints the transparent dots.
    pub fn glyph(
        &mut self,
        rows: [&str; 7],
        dx: i32,
        dy: i32,
        scale: u32,
        fg: Rgb,
        bg: Option<Rgb>,
    ) {
        let scale = scale.max(1);
        let (fv, bv) = (pack(fg), bg.map(pack));
        for (gy, row) in rows.iter().enumerate() {
            for (gx, p) in row.chars().enumerate() {
                let v = if p == '#' { Some(fv) } else { bv };
                if let Some(v) = v {
                    self.blit_dot(
                        dx + gx as i32 * scale as i32,
                        dy + gy as i32 * scale as i32,
                        scale,
                        v,
                    );
                }
            }
        }
    }

    /// Draw one text line left-to-right. Returns the drawn width under
    /// [`crate::font::text_width`] (trailing bearing excluded).
    pub fn text(&mut self, s: &str, dx: i32, dy: i32, scale: u32, fg: Rgb, bg: Option<Rgb>) -> u32 {
        let scale = scale.max(1);
        let mut x = dx;
        for c in s.chars() {
            self.glyph(font::rows_for(c), x, dy, scale, fg, bg);
            x += font::ADVANCE as i32 * scale as i32;
        }
        font::text_width(s, scale)
    }

    /// Centered text line; returns the drawn x origin.
    pub fn text_centered(
        &mut self,
        s: &str,
        cx: i32,
        dy: i32,
        scale: u32,
        fg: Rgb,
        bg: Option<Rgb>,
    ) -> i32 {
        let w = font::text_width(s, scale.max(1)) as i32;
        let x = cx - w / 2;
        self.text(s, x, dy, scale, fg, bg);
        x
    }

    /// Count frame pixels exactly equal to packed `v`.
    pub fn count_packed(&self, v: u32) -> usize {
        self.px.iter().filter(|&&p| p == v).count()
    }

    /// Count frame pixels exactly equal to `c`.
    pub fn count(&self, c: Rgb) -> usize {
        self.count_packed(pack(c))
    }

    /// Encode the frame as binary PPM (`P6`) bytes: a 3-line header plus
    /// row-major RGB triplets. Used by `--probe` screenshots and tests.
    pub fn to_ppm(&self) -> Vec<u8> {
        let mut out = format!("P6\n{} {}\n255\n", self.w, self.h).into_bytes();
        out.reserve((self.w as usize) * (self.h as usize) * 3);
        for &px in &self.px {
            out.push((px >> 16) as u8);
            out.push((px >> 8) as u8);
            out.push(px as u8);
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const BG: Rgb = Rgb(0, 0, 0);
    const FG: Rgb = Rgb(255, 255, 255);

    #[test]
    fn blank_rejects_degenerate_sizes() {
        assert!(Frame::blank(0, 10, BG).is_none());
        assert!(Frame::blank(10, 0, BG).is_none());
        assert!(Frame::blank(5000, 5000, BG).is_none());
        let f = Frame::blank(4, 3, BG).unwrap();
        assert_eq!(f.px.len(), 12);
    }

    #[test]
    fn set_get_clip_without_panic() {
        let mut f = Frame::blank(4, 4, BG).unwrap();
        f.set(1, 1, FG);
        assert_eq!(f.get(1, 1), Some(pack(FG)));
        assert_eq!(f.get(0, 0), Some(pack(BG)));
        f.set(-1, 0, FG);
        f.set(4, 0, FG);
        f.set(0, -1, FG);
        f.set(0, 4, FG);
        assert_eq!(f.get(-1, 0), None);
        assert_eq!(f.get(99, 99), None);
        assert_eq!(f.count(FG), 1);
    }

    #[test]
    fn blit_board_scales_nearest_neighbor() {
        let mut f = Frame::blank(8, 8, BG).unwrap();
        let src = PixelFrame {
            w: 2,
            h: 2,
            px: vec![Rgb(255, 0, 0), Rgb(0, 255, 0), Rgb(0, 0, 255), FG],
        };
        let (w, h) = f.blit_board(&src, 1, 1, 2);
        assert_eq!((w, h), (4, 4));
        assert_eq!(f.get(1, 1), Some(pack(Rgb(255, 0, 0))));
        assert_eq!(f.get(2, 2), Some(pack(Rgb(255, 0, 0))));
        assert_eq!(f.get(3, 1), Some(pack(Rgb(0, 255, 0))));
        assert_eq!(f.get(1, 3), Some(pack(Rgb(0, 0, 255))));
        assert_eq!(f.get(4, 4), Some(pack(FG)));
        assert_eq!(f.get(0, 0), Some(pack(BG)));
    }

    #[test]
    fn text_draw_matches_metrics_and_clips() {
        let mut f = Frame::blank(60, 20, BG).unwrap();
        let drawn = f.text("AB", 2, 2, 1, FG, None);
        assert_eq!(drawn, font::text_width("AB", 1));
        assert!(f.count(FG) > 10);
        // Off-frame text never panics and paints nothing new.
        let before = f.count(FG);
        f.text("AB", 1000, 1000, 3, FG, None);
        assert_eq!(f.count(FG), before);
        // Background fill paints the transparent dots.
        let mut g = Frame::blank(30, 12, BG).unwrap();
        g.text("A", 1, 1, 1, FG, Some(Rgb(1, 2, 3)));
        assert!(g.count(Rgb(1, 2, 3)) > 0);
    }

    #[test]
    fn ppm_encodes_header_and_rgb_triplets() {
        let mut f = Frame::blank(2, 1, BG).unwrap();
        f.set(0, 0, Rgb(255, 0, 0));
        f.set(1, 0, Rgb(0, 255, 0));
        let ppm = f.to_ppm();
        let header = "P6\n2 1\n255\n".to_string();
        assert!(ppm.starts_with(header.as_bytes()));
        assert_eq!(&ppm[header.len()..], &[255, 0, 0, 0, 255, 0]);
    }

    #[test]
    fn border_and_rect_stay_inside() {
        let mut f = Frame::blank(10, 10, BG).unwrap();
        f.rect(-2, -2, 6, 6, FG);
        assert!(f.count(FG) > 0 && f.count(FG) < 36);
        let mut g = Frame::blank(10, 10, BG).unwrap();
        g.border(1, 1, 8, 8, 1, FG);
        assert_eq!(g.get(1, 1), Some(pack(FG)));
        assert_eq!(g.get(4, 4), Some(pack(BG)));
        assert_eq!(g.get(8, 8), Some(pack(FG)));
    }
}
