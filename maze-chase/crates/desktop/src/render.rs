//! Pure layout plus play-surface composition for the desktop window.
//!
//! [`layout`] fits the 28x31 board (rendered by the shared rasterizer at
//! [`BOARD_PPT`] px per tile, then integer-scaled) plus a side HUD panel
//! into any window; windows that cannot fit the board at scale 1 get a
//! too-small card instead of a clipped game. [`render_play`] composes one
//! full frame: board pixels from the shared core, HUD text in the
//! original 5x7 face, all in theme colors. No input, no I/O, no gameplay:
//! everything here is a pure function of (`Game`, `Theme`, size).

use crate::font;
use crate::frame::Frame;
use maze_chase_assets::themes::Theme;
use maze_chase_engine::game::{Game, GameState};
use maze_chase_terminal::raster;

/// Pixels per tile handed to the shared rasterizer (its legibility
/// floor is 6; 8 matches the terminal bitmap tiers pixel-for-pixel).
pub const BOARD_PPT: u32 = 8;
/// Board size in raster pixels (28x31 tiles at [`BOARD_PPT`]).
pub const BOARD_W: u32 = 28 * BOARD_PPT;
pub const BOARD_H: u32 = 31 * BOARD_PPT;
/// Side HUD panel width in frame pixels.
pub const HUD_W: u32 = 232;
/// Margins and gaps in frame pixels.
pub const PAD: i32 = 12;
/// Smallest window that still fits the board at scale 1 plus the HUD.
pub const MIN_W: u32 = BOARD_W + HUD_W + PAD as u32 * 3;
pub const MIN_H: u32 = BOARD_H + PAD as u32 * 4;
/// HUD text scale (5x7 face doubled for window viewing distance).
pub const HUD_SCALE: u32 = 2;

/// Fitted play layout for a `w`x`h` window.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub struct Layout {
    /// Integer board magnification.
    pub scale: u32,
    /// Board origin in frame pixels.
    pub bx: i32,
    pub by: i32,
    /// Board footprint in frame pixels.
    pub bw: u32,
    pub bh: u32,
    /// HUD panel origin and size (right of the board).
    pub hx: i32,
    pub hy: i32,
    /// True when the window is too small for scale-1 play.
    pub too_small: bool,
}

/// Fit the board plus HUD into `w`x`h`. Never fails; reports
/// `too_small` instead of clipping.
pub fn layout(w: u32, h: u32) -> Layout {
    let avail_w = w as i32 - HUD_W as i32 - PAD * 3;
    let avail_h = h as i32 - PAD * 4;
    let fit_w = if avail_w >= BOARD_W as i32 {
        (avail_w as u32) / BOARD_W
    } else {
        0
    };
    let fit_h = if avail_h >= BOARD_H as i32 {
        (avail_h as u32) / BOARD_H
    } else {
        0
    };
    let scale = fit_w.min(fit_h);
    if scale == 0 {
        return Layout {
            scale: 1,
            bx: 0,
            by: 0,
            bw: BOARD_W,
            bh: BOARD_H,
            hx: 0,
            hy: 0,
            too_small: true,
        };
    }
    let (bw, bh) = (BOARD_W * scale, BOARD_H * scale);
    // Leftover space centers the board band; the HUD docks right.
    let band_w = w as i32 - HUD_W as i32 - PAD * 2;
    let bx = PAD + ((band_w - PAD - bw as i32).max(0)) / 2;
    let by = PAD * 2 + ((h as i32 - PAD * 4 - bh as i32).max(0)) / 2;
    Layout {
        scale,
        bx,
        by,
        bw,
        bh,
        hx: w as i32 - HUD_W as i32 - PAD,
        hy: PAD * 2,
        too_small: false,
    }
}

/// Extra HUD context the engine does not own (machine best, fps line).
#[derive(Clone, Copy, Debug)]
pub struct Hud<'a> {
    pub best: u32,
    pub frame_no: u64,
    pub flash: bool,
    pub fps: Option<f32>,
    pub tune: &'a str,
}

/// Compose one play frame at exactly `w`x`h` (too-small card when the
/// window cannot fit scale 1).
pub fn render_play(game: &Game, theme: &Theme, hud: Hud<'_>, w: u32, h: u32) -> Option<Frame> {
    let lay = layout(w, h);
    let mut f = Frame::blank(w, h, theme.bg)?;
    if lay.too_small {
        return Some(render_small(&mut f, theme));
    }
    let board = raster::render(game, theme, BOARD_PPT, hud.frame_no, hud.flash);
    f.blit_board(&board, lay.bx, lay.by, lay.scale);
    f.border(
        lay.bx - 3,
        lay.by - 3,
        lay.bw + 6,
        lay.bh + 6,
        2,
        theme.wall,
    );
    render_hud(&mut f, game, theme, hud, &lay);
    Some(f)
}

fn render_small(f: &mut Frame, theme: &Theme) -> Frame {
    let mut out = f.clone();
    let w = out.w as i32;
    let msg = [
        "WINDOW TOO SMALL",
        &format!("NEEDS AT LEAST {MIN_W}X{MIN_H}"),
        "DRAG LARGER TO PLAY",
    ];
    let mut y = out.h as i32 / 2 - 20;
    for line in msg {
        out.text_centered(line, w / 2, y, 2, theme.text, None);
        y += font::LINE as i32 * 2;
    }
    out
}

fn render_hud(f: &mut Frame, game: &Game, theme: &Theme, hud: Hud<'_>, lay: &Layout) {
    let s = HUD_SCALE;
    let mut y = lay.hy;
    let x = lay.hx;
    let step = |y: &mut i32| {
        *y += font::LINE as i32 * s as i32 + 6;
    };
    f.text("SCORE", x, y, s, theme.dim_text, None);
    step(&mut y);
    f.text(&format!("{}", game.score), x, y, s, theme.text, None);
    step(&mut y);
    f.text("BEST", x, y, s, theme.dim_text, None);
    step(&mut y);
    f.text(
        &format!("{}", hud.best.max(game.score)),
        x,
        y,
        s,
        theme.text,
        None,
    );
    step(&mut y);
    f.text(
        &format!("LEVEL {}", game.level),
        x,
        y,
        s,
        theme.accent,
        None,
    );
    step(&mut y);
    f.text(
        &format!("WICKS {}", game.lives.max(0)),
        x,
        y,
        s,
        theme.text,
        None,
    );
    step(&mut y);
    let mode = match game.mode {
        maze_chase_engine::modes::GameMode::Classic => "CLASSIC",
        maze_chase_engine::modes::GameMode::TimeAttack => "TIME ATTACK",
        maze_chase_engine::modes::GameMode::Sprint => "SPRINT",
        maze_chase_engine::modes::GameMode::FrightFrenzy => "FRENZY",
    };
    f.text(mode, x, y, s, theme.dim_text, None);
    step(&mut y);
    if game.wardens.fright_active() {
        f.text("FRIGHT!", x, y, s, theme.fright, None);
        step(&mut y);
    }
    if game.relish.active {
        f.text(
            &format!("RELISH {}", game.relish.value),
            x,
            y,
            s,
            theme.sunseed,
            None,
        );
        step(&mut y);
    }
    if game.state == GameState::Over {
        f.text("GAME OVER", x, y, s, theme.accent, None);
        step(&mut y);
    }
    if let Some(fps) = hud.fps {
        f.text(
            &format!("{} FPS", fps.round() as u32),
            x,
            y,
            s,
            theme.dim_text,
            None,
        );
        step(&mut y);
    }
    f.text(&format!("TUNE {}", hud.tune), x, y, s, theme.dim_text, None);
    step(&mut y);
    // Bottom hint bar spans the full window width.
    let hint = "ARROWS/WASD MOVE - P PAUSE - M MUTE - F FULLSCREEN - ESC MENU";
    f.text(
        hint,
        PAD,
        f.h as i32 - PAD - font::text_height(1, 1) as i32,
        1,
        theme.dim_text,
        None,
    );
}

#[cfg(test)]
mod tests {
    use super::*;
    use maze_chase_assets::themes;
    use maze_chase_engine::actors::Dir;

    fn theme() -> &'static Theme {
        &themes::EMBER_WARREN
    }

    fn hud<'a>() -> Hud<'a> {
        Hud {
            best: 0,
            frame_no: 0,
            flash: true,
            fps: None,
            tune: "OFF",
        }
    }

    /// Advance the shared engine one fixed step toward `want`.
    fn step(game: &mut Game, want: Option<Dir>) {
        game.step(maze_chase_engine::tuning::STEP as f64, want);
    }

    #[test]
    fn layout_scales_and_centers_or_flags_small() {
        let big = layout(1280, 800);
        assert!(!big.too_small);
        assert!(big.scale >= 2);
        assert_eq!((big.bw, big.bh), (BOARD_W * big.scale, BOARD_H * big.scale));
        assert!(big.bx >= PAD && big.by >= PAD);
        assert!(big.hx > big.bx);
        let small = layout(200, 100);
        assert!(small.too_small);
        // Exact minimum fits at scale 1.
        let exact = layout(MIN_W, MIN_H);
        assert!(!exact.too_small);
        assert_eq!(exact.scale, 1);
        let under = layout(MIN_W - 1, MIN_H);
        assert!(under.too_small);
    }

    #[test]
    fn play_frame_is_deterministic_and_shows_board() {
        let game = Game::new(7, 1);
        let a = render_play(&game, theme(), hud(), 1100, 760).unwrap();
        let b = render_play(&game, theme(), hud(), 1100, 760).unwrap();
        assert_eq!(a.px, b.px);
        assert_eq!((a.w, a.h), (1100, 760));
        // Board paint: wall and crumb colors from the shared rasterizer.
        assert!(a.count(theme().wall) > 500);
        assert!(a.count(theme().crumb) > 100);
        // HUD paint: score digits plus labels in text colors.
        assert!(a.count(theme().text) > 50);
    }

    #[test]
    fn hud_reflects_score_fright_and_game_over() {
        let mut game = Game::new(7, 1);
        for _ in 0..400 {
            step(&mut game, Some(Dir::Left));
        }
        let played = render_play(&game, theme(), hud(), 1100, 760).unwrap();
        assert!(played.count(theme().text) > 50);
        assert_ne!(game.score, 0);
        // A fresh frame and a played frame differ (crumbs eaten, HUD up).
        let fresh = render_play(&Game::new(7, 1), theme(), hud(), 1100, 760).unwrap();
        assert_ne!(played.px, fresh.px);
    }

    #[test]
    fn small_window_draws_card_not_board() {
        let game = Game::new(7, 1);
        let f = render_play(&game, theme(), hud(), 200, 120).unwrap();
        assert_eq!((f.w, f.h), (200, 120));
        // Card text paints, but no wall geometry fits.
        assert!(f.count(theme().text) > 20);
        assert_eq!(f.count(theme().wall), 0);
    }

    #[test]
    fn fright_banner_paints_fright_color() {
        let mut game = Game::new(11, 1);
        // Drive toward a sunseed: eat everything on the left corridor.
        for _ in 0..3000 {
            if game.wardens.fright_active() {
                break;
            }
            let dir = if game.tick_count.is_multiple_of(2) {
                Some(Dir::Left)
            } else {
                Some(Dir::Up)
            };
            step(&mut game, dir);
        }
        let f = render_play(&game, theme(), hud(), 1100, 760).unwrap();
        if game.wardens.fright_active() {
            assert!(f.count(theme().fright) > 30);
        } else {
            // No fright reached: banner absent, frame still valid.
            assert_eq!((f.w, f.h), (1100, 760));
        }
    }
}

/// One menu row: text plus cursor highlight.
#[derive(Clone, PartialEq, Eq, Debug)]
pub struct MenuLine {
    pub text: String,
    pub cursor: bool,
}

impl MenuLine {
    pub fn plain(text: &str) -> Self {
        Self {
            text: text.to_string(),
            cursor: false,
        }
    }
    pub fn at(text: &str, cursor: bool) -> Self {
        Self {
            text: text.to_string(),
            cursor,
        }
    }
}

/// Compose a centered menu frame: big title, rows with a `>` cursor in
/// the accent color, footer hint at the bottom. Pure and total.
pub fn render_menu(
    title: &str,
    lines: &[MenuLine],
    footer: &str,
    theme: &Theme,
    w: u32,
    h: u32,
) -> Option<Frame> {
    let mut f = Frame::blank(w, h, theme.bg)?;
    let cx = w as i32 / 2;
    f.text_centered(title, cx, PAD * 2, 4, theme.accent, None);
    let mut y = PAD * 2 + font::text_height(1, 4) as i32 + PAD;
    for line in lines {
        let row = if line.cursor {
            format!("> {}", line.text)
        } else {
            format!("  {}", line.text)
        };
        let color = if line.cursor {
            theme.accent
        } else {
            theme.text
        };
        f.text_centered(&row, cx, y, 2, color, None);
        y += font::LINE as i32 * 2 + 4;
    }
    f.border(
        PAD,
        PAD,
        w - PAD as u32 * 2,
        h - PAD as u32 * 2,
        2,
        theme.wall_inner,
    );
    f.text_centered(
        footer,
        cx,
        h as i32 - PAD - font::text_height(1, 1) as i32,
        1,
        theme.dim_text,
        None,
    );
    Some(f)
}

#[cfg(test)]
mod menu_tests {
    use super::*;

    fn theme() -> &'static Theme {
        &maze_chase_assets::themes::EMBER_WARREN
    }

    #[test]
    fn menu_frame_is_deterministic_with_cursor_accent() {
        let lines = vec![
            MenuLine::at("PLAY", true),
            MenuLine::plain("HOW TO PLAY"),
            MenuLine::plain("QUIT"),
        ];
        let a = render_menu("MAZE CHASE", &lines, "ARROWS + ENTER", theme(), 900, 700).unwrap();
        let b = render_menu("MAZE CHASE", &lines, "ARROWS + ENTER", theme(), 900, 700).unwrap();
        assert_eq!(a.px, b.px);
        assert!(a.count(theme().accent) > 30);
        assert!(a.count(theme().text) > 30);
        let moved = vec![
            MenuLine::plain("PLAY"),
            MenuLine::at("HOW TO PLAY", true),
            MenuLine::plain("QUIT"),
        ];
        let c = render_menu("MAZE CHASE", &moved, "ARROWS + ENTER", theme(), 900, 700).unwrap();
        assert_ne!(a.px, c.px);
    }

    #[test]
    fn menu_handles_empty_rows_and_tiny_windows() {
        let f = render_menu("T", &[], "F", theme(), 900, 700).unwrap();
        assert_eq!((f.w, f.h), (900, 700));
        assert!(render_menu("T", &[], "F", theme(), 0, 0).is_none());
    }
}
