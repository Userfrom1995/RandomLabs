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

use maze_chase_assets::sprites;
use maze_chase_assets::themes::{Rgb, Theme};
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

/// Sprite art is authored on an 8-pixel tile grid; when the raster is
/// taken at a larger real cell size, each sprite pixel becomes a
/// `scale`x`scale` block so the art stays crisp instead of shrinking
/// relative to the tile (issue #673).
pub(crate) fn sprite_scale(ppt: i32) -> i32 {
    (ppt / 8).max(1)
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

/// Right-facing Pip glyph for a mouth phase (0 open, 1 mid, 2 closed).
fn pip_glyph(phase: usize) -> &'static [&'static str] {
    match phase % 3 {
        0 => &sprites::PIP_RIGHT,
        1 => &sprites::PIP_RIGHT_MID,
        _ => &sprites::PIP_CLOSED,
    }
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
    frame
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
/// overflow a small tile, paint above the warren exactly like every
/// other sprite; both the full-frame and placement paths share that
/// order, which is what makes the compositor pixel-identical.
fn paint_tiles(frame: &mut PixelFrame, game: &Game, theme: &Theme, ppt: i32, crumb_field: &[u8]) {
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
                        let cx = x0 + ppt / 2;
                        let cy = y0 + ppt / 2;
                        frame.set(cx, cy, theme.crumb);
                        if ppt >= 8 {
                            frame.set(cx - 1, cy, theme.crumb);
                        }
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

/// Pulsing sunseed glyphs, painted after the warren so the overflow is
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
    frame_no: u64,
    flash: bool,
) {
    let fright = game.wardens.fright_active();
    let flash_on = flash && (game.wardens.fright_t <= 1.5) && (frame_no / 6).is_multiple_of(2);
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
                    let mask: &[&str] = if flash_on {
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
    use maze_chase_engine::actors::Dir;
    let rows: &[&str] = match dir {
        Dir::Up => &sprites::EYES_UP,
        Dir::Down => &sprites::EYES_DOWN,
        Dir::Right => &sprites::EYES_RIGHT,
        Dir::Left => return sprites::flip_horizontal(&sprites::EYES_RIGHT),
    };
    rows.iter().map(|s| s.to_string()).collect()
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
        let clip = &sprites::PIP_DEATH[(frame_no as usize / 8) % 4];
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
    let phase = (frame_no / 5) as usize % 3;
    let facing = pip_facing_rows(phase, game.player.dir);
    let refs: Vec<&str> = facing.iter().map(|s| s.as_str()).collect();
    paint_glyph(
        frame,
        &refs,
        pcx,
        pcy,
        scale,
        [theme.pip, theme.text, theme.eyes],
    );
}

/// Pip rows for one mouth phase and facing, derived from the stored
/// right-facing art with the documented transforms (never duplicate
/// art). Shared by the full-frame raster and the sprite atlas.
pub fn pip_facing_rows(phase: usize, dir: maze_chase_engine::actors::Dir) -> Vec<String> {
    use maze_chase_engine::actors::Dir;
    let right = pip_glyph(phase);
    match dir {
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
    fn frame_dimensions_follow_ppt() {
        let g = fresh();
        let f = render(&g, &themes::EMBER_WARREN, 8, 0, true);
        assert_eq!((f.w, f.h), (28 * 8, 31 * 8));
        let small = render(&g, &themes::EMBER_WARREN, 2, 0, true);
        assert_eq!((small.w, small.h), (28 * 6, 31 * 6));
    }

    #[test]
    fn walls_and_crumbs_are_painted() {
        let g = fresh();
        let f = render(&g, &themes::EMBER_WARREN, 8, 0, true);
        // Corner (0,0) is a wall: face color present.
        assert!(f.count(themes::EMBER_WARREN.wall) > 100);
        assert!(f.count(themes::EMBER_WARREN.wall_inner) > 100);
        // Fresh maze still holds hundreds of crumbs.
        assert!(f.count(themes::EMBER_WARREN.crumb) > 200);
        // Sunseeds pulse in both phases.
        let a = render(&g, &themes::EMBER_WARREN, 8, 0, true);
        let b = render(&g, &themes::EMBER_WARREN, 8, 24, true);
        assert_ne!(a.px, b.px, "sunseed halo must animate");
    }

    #[test]
    fn pip_and_wardens_are_painted() {
        let g = fresh();
        let f = render(&g, &themes::EMBER_WARREN, 8, 0, true);
        assert!(f.count(themes::EMBER_WARREN.pip) > 10);
        assert!(f.count(themes::EMBER_WARREN.bram) > 5);
        assert!(f.count(themes::EMBER_WARREN.kessa) > 5);
        // Deterministic: same frame twice, identical bytes.
        let again = render(&g, &themes::EMBER_WARREN, 8, 0, true);
        assert_eq!(f, again);
    }

    #[test]
    fn fright_masks_replace_bodies() {
        let g = fresh();
        let plain = render(&g, &themes::EMBER_WARREN, 8, 0, true);
        assert!(plain.count(themes::EMBER_WARREN.bram) > 5);
        // The mask glyph carries no body fill (`o`): Bram's hunt colors
        // vanish under the pale mask while housed wardens keep theirs.
        let mut g = fresh();
        g.wardens.start_fright(6.0);
        let f = render(&g, &themes::EMBER_WARREN, 8, 0, true);
        assert_eq!(f.count(themes::EMBER_WARREN.bram), 0);
        assert!(f.count(themes::EMBER_WARREN.kessa) > 5);
        assert!(f.count(themes::EMBER_WARREN.eyes) > plain.count(themes::EMBER_WARREN.eyes));
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
            let f = render(&g, &themes::EMBER_WARREN, 8, 3, true);
            assert!(f.count(themes::EMBER_WARREN.pip) > 10, "{dir:?}");
        }
    }
}
