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
use maze_chase_assets::themes::{Rgb, Theme};
use maze_chase_assets::{anim, sprites};
use maze_chase_engine::game::{Game, GameState};
use maze_chase_terminal::raster;

/// Pixels per tile handed to the shared rasterizer (its legibility
/// floor is 6; 8 is the parity reference raster shared with the browser
/// layer, while the terminal bitmap tiers rasterize at the detected cell
/// geometry).
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

/// Whether the window is too small to fit the board at scale 1.
pub fn too_small(w: u32, h: u32) -> bool {
    layout(w, h).too_small
}

/// Center of the play board in frame pixels. Stage cards (title and
/// pause) sit here; the page center is offset by the right-hand HUD band.
pub fn stage_center(w: u32, h: u32) -> (i32, i32) {
    let lay = layout(w, h);
    if lay.too_small {
        (w as i32 / 2, h as i32 / 2)
    } else {
        (lay.bx + lay.bw as i32 / 2, lay.by + lay.bh as i32 / 2)
    }
}

/// Extra HUD context the engine does not own (machine best, fps line).
#[derive(Clone, Copy, Debug)]
pub struct Hud<'a> {
    pub best: u32,
    pub flash: bool,
    pub reduced_motion: bool,
    pub dim_playfield: f32,
    pub fps: Option<f32>,
    pub tune: &'a str,
    pub ticker: Option<&'a str>,
}

/// Compose one play frame at exactly `w`x`h` (too-small card when the
/// window cannot fit scale 1).
pub fn render_play(game: &Game, theme: &Theme, hud: Hud<'_>, w: u32, h: u32) -> Option<Frame> {
    let lay = layout(w, h);
    let mut f = Frame::blank(w, h, theme.bg)?;
    if lay.too_small {
        return Some(render_small(&mut f, theme));
    }
    let fx = anim::Fx::dimmed(hud.flash, hud.reduced_motion, hud.dim_playfield, 0.0);
    let board = raster::render_opts(game, theme, BOARD_PPT, fx);
    f.blit_board(&board, lay.bx, lay.by, lay.scale);
    render_floaters(&mut f, game, theme, &lay, hud.reduced_motion);
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

/// Rising score floaters on an opaque plate (desktop and web only).
fn render_floaters(f: &mut Frame, game: &Game, theme: &Theme, lay: &Layout, reduced_motion: bool) {
    if reduced_motion {
        return;
    }
    for (floater, progress) in game.fx.floaters() {
        let text = format!("{}", floater.points);
        let rise = (progress * 8.0) as i32;
        let x = lay.bx + (floater.x * BOARD_PPT as f32) as i32 * lay.scale as i32;
        let y = lay.by + (floater.y * BOARD_PPT as f32) as i32 * lay.scale as i32
            - rise * lay.scale as i32;
        let scale = lay.scale.max(1);
        let tw = font::text_width(&text, scale);
        let th = font::text_height(1, scale);
        let mut px = (x - tw as i32 / 2).clamp(
            lay.bx + scale as i32,
            lay.bx + lay.bw as i32 - tw as i32 - scale as i32,
        );
        let py = (y - th as i32 / 2).clamp(
            lay.by + scale as i32,
            lay.by + lay.bh as i32 - th as i32 - scale as i32,
        );
        f.rect(
            px - scale as i32,
            py - scale as i32,
            tw + 2 * scale,
            th + 2 * scale,
            theme.bg,
        );
        for ch in text.chars() {
            let rows = &sprites::DIGITS[ch.to_digit(10).unwrap_or(0) as usize];
            for (gy, row) in rows.iter().enumerate() {
                for (gx, ink) in row.bytes().enumerate() {
                    if ink == b'#' {
                        for dy in 0..scale {
                            for dx in 0..scale {
                                f.set(
                                    px + gx as i32 * scale as i32 + dx as i32,
                                    py + gy as i32 * scale as i32 + dy as i32,
                                    theme.text,
                                );
                            }
                        }
                    }
                }
            }
            px += font::ADVANCE as i32 * scale as i32;
        }
    }
}

/// Title attract board: the live playfield behind the title card, dimmed
/// but never replaced by an empty field.
pub fn render_attract(
    game: &Game,
    theme: &Theme,
    w: u32,
    h: u32,
    dim: f32,
    flash: bool,
    reduced_motion: bool,
) -> Option<Frame> {
    let lay = layout(w, h);
    let mut f = Frame::blank(w, h, theme.bg)?;
    if lay.too_small {
        return Some(render_small(&mut f, theme));
    }
    let fx = anim::Fx::dimmed(flash, reduced_motion, dim, dim);
    let board = raster::render_opts(game, theme, BOARD_PPT, fx);
    f.blit_board(&board, lay.bx, lay.by, lay.scale);
    f.border(
        lay.bx - 3,
        lay.by - 3,
        lay.bw + 6,
        lay.bh + 6,
        2,
        theme.wall_inner,
    );
    Some(f)
}

/// Compose the menu card over an existing attract frame: opaque card,
/// centered, with the three-zone title / rows / footer hierarchy.
pub fn overlay_menu(
    f: &mut Frame,
    title: &str,
    lines: &[MenuLine],
    details: &[(&str, Rgb)],
    footer: &str,
    theme: &Theme,
) {
    // A compact card over the live attract board: the menu is one zone of
    // the title, not an opaque full-screen page.
    let row_w = lines
        .iter()
        .map(|l| font::text_width(&format!("> {}", l.text), 2))
        .max()
        .unwrap_or(0);
    let detail_w = details
        .iter()
        .map(|(text, _)| font::text_width(text, 1))
        .max()
        .unwrap_or(0);
    let content_w = row_w
        .max(font::text_width(title, 4))
        .max(font::text_width(footer, 1))
        .max(detail_w);
    let row_h = font::LINE as i32 * 2 + 4;
    let title_h = font::text_height(1, 4);
    let footer_h = font::text_height(1, 1);
    let details_h = details.len() as u32 * (font::LINE + 2) + 8;
    let cw = (content_w + PAD as u32 * 4)
        .max(340)
        .min(f.w.saturating_sub(PAD as u32 * 2))
        .max(1);
    let ch = (PAD as u32 * 2
        + title_h
        + PAD as u32
        + lines.len() as u32 * row_h as u32
        + details_h
        + PAD as u32
        + footer_h
        + PAD as u32)
        .max(220)
        .min(f.h.saturating_sub(PAD as u32 * 2))
        .max(1);
    if let Some(card) = render_menu_detailed(title, lines, details, footer, theme, cw, ch) {
        // Wide windows put the menu in the right-hand empty band while the
        // live attract board stays fully visible on the left. When there is
        // no room for that band the compact card stages over the board
        // itself, never over the middle of the page.
        let lay = layout(f.w, f.h);
        let board_right = lay.bx + lay.bw as i32 + 6;
        let right_space = f.w as i32 - board_right - PAD;
        let (board_cx, board_cy) = stage_center(f.w, f.h);
        let max_ox = (f.w as i32 - cw as i32 - PAD).max(PAD);
        let max_oy = (f.h as i32 - ch as i32 - PAD).max(PAD);
        let ox = if right_space >= cw as i32 {
            board_right + (right_space - cw as i32) / 2
        } else {
            board_cx - cw as i32 / 2
        }
        .clamp(PAD, max_ox);
        let oy = (board_cy - ch as i32 / 2).clamp(PAD, max_oy);
        for y in 0..card.h as i32 {
            for x in 0..card.w as i32 {
                if let Some(v) = card.get(x, y) {
                    f.set(
                        ox + x,
                        oy + y,
                        Rgb(
                            ((v >> 16) & 0xff) as u8,
                            ((v >> 8) & 0xff) as u8,
                            (v & 0xff) as u8,
                        ),
                    );
                }
            }
        }
    }
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
    if game.wardens.fright_flashing() {
        let lit = anim::fright_bar_segments(game.wardens.fright_t).min(30) as u32;
        if hud.flash && !hud.reduced_motion {
            f.text("FRIGHT!", x, y, s, theme.fright, None);
        } else {
            f.text("THE TURN ENDS", x, y, s, theme.fright, None);
        }
        step(&mut y);
        let seg_w = 5u32;
        let gap = 2u32;
        for i in 0..30u32 {
            // Filled segments are full-height blocks; spent segments keep a
            // half-height stub, so the drain reads in grayscale too.
            let (c, h): (Rgb, u32) = if i < lit {
                (theme.fright, 6)
            } else {
                (theme.wall_inner, 3)
            };
            f.rect(
                x + i as i32 * (seg_w + gap) as i32,
                y + (6 - h) as i32,
                seg_w,
                h,
                c,
            );
        }
        y += 6 + 6;
    } else if game.wardens.fright_active() {
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
    // Bottom hint bar spans the full window width; a fresh event ticker
    // replaces the static control hint.
    let hint = hud
        .ticker
        .unwrap_or("ARROWS/WASD MOVE - P PAUSE - M MUTE - F FULLSCREEN - ESC MENU");
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
        &themes::DUSK_POND
    }

    fn hud<'a>() -> Hud<'a> {
        Hud {
            best: 0,
            flash: true,
            reduced_motion: false,
            dim_playfield: 0.0,
            fps: None,
            tune: "OFF",
            ticker: None,
        }
    }

    /// Advance the shared engine one fixed step toward `want`.
    fn step(game: &mut Game, want: Option<Dir>) {
        game.step(maze_chase_engine::tuning::STEP as f64, want);
    }

    #[test]
    fn ticker_replaces_the_static_hint_line() {
        let game = Game::new(7, 1);
        let plain = render_play(&game, theme(), hud(), 1100, 760).unwrap();
        let ticker = render_play(
            &game,
            theme(),
            Hud {
                ticker: Some("POND CLEAR!"),
                ..hud()
            },
            1100,
            760,
        )
        .unwrap();
        assert_ne!(plain.px, ticker.px, "the ticker reaches the frame");
        let h = font::text_height(1, 1) as i32;
        let y0 = 760 - PAD - h;
        let dim = crate::frame::pack(theme().dim_text);
        let band = |f: &crate::frame::Frame| {
            let mut n = 0;
            for y in y0..y0 + h {
                for x in 0..1100 {
                    if f.get(x, y) == Some(dim) {
                        n += 1;
                    }
                }
            }
            n
        };
        assert!(band(&ticker) > 0, "the ticker paints in the hint band");
        assert!(
            band(&ticker) < band(&plain),
            "the ticker replaces the longer default hint"
        );
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
        // Deterministic fixture: force fright directly instead of
        // script-walking toward a sunseed (which may never arrive).
        let mut game = Game::new(11, 1);
        game.wardens.start_fright(30.0);
        assert!(game.wardens.fright_active());
        let f = render_play(&game, theme(), hud(), 1100, 760).unwrap();
        assert!(f.count(theme().fright) > 30);
        // Banner cleared when fright is over: fresh game paints none
        // of the banner path (frame still valid either way).
        let fresh = render_play(&Game::new(11, 1), theme(), hud(), 1100, 760).unwrap();
        assert_eq!((fresh.w, fresh.h), (1100, 760));
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
    render_menu_detailed(title, lines, &[], footer, theme, w, h)
}

/// Compose a centered menu frame with the three-zone title content:
/// title, rows, a selected-item description strip, and the warden legend
/// plus goal line, kept above the footer at every window size.
pub fn render_menu_detailed(
    title: &str,
    lines: &[MenuLine],
    details: &[(&str, Rgb)],
    footer: &str,
    theme: &Theme,
    w: u32,
    h: u32,
) -> Option<Frame> {
    let mut f = Frame::blank(w, h, theme.bg)?;
    let cx = w as i32 / 2;
    f.text_centered(title, cx, PAD * 2, 4, theme.accent, None);
    // Vertical budget: rows stop before the description strip and the
    // footer line so a long menu on a short window truncates instead of
    // painting over them (same windowed approach as `screens`).
    let row_h = font::LINE as i32 * 2 + 4;
    let footer_y = h as i32 - PAD - font::text_height(1, 1) as i32;
    let detail_h = if details.is_empty() {
        0
    } else {
        details.len() as i32 * (font::LINE as i32 + 2) + 8
    };
    let row_bottom = footer_y - detail_h;
    let mut y = PAD * 2 + font::text_height(1, 4) as i32 + PAD;
    for line in lines {
        if y + row_h / 2 > row_bottom {
            break;
        }
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
    if !details.is_empty() {
        let mut dy = footer_y - detail_h + 8;
        for (text, color) in details {
            f.text_centered(text, cx, dy, 1, *color, None);
            dy += font::LINE as i32 + 2;
        }
    }
    let bw = w.saturating_sub(PAD as u32 * 2);
    let bh = h.saturating_sub(PAD as u32 * 2);
    if bw == 0 || bh == 0 {
        return Some(f);
    }
    f.border(PAD, PAD, bw, bh, 2, theme.wall_inner);
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
        &maze_chase_assets::themes::DUSK_POND
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
        let detailed = render_menu_detailed(
            "MAZE CHASE",
            &lines,
            &[
                ("START A HUNT IN THE POND", theme().text),
                (
                    "BRAM HERON - KESSA PIKE - JORY SNAKE - NIB DRAGONFLY",
                    theme().dim_text,
                ),
                ("CLEAR 445 CRUMBS; SUNSEEDS TURN THE HUNT", theme().accent),
            ],
            "ARROWS + ENTER",
            theme(),
            900,
            700,
        )
        .unwrap();
        assert_eq!((detailed.w, detailed.h), (900, 700));
        assert!(detailed.count(theme().dim_text) > 0);
        assert!(detailed.count(theme().text) > a.count(theme().text));
    }

    #[test]
    fn stage_center_is_the_board_center_not_the_page_center() {
        for (w, h) in [(1440, 900), (1100, 760), (900, 700)] {
            let lay = layout(w, h);
            let (cx, cy) = stage_center(w, h);
            assert_eq!(cx, lay.bx + lay.bw as i32 / 2);
            assert_eq!(cy, lay.by + lay.bh as i32 / 2);
            assert_ne!(cx, w as i32 / 2, "the HUD band offsets the board");
        }
    }

    #[test]
    fn compact_title_card_falls_back_to_the_board_center() {
        let theme = theme();
        let lines = vec![
            MenuLine::at("PLAY", true),
            MenuLine::plain("HOW TO PLAY"),
            MenuLine::plain("QUIT"),
        ];
        let details = [
            ("START A HUNT IN THE POND", theme.text),
            (
                "BRAM HERON - KESSA PIKE - JORY SNAKE - NIB DRAGONFLY",
                theme.dim_text,
            ),
        ];
        let mut f = Frame::blank(900, 700, theme.bg).unwrap();
        overlay_menu(
            &mut f,
            "MAZE CHASE",
            &lines,
            &details,
            "ARROWS + ENTER",
            theme,
        );
        let border = crate::frame::pack(theme.wall_inner);
        let (mut min_x, mut max_x) = (i32::MAX, i32::MIN);
        for y in 0..f.h as i32 {
            for x in 0..f.w as i32 {
                if f.get(x, y) == Some(border) {
                    min_x = min_x.min(x);
                    max_x = max_x.max(x);
                }
            }
        }
        assert!(min_x <= max_x, "the card border must paint");
        let card_cx = (min_x + max_x) / 2;
        let (board_cx, _) = stage_center(f.w, f.h);
        assert!(
            (card_cx - board_cx).abs() <= 2,
            "compact card center {card_cx} must track board center {board_cx}"
        );
        assert_ne!(card_cx, 900 / 2, "page center is not the board center");
    }

    #[test]
    fn compact_title_card_stays_inside_the_minimum_window() {
        let theme = theme();
        let lines: Vec<MenuLine> = crate::screens::MenuItem::ALL
            .iter()
            .enumerate()
            .map(|(i, m)| MenuLine::at(m.label(), i == 0))
            .collect();
        let details = [
            (crate::screens::MenuItem::Play.description(), theme.text),
            (
                "BRAM HERON - KESSA PIKE - JORY SNAKE - NIB DRAGONFLY",
                theme.dim_text,
            ),
            ("CLEAR 445 CRUMBS; SUNSEEDS TURN THE HUNT", theme.accent),
        ];
        let border = crate::frame::pack(theme.wall_inner);
        for (w, h) in [(MIN_W, MIN_H), (601, MIN_H), (602, MIN_H)] {
            let mut f = Frame::blank(w, h, theme.bg).unwrap();
            overlay_menu(
                &mut f,
                "MAZE CHASE",
                &lines,
                &details,
                "ARROWS/WASD + ENTER - BEST 12345",
                theme,
            );
            let (mut min_x, mut max_x) = (i32::MAX, i32::MIN);
            let (mut min_y, mut max_y) = (i32::MAX, i32::MIN);
            for y in 0..f.h as i32 {
                for x in 0..f.w as i32 {
                    if f.get(x, y) == Some(border) {
                        min_x = min_x.min(x);
                        max_x = max_x.max(x);
                        min_y = min_y.min(y);
                        max_y = max_y.max(y);
                    }
                }
            }
            assert!(min_x <= max_x, "{w}x{h}: the card border must paint");
            assert!(
                min_x >= PAD,
                "{w}x{h}: card border starts at {min_x}, left of the frame margin"
            );
            assert!(
                max_x <= w as i32 - PAD,
                "{w}x{h}: card border ends at {max_x}, past the frame margin"
            );
            assert!(
                min_y >= PAD,
                "{w}x{h}: card border starts at {min_y}, above the frame margin"
            );
            assert!(
                max_y <= h as i32 - PAD,
                "{w}x{h}: card border ends at {max_y}, below the frame margin"
            );
        }
    }

    #[test]
    fn menu_handles_empty_rows_and_tiny_windows() {
        let f = render_menu("T", &[], "F", theme(), 900, 700).unwrap();
        assert_eq!((f.w, f.h), (900, 700));
        assert!(render_menu("T", &[], "F", theme(), 0, 0).is_none());
    }

    #[test]
    fn menu_truncates_rows_before_footer_on_short_windows() {
        let lines: Vec<MenuLine> = (0..40)
            .map(|i| MenuLine::plain(&format!("ROW {i}")))
            .collect();
        let f = render_menu("T", &lines, "FOOTER", theme(), 900, 200).unwrap();
        assert_eq!((f.w, f.h), (900, 200));
        // Footer row still paints in dim text; overflow rows are dropped.
        assert!(f.count(theme().dim_text) > 0);
    }
}
