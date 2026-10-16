//! Fullscreen canvas layout: fit the 28x31 maze plus HUD into any window.
//!
//! The maze board renders at `cell_cols` terminal columns per tile (2 in
//! compact rooms, 4 when the window has room to magnify) and `cell_rows`
//! text rows per tile (1 compact, 2 magnified). A side panel carries score,
//! lives, level, and warden status on wide windows; narrow windows fall
//! back to a top HUD bar plus a bottom hint line. Anything below the
//! minimum still draws a centered "window too small" card instead of a
//! clipped board. [`compute`] is pure: resize handling just calls it again.

use maze_chase_engine::maze::{HEIGHT, WIDTH};

/// Minimum window that still fits the compact board plus HUD chrome.
pub const MIN_COLS: u16 = 62;
/// Minimum window that still fits the compact board plus HUD chrome.
pub const MIN_ROWS: u16 = 35;

/// Compact cell: tiles per terminal cell.
pub const COMPACT_CELL_COLS: u16 = 2;
pub const COMPACT_CELL_ROWS: u16 = 1;
/// Magnified cell, used when the window comfortably fits it.
pub const MAGNIFIED_CELL_COLS: u16 = 4;
pub const MAGNIFIED_CELL_ROWS: u16 = 2;

/// Window width at or above which the side panel replaces the top bar.
pub const SIDE_PANEL_MIN_COLS: u16 = 96;
/// Side panel width in columns.
pub const SIDE_PANEL_COLS: u16 = 26;

/// A placed rectangle in terminal cells (0-based, end-exclusive).
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub struct Rect {
    pub x: u16,
    pub y: u16,
    pub w: u16,
    pub h: u16,
}

impl Rect {
    pub fn contains(self, x: u16, y: u16) -> bool {
        x >= self.x && y >= self.y && x < self.x + self.w && y < self.y + self.h
    }
}

/// Fitted layout for one window size.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub struct Layout {
    /// Usable window the layout was computed for.
    pub cols: u16,
    pub rows: u16,
    /// Board origin and cell size.
    pub board: Rect,
    pub cell_cols: u16,
    pub cell_rows: u16,
    /// True when the magnified cell size is active.
    pub magnified: bool,
    /// Side panel (`None` on narrow windows, which use the top bar).
    pub side: Option<Rect>,
    /// Top HUD bar (`None` on wide windows, which use the side panel).
    pub top_bar: Option<Rect>,
    /// Bottom hint line (always present when the window fits at all).
    pub hint: Rect,
    /// True when the window is below [`MIN_COLS`]x[`MIN_ROWS`].
    pub too_small: bool,
}

/// Fit the canvas into `cols`x`rows`. Pure: call again on every resize.
pub fn compute(cols: u16, rows: u16) -> Layout {
    if cols < MIN_COLS || rows < MIN_ROWS {
        return Layout {
            cols,
            rows,
            board: Rect {
                x: 0,
                y: 0,
                w: 0,
                h: 0,
            },
            cell_cols: COMPACT_CELL_COLS,
            cell_rows: COMPACT_CELL_ROWS,
            magnified: false,
            side: None,
            top_bar: None,
            hint: Rect {
                x: 0,
                y: rows.saturating_sub(1),
                w: cols,
                h: 1,
            },
            too_small: true,
        };
    }
    // Magnify when the doubled board plus chrome fits with margin.
    let mag_w = WIDTH as u16 * MAGNIFIED_CELL_COLS + SIDE_PANEL_COLS + 6;
    let mag_h = HEIGHT as u16 * MAGNIFIED_CELL_ROWS + 4;
    let magnified = cols >= mag_w && rows >= mag_h;
    let (cell_cols, cell_rows) = if magnified {
        (MAGNIFIED_CELL_COLS, MAGNIFIED_CELL_ROWS)
    } else {
        (COMPACT_CELL_COLS, COMPACT_CELL_ROWS)
    };
    let board_w = WIDTH as u16 * cell_cols;
    let board_h = HEIGHT as u16 * cell_rows;
    let wide = cols >= SIDE_PANEL_MIN_COLS && cols >= board_w + SIDE_PANEL_COLS + 4;
    let (side, top_bar, chrome_top) = if wide {
        let panel = Rect {
            x: 0, // filled in after centering below
            y: 0,
            w: SIDE_PANEL_COLS,
            h: board_h,
        };
        (Some(panel), None, 1u16)
    } else {
        (
            None,
            Some(Rect {
                x: 0,
                y: 0,
                w: cols,
                h: 2,
            }),
            3u16,
        )
    };
    // Center the board (+ panel) block in the window.
    let block_w = board_w + if wide { SIDE_PANEL_COLS + 2 } else { 0 };
    let block_h = board_h + chrome_top + 1;
    let ox = cols.saturating_sub(block_w) / 2;
    let oy = rows.saturating_sub(block_h) / 2 + chrome_top.min(2);
    let board = Rect {
        x: ox,
        y: oy,
        w: board_w,
        h: board_h,
    };
    let side = side.map(|_| Rect {
        x: ox + board_w + 2,
        y: oy,
        w: SIDE_PANEL_COLS.min(cols.saturating_sub(ox + board_w + 2)),
        h: board_h,
    });
    let hint = Rect {
        x: ox,
        y: oy + board_h,
        w: block_w.min(cols.saturating_sub(ox)),
        h: 1,
    };
    Layout {
        cols,
        rows,
        board,
        cell_cols,
        cell_rows,
        magnified,
        side,
        top_bar,
        hint,
        too_small: false,
    }
}

/// Board-tile coordinate under a terminal cell, if any.
pub fn tile_at(layout: &Layout, x: u16, y: u16) -> Option<(i32, i32)> {
    if layout.too_small || !layout.board.contains(x, y) {
        return None;
    }
    let tx = (x - layout.board.x) / layout.cell_cols;
    let ty = (y - layout.board.y) / layout.cell_rows;
    if tx < WIDTH as u16 && ty < HEIGHT as u16 {
        Some((tx as i32, ty as i32))
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn standard_80x24_is_too_small_but_never_panics() {
        // The classic 80x24 room cannot fit a 28x31 board: honest card.
        let l = compute(80, 24);
        assert!(l.too_small);
        assert_eq!(tile_at(&l, 40, 12), None);
    }

    #[test]
    fn minimum_window_fits_compact_board() {
        let l = compute(MIN_COLS, MIN_ROWS);
        assert!(!l.too_small);
        assert!(!l.magnified);
        assert_eq!(l.cell_cols, 2);
        assert_eq!(l.cell_rows, 1);
        assert_eq!(l.board.w, 56);
        assert_eq!(l.board.h, 31);
        assert!(l.top_bar.is_some());
        assert!(l.side.is_none());
    }

    #[test]
    fn wide_window_gets_side_panel() {
        let l = compute(140, 70);
        assert!(!l.too_small);
        assert!(l.side.is_some());
        assert!(l.top_bar.is_none());
        let side = l.side.unwrap();
        assert!(side.x > l.board.x + l.board.w);
    }

    #[test]
    fn huge_window_magnifies() {
        let l = compute(200, 100);
        assert!(l.magnified);
        assert_eq!(l.cell_cols, 4);
        assert_eq!(l.cell_rows, 2);
        assert_eq!(l.board.w, 112);
        assert_eq!(l.board.h, 62);
    }

    #[test]
    fn board_is_centered_and_inside() {
        for (cols, rows) in [(62, 35), (100, 40), (140, 70), (200, 100)] {
            let l = compute(cols, rows);
            assert!(!l.too_small, "{cols}x{rows}");
            assert!(l.board.x + l.board.w <= cols, "{cols}x{rows}");
            assert!(l.hint.y < rows, "{cols}x{rows}");
            if let Some(side) = l.side {
                assert!(side.x + side.w <= cols, "{cols}x{rows}");
            }
        }
    }

    #[test]
    fn tile_at_maps_corners() {
        let l = compute(100, 40);
        assert!(!l.too_small);
        assert_eq!(tile_at(&l, l.board.x, l.board.y), Some((0, 0)));
        assert_eq!(
            tile_at(&l, l.board.x + l.board.w - 1, l.board.y + l.board.h - 1),
            Some((27, 30))
        );
        assert_eq!(tile_at(&l, 0, 0), None);
    }

    #[test]
    fn resize_recomputes_cleanly() {
        // Dynamic resize path: recompute must stay consistent across a
        // sweep of sizes, including degenerate ones.
        let mut prev: Option<Layout> = None;
        for cols in (0..160).step_by(7) {
            for rows in (0..60).step_by(5) {
                let l = compute(cols, rows);
                if l.too_small {
                    assert!(cols < MIN_COLS || rows < MIN_ROWS);
                } else {
                    assert!(l.board.w > 0 && l.board.h > 0);
                }
                let _ = prev.replace(l);
            }
        }
    }
}
