//! Canvas framebuffer for the browser harness: game state to RGBA pixels.
//!
//! This module mirrors `maze_chase_terminal::raster` pixel-for-pixel at the
//! board level (fixed [`BOARD_PPT`], same iteration order, same animation
//! cadence) but packs pixels as RGBA bytes for `<canvas>` via `putImageData`.
//! It is read-only over the engine: no gameplay logic lives here, only the
//! mapping from `Game` state to pixels.
//!
//! Layout: the board is [`BOARD_W`]x[`BOARD_H`] pixels. The JS harness scales
//! it with [`fit_canvas`] / [`blit_scaled`]. Canvases smaller than the board
//! clip centered (the JS harness enforces a minimum CSS size; see docs).
//!
//! Glyph legend (see `maze_chase_assets::sprites`): `.` transparent,
//! `#` outline, `o` body fill (actor color), `*` highlight. Alpha is always
//! 255 (fully opaque).

use maze_chase_assets::sprites;
use maze_chase_assets::themes::{Rgb, Theme};
use maze_chase_engine::actors::Dir;
use maze_chase_engine::game::{Game, GameState};
use maze_chase_engine::ghosts::WardenState;
use maze_chase_engine::maze::{Tile, HEIGHT, WIDTH};
use maze_chase_engine::tuning;

/// Pixels per tile for the web board (matches the terminal default tier).
pub const BOARD_PPT: u32 = 8;
/// Board width in pixels: 28 tiles * 8.
pub const BOARD_W: u32 = 224;
/// Board height in pixels: 31 tiles * 8.
pub const BOARD_H: u32 = 248;

/// An RGBA frame, row-major, `w`x`h` pixels, `px.len() == w*h*4`.
#[derive(Clone, PartialEq, Eq, Debug)]
pub struct Frame {
    pub w: u32,
    pub h: u32,
    pub px: Vec<u8>,
}

impl Frame {
    /// Blank frame filled with `bg` (alpha 255 everywhere).
    pub fn blank(w: u32, h: u32, bg: Rgb) -> Self {
        let n = (w as u64).saturating_mul(h as u64).saturating_mul(4) as usize;
        let mut px = Vec::with_capacity(n);
        let cell = [bg.0, bg.1, bg.2, 255];
        for _ in 0..n / 4 {
            px.extend_from_slice(&cell);
        }
        Self { w, h, px }
    }

    /// Pixel at `(x, y)` as `(r, g, b, a)`, or `None` when out of bounds.
    pub fn get(&self, x: i32, y: i32) -> Option<(u8, u8, u8, u8)> {
        if x < 0 || y < 0 || x >= self.w as i32 || y >= self.h as i32 {
            return None;
        }
        let i = ((y as u64 * self.w as u64 + x as u64) * 4) as usize;
        if i + 4 > self.px.len() {
            return None;
        }
        Some((self.px[i], self.px[i + 1], self.px[i + 2], self.px[i + 3]))
    }

    /// Paint `c` at `(x, y)` (alpha 255); silently clips out of bounds.
    pub fn set(&mut self, x: i32, y: i32, c: Rgb) {
        if x < 0 || y < 0 || x >= self.w as i32 || y >= self.h as i32 {
            return;
        }
        let i = ((y as u64 * self.w as u64 + x as u64) * 4) as usize;
        if i + 4 > self.px.len() {
            return;
        }
        self.px[i] = c.0;
        self.px[i + 1] = c.1;
        self.px[i + 2] = c.2;
        self.px[i + 3] = 255;
    }

    /// Count pixels exactly equal to `c` (RGB match, alpha ignored).
    pub fn count(&self, c: Rgb) -> usize {
        let (cells, _) = self.px.as_chunks::<4>();
        cells
            .iter()
            .filter(|p| p[0] == c.0 && p[1] == c.1 && p[2] == c.2)
            .count()
    }
}

/// Paint one legend glyph centered at pixel `(cx, cy)`.
fn paint_glyph(
    frame: &mut Frame,
    rows: &[&str],
    cx: i32,
    cy: i32,
    body: Rgb,
    outline: Rgb,
    highlight: Rgb,
) {
    let h = rows.len() as i32;
    let w = rows.first().map_or(0, |r| r.len()) as i32;
    for (gy, row) in rows.iter().enumerate() {
        for (gx, ch) in row.bytes().enumerate() {
            let c = match ch {
                b'.' => continue,
                b'#' => outline,
                b'o' => body,
                b'*' => highlight,
                _ => continue,
            };
            frame.set(cx - w / 2 + gx as i32, cy - h / 2 + gy as i32, c);
        }
    }
}

/// Right-facing Pip glyph for a mouth phase (0 open, 1 mid, 2 closed).
fn pip_glyph(phase: usize) -> &'static [&'static str] {
    match phase % 3 {
        0 => &sprites::PIP_RIGHT,
        1 => &sprites::PIP_RIGHT_MID,
        _ => &sprites::PIP_CLOSED,
    }
}

/// Relish icon tier for a level: pairs of levels share one of six icons.
fn relish_icon_index(level: u32) -> usize {
    ((level.saturating_sub(1) / 2) as usize).min(5)
}

/// Render the full board frame: maze, pickups, relish, wardens, Pip.
///
/// `frame_no` drives honest animation (mouth chomp, sunseed pulse, fright
/// flash blink). `flash` enables the fright-warning blink; accessibility
/// callers pass `false` to hold the steady mask (honors reduced-flash).
pub fn render_board(game: &Game, theme: &Theme, frame_no: u64, flash: bool) -> Frame {
    const PPT: i32 = BOARD_PPT as i32;
    let mut frame = Frame::blank(BOARD_W, BOARD_H, theme.bg);
    let crumb_field = game.maze.dot_bytes();
    let stride = (WIDTH * HEIGHT) as usize;

    for ty in 0..HEIGHT {
        for tx in 0..WIDTH {
            let x0 = tx * PPT;
            let y0 = ty * PPT;
            match game.maze.tile(tx, ty) {
                Tile::Wall => {
                    // Beveled wall: inner fill in the deep tone, inset
                    // face in the wall tone (margin max(8/4,1) = 2).
                    for py in y0..y0 + PPT {
                        for px in x0..x0 + PPT {
                            frame.set(px, py, theme.wall_inner);
                        }
                    }
                    let m = (PPT / 4).max(1);
                    for py in y0 + m..y0 + PPT - m {
                        for px in x0 + m..x0 + PPT - m {
                            frame.set(px, py, theme.wall);
                        }
                    }
                }
                Tile::Door => {
                    let mid = y0 + PPT / 2;
                    for px in x0..x0 + PPT {
                        frame.set(px, mid, theme.accent);
                        frame.set(px, mid - 1, theme.accent);
                    }
                }
                Tile::House => {}
                Tile::Dot | Tile::Energizer | Tile::Plain => {
                    let i = (ty * WIDTH + tx) as usize;
                    if crumb_field.get(i).copied().unwrap_or(0) == 1 {
                        let cx = x0 + PPT / 2;
                        let cy = y0 + PPT / 2;
                        frame.set(cx, cy, theme.crumb);
                        frame.set(cx - 1, cy, theme.crumb);
                    }
                    if crumb_field.get(stride + i).copied().unwrap_or(0) == 1 {
                        // Sunseed pulse: halo frame alternates every ~0.4 s
                        // at 60 fps render cadence.
                        let halo = (frame_no / 24) % 2 == 1;
                        let glyph: &[&str] = if halo {
                            &sprites::SUNSEED_B
                        } else {
                            &sprites::SUNSEED_A
                        };
                        paint_glyph(
                            &mut frame,
                            glyph,
                            x0 + PPT / 2,
                            y0 + PPT / 2,
                            theme.sunseed,
                            theme.sunseed,
                            theme.eyes,
                        );
                    }
                }
            }
        }
    }

    // Bonus relish on its tile while it waits.
    if game.relish.active {
        let (rtx, rty) = tuning::RELISH_TILE;
        let icon: &[&str] = &sprites::RELISH_ICONS[relish_icon_index(game.level)];
        let bob = if (frame_no / 30).is_multiple_of(2) {
            0
        } else {
            -1
        };
        paint_glyph(
            &mut frame,
            icon,
            rtx * PPT + PPT / 2,
            rty * PPT + PPT / 2 + bob,
            theme.accent,
            theme.text,
            theme.eyes,
        );
    }

    // Wardens under Pip (Pip paints last).
    let fright = game.wardens.fright_active();
    let flash_on = flash
        && game.wardens.fright_t <= tuning::FRIGHT_FLASH_THRESHOLD
        && (frame_no / 6).is_multiple_of(2);
    let bodies = [theme.bram, theme.kessa, theme.jory, theme.nib];
    for warden in game.wardens.wardens.iter() {
        let cx = (warden.actor.x * PPT as f32) as i32;
        let cy = (warden.actor.y * PPT as f32) as i32;
        match warden.state {
            WardenState::Eyes => {
                let eyes: &[&str] = match warden.actor.dir {
                    Dir::Up => &sprites::EYES_UP,
                    Dir::Down => &sprites::EYES_DOWN,
                    _ => &sprites::EYES_RIGHT,
                };
                paint_glyph(&mut frame, eyes, cx, cy, theme.eyes, theme.eyes, theme.eyes);
            }
            _ => {
                let body_glyph: &[&str] = match warden.index {
                    0 => &sprites::WARDEN_BRAM,
                    1 => &sprites::WARDEN_KESSA,
                    2 => &sprites::WARDEN_JORY,
                    _ => &sprites::WARDEN_NIB,
                };
                if fright && warden.state == WardenState::Active {
                    let mask: &[&str] = if flash_on {
                        &sprites::FRIGHT_MASK_FLASH
                    } else {
                        &sprites::FRIGHT_MASK
                    };
                    paint_glyph(
                        &mut frame,
                        mask,
                        cx,
                        cy,
                        theme.fright,
                        theme.text,
                        theme.eyes,
                    );
                } else {
                    let body = bodies.get(warden.index).copied().unwrap_or(theme.bram);
                    paint_glyph(&mut frame, body_glyph, cx, cy, body, theme.text, theme.eyes);
                    let eyes: &[&str] = match warden.actor.dir {
                        Dir::Up => &sprites::EYES_UP,
                        Dir::Down => &sprites::EYES_DOWN,
                        _ => &sprites::EYES_RIGHT,
                    };
                    // Eye overlay sits high on the 11-tall body.
                    paint_glyph(
                        &mut frame,
                        eyes,
                        cx,
                        cy - 1,
                        theme.eyes,
                        theme.eyes,
                        theme.eyes,
                    );
                }
            }
        }
    }

    // Pip paints last (death clip while dying, chomp cycle in play).
    let (pcx, pcy) = (
        (game.player.x * PPT as f32) as i32,
        (game.player.y * PPT as f32) as i32,
    );
    if game.state == GameState::Dying {
        let clip: &[&str] = sprites::PIP_DEATH[(frame_no as usize / 8) % 4];
        paint_glyph(
            &mut frame, clip, pcx, pcy, theme.pip, theme.text, theme.eyes,
        );
    } else {
        let phase = (frame_no / 5) as usize % 3;
        let right = pip_glyph(phase);
        // Derive the facing from the stored right-facing art, mirroring
        // the documented sprite transforms (never duplicate art).
        let facing: Vec<String> = match game.player.dir {
            Dir::Right => right.iter().map(|s| s.to_string()).collect(),
            Dir::Left => sprites::flip_horizontal(right),
            Dir::Down => sprites::rotate_cw(right),
            Dir::Up => {
                let down = sprites::rotate_cw(right);
                let d2: Vec<&str> = down.iter().map(|s| s.as_str()).collect();
                let up1 = sprites::rotate_cw(&d2);
                let u1: Vec<&str> = up1.iter().map(|s| s.as_str()).collect();
                sprites::rotate_cw(&u1)
            }
        };
        let refs: Vec<&str> = facing.iter().map(|s| s.as_str()).collect();
        paint_glyph(
            &mut frame, &refs, pcx, pcy, theme.pip, theme.text, theme.eyes,
        );
    }

    frame
}

/// Integer-fit of the board inside a canvas: whole-pixel scale plus the
/// letterbox offset. Canvases smaller than the board keep scale 1 and center
/// on `0`, so the board clips centered (the JS harness enforces a minimum
/// CSS size; see docs).
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub struct Fit {
    pub scale: u32,
    pub dw: u32,
    pub dh: u32,
    pub ox: u32,
    pub oy: u32,
}

/// Fit the [`BOARD_W`]x[`BOARD_H`] board into a `canvas_w`x`canvas_h` canvas.
///
/// Integer scale is `max(1, min(canvas_w/224, canvas_h/248))` with integer
/// division. A zero canvas in either dimension returns scale 1 with zero
/// sizes and offsets (no division by zero, no panic).
pub fn fit_canvas(canvas_w: u32, canvas_h: u32) -> Fit {
    if canvas_w == 0 || canvas_h == 0 {
        return Fit {
            scale: 1,
            dw: 0,
            dh: 0,
            ox: 0,
            oy: 0,
        };
    }
    let scale = (canvas_w / BOARD_W).min(canvas_h / BOARD_H).max(1);
    let dw = BOARD_W.saturating_mul(scale);
    let dh = BOARD_H.saturating_mul(scale);
    let ox = if dw > canvas_w {
        0
    } else {
        (canvas_w - dw) / 2
    };
    let oy = if dh > canvas_h {
        0
    } else {
        (canvas_h - dh) / 2
    };
    Fit {
        scale,
        dw,
        dh,
        ox,
        oy,
    }
}

/// Blit `src` onto `dst` (a `dw`x`dh` RGBA canvas, `dw*dh*4` bytes).
///
/// Fills `dst` with `bg`, then nearest-neighbor replicates each source pixel
/// `fit.scale`x`fit.scale` times at offset (`fit.ox`, `fit.oy`), clipping to
/// the `dw`x`dh` bounds. Never panics: short buffers simply paint the bytes
/// that fit.
pub fn blit_scaled(dst: &mut [u8], dw: u32, dh: u32, src: &Frame, fit: &Fit, bg: Rgb) {
    let cell = [bg.0, bg.1, bg.2, 255];
    // Fill the whole buffer with the background (any trailing partial cell,
    // when the buffer is not a multiple of 4, is padded opaque).
    let (cells, tail) = dst.as_chunks_mut::<4>();
    for chunk in cells {
        *chunk = cell;
    }
    for b in tail {
        *b = 255;
    }
    let scale = fit.scale.max(1) as u64;
    let (sw, sh) = (src.w as u64, src.h as u64);
    let (dw64, dh64) = (dw as u64, dh as u64);
    for sy in 0..sh {
        for sx in 0..sw {
            let si = ((sy * sw + sx) * 4) as usize;
            if si + 4 > src.px.len() {
                continue;
            }
            let (r, g, b, a) = (src.px[si], src.px[si + 1], src.px[si + 2], src.px[si + 3]);
            for dy in 0..scale {
                for dx in 0..scale {
                    let x = fit.ox as u64 + sx * scale + dx;
                    let y = fit.oy as u64 + sy * scale + dy;
                    if x < dw64 && y < dh64 {
                        let di = ((y * dw64 + x) * 4) as usize;
                        if di + 4 <= dst.len() {
                            dst[di] = r;
                            dst[di + 1] = g;
                            dst[di + 2] = b;
                            dst[di + 3] = a;
                        }
                    }
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use maze_chase_assets::themes;

    fn fresh() -> Game {
        Game::new(7, 1)
    }

    #[test]
    fn board_dimensions_exact() {
        let g = fresh();
        let f = render_board(&g, &themes::EMBER_WARREN, 0, true);
        assert_eq!((f.w, f.h), (BOARD_W, BOARD_H));
        assert_eq!((f.w, f.h), (224, 248));
        assert_eq!(f.px.len(), 224 * 248 * 4);
    }

    #[test]
    fn walls_and_crumbs_painted() {
        let g = fresh();
        let f = render_board(&g, &themes::EMBER_WARREN, 0, true);
        assert!(f.count(themes::EMBER_WARREN.wall) > 100);
        assert!(f.count(themes::EMBER_WARREN.wall_inner) > 100);
        assert!(f.count(themes::EMBER_WARREN.crumb) > 200);
    }

    #[test]
    fn sunseed_animates() {
        let g = fresh();
        let a = render_board(&g, &themes::EMBER_WARREN, 0, true);
        let b = render_board(&g, &themes::EMBER_WARREN, 24, true);
        assert_ne!(a.px, b.px, "sunseed halo must animate");
    }

    #[test]
    fn pip_and_wardens_painted_and_deterministic() {
        let g = fresh();
        let f = render_board(&g, &themes::EMBER_WARREN, 0, true);
        assert!(f.count(themes::EMBER_WARREN.pip) > 10);
        assert!(f.count(themes::EMBER_WARREN.bram) > 5);
        assert!(f.count(themes::EMBER_WARREN.kessa) > 5);
        let again = render_board(&g, &themes::EMBER_WARREN, 0, true);
        assert_eq!(f, again);
    }

    #[test]
    fn fright_masks_replace_active_bodies() {
        let g = fresh();
        let plain = render_board(&g, &themes::EMBER_WARREN, 0, true);
        assert!(plain.count(themes::EMBER_WARREN.bram) > 5);
        // The mask glyph carries no body fill (`o`): Bram's hunt colors
        // vanish under the pale mask while housed wardens keep theirs.
        let mut g = fresh();
        g.wardens.start_fright(6.0);
        let f = render_board(&g, &themes::EMBER_WARREN, 0, true);
        assert_eq!(f.count(themes::EMBER_WARREN.bram), 0);
        assert!(f.count(themes::EMBER_WARREN.kessa) > 5);
    }

    #[test]
    fn all_facings_render_pip() {
        for dir in [Dir::Right, Dir::Left, Dir::Up, Dir::Down] {
            let mut g = fresh();
            g.player.dir = dir;
            let f = render_board(&g, &themes::EMBER_WARREN, 3, true);
            assert!(f.count(themes::EMBER_WARREN.pip) > 10, "{dir:?}");
        }
    }

    #[test]
    fn fit_math() {
        assert_eq!(
            fit_canvas(224, 248),
            Fit {
                scale: 1,
                dw: 224,
                dh: 248,
                ox: 0,
                oy: 0
            }
        );
        assert_eq!(
            fit_canvas(448, 496),
            Fit {
                scale: 2,
                dw: 448,
                dh: 496,
                ox: 0,
                oy: 0
            }
        );
        assert_eq!(
            fit_canvas(800, 600),
            Fit {
                scale: 2,
                dw: 448,
                dh: 496,
                ox: 176,
                oy: 52
            }
        );
        // Smaller than the board: scale stays 1, board clips centered.
        let clip = fit_canvas(100, 100);
        assert_eq!(clip.scale, 1);
        assert_eq!((clip.dw, clip.dh), (224, 248));
        assert_eq!((clip.ox, clip.oy), (0, 0));
        // Zero canvas: no panic, no divide by zero.
        assert_eq!(
            fit_canvas(0, 0),
            Fit {
                scale: 1,
                dw: 0,
                dh: 0,
                ox: 0,
                oy: 0
            }
        );
        assert_eq!(
            fit_canvas(0, 600),
            Fit {
                scale: 1,
                dw: 0,
                dh: 0,
                ox: 0,
                oy: 0
            }
        );
        assert_eq!(
            fit_canvas(800, 0),
            Fit {
                scale: 1,
                dw: 0,
                dh: 0,
                ox: 0,
                oy: 0
            }
        );
    }

    #[test]
    fn blit_round_trips_exact_size() {
        let mut src = Frame::blank(2, 2, Rgb(10, 20, 30));
        src.set(1, 0, Rgb(200, 0, 0));
        src.set(0, 1, Rgb(0, 200, 0));
        src.set(1, 1, Rgb(0, 0, 200));
        let fit = Fit {
            scale: 1,
            dw: 2,
            dh: 2,
            ox: 0,
            oy: 0,
        };
        let mut dst = vec![0u8; 2 * 2 * 4];
        blit_scaled(&mut dst, 2, 2, &src, &fit, Rgb(0, 0, 0));
        assert_eq!(dst, src.px);
    }

    #[test]
    fn blit_letterbox_keeps_bg_border() {
        let src = Frame::blank(2, 2, Rgb(200, 0, 0));
        let fit = Fit {
            scale: 1,
            dw: 2,
            dh: 2,
            ox: 2,
            oy: 2,
        };
        let mut dst = vec![0u8; 6 * 6 * 4];
        let bg = Rgb(1, 2, 3);
        blit_scaled(&mut dst, 6, 6, &src, &fit, bg);
        // Corner stays background.
        assert_eq!(&dst[0..4], &[1, 2, 3, 255]);
        // Center 2x2 carries the source red.
        let at = |x: usize, y: usize| dst[(y * 6 + x) * 4..(y * 6 + x) * 4 + 4].to_vec();
        assert_eq!(at(2, 2), vec![200, 0, 0, 255]);
        assert_eq!(at(3, 3), vec![200, 0, 0, 255]);
        // Far corner still background.
        assert_eq!(at(5, 5), vec![1, 2, 3, 255]);
    }

    #[test]
    fn blit_clip_case_paints_visible_region() {
        let src = Frame::blank(2, 2, Rgb(200, 0, 0));
        // Scaled board (4x4) clipped onto a 2x2 canvas: must not panic.
        let fit = Fit {
            scale: 2,
            dw: 4,
            dh: 4,
            ox: 0,
            oy: 0,
        };
        let mut dst = vec![0u8; 2 * 2 * 4];
        blit_scaled(&mut dst, 2, 2, &src, &fit, Rgb(0, 0, 0));
        assert_eq!(dst.len(), 2 * 2 * 4);
        // Visible region carries source pixels.
        assert_eq!(&dst[0..4], &[200, 0, 0, 255]);
    }

    #[test]
    fn golden_determinism_across_theme_and_bg_pixel() {
        let g = fresh();
        let a = render_board(&g, &themes::PARCHMENT_DAWN, 7, true);
        let b = render_board(&g, &themes::PARCHMENT_DAWN, 7, true);
        assert_eq!(a, b);
        // Tile (13,13) is gatehouse interior: nothing paints over it.
        let (x, y) = (13 * BOARD_PPT as i32 + 4, 13 * BOARD_PPT as i32 + 4);
        let t = themes::PARCHMENT_DAWN;
        assert_eq!(
            a.get(x, y),
            Some((t.bg.0, t.bg.1, t.bg.2, 255)),
            "house tile center must be theme bg"
        );
    }

    #[test]
    fn frame_get_set_count_basics() {
        let mut f = Frame::blank(4, 4, Rgb(1, 2, 3));
        assert_eq!(f.px.len(), 4 * 4 * 4);
        assert_eq!(f.get(0, 0), Some((1, 2, 3, 255)));
        assert_eq!(f.get(-1, 0), None);
        assert_eq!(f.get(4, 0), None);
        f.set(1, 1, Rgb(9, 9, 9));
        assert_eq!(f.get(1, 1), Some((9, 9, 9, 255)));
        assert_eq!(f.count(Rgb(9, 9, 9)), 1);
        // Out-of-bounds writes are silent no-ops.
        f.set(-5, -5, Rgb(9, 9, 9));
        f.set(99, 99, Rgb(9, 9, 9));
        assert_eq!(f.count(Rgb(9, 9, 9)), 1);
    }
}
