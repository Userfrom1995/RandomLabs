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

use maze_chase_assets::anim;
use maze_chase_assets::sprites;
use maze_chase_assets::themes::{mix, Rgb, Theme};
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

/// Engine heading mapped onto the shared authored-sheet selector.
fn facing_of(dir: Dir) -> sprites::Facing {
    match dir {
        Dir::Right => sprites::Facing::Right,
        Dir::Left => sprites::Facing::Left,
        Dir::Up => sprites::Facing::Up,
        Dir::Down => sprites::Facing::Down,
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
                        paint_glyph(
                            &mut frame,
                            &sprites::CRUMB,
                            x0 + PPT / 2,
                            y0 + PPT / 2,
                            theme.crumb,
                            theme.text,
                            theme.eyes,
                        );
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
    let flash_on = flash && anim::fright_flash_on(game.wardens.fright_t);
    let bodies = [theme.bram, theme.kessa, theme.jory, theme.nib];
    for warden in game.wardens.wardens.iter() {
        let cx = (warden.actor.x * PPT as f32) as i32;
        let cy = (warden.actor.y * PPT as f32) as i32;
        match warden.state {
            WardenState::Eyes => {
                let eye_rows = sprites::eyes_rows(facing_of(warden.actor.dir));
                let eyes: Vec<&str> = eye_rows.iter().map(|s| s.as_str()).collect();
                paint_glyph(
                    &mut frame, &eyes, cx, cy, theme.eyes, theme.eyes, theme.eyes,
                );
            }
            _ => {
                let body_glyph: &[&str] = match warden.index {
                    0 => &sprites::WARDEN_BRAM,
                    1 => &sprites::WARDEN_KESSA,
                    2 => &sprites::WARDEN_JORY,
                    _ => &sprites::WARDEN_NIB,
                };
                if fright && warden.state == WardenState::Active {
                    let morph = !game.wardens.fright_total.is_finite()
                        || game.wardens.fright_total - game.wardens.fright_t < 0.25;
                    let mask: &[&str] = if morph {
                        &sprites::FRIGHT_MASK_ENTRY
                    } else if flash_on {
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
                    let eye_rows = sprites::eyes_rows(facing_of(warden.actor.dir));
                    let eyes: Vec<&str> = eye_rows.iter().map(|s| s.as_str()).collect();
                    paint_glyph(
                        &mut frame, &eyes, cx, cy, theme.eyes, theme.eyes, theme.eyes,
                    );
                } else {
                    let body = bodies.get(warden.index).copied().unwrap_or(theme.bram);
                    paint_glyph(&mut frame, body_glyph, cx, cy, body, theme.text, theme.eyes);
                    let eye_rows = sprites::eyes_rows(facing_of(warden.actor.dir));
                    let eyes: Vec<&str> = eye_rows.iter().map(|s| s.as_str()).collect();
                    // Eye overlay sits high on the 11-tall body.
                    paint_glyph(
                        &mut frame,
                        &eyes,
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
        let clip: &[&str] = sprites::PIP_DEATH[anim::death_frame(game.state_elapsed())];
        paint_glyph(
            &mut frame, clip, pcx, pcy, theme.pip, theme.text, theme.eyes,
        );
    } else {
        let phase = game.fx.gulp_phase().unwrap_or((frame_no / 5) as usize % 3);
        let rows = sprites::pip_facing_rows(phase, facing_of(game.player.dir), 11);
        let refs: Vec<&str> = rows.iter().map(|s| s.as_str()).collect();
        let hop = game.fx.hop_frame().map(sprites::hop_offset).unwrap_or(0);
        paint_glyph(
            &mut frame,
            &refs,
            pcx,
            pcy + hop,
            theme.pip,
            theme.text,
            theme.eyes,
        );
    }

    // Pickup ripple above Pip, so the player never hides it.
    if let Some((anchor, idx)) = game.fx.pickup_burst() {
        paint_glyph(
            &mut frame,
            &sprites::PICKUP_BURST[idx],
            (anchor.x * PPT as f32) as i32,
            (anchor.y * PPT as f32) as i32,
            theme.accent,
            theme.text,
            theme.eyes,
        );
    }

    // Committed-turn spark above Pip, then the spare-wick bloom.
    if let Some(anchor) = game.fx.turn_spark() {
        paint_glyph(
            &mut frame,
            &sprites::TURN_SPARK,
            (anchor.x * PPT as f32) as i32,
            (anchor.y * PPT as f32) as i32,
            theme.text,
            theme.text,
            theme.text,
        );
    }
    if let Some(idx) = game.fx.lily_frame() {
        paint_glyph(
            &mut frame,
            &sprites::GOLDEN_LILY[idx],
            (BOARD_W / 2) as i32,
            (BOARD_H / 2) as i32,
            theme.accent,
            theme.text,
            theme.eyes,
        );
    }

    // Lantern sweep after the actors, then the lily-crown banner, exactly
    // like the shared raster.
    if game.state == GameState::Clearing {
        if let Some(p) = anim::level_clear_sweep(game.state_elapsed()) {
            let band = (PPT * 2) as u32;
            let x = (p * frame.w as f32) as u32;
            let tint = mix(theme.bg, theme.accent, 0.45);
            for bx in x..(x + band).min(frame.w) {
                for y in 0..frame.h as i32 {
                    frame.set(bx as i32, y, tint);
                }
            }
        }
        if anim::level_clear_banner_on(game.state_elapsed()) {
            paint_glyph(
                &mut frame,
                &sprites::LILY_CROWN,
                (BOARD_W / 2) as i32,
                (BOARD_H / 2) as i32,
                theme.accent,
                theme.text,
                theme.eyes,
            );
        }
    }

    // Rising score floaters on an opaque plate (desktop and web only).
    for (floater, progress) in game.fx.floaters() {
        paint_floater(&mut frame, &floater, progress, theme);
    }

    frame
}

/// One floater: 5x7 numerals rising 8 px over 500 ms on an opaque plate.
fn paint_floater(
    frame: &mut Frame,
    floater: &maze_chase_engine::effects::Floater,
    progress: f32,
    theme: &Theme,
) {
    const PPT: i32 = BOARD_PPT as i32;
    let text = floater.points.to_string();
    let rise = (progress * 8.0) as i32;
    let cx = (floater.x * PPT as f32) as i32;
    let cy = (floater.y * PPT as f32) as i32 - rise;
    let w = text.chars().count() as i32 * 6 - 1;
    let x0 = (cx - w / 2).clamp(1, frame.w as i32 - w - 2);
    let y0 = (cy - 3).clamp(9, frame.h as i32 - 10);
    for y in y0 - 1..y0 + 8 {
        for x in x0 - 1..x0 + w + 1 {
            frame.set(x, y, theme.bg);
        }
    }
    for (i, ch) in text.chars().enumerate() {
        let digit = ch.to_digit(10).unwrap_or(0) as usize;
        let glyph = &sprites::DIGITS[digit];
        let x = x0 + i as i32 * 6;
        for (gy, row) in glyph.iter().enumerate() {
            for (gx, ink) in row.bytes().enumerate() {
                if ink == b'#' {
                    frame.set(x + gx as i32, y0 + gy as i32, theme.text);
                }
            }
        }
    }
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
        let f = render_board(&g, &themes::DUSK_POND, 0, true);
        assert_eq!((f.w, f.h), (BOARD_W, BOARD_H));
        assert_eq!((f.w, f.h), (224, 248));
        assert_eq!(f.px.len(), 224 * 248 * 4);
    }

    #[test]
    fn walls_and_crumbs_painted() {
        let g = fresh();
        let f = render_board(&g, &themes::DUSK_POND, 0, true);
        assert!(f.count(themes::DUSK_POND.wall) > 100);
        assert!(f.count(themes::DUSK_POND.wall_inner) > 100);
        assert!(f.count(themes::DUSK_POND.crumb) > 200);
    }

    #[test]
    fn sunseed_animates() {
        let g = fresh();
        let a = render_board(&g, &themes::DUSK_POND, 0, true);
        let b = render_board(&g, &themes::DUSK_POND, 24, true);
        assert_ne!(a.px, b.px, "sunseed halo must animate");
    }

    #[test]
    fn pip_and_wardens_painted_and_deterministic() {
        let g = fresh();
        let f = render_board(&g, &themes::DUSK_POND, 0, true);
        assert!(f.count(themes::DUSK_POND.pip) > 10);
        assert!(f.count(themes::DUSK_POND.bram) > 5);
        assert!(f.count(themes::DUSK_POND.kessa) > 5);
        let again = render_board(&g, &themes::DUSK_POND, 0, true);
        assert_eq!(f, again);
    }

    #[test]
    fn fright_masks_replace_active_bodies() {
        let g = fresh();
        let plain = render_board(&g, &themes::DUSK_POND, 0, true);
        assert!(plain.count(themes::DUSK_POND.bram) > 5);
        // The mask glyph carries no body fill (`o`): Bram's hunt colors
        // vanish under the pale mask while housed wardens keep theirs.
        let mut g = fresh();
        g.wardens.start_fright(6.0);
        let f = render_board(&g, &themes::DUSK_POND, 0, true);
        assert_eq!(f.count(themes::DUSK_POND.bram), 0);
        assert!(f.count(themes::DUSK_POND.kessa) > 5);
    }

    #[test]
    fn all_facings_render_pip() {
        for dir in [Dir::Right, Dir::Left, Dir::Up, Dir::Down] {
            let mut g = fresh();
            g.player.dir = dir;
            let f = render_board(&g, &themes::DUSK_POND, 3, true);
            assert!(f.count(themes::DUSK_POND.pip) > 10, "{dir:?}");
        }
    }

    #[test]
    fn effects_and_death_follow_the_shared_clocks() {
        let theme = themes::DUSK_POND;
        let mut g = fresh();
        let base = render_board(&g, &theme, 0, true);
        g.fx.pickup(g.player.x, g.player.y);
        let burst = render_board(&g, &theme, 0, true);
        assert_ne!(burst.px, base.px);
        let (px, py) = (
            (g.player.x * BOARD_PPT as f32) as i32,
            (g.player.y * BOARD_PPT as f32) as i32,
        );
        assert_eq!(
            burst.get(px, py).map(|(r, g, b, _)| (r, g, b)),
            Some((theme.text.0, theme.text.1, theme.text.2)),
            "the burst must paint over Pip, not under the sprite"
        );
        g.fx.advance(0.3);
        assert_eq!(render_board(&g, &theme, 0, true).px, base.px);

        g.fx.turn(g.player.x, g.player.y);
        assert_ne!(render_board(&g, &theme, 0, true).px, base.px);
        g.fx.advance(0.2);
        g.fx.spare_wick();
        assert_ne!(render_board(&g, &theme, 0, true).px, base.px);
        g.fx.advance(0.6);
        assert_eq!(render_board(&g, &theme, 0, true).px, base.px);

        // Death: 100 ms frames from the state clock, then hold frame 3.
        let mut g = fresh();
        g.kill_player();
        for _ in 0..60 {
            g.tick(1.0 / 120.0);
        }
        let held = render_board(&g, &theme, 0, true);
        for _ in 0..12 {
            g.tick(1.0 / 120.0);
        }
        assert_eq!(render_board(&g, &theme, 0, true), held);
    }

    #[test]
    fn death_frame_boundaries_are_exact() {
        let theme = themes::DUSK_POND;
        let mut frames = Vec::new();
        for t in [0.0f32, 0.05, 0.1, 0.2, 0.4] {
            let mut g = fresh();
            g.kill_player();
            if t > 0.0 {
                g.tick(t);
            }
            frames.push(render_board(&g, &theme, 0, true).px);
        }
        assert_eq!(frames[0], frames[1], "0.0 and 0.05 hold frame 0");
        assert_ne!(frames[1], frames[2], "0.1 starts frame 1");
        assert_ne!(frames[2], frames[3], "0.2 starts frame 2");
        assert_ne!(frames[3], frames[4], "0.4 holds the final frame");
        assert_ne!(frames[0], frames[4], "the first and last frames differ");
    }

    #[test]
    fn left_facing_warden_eyes_are_mirrored() {
        let theme = themes::DUSK_POND;
        let mut g = fresh();
        for (i, warden) in g.wardens.wardens.iter_mut().enumerate() {
            warden.state = WardenState::Active;
            warden.actor.x = 2.0 + i as f32 * 3.0;
            warden.actor.y = 2.0;
        }
        g.wardens.fright_t = 0.0;
        let cx = (g.wardens.wardens[0].actor.x * BOARD_PPT as f32) as i32;
        let cy = (g.wardens.wardens[0].actor.y * BOARD_PPT as f32) as i32 - 1;
        let eye_positions = |frame: &Frame| {
            let mut set = std::collections::BTreeSet::new();
            for dy in -3..=3 {
                for dx in -3..=3 {
                    if frame.get(cx + dx, cy + dy).map(|(r, g, b, _)| (r, g, b))
                        == Some((theme.eyes.0, theme.eyes.1, theme.eyes.2))
                    {
                        set.insert((dx, dy));
                    }
                }
            }
            set
        };
        g.wardens.wardens[0].actor.dir = Dir::Left;
        let left = eye_positions(&render_board(&g, &theme, 0, true));
        g.wardens.wardens[0].actor.dir = Dir::Right;
        let right = eye_positions(&render_board(&g, &theme, 0, true));
        let left_only: std::collections::BTreeSet<_> = left.difference(&right).copied().collect();
        let right_only: std::collections::BTreeSet<_> = right.difference(&left).copied().collect();
        let mirrored: std::collections::BTreeSet<_> =
            right_only.iter().map(|&(dx, dy)| (-dx, dy)).collect();
        assert_eq!(left_only, mirrored, "left eyes must mirror right eyes");
    }

    #[test]
    fn up_and_down_use_authored_sheets() {
        let theme = themes::DUSK_POND;
        let mut g = fresh();
        g.player.dir = Dir::Up;
        let up = render_board(&g, &theme, 0, true);
        g.player.dir = Dir::Down;
        let down = render_board(&g, &theme, 0, true);
        assert_ne!(up.px, down.px);
    }

    #[test]
    fn level_clear_sweep_paints_after_the_actors() {
        let theme = themes::DUSK_POND;
        let mut g = fresh();
        g.state = GameState::Clearing;
        for _ in 0..18 {
            g.tick(1.0 / 120.0);
        }
        let f = render_board(&g, &theme, 0, true);
        let p = anim::level_clear_sweep(g.state_elapsed()).expect("sweep window");
        let x = (p * f.w as f32) as i32;
        let tint = mix(theme.bg, theme.accent, 0.45);
        assert_eq!(f.get(x + 1, 0), Some((tint.0, tint.1, tint.2, 255)));
        assert_eq!(f.get(x + 1, 1), Some((tint.0, tint.1, tint.2, 255)));
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
        let a = render_board(&g, &themes::MORNING_SHALLOWS, 7, true);
        let b = render_board(&g, &themes::MORNING_SHALLOWS, 7, true);
        assert_eq!(a, b);
        // Tile (13,13) is gatehouse interior: nothing paints over it.
        let (x, y) = (13 * BOARD_PPT as i32 + 4, 13 * BOARD_PPT as i32 + 4);
        let t = themes::MORNING_SHALLOWS;
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
