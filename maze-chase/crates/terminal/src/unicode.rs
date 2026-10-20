//! Unicode cell renderer: the polished fallback every terminal gets.
//!
//! The 28x31 maze becomes text cells at the layout's continuous tile
//! scale: every tile is `cell_cols` characters wide and `cell_rows`
//! rows tall (not just the old 2x1/4x2 steps, issue #675). Walls are
//! solid blocks in the theme wall tones, corridors breathe with dotted
//! crumbs and pulsing sunseeds centered in their tile, Pip shows a
//! facing mouth, wardens wear their theme colors (fright masks while
//! frightened, drifting eyes when eaten), and the relish waits as an
//! accent diamond. Truecolor tiers emit 24-bit SGR; the legacy tier
//! folds every theme color to the nearest of the 16 ANSI colors.

use crate::layout::Layout;
use maze_chase_assets::anim;
use maze_chase_assets::themes::{Rgb, Theme};
use maze_chase_engine::actors::tile_of;
use maze_chase_engine::game::{Game, GameState};
use maze_chase_engine::ghosts::WardenState;
use maze_chase_engine::maze::{Tile, HEIGHT, WIDTH};

/// One painted cell run: text plus its colors.
#[derive(Clone, PartialEq, Eq, Debug)]
pub struct Span {
    pub text: String,
    pub fg: Rgb,
    pub bg: Rgb,
}

/// A fully painted screen: rows of spans plus the cursor home prefix the
/// main loop needs. No I/O here; the caller writes the bytes.
#[derive(Clone, PartialEq, Eq, Debug)]
pub struct Screen {
    pub rows: Vec<Vec<Span>>,
}

impl Screen {
    /// Flatten to one string with SGR color codes (`truecolor` selects
    /// 24-bit vs 16-color folding).
    pub fn to_ansi(&self, truecolor: bool) -> String {
        let mut out = String::new();
        for row in &self.rows {
            out.push_str(&row_ansi(row, truecolor));
            out.push('\n');
        }
        out
    }
}

/// One row of spans as an ANSI string (no trailing newline): the caller
/// positions the cursor first, so resizes never leave stale glyphs.
pub fn row_ansi(row: &[Span], truecolor: bool) -> String {
    let mut out = String::new();
    for span in row {
        out.push_str(&paint(&span.text, span.fg, span.bg, truecolor));
    }
    out.push_str("\x1b[0m");
    out
}

/// Nearest of the 16 ANSI colors (10..17 index space folded to 30-37 /
/// 90-97 SGR). Used only by the legacy tier.
pub fn ansi16(c: Rgb) -> u8 {
    const TABLE: [(Rgb, u8); 16] = [
        (Rgb(0, 0, 0), 30),
        (Rgb(170, 0, 0), 31),
        (Rgb(0, 170, 0), 32),
        (Rgb(170, 85, 0), 33),
        (Rgb(0, 0, 170), 34),
        (Rgb(170, 0, 170), 35),
        (Rgb(0, 170, 170), 36),
        (Rgb(170, 170, 170), 37),
        (Rgb(85, 85, 85), 90),
        (Rgb(255, 85, 85), 91),
        (Rgb(85, 255, 85), 92),
        (Rgb(255, 255, 85), 93),
        (Rgb(85, 85, 255), 94),
        (Rgb(255, 85, 255), 95),
        (Rgb(85, 255, 255), 96),
        (Rgb(255, 255, 255), 97),
    ];
    let mut best = 37;
    let mut best_d = u32::MAX;
    for (rgb, code) in TABLE {
        let dr = rgb.0 as i32 - c.0 as i32;
        let dg = rgb.1 as i32 - c.1 as i32;
        let db = rgb.2 as i32 - c.2 as i32;
        let d = (dr * dr + dg * dg + db * db) as u32;
        if d < best_d {
            best_d = d;
            best = code;
        }
    }
    best
}

fn sgr_fg(c: Rgb, truecolor: bool) -> String {
    if truecolor {
        format!("\x1b[38;2;{};{};{}m", c.0, c.1, c.2)
    } else {
        format!("\x1b[{}m", ansi16(c))
    }
}

fn sgr_bg(c: Rgb, truecolor: bool) -> String {
    // The base background is always painted, even when the span's
    // background equals it: the cell tiers own their canvas instead of
    // inheriting the terminal's default background, so a light-default
    // terminal can never wash out the theme's text (the evaluator's
    // default-light xterm finding: cream chrome text invisible on
    // white).
    if truecolor {
        format!("\x1b[48;2;{};{};{}m", c.0, c.1, c.2)
    } else {
        // Foreground 30-37/90-97 map to background 40-47/100-107.
        format!("\x1b[{}m", ansi16(c) + 10)
    }
}

/// Paint one text run with foreground/background colors. `bg` is painted
/// explicitly on every run so no cell tier depends on the terminal's
/// default background.
pub fn paint(text: &str, fg: Rgb, bg: Rgb, truecolor: bool) -> String {
    format!(
        "{}{}{}\x1b[0m",
        sgr_fg(fg, truecolor),
        sgr_bg(bg, truecolor),
        text
    )
}

/// Pip mouth for a heading (two cells wide in compact rooms).
fn pip_text(game: &Game, frame_no: u64) -> &'static str {
    use maze_chase_engine::actors::Dir;
    if game.state == GameState::Dying {
        return match anim::death_frame(game.state_elapsed()) {
            0 => "><",
            1 => "++",
            2 => "..",
            _ => "  ",
        };
    }
    let closed = game
        .fx
        .gulp_phase()
        .map(|phase| phase == 2)
        .unwrap_or((frame_no / 5) % 3 == 2);
    match game.player.dir {
        Dir::Right => {
            if closed {
                "()"
            } else {
                ">>"
            }
        }
        Dir::Left => {
            if closed {
                "()"
            } else {
                "<<"
            }
        }
        Dir::Up => {
            if closed {
                "()"
            } else {
                "^^"
            }
        }
        Dir::Down => {
            if closed {
                "()"
            } else {
                "vv"
            }
        }
    }
}

/// Render the board area of a layout into spans. The caller positions the
/// rows at `layout.board`; rows outside the board are bg-filled to the
/// full window width so resizes never leave stale glyphs.
pub fn render_board(
    game: &Game,
    theme: &Theme,
    layout: &Layout,
    frame_no: u64,
    flash: bool,
) -> Screen {
    let cw = layout.cell_cols as usize;
    let ch = layout.cell_rows as usize;
    let cols = layout.cols as usize;
    let rows = layout.rows as usize;
    let mut screen = Screen { rows: Vec::new() };
    if layout.too_small {
        return screen;
    }
    let field = game.maze.dot_bytes();
    let stride = (WIDTH * HEIGHT) as usize;
    let fright = game.wardens.fright_active();
    let flash_on = flash && game.wardens.fright_t <= 1.5 && (frame_no / 6).is_multiple_of(2);
    let bodies = [theme.bram, theme.kessa, theme.jory, theme.nib];

    // Actor overlay lookup: tile -> (text, color).
    let mut overlay = std::collections::BTreeMap::new();
    for warden in game.wardens.wardens.iter() {
        let t = tile_of(warden.actor.x, warden.actor.y);
        let (text, color) = match warden.state {
            WardenState::Eyes => ("''", theme.eyes),
            _ if fright && warden.state == WardenState::Active => {
                (if flash_on { "##" } else { "FF" }, theme.fright)
            }
            _ => {
                let letter = match warden.index {
                    0 => "BB",
                    1 => "KK",
                    2 => "JJ",
                    _ => "NN",
                };
                (letter, bodies[warden.index])
            }
        };
        overlay.insert(t, (text, color));
    }
    let pip_tile = tile_of(game.player.x, game.player.y);
    if game.relish.active {
        overlay.insert(
            maze_chase_engine::tuning::RELISH_TILE,
            (
                if (frame_no / 30).is_multiple_of(2) {
                    "<>"
                } else {
                    "<<"
                },
                theme.accent,
            ),
        );
    }
    overlay.insert(pip_tile, (pip_text(game, frame_no), theme.pip));
    // Effect cues on the cell rung: the pickup ripple is the two static
    // states the motion table allows, the turn spark a committed-corner
    // marker, and the spare wick a crown over the board center. They paint
    // after Pip so a cue on the player tile is not swallowed.
    if let Some((anchor, frame)) = game.fx.pickup_burst() {
        overlay.insert(
            (anchor.x.floor() as i32, anchor.y.floor() as i32),
            (if frame < 2 { "++" } else { "**" }, theme.accent),
        );
    }
    if let Some(anchor) = game.fx.turn_spark() {
        overlay.insert(
            (anchor.x.floor() as i32, anchor.y.floor() as i32),
            ("::", theme.text),
        );
    }
    if game.fx.lily_live() {
        let cx = WIDTH / 2;
        let cy = HEIGHT / 2;
        overlay.insert((cx, cy), ("YY", theme.accent));
    }
    for row in 0..rows {
        let mut spans: Vec<Span> = Vec::new();
        let mut line = String::new();
        // Track the pending run color to merge spans.
        let mut cur_fg = theme.bg;
        let mut cur_bg = theme.bg;
        macro_rules! flush {
            () => {
                if !line.is_empty() {
                    spans.push(Span {
                        text: core::mem::take(&mut line),
                        fg: cur_fg,
                        bg: cur_bg,
                    });
                }
            };
        }
        // One output character per terminal column: `row_sub` selects the
        // tile's sub-row, `col_sub` its horizontal character. Each sub-row
        // string is exactly `cw` characters wide, so indexing it (never
        // emitting a whole sub-row per column) keeps every row exactly
        // `layout.cols` characters.
        let cell_text = |tx: i32, ty: i32, row_sub: usize, col_sub: usize| -> (char, Rgb, Rgb) {
            let pick = |s: &str| s.chars().nth(col_sub).unwrap_or(' ');
            let tile = game.maze.tile(tx, ty);
            if let Some(&(text, color)) = overlay.get(&(tx, ty)) {
                let t = fit_width(text, cw);
                return (pick(&t), color, theme.bg);
            }
            match tile {
                Tile::Wall => {
                    // Full-block face in the wall tone; the bitmap
                    // tiers add bevel shading where pixels allow.
                    (pick(&"█".repeat(cw)), theme.wall, theme.bg)
                }
                Tile::Door => {
                    let s = fit_width("──", cw);
                    (pick(&s), theme.accent, theme.bg)
                }
                Tile::House => (' ', theme.bg, theme.bg),
                Tile::Dot | Tile::Energizer | Tile::Plain => {
                    let (first, last) = center_rows(ch);
                    let centered = row_sub >= first && row_sub <= last;
                    let i = (ty * WIDTH + tx) as usize;
                    if field.get(stride + i).copied().unwrap_or(0) == 1 {
                        let halo = (frame_no / 24) % 2 == 1;
                        let s = fit_width(if halo { "○○" } else { "●●" }, cw);
                        (
                            if centered { pick(&s) } else { ' ' },
                            if centered { theme.sunseed } else { theme.bg },
                            theme.bg,
                        )
                    } else if field.get(i).copied().unwrap_or(0) == 1 {
                        let s = fit_width("· ", cw);
                        (
                            if centered { pick(&s) } else { ' ' },
                            if centered { theme.crumb } else { theme.bg },
                            theme.bg,
                        )
                    } else {
                        (' ', theme.bg, theme.bg)
                    }
                }
            }
        };
        for col in 0..cols {
            let bx = layout.board.x as usize;
            let by = layout.board.y as usize;
            let bw = layout.board.w as usize;
            let bh = layout.board.h as usize;
            let (tx, ty, row_sub, col_sub) =
                if col >= bx && col < bx + bw && row >= by && row < by + bh {
                    let lx = col - bx;
                    let ly = row - by;
                    let tx = (lx / cw) as i32;
                    let ty = (ly / ch) as i32;
                    let row_sub = ly % ch;
                    let col_sub = lx % cw;
                    (tx, ty, row_sub, col_sub)
                } else {
                    // Chrome areas are painted by the app; fill background.
                    if cur_fg != theme.bg || cur_bg != theme.bg {
                        flush!();
                        cur_fg = theme.bg;
                        cur_bg = theme.bg;
                    }
                    line.push(' ');
                    continue;
                };
            let (text, fg, bg) = cell_text(tx, ty, row_sub, col_sub);
            if fg != cur_fg || bg != cur_bg {
                flush!();
                cur_fg = fg;
                cur_bg = bg;
            }
            line.push(text);
        }
        flush!();
        screen.rows.push(spans);
    }
    screen
}

/// Fit a compact glyph to exactly `width` characters by cycling its
/// characters (a 2-char glyph at width 3 repeats its first char last,
/// width 5 repeats the pair). Never returns more or fewer than `width`
/// characters, which is what keeps every output row exact.
fn fit_width(glyph: &str, width: usize) -> String {
    let chars: Vec<char> = glyph.chars().collect();
    if chars.is_empty() {
        return " ".repeat(width);
    }
    (0..width).map(|i| chars[i % chars.len()]).collect()
}

/// Inclusive sub-row range that carries a small pickup glyph: the
/// middle row for odd tile heights, the middle pair for even ones (the
/// old 2x1/2x2 behavior generalized to any continuous scale).
fn center_rows(height: usize) -> (usize, usize) {
    let start = height.saturating_sub(1) / 2;
    let end = height / 2;
    (start, end.max(start))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::layout;
    use maze_chase_assets::themes;

    fn game() -> Game {
        Game::new(11, 1)
    }

    #[test]
    fn board_covers_layout_and_holds_actors() {
        let theme = &themes::DUSK_POND;
        let l = layout::compute(100, 40);
        let s = render_board(&game(), theme, &l, 0, true);
        assert_eq!(s.rows.len(), 40);
        let ansi = s.to_ansi(true);
        assert!(ansi.contains("38;2;"), "truecolor SGR present");
        // Fresh Pip heads left with an open mouth.
        assert!(ansi.contains("<<"), "pip present");
        assert!(ansi.contains("BB"), "bram present");
    }

    #[test]
    fn board_rows_are_exactly_window_width() {
        // Every output row must be exactly `layout.cols` characters: the
        // renderer emits one character per terminal column at any
        // continuous tile scale (2x1 floor through 7x3 at 200x100), so a
        // row can never overflow the window and clip the right wall.
        let theme = &themes::DUSK_POND;
        for (cols, rows) in [(62u16, 35u16), (100, 40), (200, 100)] {
            let l = layout::compute(cols, rows);
            assert!(!l.too_small, "{cols}x{rows}");
            let s = render_board(&game(), theme, &l, 0, true);
            assert_eq!(s.rows.len(), rows as usize, "{cols}x{rows} row count");
            for (i, row) in s.rows.iter().enumerate() {
                let width: usize = row.iter().map(|sp| sp.text.chars().count()).sum();
                assert_eq!(width, cols as usize, "{cols}x{rows} row {i} width");
            }
        }
        // The sweep above covers three distinct continuous scales; pin
        // them so a layout change cannot silently make the test cover
        // one mode twice (issue #675).
        assert_eq!(layout::compute(62, 35).cell_cols, 2);
        assert_eq!(layout::compute(100, 40).cell_cols, 3);
        assert_eq!(layout::compute(200, 100).cell_cols, 7);
        assert_eq!(layout::compute(200, 100).cell_rows, 3);
    }

    #[test]
    fn tall_tile_walls_fill_every_sub_row() {
        // At a 7x3 scale a wall tile is a 7-char block on all three of
        // its sub-rows: no hollow bands inside wall runs.
        let theme = &themes::DUSK_POND;
        let l = layout::compute(200, 100);
        assert_eq!((l.cell_cols, l.cell_rows), (7, 3));
        let s = render_board(&game(), theme, &l, 0, true);
        let text: Vec<String> = s
            .rows
            .iter()
            .map(|row| row.iter().map(|sp| sp.text.as_str()).collect())
            .collect();
        for sub in 0..3usize {
            let y = l.board.y as usize + sub;
            let seg: String = text[y].chars().skip(l.board.x as usize).take(7).collect();
            assert_eq!(seg, "█".repeat(7), "sub-row {sub} wall: {seg:?}");
        }
    }

    #[test]
    fn legacy_tier_folds_to_16_colors() {
        let theme = &themes::DUSK_POND;
        let l = layout::compute(100, 40);
        let s = render_board(&game(), theme, &l, 0, true);
        let ansi = s.to_ansi(false);
        assert!(!ansi.contains("38;2;"), "no 24-bit codes in legacy");
        assert!(ansi.contains("\x1b["), "SGR still present");
    }

    #[test]
    fn base_background_is_painted_on_cell_tiers() {
        // Evaluator finding (default-light xterm): a span whose
        // background equals the theme base background still emits the
        // explicit background SGR, so a light terminal default can never
        // hide the theme's text.
        let theme = &themes::DUSK_POND;
        let true_ansi = paint("x", theme.text, theme.bg, true);
        assert!(
            true_ansi.contains("\x1b[48;2;14;30;28m"),
            "truecolor base bg painted: {true_ansi:?}"
        );
        let legacy_ansi = paint("x", theme.text, theme.bg, false);
        assert!(
            legacy_ansi.contains("\x1b[40m"),
            "legacy base bg folded and painted: {legacy_ansi:?}"
        );
        let board = render_board(&game(), theme, &layout::compute(100, 40), 0, true);
        assert!(
            board.to_ansi(true).contains("\x1b[48;2;14;30;28m"),
            "board rows carry the base background"
        );
    }

    #[test]
    fn fright_masks_show_in_cells() {
        let theme = &themes::DUSK_POND;
        let mut g = game();
        g.wardens.start_fright(6.0);
        let l = layout::compute(100, 40);
        let s = render_board(&g, theme, &l, 0, true);
        assert!(s.to_ansi(true).contains("FF"));
    }

    #[test]
    fn ansi16_folds_sanely() {
        assert_eq!(ansi16(Rgb(255, 255, 255)), 97);
        assert_eq!(ansi16(Rgb(0, 0, 0)), 30);
        assert!(ansi16(Rgb(232, 110, 40)) == 33 || ansi16(Rgb(232, 110, 40)) == 91);
    }
}
