//! The desktop HUD must clear the bottom hint bar at both sides of the
//! compact/full switch. The renderer paints the hint last with a one-pixel
//! face, so an overlapping HUD row is silently clipped or garbled rather
//! than loudly rejected. This drives the production `render_play` path and
//! finds the lowest painted HUD text row with an empty ticker (no hint ink)
//! at the 363 px compact height and the 365 px full-stack switch, where game
//! over plus the optional FPS/TUNE rows are the tallest combination.
//!
//! A regression here is a real layout defect at the documented floor: 363
//! catches the switch being lowered into the overlap, and 365 proves the
//! full stack fits.

use maze_chase_assets::themes::DUSK_POND;
use maze_chase_desktop::font;
use maze_chase_desktop::frame::pack;
use maze_chase_desktop::render::{layout, render_play, Hud, MIN_W, PAD};
use maze_chase_engine::game::{Game, GameState};

const COMPACT_H: u32 = 363;
const FULL_HUD_H: u32 = 365;

fn tallest_hud_game() -> Game {
    let mut game = Game::new(7, 1);
    game.wardens.start_fright(6.0);
    game.wardens.fright_t = 1.2;
    game.relish.active = true;
    game.relish.value = 1000;
    game.state = GameState::Over;
    game
}

/// Lowest row carrying HUD text ink in the right-hand panel, with an empty
/// ticker so the bottom hint bar contributes nothing.
fn lowest_hud_text_row(h: u32) -> i32 {
    let game = tallest_hud_game();
    let lay = layout(MIN_W, h);
    let hud = Hud {
        best: 0,
        flash: true,
        reduced_motion: false,
        dim_playfield: 0.0,
        fps: Some(60.0),
        tune: "OFF",
        ticker: Some(""),
    };
    let f = render_play(&game, &DUSK_POND, hud, MIN_W, h).expect("frame");
    let dim = pack(DUSK_POND.dim_text);
    let mut lowest = -1;
    for y in 0..h as i32 {
        for x in lay.hx..MIN_W as i32 - PAD {
            if f.get(x, y) == Some(dim) {
                lowest = y;
            }
        }
    }
    lowest
}

#[test]
fn hud_clears_the_hint_bar_at_the_compact_height() {
    let hint_top = COMPACT_H as i32 - PAD - font::text_height(1, 1) as i32;
    let lowest = lowest_hud_text_row(COMPACT_H);
    assert!(
        lowest >= 0,
        "the HUD must paint text at the {COMPACT_H}px compact height"
    );
    assert!(
        lowest < hint_top,
        "HUD text reaches row {lowest} but the hint bar starts at {hint_top} \
         (the compact stack must clear at the old 363 px switch height)"
    );
}

#[test]
fn full_hud_clears_the_hint_bar_at_the_switch_boundary() {
    let hint_top = FULL_HUD_H as i32 - PAD - font::text_height(1, 1) as i32;
    let lowest = lowest_hud_text_row(FULL_HUD_H);
    assert!(lowest >= 0);
    assert!(
        lowest < hint_top,
        "HUD text reaches row {lowest} but the hint bar starts at {hint_top}"
    );
}
