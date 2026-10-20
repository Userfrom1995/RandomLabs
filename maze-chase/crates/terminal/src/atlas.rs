//! Sprite atlas and board placement composition for the Kitty tier.
//!
//! The bitmap tiers used to transmit a full board PNG on every frame.
//! The steady-state Kitty path now ships the static board layer and the
//! transparent sprite atlas with `a=t` once per change (a crumb eaten, a
//! level clear, a theme or tile-scale change), places them with `a=p`,
//! and then moves stable-id placements each frame. A steady frame costs
//! a few kilobytes of placement commands instead of a full-board PNG,
//! and unchanged pixels are never re-sent.
//!
//! The atlas is a 6x6 grid of 11x11-glyph cells (34 used) with the same
//! art and palettes as [`crate::raster`], authored on the 8-pixel tile
//! grid so it stays crisp at larger cell sizes. [`compose`] renders the
//! static layer plus placements on the CPU for parity tests against the
//! full-frame raster: both paths must produce identical pixels.

use maze_chase_assets::sprites;
use maze_chase_assets::themes::{Rgb, Theme};
use maze_chase_engine::actors::Dir;
use maze_chase_engine::game::{Game, GameState};
use maze_chase_engine::ghosts::WardenState;
use maze_chase_engine::maze::{HEIGHT, WIDTH};
use maze_chase_engine::tuning;

use crate::raster::{self, PixelFrame};

/// Sprite art is authored on an 11x11 glyph box (widest row wins).
pub const GLYPH_PX: u32 = 11;
/// Atlas slots (6x6 grid, 36 cells; two unused).
pub const SLOT_COUNT: usize = 34;
/// Slot grid columns.
pub const ATLAS_COLS: usize = 6;

/// Slot indices, grouped by layer.
pub mod slot {
    pub const PIP_RIGHT_OPEN: usize = 0;
    pub const PIP_RIGHT_MID: usize = 4;
    pub const PIP_RIGHT_CLOSED: usize = 8;
    /// Facing order within a mouth phase: right, left, down, up.
    pub const PIP_FACING_STRIDE: usize = 4;
    pub const PIP_PHASE_STRIDE: usize = 4;
    pub const PIP_DEATH: usize = 12;
    pub const WARDEN: usize = 16;
    pub const FRIGHT: usize = 20;
    pub const FRIGHT_FLASH: usize = 21;
    pub const EYES: usize = 22;
    pub const SUNSEED_A: usize = 26;
    pub const SUNSEED_B: usize = 27;
    pub const RELISH: usize = 28;
}

/// A placed sprite: atlas `slot`, board-pixel top-left `(x, y)`, and the
/// kitty stacking layer it belongs to.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Placement {
    /// Stable placement id, so an unchanged sprite is neither deleted
    /// nor re-placed on the next frame.
    pub id: u32,
    pub slot: usize,
    pub x: i32,
    pub y: i32,
    /// Explicit kitty `z` stacking layer (see [`z`]). Every placement
    /// carries the layer that mirrors its position in the raster paint
    /// order, so the terminal never falls back to the spec's equal-z
    /// tie-break by image id (which sorts the sprite atlas below the
    /// static board).
    pub z: u32,
}

/// Kitty placement stacking layers, bottom to top. The raster
/// ([`crate::raster::paint_wardens`]) paints, per warden in index order,
/// its body (or fright mask) and then its eye overlay; two warden boxes
/// can overlap when the sprite cell is larger than one board tile, so
/// the layers use one band per warden (`body(i) < eyes(i) < body(i+1)`)
/// to reproduce that interleaving exactly. A single shared body layer
/// followed by a single shared eye layer would stack every eye above
/// every body, which diverges from the raster for overlapping wardens.
pub mod z {
    /// Static board layer (walls, gate, house, crumbs).
    pub const STATIC: u32 = 0;
    /// Sunseed halo pickups.
    pub const SUNSEED: u32 = 1;
    /// Relish icon (paints above sunseeds, below bodies).
    pub const RELISH: u32 = 2;
    /// Warden `warden` body or fright mask; strictly above warden
    /// `warden - 1`'s eyes and strictly below its own eyes.
    pub const fn body(warden: usize) -> u32 {
        3 + 2 * warden as u32
    }
    /// Warden `warden` eyes overlay, above its own body and below
    /// warden `warden + 1`'s body, exactly like the raster.
    pub const fn eyes(warden: usize) -> u32 {
        4 + 2 * warden as u32
    }
    /// Pip, the player sprite (always the top layer).
    pub const PIP: u32 = 11;
}

/// An RGBA image (alpha 0 transparent). The kitty path encodes it as a
/// real DEFLATE PNG for the quiet transmit (`a=t,f=100`); tests compose
/// it on the CPU.
#[derive(Clone, PartialEq, Eq, Debug)]
pub struct RgbaFrame {
    pub w: u32,
    pub h: u32,
    pub px: Vec<[u8; 4]>,
}

impl RgbaFrame {
    pub fn transparent(w: u32, h: u32) -> Self {
        Self {
            w,
            h,
            px: vec![[0, 0, 0, 0]; (w * h) as usize],
        }
    }

    pub fn from_rgb(frame: &PixelFrame) -> Self {
        Self {
            w: frame.w,
            h: frame.h,
            px: frame.px.iter().map(|c| [c.0, c.1, c.2, 255]).collect(),
        }
    }

    pub fn get(&self, x: i32, y: i32) -> [u8; 4] {
        if x < 0 || y < 0 || x >= self.w as i32 || y >= self.h as i32 {
            return [0, 0, 0, 0];
        }
        self.px[(y as u32 * self.w + x as u32) as usize]
    }

    pub fn set(&mut self, x: i32, y: i32, c: Rgb) {
        if x < 0 || y < 0 || x >= self.w as i32 || y >= self.h as i32 {
            return;
        }
        self.px[(y as u32 * self.w + x as u32) as usize] = [c.0, c.1, c.2, 255];
    }

    /// Paint a legend glyph centered at `(cx, cy)` on this frame.
    fn draw_glyph(&mut self, rows: &[&str], cx: i32, cy: i32, scale: i32, palette: [Rgb; 3]) {
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
                        self.set(
                            cx - (w * scale) / 2 + gx as i32 * scale + dx,
                            cy - (h * scale) / 2 + gy as i32 * scale + dy,
                            c,
                        );
                    }
                }
            }
        }
    }
}

/// A built sprite atlas: one RGBA image plus each slot's cell origin.
#[derive(Clone, Debug)]
pub struct Atlas {
    pub frame: RgbaFrame,
    pub cell: u32,
    pub scale: i32,
    slots: [(u32, u32); SLOT_COUNT],
}

impl Atlas {
    /// Build the atlas for a theme and pixels-per-tile choice.
    pub fn build(theme: &Theme, ppt: u32) -> Self {
        let scale = (ppt.max(raster::MIN_PPT) as i32 / 8).max(1);
        let cell = GLYPH_PX * scale as u32;
        let rows = SLOT_COUNT.div_ceil(ATLAS_COLS) as u32;
        let mut frame = RgbaFrame::transparent(ATLAS_COLS as u32 * cell, rows * cell);
        let mut slots = [(0, 0); SLOT_COUNT];
        let mut glyphs: Vec<(usize, Vec<String>, [Rgb; 3])> = Vec::new();

        let pip_palette = [theme.pip, theme.text, theme.eyes];
        for phase in 0..3 {
            for (facing, dir) in [Dir::Right, Dir::Left, Dir::Down, Dir::Up]
                .into_iter()
                .enumerate()
            {
                let rows = raster::pip_facing_rows(phase, dir);
                glyphs.push((
                    slot::PIP_RIGHT_OPEN + phase * slot::PIP_PHASE_STRIDE + facing,
                    rows,
                    pip_palette,
                ));
            }
        }
        for (i, clip) in sprites::PIP_DEATH.iter().enumerate() {
            glyphs.push((
                slot::PIP_DEATH + i,
                clip.iter().map(|s| s.to_string()).collect(),
                pip_palette,
            ));
        }
        let bodies = [theme.bram, theme.kessa, theme.jory, theme.nib];
        for (i, body) in [
            &sprites::WARDEN_BRAM,
            &sprites::WARDEN_KESSA,
            &sprites::WARDEN_JORY,
            &sprites::WARDEN_NIB,
        ]
        .into_iter()
        .enumerate()
        {
            glyphs.push((
                slot::WARDEN + i,
                body.iter().map(|s| s.to_string()).collect(),
                [bodies[i], theme.text, theme.eyes],
            ));
        }
        glyphs.push((
            slot::FRIGHT,
            sprites::FRIGHT_MASK.iter().map(|s| s.to_string()).collect(),
            [theme.fright, theme.text, theme.eyes],
        ));
        glyphs.push((
            slot::FRIGHT_FLASH,
            sprites::FRIGHT_MASK_FLASH
                .iter()
                .map(|s| s.to_string())
                .collect(),
            [theme.fright, theme.text, theme.eyes],
        ));
        for (i, dir) in [Dir::Right, Dir::Left, Dir::Up, Dir::Down]
            .into_iter()
            .enumerate()
        {
            glyphs.push((
                slot::EYES + i,
                raster::eyes_rows(dir),
                [theme.eyes, theme.eyes, theme.eyes],
            ));
        }
        for (i, glyph) in [&sprites::SUNSEED_A, &sprites::SUNSEED_B]
            .into_iter()
            .enumerate()
        {
            glyphs.push((
                slot::SUNSEED_A + i,
                glyph.iter().map(|s| s.to_string()).collect(),
                [theme.sunseed, theme.sunseed, theme.eyes],
            ));
        }
        for (i, icon) in sprites::RELISH_ICONS.iter().enumerate() {
            glyphs.push((
                slot::RELISH + i,
                icon.iter().map(|s| s.to_string()).collect(),
                [theme.accent, theme.text, theme.eyes],
            ));
        }

        for (slot, rows, palette) in glyphs {
            let x0 = (slot % ATLAS_COLS) as u32 * cell;
            let y0 = (slot / ATLAS_COLS) as u32 * cell;
            slots[slot] = (x0, y0);
            let refs: Vec<&str> = rows.iter().map(|s| s.as_str()).collect();
            frame.draw_glyph(
                &refs,
                (x0 + cell / 2) as i32,
                (y0 + cell / 2) as i32,
                scale,
                palette,
            );
        }
        Self {
            frame,
            cell,
            scale,
            slots,
        }
    }

    /// Top-left pixel of a slot inside the atlas image.
    pub fn slot_origin(&self, slot: usize) -> (u32, u32) {
        self.slots[slot]
    }

    /// Board placement for one atlas slot centered at `(cx, cy)` on the
    /// given stacking layer `z` (see [`z`]).
    pub fn place(&self, id: u32, slot: usize, cx: i32, cy: i32, z: u32) -> Placement {
        let half = self.cell as i32 / 2;
        Placement {
            id,
            slot,
            x: cx - half,
            y: cy - half,
            z,
        }
    }
}

/// Static board layer (walls, gate, house, crumbs) as RGBA.
pub fn static_frame(game: &Game, theme: &Theme, ppt: u32) -> RgbaFrame {
    RgbaFrame::from_rgb(&raster::render_static(game, theme, ppt))
}

/// Every moving sprite for the current frame, in paint order (sunseeds,
/// relish, wardens and their eyes, then Pip). Each sprite carries its
/// explicit kitty stacking layer (see [`z`]), so overlapping sprites
/// stack identically on the terminal and in [`compose`].
pub fn placements(
    game: &Game,
    ppt: u32,
    frame_no: u64,
    flash: bool,
    atlas: &Atlas,
) -> Vec<Placement> {
    let ppt = ppt.max(raster::MIN_PPT) as i32;
    let scale = atlas.scale;
    let mut out = Vec::new();
    let crumb_field = game.maze.dot_bytes();
    let stride = (WIDTH * HEIGHT) as usize;
    let sunseed = if raster::sunseed_halo(frame_no) {
        slot::SUNSEED_B
    } else {
        slot::SUNSEED_A
    };
    for ty in 0..HEIGHT {
        for tx in 0..WIDTH {
            let i = (ty * WIDTH + tx) as usize;
            if crumb_field.get(stride + i).copied().unwrap_or(0) == 1 {
                out.push(atlas.place(
                    1000 + i as u32,
                    sunseed,
                    tx * ppt + ppt / 2,
                    ty * ppt + ppt / 2,
                    z::SUNSEED,
                ));
            }
        }
    }

    if game.relish.active {
        let (rtx, rty) = tuning::RELISH_TILE;
        let icon = raster::relish_icon_index(game.level);
        let bob = if (frame_no / 30).is_multiple_of(2) {
            0
        } else {
            -1
        };
        out.push(atlas.place(
            50,
            slot::RELISH + icon,
            rtx * ppt + ppt / 2,
            rty * ppt + ppt / 2 + bob,
            z::RELISH,
        ));
    }

    let fright = game.wardens.fright_active();
    let flash_on = flash && (game.wardens.fright_t <= 1.5) && (frame_no / 6).is_multiple_of(2);
    for warden in game.wardens.wardens.iter() {
        let cx = (warden.actor.x * ppt as f32) as i32;
        let cy = (warden.actor.y * ppt as f32) as i32;
        match warden.state {
            WardenState::Eyes => {
                out.push(atlas.place(
                    101 + warden.index as u32 * 2,
                    eyes_slot(warden.actor.dir),
                    cx,
                    cy,
                    z::eyes(warden.index),
                ));
            }
            _ => {
                if fright && warden.state == WardenState::Active {
                    let mask = if flash_on {
                        slot::FRIGHT_FLASH
                    } else {
                        slot::FRIGHT
                    };
                    out.push(atlas.place(
                        100 + warden.index as u32 * 2,
                        mask,
                        cx,
                        cy,
                        z::body(warden.index),
                    ));
                } else {
                    out.push(atlas.place(
                        100 + warden.index as u32 * 2,
                        slot::WARDEN + warden.index,
                        cx,
                        cy,
                        z::body(warden.index),
                    ));
                    // Eye overlay sits high on the 11-tall body.
                    out.push(atlas.place(
                        101 + warden.index as u32 * 2,
                        eyes_slot(warden.actor.dir),
                        cx,
                        cy - scale,
                        z::eyes(warden.index),
                    ));
                }
            }
        }
    }

    let (pcx, pcy) = (
        (game.player.x * ppt as f32) as i32,
        (game.player.y * ppt as f32) as i32,
    );
    if game.state == GameState::Dying {
        out.push(atlas.place(
            60,
            slot::PIP_DEATH + (frame_no as usize / 8) % 4,
            pcx,
            pcy,
            z::PIP,
        ));
    } else {
        let phase = (frame_no / 5) as usize % 3;
        out.push(atlas.place(60, pip_slot(phase, game.player.dir), pcx, pcy, z::PIP));
    }
    out
}

fn pip_slot(phase: usize, dir: Dir) -> usize {
    let facing = match dir {
        Dir::Right => 0,
        Dir::Left => 1,
        Dir::Down => 2,
        Dir::Up => 3,
    };
    slot::PIP_RIGHT_OPEN + phase * slot::PIP_PHASE_STRIDE + facing
}

fn eyes_slot(dir: Dir) -> usize {
    let facing = match dir {
        Dir::Right => 0,
        Dir::Left => 1,
        Dir::Up => 2,
        Dir::Down => 3,
    };
    slot::EYES + facing
}

/// CPU composition of the static layer plus placements, matching the
/// full-frame [`raster::render`] pixel for pixel. Used by the parity
/// test; the live Kitty path places these sprites on the terminal side.
/// Placements are composed in stacking-layer order (stable, so equal-z
/// sprites keep their emission order); the per-warden bands reproduce
/// the raster's body/eyes interleaving even when two warden boxes
/// overlap.
pub fn compose(base: &RgbaFrame, atlas: &Atlas, placements: &[Placement]) -> RgbaFrame {
    let mut out = base.clone();
    let cell = atlas.cell as i32;
    let mut ordered: Vec<&Placement> = placements.iter().collect();
    ordered.sort_by_key(|p| p.z);
    for p in ordered {
        let (sx, sy) = atlas.slot_origin(p.slot);
        for dy in 0..cell {
            for dx in 0..cell {
                let px = atlas.frame.get(sx as i32 + dx, sy as i32 + dy);
                if px[3] == 0 {
                    continue;
                }
                let x = p.x + dx;
                let y = p.y + dy;
                if x < 0 || y < 0 || x >= out.w as i32 || y >= out.h as i32 {
                    continue;
                }
                out.px[(y as u32 * out.w + x as u32) as usize] = px;
            }
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use maze_chase_assets::themes;

    fn atlas_for(ppt: u32) -> Atlas {
        Atlas::build(&themes::DUSK_POND, ppt)
    }

    fn assert_frames_eq(got: &RgbaFrame, want: &RgbaFrame, ctx: &str) {
        assert_eq!((got.w, got.h), (want.w, want.h), "{ctx}");
        for (i, (g, w)) in got.px.iter().zip(&want.px).enumerate() {
            if g != w {
                let x = i as u32 % got.w;
                let y = i as u32 / got.w;
                panic!("{ctx}: first diff at ({x},{y}) got {g:?} want {w:?}");
            }
        }
    }

    #[test]
    fn atlas_has_every_slot_and_transparent_corners() {
        let atlas = atlas_for(8);
        assert_eq!(atlas.cell, GLYPH_PX);
        assert_eq!(atlas.frame.w, ATLAS_COLS as u32 * GLYPH_PX);
        assert!(atlas.frame.h >= GLYPH_PX * 6);
        for slot in 0..SLOT_COUNT {
            let (x, y) = atlas.slot_origin(slot);
            assert!(x + atlas.cell <= atlas.frame.w);
            assert!(y + atlas.cell <= atlas.frame.h);
        }
        // Slot 34/35 are unused and fully transparent.
        let (x, y) = (atlas.frame.w - GLYPH_PX, atlas.frame.h - GLYPH_PX);
        for dy in 0..GLYPH_PX as i32 {
            for dx in 0..GLYPH_PX as i32 {
                assert_eq!(atlas.frame.get(x as i32 + dx, y as i32 + dy), [0, 0, 0, 0]);
            }
        }
    }

    #[test]
    fn composed_frame_matches_full_raster() {
        for ppt in [6, 8, 12] {
            let mut game = Game::new(11, 1);
            let theme = themes::DUSK_POND;
            let atlas = atlas_for(ppt);
            for frame_no in [0u64, 7, 33, 99] {
                for flash in [false, true] {
                    let want =
                        RgbaFrame::from_rgb(&raster::render(&game, &theme, ppt, frame_no, flash));
                    let base = static_frame(&game, &theme, ppt);
                    let parts = placements(&game, ppt, frame_no, flash, &atlas);
                    let got = compose(&base, &atlas, &parts);
                    assert_frames_eq(
                        &got,
                        &want,
                        &format!("ppt {ppt} frame {frame_no} flash {flash}"),
                    );
                }
            }
            // Move Pip and animate the death clip; wardens and relish
            // stay where they are, which still exercises overlay order.
            game.player.x += 0.5;
            let want = RgbaFrame::from_rgb(&raster::render(&game, &theme, ppt, 12, false));
            let got = compose(
                &static_frame(&game, &theme, ppt),
                &atlas,
                &placements(&game, ppt, 12, false, &atlas),
            );
            assert_frames_eq(&got, &want, &format!("ppt {ppt} moved pip"));
        }
    }

    #[test]
    fn composed_frame_matches_full_raster_with_overlapping_wardens() {
        // The sprite cell is `11 * scale` pixels, so at these ppt values
        // two close wardens' boxes genuinely overlap. The raster paints
        // body_i, eyes_i, body_j, eyes_j in warden index order; the
        // terminal must stack the same way, or the lower-index eyes
        // cover the higher-index body (a class-wide eye layer does not
        // reproduce that interleaving).
        for ppt in [6, 17] {
            for sep in [0.25f32, 0.5, 0.75] {
                let mut game = Game::new(11, 1);
                let theme = themes::DUSK_POND;
                let atlas = atlas_for(ppt);
                let (x0, y0) = (
                    game.wardens.wardens[0].actor.x,
                    game.wardens.wardens[0].actor.y,
                );
                game.wardens.wardens[1].actor.x = x0 + sep;
                game.wardens.wardens[1].actor.y = y0;
                game.wardens.wardens[1].state = WardenState::Active;
                let want = RgbaFrame::from_rgb(&raster::render(&game, &theme, ppt, 12, false));
                let got = compose(
                    &static_frame(&game, &theme, ppt),
                    &atlas,
                    &placements(&game, ppt, 12, false, &atlas),
                );
                assert_frames_eq(&got, &want, &format!("ppt {ppt} sep {sep}"));
            }
        }
    }

    #[test]
    fn pip_slots_cover_three_phases_and_four_facings() {
        let mut seen = [false; 12];
        for phase in 0..3 {
            for dir in [Dir::Right, Dir::Left, Dir::Down, Dir::Up] {
                seen[pip_slot(phase, dir)] = true;
            }
        }
        assert!(seen.iter().all(|&s| s));
    }
}
