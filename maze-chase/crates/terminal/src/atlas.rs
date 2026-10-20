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
//! The atlas is an 8x6 grid of 11x11-glyph cells (46 used) with the same
//! art and palettes as [`crate::raster`], authored on the 8-pixel tile
//! grid so it stays crisp at larger cell sizes. [`compose`] renders the
//! static layer plus placements on the CPU for parity tests against the
//! full-frame raster: both paths must produce identical pixels.

use maze_chase_assets::anim;
use maze_chase_assets::sprites;
use maze_chase_assets::themes::{Rgb, Theme};
use maze_chase_engine::actors::Dir;
use maze_chase_engine::game::{Game, GameState};
use maze_chase_engine::ghosts::WardenState;
use maze_chase_engine::maze::{HEIGHT, WIDTH};
use maze_chase_engine::tuning;

use crate::raster::{self, PixelFrame};

/// Baseline 11x11 glyph box (the 21x21 rung doubles this).
pub const GLYPH_PX: u32 = 11;
/// Atlas slots (8x6 grid, 48 cells; two unused).
pub const SLOT_COUNT: usize = 46;
/// Slot grid columns.
pub const ATLAS_COLS: usize = 8;

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
    pub const FRIGHT_ENTRY: usize = 22;
    pub const EYES: usize = 23;
    pub const SUNSEED_A: usize = 27;
    pub const SUNSEED_B: usize = 28;
    pub const RELISH: usize = 29;
    pub const PICKUP_BURST: usize = 35;
    pub const TURN_SPARK: usize = 39;
    pub const GOLDEN_LILY: usize = 40;
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
        4 + 2 * warden as u32
    }
    /// Warden `warden` eyes overlay, above its own body and below
    /// warden `warden + 1`'s body, exactly like the raster.
    pub const fn eyes(warden: usize) -> u32 {
        5 + 2 * warden as u32
    }
    /// Pickup burst (above Pip, so the player never hides it).
    pub const BURST: u32 = 13;
    /// Pip, the player sprite (above every warden).
    pub const PIP: u32 = 12;
    /// Committed-turn spark (above Pip).
    pub const SPARK: u32 = 14;
    /// Spare-wick Golden Lily (above the spark).
    pub const LILY: u32 = 15;
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
        let ppt = ppt.max(raster::MIN_PPT);
        let scale = raster::sprite_scale(ppt as i32);
        // The 21 rung draws Rill's 21x21 sheet at scale 1 (centered in the
        // same 22-pixel cell the 11x11 sheet occupies at scale 2), so the
        // atlas stays the quiet single-transmit path at every rung.
        let pip_scale = raster::pip_scale(ppt as i32);
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
                let rows = sprites::pip_facing_rows(
                    phase,
                    raster::facing_of(dir),
                    raster::art_rung(ppt as i32),
                );
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
        glyphs.push((
            slot::FRIGHT_ENTRY,
            sprites::FRIGHT_MASK_ENTRY
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
        for (i, frame) in sprites::PICKUP_BURST.iter().enumerate() {
            glyphs.push((
                slot::PICKUP_BURST + i,
                frame.iter().map(|s| s.to_string()).collect(),
                [theme.accent, theme.text, theme.eyes],
            ));
        }
        glyphs.push((
            slot::TURN_SPARK,
            sprites::TURN_SPARK.iter().map(|s| s.to_string()).collect(),
            [theme.text, theme.text, theme.text],
        ));
        for (i, frame) in sprites::GOLDEN_LILY.iter().enumerate() {
            glyphs.push((
                slot::GOLDEN_LILY + i,
                frame.iter().map(|s| s.to_string()).collect(),
                [theme.accent, theme.text, theme.eyes],
            ));
        }

        for (slot, rows, palette) in glyphs {
            let x0 = (slot % ATLAS_COLS) as u32 * cell;
            let y0 = (slot / ATLAS_COLS) as u32 * cell;
            slots[slot] = (x0, y0);
            let refs: Vec<&str> = rows.iter().map(|s| s.as_str()).collect();
            let draw_scale = if slot < slot::PIP_DEATH {
                pip_scale
            } else {
                scale
            };
            frame.draw_glyph(
                &refs,
                (x0 + cell / 2) as i32,
                (y0 + cell / 2) as i32,
                draw_scale,
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
/// stack identically on the terminal and in [`compose`]. Animation reads
/// the engine clock, so the layers share one cadence.
pub fn placements(game: &Game, ppt: u32, flash: bool, atlas: &Atlas) -> Vec<Placement> {
    let ppt = ppt.max(raster::MIN_PPT) as i32;
    let scale = atlas.scale;
    let mut out = Vec::new();
    let crumb_field = game.maze.dot_bytes();
    let stride = (WIDTH * HEIGHT) as usize;
    let sunseed = if anim::sunseed_halo(game.elapsed()) {
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
        let bob = anim::relish_bob(game.elapsed());
        out.push(atlas.place(
            50,
            slot::RELISH + icon,
            rtx * ppt + ppt / 2,
            rty * ppt + ppt / 2 + bob,
            z::RELISH,
        ));
    }

    if let Some((anchor, idx)) = game.fx.pickup_burst() {
        out.push(atlas.place(
            70,
            slot::PICKUP_BURST + idx,
            (anchor.x * ppt as f32) as i32,
            (anchor.y * ppt as f32) as i32,
            z::BURST,
        ));
    }

    let fright = game.wardens.fright_active();
    let fright_elapsed = game.wardens.fright_total - game.wardens.fright_t;
    let flash_t_left = if flash {
        game.wardens.fright_t
    } else {
        f32::INFINITY
    };
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
                    let mask = match anim::fright_mask_id(fright_elapsed, flash_t_left) {
                        "fright_entry" => slot::FRIGHT_ENTRY,
                        "fright_mask_flash" => slot::FRIGHT_FLASH,
                        _ => slot::FRIGHT,
                    };
                    out.push(atlas.place(
                        100 + warden.index as u32 * 2,
                        mask,
                        cx,
                        cy,
                        z::body(warden.index),
                    ));
                    // The raster keeps the eye overlay over the mask.
                    out.push(atlas.place(
                        101 + warden.index as u32 * 2,
                        eyes_slot(warden.actor.dir),
                        cx,
                        cy,
                        z::eyes(warden.index),
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
            slot::PIP_DEATH + anim::death_frame(game.state_elapsed()),
            pcx,
            pcy,
            z::PIP,
        ));
    } else {
        let phase = game.fx.chomp_phase();
        let hop = game
            .fx
            .hop_frame()
            .map(|pose| raster::hop_offset(ppt, pose))
            .unwrap_or(0);
        out.push(atlas.place(60, pip_slot(phase, game.player.dir), pcx, pcy + hop, z::PIP));
    }

    if let Some(anchor) = game.fx.turn_spark() {
        out.push(atlas.place(
            71,
            slot::TURN_SPARK,
            (anchor.x * ppt as f32) as i32,
            (anchor.y * ppt as f32) as i32,
            z::SPARK,
        ));
    }
    if let Some(idx) = game.fx.lily_frame() {
        out.push(atlas.place(
            72,
            slot::GOLDEN_LILY + idx,
            (WIDTH * ppt) / 2,
            (HEIGHT * ppt) / 2,
            z::LILY,
        ));
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

    fn actual_sprite_scale(ppt: u32) -> u32 {
        raster::sprite_scale(ppt as i32) as u32
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
        for ppt in [8, 21] {
            let atlas = atlas_for(ppt);
            let cell = atlas.cell;
            assert_eq!(cell, GLYPH_PX * actual_sprite_scale(ppt));
            assert_eq!(atlas.frame.w, ATLAS_COLS as u32 * cell);
            assert!(atlas.frame.h >= cell * 6);
            for slot in 0..SLOT_COUNT {
                let (x, y) = atlas.slot_origin(slot);
                assert!(x + atlas.cell <= atlas.frame.w);
                assert!(y + atlas.cell <= atlas.frame.h);
            }
            // The two cells past SLOT_COUNT stay fully transparent.
            let start = SLOT_COUNT;
            for slot in start..(ATLAS_COLS * 6) {
                let (x, y) = (
                    (slot % ATLAS_COLS) as u32 * cell,
                    (slot / ATLAS_COLS) as u32 * cell,
                );
                for dy in 0..cell as i32 {
                    for dx in 0..cell as i32 {
                        assert_eq!(atlas.frame.get(x as i32 + dx, y as i32 + dy), [0, 0, 0, 0]);
                    }
                }
            }
        }
    }

    #[test]
    fn fright_slots_follow_the_shared_clock() {
        let atlas = atlas_for(8);
        let mut game = Game::new(11, 1);
        game.wardens.start_fright(6.0);
        let has = |game: &Game, slot: usize| {
            placements(game, 8, true, &atlas)
                .iter()
                .any(|p| p.slot == slot)
        };

        game.wardens.fright_t = 5.5;
        assert!(has(&game, slot::FRIGHT), "steady mask");
        assert!(!has(&game, slot::FRIGHT_FLASH));
        assert!(!has(&game, slot::FRIGHT_ENTRY));

        game.wardens.fright_t = 1.3; // 2.5 Hz phase on
        assert!(has(&game, slot::FRIGHT_FLASH), "flash on");
        assert!(!has(&game, slot::FRIGHT));

        game.wardens.fright_t = 1.1; // 2.5 Hz phase off
        assert!(has(&game, slot::FRIGHT), "flash off");
        assert!(!has(&game, slot::FRIGHT_FLASH));

        game.wardens.fright_t = 5.9; // 0.1 s into the turn
        assert!(has(&game, slot::FRIGHT_ENTRY), "entry morph");
        assert!(!has(&game, slot::FRIGHT));
    }

    #[test]
    fn composed_frame_matches_full_raster() {
        for ppt in [6, 8, 12, 20, 21] {
            let mut game = Game::new(11, 1);
            let theme = themes::DUSK_POND;
            let atlas = atlas_for(ppt);
            for step in 0..4 {
                for flash in [false, true] {
                    let want = RgbaFrame::from_rgb(&raster::render(&game, &theme, ppt, flash));
                    let base = static_frame(&game, &theme, ppt);
                    let parts = placements(&game, ppt, flash, &atlas);
                    let got = compose(&base, &atlas, &parts);
                    assert_frames_eq(&got, &want, &format!("ppt {ppt} step {step} flash {flash}"));
                }
                // Advance the engine clock so the sunseed halo, relish bob
                // and mouth phases are all exercised on shared time.
                for _ in 0..24 {
                    game.tick(maze_chase_engine::tuning::STEP);
                }
            }
            // Fright entry, steady and flashing masks must compose to the
            // same pixels as the raster: the mask glyph alone is not the
            // whole mask, the eye overlay stays on top.
            game.wardens.start_fright(6.0);
            for step in 0..4 {
                for flash in [false, true] {
                    let want = RgbaFrame::from_rgb(&raster::render(&game, &theme, ppt, flash));
                    let got = compose(
                        &static_frame(&game, &theme, ppt),
                        &atlas,
                        &placements(&game, ppt, flash, &atlas),
                    );
                    assert_frames_eq(
                        &got,
                        &want,
                        &format!("ppt {ppt} fright step {step} flash {flash}"),
                    );
                }
                for _ in 0..24 {
                    game.tick(maze_chase_engine::tuning::STEP);
                }
            }
            // Effects: pickup burst, turn spark and the spare-wick bloom.
            game.fx.pickup(game.player.x, game.player.y);
            game.fx.turn(game.player.x + 0.25, game.player.y);
            game.fx.spare_wick();
            for step in 0..3 {
                let want = RgbaFrame::from_rgb(&raster::render(&game, &theme, ppt, true));
                let got = compose(
                    &static_frame(&game, &theme, ppt),
                    &atlas,
                    &placements(&game, ppt, true, &atlas),
                );
                assert_frames_eq(&got, &want, &format!("ppt {ppt} effects step {step}"));
                for _ in 0..4 {
                    game.tick(maze_chase_engine::tuning::STEP);
                }
            }
            // Move Pip and animate the death clip; wardens and relish
            // stay where they are, which still exercises overlay order.
            game.player.x += 0.5;
            let want = RgbaFrame::from_rgb(&raster::render(&game, &theme, ppt, false));
            let got = compose(
                &static_frame(&game, &theme, ppt),
                &atlas,
                &placements(&game, ppt, false, &atlas),
            );
            assert_frames_eq(&got, &want, &format!("ppt {ppt} moved pip"));

            // Dying: frame index comes from the state clock, not frame_no.
            game.kill_player();
            for step in 0..20 {
                for _ in 0..2 {
                    game.tick(1.0 / 120.0);
                }
                let want = RgbaFrame::from_rgb(&raster::render(&game, &theme, ppt, true));
                let got = compose(
                    &static_frame(&game, &theme, ppt),
                    &atlas,
                    &placements(&game, ppt, true, &atlas),
                );
                assert_frames_eq(&got, &want, &format!("ppt {ppt} dying step {step}"));
            }
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
                let want = RgbaFrame::from_rgb(&raster::render(&game, &theme, ppt, false));
                let got = compose(
                    &static_frame(&game, &theme, ppt),
                    &atlas,
                    &placements(&game, ppt, false, &atlas),
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
