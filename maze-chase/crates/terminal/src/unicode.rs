//! Unicode cell renderer: the polished fallback every terminal gets.
//!
//! The 28x31 maze becomes text cells at the layout's cell size: compact
//! rooms draw 2 columns x 1 row per tile, magnified rooms 4 x 2. Walls are
//! solid blocks in the theme wall tones, corridors breathe with dotted
//! crumbs and pulsing sunseeds, Pip shows a facing mouth, wardens wear
//! their theme colors (fright masks while frightened, drifting eyes when
//! eaten), and the relish waits as an accent diamond. Truecolor tiers emit
//! 24-bit SGR; the legacy tier folds every theme color to the nearest of
//! the 16 ANSI colors.

use crate::layout::Layout;
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
    pub fn to_ansi(&self, theme: &Theme, truecolor: bool) -> String {
        let mut out = String::new();
        for row in &self.rows {
            out.push_str(&row_ansi(row, theme, truecolor));
            out.push('\n');
        }
        out
    }
}

/// One row of spans as an ANSI string (no trailing newline): the caller
/// positions the cursor first, so resizes never leave stale glyphs.
pub fn row_ansi(row: &[Span], theme: &Theme, truecolor: bool) -> String {
    let mut out = String::new();
    for span in row {
        out.push_str(&paint(&span.text, span.fg, span.bg, theme.bg, truecolor));
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

fn sgr_bg(c: Rgb, bg: Rgb, truecolor: bool) -> String {
    if c == bg {
        return String::new();
    }
    if truecolor {
        format!("\x1b[48;2;{};{};{}m", c.0, c.1, c.2)
    } else {
        // Foreground 30-37/90-97 map to background 40-47/100-107.
        format!("\x1b[{}m", ansi16(c) + 10)
    }
}

/// Paint one text run with foreground/background colors.
pub fn paint(text: &str, fg: Rgb, bg: Rgb, base_bg: Rgb, truecolor: bool) -> String {
    format!(
        "{}{}{}\x1b[0m",
        sgr_fg(fg, truecolor),
        sgr_bg(bg, base_bg, truecolor),
        text
    )
}

/// Pip mouth for a heading (two cells wide in compact rooms).
fn pip_text(game: &Game, frame_no: u64) -> &'static str {
    use maze_chase_engine::actors::Dir;
    if game.state == GameState::Dying {
        return match (frame_no / 8) % 4 {
            0 => "><",
            1 => "++",
            2 => "..",
            _ => "  ",
        };
    }
    let closed = (frame_no / 5) % 3 == 2;
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
    overlay.insert(pip_tile, (pip_text(game, frame_no), theme.pip));
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
        let cell_text = |tx: i32, ty: i32, sub: usize| -> (String, Rgb, Rgb) {
            let tile = game.maze.tile(tx, ty);
            if let Some(&(text, color)) = overlay.get(&(tx, ty)) {
                let t = expand(text, cw);
                return (t[sub].clone(), color, theme.bg);
            }
            match tile {
                Tile::Wall => {
                    // Full-block face in the wall tone; the bitmap
                    // tiers add bevel shading where pixels allow.
                    let s = if layout.magnified {
                        "████".to_string()
                    } else {
                        "██".to_string()
                    };
                    (s, theme.wall, theme.bg)
                }
                Tile::Door => {
                    let s = expand("──", cw);
                    (s[sub].clone(), theme.accent, theme.bg)
                }
                Tile::House => (spaces(cw), theme.bg, theme.bg),
                Tile::Dot | Tile::Energizer | Tile::Plain => {
                    let i = (ty * WIDTH + tx) as usize;
                    if field.get(stride + i).copied().unwrap_or(0) == 1 {
                        let halo = (frame_no / 24) % 2 == 1;
                        let s = expand(if halo { "○○" } else { "●●" }, cw);
                        (s[sub].clone(), theme.sunseed, theme.bg)
                    } else if field.get(i).copied().unwrap_or(0) == 1 {
                        let s = expand("· ", cw);
                        (s[sub].clone(), theme.crumb, theme.bg)
                    } else {
                        (spaces(cw), theme.bg, theme.bg)
                    }
                }
            }
        };
        for col in 0..cols {
            let bx = layout.board.x as usize;
            let by = layout.board.y as usize;
            let bw = layout.board.w as usize;
            let bh = layout.board.h as usize;
            let (tx, ty, sub) = if col >= bx && col < bx + bw && row >= by && row < by + bh {
                let lx = col - bx;
                let ly = row - by;
                let tx = (lx / cw) as i32;
                let ty = (ly / ch) as i32;
                let sub = (ly % ch).min(expand_len(cw) - 1);
                (tx, ty, sub)
            } else {
                // Chrome areas are painted by the app; fill background.
                let s = " ".to_string();
                if cur_fg != theme.bg || cur_bg != theme.bg {
                    flush!();
                    cur_fg = theme.bg;
                    cur_bg = theme.bg;
                }
                line.push_str(&s);
                continue;
            };
            let (text, fg, bg) = cell_text(tx, ty, sub);
            if fg != cur_fg || bg != cur_bg {
                flush!();
                cur_fg = fg;
                cur_bg = bg;
            }
            line.push_str(&text);
        }
        flush!();
        screen.rows.push(spans);
    }
    screen
}

/// Rows produced by [`expand`] for a cell width.
fn expand_len(width: usize) -> usize {
    if width <= 2 {
        1
    } else {
        2
    }
}

fn spaces(n: usize) -> String {
    " ".repeat(n)
}

/// Expand a 2-cell glyph to the magnified width (4) by doubling chars.
fn expand(glyph: &str, width: usize) -> Vec<String> {
    if width <= 2 {
        return vec![glyph.to_string()];
    }
    let doubled: String = glyph.chars().flat_map(|c| [c, c]).collect();
    vec![doubled.clone(), doubled]
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
        let theme = &themes::EMBER_WARREN;
        let l = layout::compute(100, 40);
        let s = render_board(&game(), theme, &l, 0, true);
        assert_eq!(s.rows.len(), 40);
        let ansi = s.to_ansi(theme, true);
        assert!(ansi.contains("38;2;"), "truecolor SGR present");
        // Fresh Pip heads left with an open mouth.
        assert!(ansi.contains("<<"), "pip present");
        assert!(ansi.contains("BB"), "bram present");
    }

    #[test]
    fn legacy_tier_folds_to_16_colors() {
        let theme = &themes::EMBER_WARREN;
        let l = layout::compute(100, 40);
        let s = render_board(&game(), theme, &l, 0, true);
        let ansi = s.to_ansi(theme, false);
        assert!(!ansi.contains("38;2;"), "no 24-bit codes in legacy");
        assert!(ansi.contains("\x1b["), "SGR still present");
    }

    #[test]
    fn fright_masks_show_in_cells() {
        let theme = &themes::EMBER_WARREN;
        let mut g = game();
        g.wardens.start_fright(6.0);
        let l = layout::compute(100, 40);
        let s = render_board(&g, theme, &l, 0, true);
        assert!(s.to_ansi(theme, true).contains("FF"));
    }

    #[test]
    fn ansi16_folds_sanely() {
        assert_eq!(ansi16(Rgb(255, 255, 255)), 97);
        assert_eq!(ansi16(Rgb(0, 0, 0)), 30);
        assert!(ansi16(Rgb(232, 110, 40)) == 33 || ansi16(Rgb(232, 110, 40)) == 91);
    }
}
