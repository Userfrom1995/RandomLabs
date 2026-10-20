//! Shared pixel rasterizer: game state to an RGB frame.
//!
//! Both bitmap tiers ([`crate::kitty`] and [`crate::sixel`]) render from
//! the same [`PixelFrame`], so pixels are identical wherever the bytes go.
//! The rasterizer is read-only over the engine: it maps input to nothing,
//! branches no gameplay, and only reads `Game` state (maze tiles, crumb
//! field, actor positions, warden states, relish, fright clock).
//!
//! Glyph legend (see `maze_chase_assets::sprites`): `.` transparent,
//! `#` outline, `o` body fill (actor color), `*` highlight / white.

use maze_chase_assets::anim;
use maze_chase_assets::sprites;
use maze_chase_assets::themes::{mix, Rgb, Theme};
use maze_chase_engine::game::Game;
use maze_chase_engine::ghosts::WardenState;
use maze_chase_engine::maze::{Tile, HEIGHT, WIDTH};
use maze_chase_engine::tuning;

/// Smallest pixels-per-tile the rasterizer accepts (glyphs stay legible).
pub const MIN_PPT: u32 = 6;
/// Default pixels-per-tile for the bitmap tiers.
pub const DEFAULT_PPT: u32 = 8;

/// An RGB frame, row-major, `w`x`h` pixels.
#[derive(Clone, PartialEq, Eq, Debug)]
pub struct PixelFrame {
    pub w: u32,
    pub h: u32,
    pub px: Vec<Rgb>,
}

impl PixelFrame {
    pub fn blank(w: u32, h: u32, bg: Rgb) -> Self {
        Self {
            w,
            h,
            px: vec![bg; (w * h) as usize],
        }
    }

    pub fn get(&self, x: i32, y: i32) -> Option<Rgb> {
        if x < 0 || y < 0 || x >= self.w as i32 || y >= self.h as i32 {
            return None;
        }
        Some(self.px[(y as u32 * self.w + x as u32) as usize])
    }

    pub fn set(&mut self, x: i32, y: i32, c: Rgb) {
        if x < 0 || y < 0 || x >= self.w as i32 || y >= self.h as i32 {
            return;
        }
        self.px[(y as u32 * self.w + x as u32) as usize] = c;
    }

    /// Count pixels exactly equal to `c`.
    pub fn count(&self, c: Rgb) -> usize {
        self.px.iter().filter(|&&p| p == c).count()
    }
}

/// Art rung selected for a pixels-per-tile choice.
///
/// The 11x11 sheet is the baseline; at 21 px per tile and above the
/// high-detail 21x21 sheet carries a belly seam, a throat pulse and 1 px
/// toe webbing. Both rungs are authored data, never upscales.
pub fn art_rung(ppt: i32) -> u8 {
    if ppt >= 21 {
        21
    } else {
        11
    }
}

/// Sprite art is authored on an 8-pixel tile grid at the 11x11 rung and a
/// 21-pixel grid at the 21x21 rung; when the raster is taken at a larger
/// real cell size, each sprite pixel becomes a `scale`x`scale` block so
/// the art stays crisp instead of shrinking relative to the tile.
pub(crate) fn sprite_scale(ppt: i32) -> i32 {
    (ppt / 8).max(1)
}

/// Scale for Rill's sheet: the 11x11 grid at its 8-pixel baseline, the
/// 21x21 grid at its own 21-pixel baseline.
pub(crate) fn pip_scale(ppt: i32) -> i32 {
    if art_rung(ppt) == 21 {
        (ppt / 21).max(1)
    } else {
        sprite_scale(ppt)
    }
}

/// Paint one legend glyph centered at pixel `(cx, cy)`, each glyph pixel
/// drawn as a `scale`x`scale` block.
fn paint_glyph(
    frame: &mut PixelFrame,
    rows: &[&str],
    cx: i32,
    cy: i32,
    scale: i32,
    palette: [Rgb; 3],
) {
    let [body, outline, highlight] = palette;
    let h = rows.len() as i32;
    let w = rows.first().map(|r| r.len()).unwrap_or(0) as i32;
    let scale = scale.max(1);
    for (gy, row) in rows.iter().enumerate() {
        for (gx, ch) in row.bytes().enumerate() {
            let c = match ch {
                b'.' => continue,
                b'#' => outline,
                b'o' => body,
                b'*' => highlight,
                _ => continue,
            };
            for dy in 0..scale {
                for dx in 0..scale {
                    frame.set(
                        cx - (w * scale) / 2 + gx as i32 * scale + dx,
                        cy - (h * scale) / 2 + gy as i32 * scale + dy,
                        c,
                    );
                }
            }
        }
    }
}

/// Engine heading mapped onto the authored sheet selector.
pub fn facing_of(dir: maze_chase_engine::actors::Dir) -> sprites::Facing {
    use maze_chase_engine::actors::Dir;
    match dir {
        Dir::Right => sprites::Facing::Right,
        Dir::Left => sprites::Facing::Left,
        Dir::Up => sprites::Facing::Up,
        Dir::Down => sprites::Facing::Down,
    }
}

/// Hop displacement in board pixels for pose 0 (squash) or 1 (stretch).
///
/// The 21x21 rung squashes 6 px and stretches 9 px; the 11x11 rung uses
/// the proportional 3 px / 5 px pair.
pub fn hop_offset(ppt: i32, frame: usize) -> i32 {
    sprites::hop_offset_for_rung(frame, art_rung(ppt)) * pip_scale(ppt)
}

/// Relish icon tier for a level: pairs of levels share one of six icons.
pub fn relish_icon_index(level: u32) -> usize {
    ((level.saturating_sub(1) / 2) as usize).min(5)
}

/// Render the full game frame: maze, pickups, relish, wardens, Pip.
///
/// `frame_no` drives honest animation (mouth chomp, sunseed pulse, fright
/// flash blink). `flash` enables the fright-warning blink; accessibility
/// callers pass `false` to hold the steady mask (honors reduced-flash).
pub fn render(game: &Game, theme: &Theme, ppt: u32, frame_no: u64, flash: bool) -> PixelFrame {
    let ppt = ppt.max(MIN_PPT) as i32;
    let scale = sprite_scale(ppt);
    let mut frame = PixelFrame::blank((WIDTH * ppt) as u32, (HEIGHT * ppt) as u32, theme.bg);
    let crumb_field = game.maze.dot_bytes();
    paint_tiles(&mut frame, game, theme, ppt, &crumb_field);
    paint_sunseeds(&mut frame, game, theme, ppt, scale, frame_no);
    paint_relish(&mut frame, game, theme, ppt, scale, frame_no);
    paint_wardens(&mut frame, game, theme, ppt, scale, frame_no, flash);
    paint_pip(&mut frame, game, theme, ppt, scale, frame_no);
    paint_pickup_burst(&mut frame, game, theme, ppt, scale);
    paint_turn_spark(&mut frame, game, theme, ppt, scale);
    paint_golden_lily(&mut frame, game, theme, scale);
    paint_level_clear(&mut frame, game, theme, ppt, scale);
    frame
}

/// One 300 ms lantern sweep across the board while the level clear is
/// playing. Presentation only: the engine state is untouched.
fn paint_level_clear(frame: &mut PixelFrame, game: &Game, theme: &Theme, ppt: i32, scale: i32) {
    if game.state != maze_chase_engine::game::GameState::Clearing {
        return;
    }
    if let Some(p) = anim::level_clear_sweep(game.state_elapsed()) {
        let band = (ppt * 2).max(2);
        let x = (p * frame.w as f32) as i32;
        let tint = mix(theme.bg, theme.accent, 0.45);
        for bx in x..(x + band).min(frame.w as i32) {
            for y in 0..frame.h as i32 {
                frame.set(bx, y, tint);
            }
        }
    }
    if anim::level_clear_banner_on(game.state_elapsed()) {
        let cx = (frame.w / 2) as i32;
        let cy = (frame.h / 2) as i32;
        paint_glyph(
            frame,
            &sprites::LILY_CROWN,
            cx,
            cy,
            scale,
            [theme.accent, theme.text, theme.eyes],
        );
    }
}

/// One burst per crumb or sunseed pickup, on the 66.7 ms four-frame grid.
fn paint_pickup_burst(frame: &mut PixelFrame, game: &Game, theme: &Theme, ppt: i32, scale: i32) {
    let Some((anchor, idx)) = game.fx.pickup_burst() else {
        return;
    };
    paint_glyph(
        frame,
        &sprites::PICKUP_BURST[idx],
        (anchor.x * ppt as f32) as i32,
        (anchor.y * ppt as f32) as i32,
        scale,
        [theme.accent, theme.text, theme.eyes],
    );
}

/// Committed-turn spark at the corner tile, painted above Pip.
fn paint_turn_spark(frame: &mut PixelFrame, game: &Game, theme: &Theme, ppt: i32, scale: i32) {
    let Some(anchor) = game.fx.turn_spark() else {
        return;
    };
    paint_glyph(
        frame,
        &sprites::TURN_SPARK,
        (anchor.x * ppt as f32) as i32,
        (anchor.y * ppt as f32) as i32,
        scale,
        [theme.text, theme.text, theme.text],
    );
}

/// Spare-wick bloom: six 9x9 frames held over the board center.
fn paint_golden_lily(frame: &mut PixelFrame, game: &Game, theme: &Theme, scale: i32) {
    let Some(idx) = game.fx.lily_frame() else {
        return;
    };
    paint_glyph(
        frame,
        &sprites::GOLDEN_LILY[idx],
        (frame.w / 2) as i32,
        (frame.h / 2) as i32,
        scale,
        [theme.accent, theme.text, theme.eyes],
    );
}

/// Static board layer for the placement pipeline: walls, gate, house,
/// and the crumb dots. Sunseeds, relish, and actors are dynamic layers
/// (their animation is cheaper as placements than as whole-atlas
/// retransmits), so this layer changes only when a crumb is eaten or the
/// level/theme changes.
pub fn render_static(game: &Game, theme: &Theme, ppt: u32) -> PixelFrame {
    let ppt = ppt.max(MIN_PPT) as i32;
    let mut frame = PixelFrame::blank((WIDTH * ppt) as u32, (HEIGHT * ppt) as u32, theme.bg);
    let crumb_field = game.maze.dot_bytes();
    paint_tiles(&mut frame, game, theme, ppt, &crumb_field);
    frame
}

/// Wall, gate, house, and crumb painting shared by both board layers.
/// Sunseeds are a separate pass (below) so their 11-px glyphs, which
/// overflow a small tile, paint above the pond exactly like every
/// other sprite; both the full-frame and placement paths share that
/// order, which is what makes the compositor pixel-identical.
fn paint_tiles(frame: &mut PixelFrame, game: &Game, theme: &Theme, ppt: i32, crumb_field: &[u8]) {
    let scale = sprite_scale(ppt);
    for ty in 0..HEIGHT {
        for tx in 0..WIDTH {
            let x0 = tx * ppt;
            let y0 = ty * ppt;
            match game.maze.tile(tx, ty) {
                Tile::Wall => {
                    // Beveled wall: inner fill in the deep tone, inset
                    // face in the wall tone.
                    for py in y0..y0 + ppt {
                        for px in x0..x0 + ppt {
                            frame.set(px, py, theme.wall_inner);
                        }
                    }
                    let m = (ppt / 4).max(1);
                    for py in y0 + m..y0 + ppt - m {
                        for px in x0 + m..x0 + ppt - m {
                            frame.set(px, py, theme.wall);
                        }
                    }
                }
                Tile::Door => {
                    let mid = y0 + ppt / 2;
                    for px in x0..x0 + ppt {
                        frame.set(px, mid, theme.accent);
                        if ppt >= 8 {
                            frame.set(px, mid - 1, theme.accent);
                        }
                    }
                }
                Tile::House => {}
                Tile::Dot | Tile::Energizer | Tile::Plain => {
                    let i = (ty * WIDTH + tx) as usize;
                    if crumb_field.get(i).copied().unwrap_or(0) == 1 {
                        paint_glyph(
                            frame,
                            &sprites::CRUMB,
                            x0 + ppt / 2,
                            y0 + ppt / 2,
                            scale,
                            [theme.crumb, theme.text, theme.eyes],
                        );
                    }
                }
            }
        }
    }
}

/// Sunseed halo phase at a render frame (alternates every 24 frames,
/// about 0.4 s at the 60 fps cell cadence).
pub fn sunseed_halo(frame_no: u64) -> bool {
    (frame_no / 24) % 2 == 1
}

/// Pulsing sunseed glyphs, painted after the pond so the overflow is
/// never clipped by a later-painted neighbour wall.
fn paint_sunseeds(
    frame: &mut PixelFrame,
    game: &Game,
    theme: &Theme,
    ppt: i32,
    scale: i32,
    frame_no: u64,
) {
    let crumb_field = game.maze.dot_bytes();
    let stride = (WIDTH * HEIGHT) as usize;
    let glyph = if sunseed_halo(frame_no) {
        &sprites::SUNSEED_B
    } else {
        &sprites::SUNSEED_A
    };
    for ty in 0..HEIGHT {
        for tx in 0..WIDTH {
            let i = (ty * WIDTH + tx) as usize;
            if crumb_field.get(stride + i).copied().unwrap_or(0) == 1 {
                paint_glyph(
                    frame,
                    glyph,
                    tx * ppt + ppt / 2,
                    ty * ppt + ppt / 2,
                    scale,
                    [theme.sunseed, theme.sunseed, theme.eyes],
                );
            }
        }
    }
}

/// Relish icon placement (spawns, bob-animates, expires).
fn paint_relish(
    frame: &mut PixelFrame,
    game: &Game,
    theme: &Theme,
    ppt: i32,
    scale: i32,
    frame_no: u64,
) {
    if !game.relish.active {
        return;
    }
    let (rtx, rty) = tuning::RELISH_TILE;
    let icon = &sprites::RELISH_ICONS[relish_icon_index(game.level)];
    let bob = if (frame_no / 30).is_multiple_of(2) {
        0
    } else {
        -1
    };
    paint_glyph(
        frame,
        icon,
        rtx * ppt + ppt / 2,
        rty * ppt + ppt / 2 + bob,
        scale,
        [theme.accent, theme.text, theme.eyes],
    );
}

/// Warden bodies, fright masks, and the eye overlay (Pip paints last).
fn paint_wardens(
    frame: &mut PixelFrame,
    game: &Game,
    theme: &Theme,
    ppt: i32,
    scale: i32,
    _frame_no: u64,
    flash: bool,
) {
    let fright = game.wardens.fright_active();
    let flash_on = flash && anim::fright_flash_on(game.wardens.fright_t);
    let bodies = [theme.bram, theme.kessa, theme.jory, theme.nib];
    for warden in game.wardens.wardens.iter() {
        let cx = (warden.actor.x * ppt as f32) as i32;
        let cy = (warden.actor.y * ppt as f32) as i32;
        match warden.state {
            WardenState::Eyes => {
                let eyes = eyes_rows(warden.actor.dir);
                let refs: Vec<&str> = eyes.iter().map(|s| s.as_str()).collect();
                paint_glyph(
                    frame,
                    &refs,
                    cx,
                    cy,
                    scale,
                    [theme.eyes, theme.eyes, theme.eyes],
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
                        frame,
                        mask,
                        cx,
                        cy,
                        scale,
                        [theme.fright, theme.text, theme.eyes],
                    );
                    // Eye bubbles stay readable inside the mask; they are
                    // information, not decoration.
                    let eyes = eyes_rows(warden.actor.dir);
                    let refs: Vec<&str> = eyes.iter().map(|s| s.as_str()).collect();
                    paint_glyph(
                        frame,
                        &refs,
                        cx,
                        cy,
                        scale,
                        [theme.eyes, theme.eyes, theme.eyes],
                    );
                } else {
                    paint_glyph(
                        frame,
                        body_glyph,
                        cx,
                        cy,
                        scale,
                        [bodies[warden.index], theme.text, theme.eyes],
                    );
                    // Eye overlay sits high on the 11-tall body.
                    let eyes = eyes_rows(warden.actor.dir);
                    let refs: Vec<&str> = eyes.iter().map(|s| s.as_str()).collect();
                    paint_glyph(
                        frame,
                        &refs,
                        cx,
                        cy - scale,
                        scale,
                        [theme.eyes, theme.eyes, theme.eyes],
                    );
                }
            }
        }
    }
}

/// The eye pair for a facing (left is the mirror of right, never
/// duplicated art).
pub fn eyes_rows(dir: maze_chase_engine::actors::Dir) -> Vec<String> {
    sprites::eyes_rows(facing_of(dir))
}

/// Pip (death clip while dying, chomp cycle in play).
fn paint_pip(
    frame: &mut PixelFrame,
    game: &Game,
    theme: &Theme,
    ppt: i32,
    scale: i32,
    frame_no: u64,
) {
    let (pcx, pcy) = (
        (game.player.x * ppt as f32) as i32,
        (game.player.y * ppt as f32) as i32,
    );
    if game.state == maze_chase_engine::game::GameState::Dying {
        let clip = &sprites::PIP_DEATH[anim::death_frame(game.state_elapsed())];
        paint_glyph(
            frame,
            clip,
            pcx,
            pcy,
            scale,
            [theme.pip, theme.text, theme.eyes],
        );
        return;
    }
    let phase = game.fx.gulp_phase().unwrap_or((frame_no / 5) as usize % 3);
    let facing = facing_of(game.player.dir);
    let rows = sprites::pip_facing_rows(phase, facing, art_rung(ppt));
    let refs: Vec<&str> = rows.iter().map(|s| s.as_str()).collect();
    let hop = game
        .fx
        .hop_frame()
        .map(|pose| hop_offset(ppt, pose))
        .unwrap_or(0);
    paint_glyph(
        frame,
        &refs,
        pcx,
        pcy + hop,
        pip_scale(ppt),
        [theme.pip, theme.text, theme.eyes],
    );
}

/// Pip rows for one mouth phase and facing, derived from the stored
/// right-facing art with the documented transforms (never duplicate
/// art). Shared by the full-frame raster and the sprite atlas.
pub fn pip_facing_rows(phase: usize, dir: maze_chase_engine::actors::Dir) -> Vec<String> {
    sprites::pip_facing_rows(phase, facing_of(dir), 11)
}

#[cfg(test)]
mod tests {
    use super::*;
    use maze_chase_assets::themes;

    fn fresh() -> Game {
        Game::new(7, 1)
    }

    #[test]
    fn frame_dimensions_follow_ppt() {
        let g = fresh();
        let f = render(&g, &themes::DUSK_POND, 8, 0, true);
        assert_eq!((f.w, f.h), (28 * 8, 31 * 8));
        let small = render(&g, &themes::DUSK_POND, 2, 0, true);
        assert_eq!((small.w, small.h), (28 * 6, 31 * 6));
    }

    #[test]
    fn walls_and_crumbs_are_painted() {
        let g = fresh();
        let f = render(&g, &themes::DUSK_POND, 8, 0, true);
        // Corner (0,0) is a wall: face color present.
        assert!(f.count(themes::DUSK_POND.wall) > 100);
        assert!(f.count(themes::DUSK_POND.wall_inner) > 100);
        // Fresh maze still holds hundreds of crumbs.
        assert!(f.count(themes::DUSK_POND.crumb) > 200);
        // Sunseeds pulse in both phases.
        let a = render(&g, &themes::DUSK_POND, 8, 0, true);
        let b = render(&g, &themes::DUSK_POND, 8, 24, true);
        assert_ne!(a.px, b.px, "sunseed halo must animate");
    }

    #[test]
    fn pip_and_wardens_are_painted() {
        let g = fresh();
        let f = render(&g, &themes::DUSK_POND, 8, 0, true);
        assert!(f.count(themes::DUSK_POND.pip) > 10);
        assert!(f.count(themes::DUSK_POND.bram) > 5);
        assert!(f.count(themes::DUSK_POND.kessa) > 5);
        // Deterministic: same frame twice, identical bytes.
        let again = render(&g, &themes::DUSK_POND, 8, 0, true);
        assert_eq!(f, again);
    }

    #[test]
    fn fright_masks_replace_bodies() {
        let g = fresh();
        let plain = render(&g, &themes::DUSK_POND, 8, 0, true);
        assert!(plain.count(themes::DUSK_POND.bram) > 5);
        // The mask glyph carries no body fill (`o`): Bram's hunt colors
        // vanish under the pale mask while housed wardens keep theirs.
        let mut g = fresh();
        g.wardens.start_fright(6.0);
        let f = render(&g, &themes::DUSK_POND, 8, 0, true);
        assert_eq!(f.count(themes::DUSK_POND.bram), 0);
        assert!(f.count(themes::DUSK_POND.kessa) > 5);
        // The eye overlay is still painted inside the mask, so dazed
        // hunters remain readable without borrowing a body fill.
        assert!(f.count(themes::DUSK_POND.eyes) > 0);
        assert!(plain.count(themes::DUSK_POND.eyes) > 0);
    }

    #[test]
    fn effect_windows_paint_then_expire() {
        let theme = themes::DUSK_POND;
        let mut g = fresh();
        let base = render(&g, &theme, 8, 0, true);

        g.fx.pickup(g.player.x, g.player.y);
        let burst = render(&g, &theme, 8, 0, true);
        assert_ne!(
            base.px, burst.px,
            "pickup burst must paint on the pickup grid"
        );
        let (px, py) = ((g.player.x * 8.0) as i32, (g.player.y * 8.0) as i32);
        assert_eq!(
            burst.get(px, py),
            Some(theme.text),
            "the burst must paint over Pip, not under the sprite"
        );
        g.fx.advance(0.3);
        assert_eq!(render(&g, &theme, 8, 0, true), base, "burst expires");

        g.fx.turn(g.player.x, g.player.y);
        let spark = render(&g, &theme, 8, 0, true);
        assert_ne!(base.px, spark.px, "turn spark must paint at the corner");
        g.fx.advance(0.2);
        assert_eq!(render(&g, &theme, 8, 0, true), base, "spark expires");

        g.fx.spare_wick();
        let lily = render(&g, &theme, 8, 0, true);
        assert_ne!(base.px, lily.px, "spare wick must bloom");
        g.fx.advance(0.6);
        assert_eq!(render(&g, &theme, 8, 0, true), base, "lily bloom expires");
    }

    #[test]
    fn level_clear_sweep_and_banner_paint_then_hold() {
        let theme = themes::DUSK_POND;
        let mut g = fresh();
        g.state = maze_chase_engine::game::GameState::Clearing;
        let early = render(&g, &theme, 8, 0, true);
        let mut later = fresh();
        later.state = maze_chase_engine::game::GameState::Clearing;
        for _ in 0..60 {
            later.tick(1.0 / 120.0);
        }
        let swept = render(&later, &theme, 8, 0, true);
        assert_ne!(early.px, swept.px, "the sweep must move across the board");
        // The lily-crown banner is only up for the first 900 ms.
        let mut after = fresh();
        after.state = maze_chase_engine::game::GameState::Clearing;
        for _ in 0..120 {
            after.tick(1.0 / 120.0);
        }
        let held = render(&after, &theme, 8, 0, true);
        assert!(
            held.count(theme.accent) < early.count(theme.accent),
            "banner must not stay for the whole clear window"
        );
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
            frames.push(render(&g, &theme, 8, 0, true).px);
        }
        assert_eq!(frames[0], frames[1], "0.0 and 0.05 hold frame 0");
        assert_ne!(frames[1], frames[2], "0.1 starts frame 1");
        assert_ne!(frames[2], frames[3], "0.2 starts frame 2");
        assert_ne!(frames[3], frames[4], "0.4 holds the final frame");
        assert_ne!(frames[0], frames[4], "the first and last frames differ");
    }

    #[test]
    fn death_clip_holds_the_final_frame_instead_of_looping() {
        let theme = themes::DUSK_POND;
        let mut g = fresh();
        g.kill_player();
        for _ in 0..60 {
            g.tick(1.0 / 120.0);
        }
        let held = render(&g, &theme, 8, 0, true);
        for _ in 0..12 {
            g.tick(1.0 / 120.0);
        }
        let later = render(&g, &theme, 8, 0, true);
        assert_eq!(held, later, "the death clip holds its last frame");
    }

    #[test]
    fn up_and_down_use_their_authored_sheets() {
        use maze_chase_engine::actors::Dir;
        let theme = themes::DUSK_POND;
        let mut g = fresh();
        g.player.dir = Dir::Up;
        let up = render(&g, &theme, 8, 0, true);
        g.player.dir = Dir::Down;
        let down = render(&g, &theme, 8, 0, true);
        assert_ne!(up.px, down.px, "up and down are authored, not one rotation");
        // The 21x21 rung selects the high-detail sheet.
        let high = render(&g, &theme, 21, 0, true);
        assert_eq!(high.w, (WIDTH * 21) as u32);
        assert!(high.count(theme.pip) > 20);
    }

    #[test]
    fn relish_tier_index_pairs_levels() {
        assert_eq!(relish_icon_index(1), 0);
        assert_eq!(relish_icon_index(2), 0);
        assert_eq!(relish_icon_index(3), 1);
        assert_eq!(relish_icon_index(11), 5);
        assert_eq!(relish_icon_index(99), 5);
    }

    #[test]
    fn all_facings_render_without_panic() {
        use maze_chase_engine::actors::Dir;
        let mut g = fresh();
        for dir in [Dir::Right, Dir::Left, Dir::Up, Dir::Down] {
            g.player.dir = dir;
            let f = render(&g, &themes::DUSK_POND, 8, 3, true);
            assert!(f.count(themes::DUSK_POND.pip) > 10, "{dir:?}");
        }
    }
}
