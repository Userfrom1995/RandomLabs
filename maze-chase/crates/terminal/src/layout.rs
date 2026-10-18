//! Fullscreen canvas layout: fit the 28x31 warren plus HUD into any window.
//!
//! The board is `cell_cols` x `cell_rows` terminal cells per tile, chosen
//! continuously: the solver scans every scale in the documented 1..8 x
//! 1..4 grid (the 2x1 compact floor included) and keeps the one with the
//! highest coverage - the share of the window the board plus chrome
//! occupies - breaking ties by tile squareness, chrome, area, and width
//! (issues #675, #656: the old per-column derivation skipped wide-short
//! scales like 7x1 and 2x2, leaving most of a wide or tall window empty).
//! Chrome adapts to the room the board leaves: a right side panel on wide
//! rooms, a two-row HUD band above the board when the board's own width
//! leaves no panel room, and nothing but the bottom hint line in tight
//! rooms. Windows below the supported 62x35 minimum draw a centered
//! "window too small" card instead of a clipped board; the card's numbers
//! come from [`MIN_COLS`]/[`MIN_ROWS`], the same constants the solver
//! enforces (issue #684).
//!
//! On the bitmap tiers [`Layout::image`] is the centered cell footprint
//! the raster occupies inside [`Layout::board`], mapped from the raster's
//! pixel size through the detected window pixels (issue #656: the sixel
//! raster used to keep its natural size anchored at the board origin, so
//! it could overflow into the hint line on one window and hug a corner of
//! a much larger box on another). [`Layout::ppt`] rasterizes at the
//! detected real cell pixel size, additionally bounded so the raster fits
//! the board's pixel box whenever the box can host even the 6-ppt
//! legibility floor (see [`Layout::board_px`]; below that floor, in
//! absurdly tiny pixel windows, the floor wins and the raster can exceed
//! the box). Kitty terminals scale the image into [`Layout::image`], whose
//! cell footprint tracks the raster's pixel aspect to within one cell of
//! rounding per axis, so the art is never stretched across the whole
//! board.
//! Terminals that report no pixel size keep the Phase 1 behavior: the
//! nominal 8-ppt raster drawn across the full board box (see
//! [`NOMINAL_IMAGE_PPT`]).
//!
//! [`compute`] is pure: resize handling just calls it again, and equal
//! inputs always yield equal plans, so the binary can detect a plan
//! change by comparison and repaint from scratch (issue #674).

use crate::geometry::PixelGeometry;
use maze_chase_engine::maze::{HEIGHT, WIDTH};

/// Supported minimum window: below either floor the too-small card shows.
pub const MIN_COLS: u16 = 62;
pub const MIN_ROWS: u16 = 35;

/// Gap between the board and the side panel, in columns.
pub const PANEL_GAP: u16 = 2;
/// Side panel width in columns.
pub const SIDE_PANEL_COLS: u16 = 26;
/// HUD band height in rows when the panel does not fit.
pub const BAND_ROWS: u16 = 2;

/// Largest tile scale the cell tier considers.
pub const MAX_CELL_COLS: u16 = 8;
pub const MAX_CELL_ROWS: u16 = 4;

/// Rasterization bounds for the bitmap tiers: below 6 ppt glyphs stop
/// reading, above 20 ppt the stored-block PNG grows past what 20 fps on
/// a PTY can carry in this phase.
pub const MIN_IMAGE_PPT: u32 = 6;
pub const MAX_IMAGE_PPT: u32 = 20;
/// Raster scale when the terminal reports no cell pixels (the Phase 1
/// default): bitmap tiers keep the proven 8-ppt render instead of
/// guessing from nominal cells.
pub const NOMINAL_IMAGE_PPT: u32 = crate::raster::DEFAULT_PPT;

/// Nominal cell pixel size used when the terminal reports none.
pub const NOMINAL_CELL_W_PX: u16 = crate::geometry::NOMINAL_CELL_W_PX;
pub const NOMINAL_CELL_H_PX: u16 = crate::geometry::NOMINAL_CELL_H_PX;

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

/// Where the HUD chrome lives in this plan.
#[derive(Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Debug)]
pub enum Chrome {
    /// Only the bottom hint line (tight rooms).
    Minimal,
    /// Two-row HUD band above the board.
    Band,
    /// Right-hand side panel.
    Side,
}

/// How the board is presented on this tier.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum BoardKind {
    /// Unicode cells at the plan's tile scale.
    Cells { cell_cols: u16, cell_rows: u16 },
    /// Pixels rasterized at `ppt` pixels per tile.
    Image { ppt: u32 },
}

/// Fitted layout for one window size.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub struct Layout {
    /// Usable window the layout was computed for.
    pub cols: u16,
    pub rows: u16,
    /// Board origin and size in terminal cells.
    pub board: Rect,
    /// Board pixel box ([`Layout::board`] at the detected window pixel
    /// resolution); zero when no pixel report exists.
    pub board_px: (u32, u32),
    /// Cell footprint the raster is drawn into, centered inside
    /// [`Layout::board`]: the mapped raster footprint on pixel-reporting
    /// bitmap terminals, and the full board everywhere else (cell tiers,
    /// too-small cards, and terminals without a pixel report).
    pub image: Rect,
    /// Tile footprint: terminal columns/rows per maze tile (both kinds).
    pub cell_cols: u16,
    pub cell_rows: u16,
    /// Presentation kind for this tier.
    pub kind: BoardKind,
    /// Which chrome fits (side panel > band > hint only).
    pub chrome: Chrome,
    /// True when the tile scale is above the 2x1 compact floor.
    pub magnified: bool,
    /// Side panel (`None` unless [`Chrome::Side`]).
    pub side: Option<Rect>,
    /// HUD band above the board (`None` unless [`Chrome::Band`]).
    pub top_bar: Option<Rect>,
    /// Bottom hint line (full content width).
    pub hint: Rect,
    /// True when the window is below [`MIN_COLS`]x[`MIN_ROWS`].
    pub too_small: bool,
    /// Minimums this plan enforces (card copy reads these).
    pub min_cols: u16,
    pub min_rows: u16,
}

/// The plan is the layout; alias kept for call sites that read "plan".
pub type LayoutPlan = Layout;

impl Layout {
    /// True when the board is presented as pixels on this tier.
    pub fn is_pixels(&self) -> bool {
        matches!(self.kind, BoardKind::Image { .. })
    }

    /// Rasterization scale (pixels per tile) for the bitmap tiers.
    pub fn ppt(&self) -> u32 {
        match self.kind {
            BoardKind::Image { ppt } => ppt,
            BoardKind::Cells { .. } => NOMINAL_IMAGE_PPT,
        }
    }
}

/// Internal candidate: one tile scale with the best chrome it can host.
#[derive(Clone, Copy)]
struct Choice {
    cw: u16,
    ch: u16,
    chrome: Chrome,
    content_w: u16,
    content_h: u16,
    area: u32,
    square: u32,
    coverage: u64,
}

fn better(a: &Choice, b: &Choice) -> bool {
    if a.coverage != b.coverage {
        return a.coverage > b.coverage;
    }
    if a.square != b.square {
        return a.square < b.square;
    }
    if a.chrome != b.chrome {
        return a.chrome > b.chrome;
    }
    if a.area != b.area {
        return a.area > b.area;
    }
    a.cw > b.cw
}

/// Fit the canvas into `cols`x`rows` at nominal cell pixels. Pure: call
/// again on every resize.
pub fn compute(cols: u16, rows: u16) -> Layout {
    compute_pixels(cols, rows, None)
}

/// [`compute`] with the detected real cell pixel size: the cell tier uses
/// it to keep tiles square, and the bitmap tier to rasterize at (near)
/// the real cell resolution. `None` falls back to nominal cells.
pub fn compute_with(cols: u16, rows: u16, cell_px: Option<(u16, u16)>) -> Layout {
    compute_pixels(
        cols,
        rows,
        cell_px
            .and_then(|cell| crate::geometry::sane(Some(cell)))
            .map(|cell| PixelGeometry { cell, window: None }),
    )
}

/// [`compute_with`] with the full detected pixel geometry: the cell size
/// keeps tiles square and sets the raster resolution, the window pixel
/// size maps the raster onto its centered cell footprint (issue #656).
/// A missing or insane report falls back to nominal cells exactly like
/// [`compute_with`]; the solver stays total for any caller.
pub fn compute_pixels(cols: u16, rows: u16, px: Option<PixelGeometry>) -> Layout {
    // A zero-sized or out-of-bounds cell report is nonsense; treat it
    // as "no report" so this public solver stays total for any caller
    // (the geometry detector filters first, this keeps direct callers
    // honest too).
    let cell_px = px.and_then(|p| crate::geometry::sane(Some(p.cell)));
    let window_px = px.and_then(|p| {
        cell_px.map(|cell| {
            p.window
                .filter(|&(w, h)| w > 0 && h > 0)
                .unwrap_or((cols as u32 * cell.0 as u32, rows as u32 * cell.1 as u32))
        })
    });
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
            board_px: (0, 0),
            image: Rect {
                x: 0,
                y: 0,
                w: 0,
                h: 0,
            },
            cell_cols: 2,
            cell_rows: 1,
            kind: BoardKind::Cells {
                cell_cols: 2,
                cell_rows: 1,
            },
            chrome: Chrome::Minimal,
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
            min_cols: MIN_COLS,
            min_rows: MIN_ROWS,
        };
    }
    let (cell_w, cell_h) = cell_px.unwrap_or((NOMINAL_CELL_W_PX, NOMINAL_CELL_H_PX));
    let board_w_tiles = WIDTH as u32;
    let board_h_tiles = HEIGHT as u32;
    let window_area = cols as u64 * rows as u64;

    let mut best: Option<Choice> = None;
    // The full documented scale grid: every (cw, ch) in 1..8 x 1..4 is a
    // candidate (with the chrome combinations that fit), so wide-short
    // rooms can reach 7x1 / 8x1 and tall rooms 2x2 / 2x3 instead of
    // being stuck on the derived-aspect diagonal (issue #656).
    for cw in 1..=MAX_CELL_COLS {
        for ch in 1..=MAX_CELL_ROWS {
            let board_w = (board_w_tiles * cw as u32) as u16;
            let board_h = (board_h_tiles * ch as u32) as u16;
            if cols < board_w || rows < board_h + 1 {
                continue;
            }
            let side_fits = cols >= board_w + PANEL_GAP + SIDE_PANEL_COLS;
            let band_fits = rows > board_h + BAND_ROWS;
            for chrome in [Chrome::Side, Chrome::Band, Chrome::Minimal] {
                match chrome {
                    Chrome::Side if !side_fits => continue,
                    Chrome::Band if !band_fits => continue,
                    _ => {}
                }
                let (content_w, content_h) = match chrome {
                    Chrome::Side => (board_w + PANEL_GAP + SIDE_PANEL_COLS, board_h),
                    Chrome::Band => (board_w, board_h + BAND_ROWS),
                    Chrome::Minimal => (board_w, board_h),
                };
                let coverage = (content_w as u64 * (content_h as u64 + 1) * 1000) / window_area;
                let candidate = Choice {
                    cw,
                    ch,
                    chrome,
                    content_w,
                    content_h,
                    area: cw as u32 * ch as u32,
                    square: (cw as u32 * cell_w as u32).abs_diff(ch as u32 * cell_h as u32),
                    coverage,
                };
                if best.as_ref().is_none_or(|b| better(&candidate, b)) {
                    best = Some(candidate);
                }
            }
        }
    }
    // The (2,1) floor always fits at or above the minimum window, so a
    // best is guaranteed; keep a defensive fallback anyway.
    let choice = best.unwrap_or(Choice {
        cw: 2,
        ch: 1,
        chrome: Chrome::Minimal,
        content_w: (board_w_tiles * 2) as u16,
        content_h: board_h_tiles as u16,
        area: 2,
        square: 0,
        coverage: 0,
    });

    let board_w = (board_w_tiles * choice.cw as u32) as u16;
    let board_h = (board_h_tiles * choice.ch as u32) as u16;
    let ox = (cols - choice.content_w) / 2;
    let oy = (rows - (choice.content_h + 1)) / 2;
    let board_y = oy
        + if choice.chrome == Chrome::Band {
            BAND_ROWS
        } else {
            0
        };
    let board = Rect {
        x: ox,
        y: board_y,
        w: board_w,
        h: board_h,
    };
    let side = (choice.chrome == Chrome::Side).then_some(Rect {
        x: ox + board_w + PANEL_GAP,
        y: board_y,
        w: SIDE_PANEL_COLS,
        h: board_h,
    });
    let top_bar = (choice.chrome == Chrome::Band).then_some(Rect {
        x: ox,
        y: oy,
        w: board_w,
        h: BAND_ROWS,
    });
    let hint = Rect {
        x: ox,
        y: oy + choice.content_h,
        w: choice.content_w,
        h: 1,
    };

    // The board's pixel box: the board rect mapped through the detected
    // window pixels ((0, 0) without a report).
    let board_px = match window_px {
        Some((w, h)) => (
            ((w as u64 * board.w as u64) / cols as u64) as u32,
            ((h as u64 * board.h as u64) / rows as u64) as u32,
        ),
        None => (0, 0),
    };

    // Raster scale at (near) the real cell resolution: the smaller of the
    // tile's pixel dimensions, further bounded so the raster's natural
    // size fits the board's pixel box (issue #656: a 20-ppt raster could
    // outgrow its board box and bleed into the hint line), and clamped to
    // 6..20 ppt for encode cost. The clamp bounds (never removes) sprite
    // upscaling where the art exceeds the tile footprint: the 11x11
    // sprite art outgrows the tile even at the nominal 8 ppt.
    let ppt = cell_px.map(|_| {
        let tile_w = choice.cw as u32 * cell_w as u32;
        let tile_h = choice.ch as u32 * cell_h as u32;
        tile_w
            .min(tile_h)
            .min(board_px.0 / WIDTH as u32)
            .min(board_px.1 / HEIGHT as u32)
            .clamp(MIN_IMAGE_PPT, MAX_IMAGE_PPT)
    });
    let kind = match ppt {
        Some(ppt) => BoardKind::Image { ppt },
        None => BoardKind::Cells {
            cell_cols: choice.cw,
            cell_rows: choice.ch,
        },
    };

    // Centered raster footprint in cells: map the raster's pixel size
    // back through the window pixels, capped at the board box (the cap
    // can only bite in the pathological clamp-floor case, and the image
    // must never leave the board).
    let image = match (ppt, window_px) {
        (Some(ppt), Some((w, h))) => {
            let fw = ((WIDTH as u64 * ppt as u64 * cols as u64).div_ceil(w as u64) as u32)
                .clamp(1, board.w as u32) as u16;
            let fh = ((HEIGHT as u64 * ppt as u64 * rows as u64).div_ceil(h as u64) as u32)
                .clamp(1, board.h as u32) as u16;
            Rect {
                x: board.x + (board.w - fw) / 2,
                y: board.y + (board.h - fh) / 2,
                w: fw,
                h: fh,
            }
        }
        _ => board,
    };

    Layout {
        cols,
        rows,
        board,
        board_px,
        image,
        cell_cols: choice.cw,
        cell_rows: choice.ch,
        kind,
        chrome: choice.chrome,
        magnified: (choice.cw, choice.ch) != (2, 1),
        side,
        top_bar,
        hint,
        too_small: false,
        min_cols: MIN_COLS,
        min_rows: MIN_ROWS,
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
        assert_eq!(l.min_cols, 62);
        assert_eq!(l.min_rows, 35);
        assert_eq!(tile_at(&l, 40, 12), None);
    }

    #[test]
    fn minimum_window_fits_compact_board() {
        let l = compute(MIN_COLS, MIN_ROWS);
        assert!(!l.too_small);
        assert!(!l.magnified);
        assert_eq!((l.cell_cols, l.cell_rows), (2, 1));
        assert_eq!(
            l.board,
            Rect {
                x: 3,
                y: 2,
                w: 56,
                h: 31
            }
        );
        assert!(l.top_bar.is_some());
        assert_eq!(l.chrome, Chrome::Band);
        assert!(l.side.is_none());
        assert_eq!(l.hint.y, 33);
        assert_eq!(l.hint.w, 56);
    }

    #[test]
    fn scales_grow_continuously_with_the_window() {
        // Assert the actual continuous scale steps; no fixed 2x1/4x2 jump.
        assert_eq!(
            (compute(62, 35).cell_cols, compute(62, 35).cell_rows),
            (2, 1)
        );
        assert_eq!(
            (compute(100, 40).cell_cols, compute(100, 40).cell_rows),
            (3, 1)
        );
        assert_eq!(
            (compute(170, 64).cell_cols, compute(170, 64).cell_rows),
            (5, 2)
        );
        assert_eq!(
            (compute(200, 100).cell_cols, compute(200, 100).cell_rows),
            (7, 3)
        );
        // And the in-between: 140x70 lands between the pinned steps.
        let mid = compute(140, 70);
        assert!(mid.cell_cols >= 4 && mid.cell_cols < 7);
    }

    #[test]
    fn wide_room_with_panel_room_gets_side_panel() {
        let l = compute(170, 64);
        assert!(!l.too_small);
        assert_eq!(l.chrome, Chrome::Side);
        let side = l.side.expect("side panel");
        assert_eq!(side.x, l.board.x + l.board.w + PANEL_GAP);
        assert!(side.x + side.w <= 170);
        assert!(l.top_bar.is_none());
        // The hint line spans the whole content block.
        assert_eq!(l.hint.w, l.board.w + PANEL_GAP + SIDE_PANEL_COLS);
    }

    #[test]
    fn huge_window_keeps_square_tiles() {
        let l = compute(200, 100);
        assert!(l.magnified);
        assert_eq!((l.cell_cols, l.cell_rows), (7, 3));
        // Nominal cells: tile 56x48 px - closer to square than 64x48.
        let alt = 8 * NOMINAL_CELL_W_PX as u32; // 8x3 candidate width
        let chosen = l.cell_cols as u32 * NOMINAL_CELL_W_PX as u32;
        let chosen_h = l.cell_rows as u32 * NOMINAL_CELL_H_PX as u32;
        assert!(
            chosen.abs_diff(chosen_h) <= alt.abs_diff(3 * NOMINAL_CELL_H_PX as u32),
            "solver picked a less square tile than a same-area alternative"
        );
    }

    #[test]
    fn board_is_centered_and_inside() {
        for (cols, rows) in [(62, 35), (100, 40), (140, 70), (170, 64), (200, 100)] {
            let l = compute(cols, rows);
            assert!(!l.too_small, "{cols}x{rows}");
            assert!(l.board.x + l.board.w <= cols, "{cols}x{rows}");
            assert!(l.board.y + l.board.h <= rows, "{cols}x{rows}");
            assert!(l.hint.y < rows, "{cols}x{rows}");
            assert!(l.hint.x + l.hint.w <= cols, "{cols}x{rows}");
            if let Some(side) = l.side {
                assert!(side.x + side.w <= cols, "{cols}x{rows}");
            }
            if let Some(bar) = l.top_bar {
                assert_eq!(bar.y + bar.h, l.board.y, "{cols}x{rows}");
            }
            assert_eq!(
                l.hint.y,
                l.board.y + l.board.h,
                "{cols}x{rows}: hint sits right under the block"
            );
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
    fn real_cell_pixels_shape_the_scale_and_raster() {
        // Real cells 10x20: same footprint family, raster at real size.
        let l = compute_with(100, 40, Some((10, 20)));
        assert!(l.is_pixels());
        assert_eq!((l.cell_cols, l.cell_rows), (3, 1));
        // Tile is 30x20 px: the raster takes the smaller dimension.
        assert_eq!(l.ppt(), 20);
        // Without a pixel report the plan keeps the proven 8-ppt
        // nominal raster (Phase 1 default, no regression for terminals
        // that cannot report pixel sizes).
        let nominal = compute_with(100, 40, None);
        assert!(!nominal.is_pixels());
        assert_eq!(nominal.ppt(), NOMINAL_IMAGE_PPT);
        assert_eq!(nominal.ppt(), 8);
    }

    #[test]
    fn zero_cell_report_falls_back_to_nominal_without_panicking() {
        let zero = compute_with(100, 40, Some((0, 0)));
        assert_eq!(zero, compute_with(100, 40, None));
        let h_zero = compute_with(62, 35, Some((10, 0)));
        assert!(!h_zero.is_pixels());
        assert_eq!(h_zero.cell_cols, 2);
    }

    #[test]
    fn insane_cell_reports_fall_back_to_nominal() {
        // Non-zero but out-of-bounds reports (the geometry detector's
        // sane bounds are shared with this public solver) must not
        // produce a divergent plan: both degrade to nominal cells.
        for bad in [Some((1, 1)), Some((65, 16))] {
            assert_eq!(
                compute_with(170, 64, bad),
                compute_with(170, 64, None),
                "{bad:?}"
            );
        }
    }

    #[test]
    fn same_aspect_pixel_reports_keep_the_footprint() {
        // The reported cell aspect drives the squareness tie-break; the
        // 170x64 winner (5x2 side panel) fills the window best, so
        // same-aspect reports change only the raster detail, never the
        // plan.
        for cell_px in [None, Some((9, 18)), Some((12, 24))] {
            let l = compute_with(170, 64, cell_px);
            assert_eq!((l.cell_cols, l.cell_rows), (5, 2), "{cell_px:?}");
            assert_eq!(l.board.w, 140, "{cell_px:?}");
        }
        // Square 4x4 cells do not re-fit the footprint either: coverage
        // outranks squareness, and 5x2 still dresses the window far
        // better than the squarer-but-tiny 2x2 (972 vs 486 coverage).
        let square = compute_with(170, 64, Some((4, 4)));
        assert_eq!((square.cell_cols, square.cell_rows), (5, 2));
    }

    #[test]
    fn golden_plans_pin_the_fixed_scale_grid() {
        // Wide-short rooms reach the 7x1/8x1 row of the grid: the old
        // derived-aspect scan could never offer it (issue #656 F1), so
        // 200x60 used to settle on 3x1 and waste most of the window.
        let wide = compute(200, 60);
        assert_eq!((wide.cell_cols, wide.cell_rows), (7, 1));
        assert_eq!(wide.chrome, Chrome::Band);
        assert_eq!(
            wide.board,
            Rect {
                x: 2,
                y: 15,
                w: 196,
                h: 31
            }
        );
        assert_eq!(wide.hint.y, 46);

        // Tall rooms reach the 2x2 footprint the same way: 62x80 used to
        // settle on 2x1 (35% coverage) instead of 2x2 (70%).
        let tall = compute(62, 80);
        assert_eq!((tall.cell_cols, tall.cell_rows), (2, 2));
        assert_eq!(tall.chrome, Chrome::Band);
        assert_eq!(
            tall.board,
            Rect {
                x: 3,
                y: 9,
                w: 56,
                h: 62
            }
        );
        assert_eq!(tall.hint.y, 71);

        // The rest of the checked-in golden set: every row/column family
        // of the 1..8 x 1..4 grid is reachable.
        for (cols, rows, cw, ch, chrome) in [
            (300, 120, 8, 3, Chrome::Side),
            (300, 40, 8, 1, Chrome::Side),
            (64, 90, 2, 2, Chrome::Band),
            (144, 66, 5, 2, Chrome::Band),
            (137, 84, 4, 2, Chrome::Band),
            (100, 200, 3, 4, Chrome::Band),
        ] {
            let l = compute(cols, rows);
            assert_eq!(
                (l.cell_cols, l.cell_rows, l.chrome),
                (cw, ch, chrome),
                "{cols}x{rows}"
            );
        }

        // Chrome-aware tie: at 143x64 the 4x2 side-panel plan covers the
        // same content area as 5x2 minimal (140x62) with perfectly
        // square tiles, so it wins.
        let tie = compute(143, 64);
        assert_eq!((tie.cell_cols, tie.cell_rows), (4, 2));
        assert_eq!(tie.chrome, Chrome::Side);
    }

    #[test]
    fn coverage_sweep_never_leaves_rooms_hollow() {
        // Regression sweep for issue #656 F1: across the ordinary window
        // range every plan must dress a large share of the window with
        // board cells. The measured floor of the fixed solver is 280/1000
        // (28%) at 399x62; the old solver hit 217/1000 at 200x60.
        let mut checked = 0u32;
        for cols in MIN_COLS..=400 {
            for rows in MIN_ROWS..=120 {
                let l = compute(cols, rows);
                assert!(!l.too_small, "{cols}x{rows}");
                let area = cols as u64 * rows as u64;
                let cov = l.board.w as u64 * l.board.h as u64 * 1000 / area;
                assert!(
                    cov >= 270,
                    "{cols}x{rows}: board covers only {cov}/1000 of the window"
                );
                assert!(l.board.x + l.board.w <= cols, "{cols}x{rows}");
                assert!(l.board.y + l.board.h <= rows, "{cols}x{rows}");
                assert!(l.image.x >= l.board.x && l.image.y >= l.board.y);
                assert!(l.image.x + l.image.w <= l.board.x + l.board.w);
                assert!(l.image.y + l.image.h <= l.board.y + l.board.h);
                checked += 1;
            }
        }
        assert!(checked >= 29_000, "sweep shrank: {checked}");
    }

    #[test]
    fn window_pixels_map_the_raster_onto_a_centered_footprint() {
        // xterm with a 604x524 px window at 100x40 (real cells 6.04x13.1,
        // detected as 7x14): the 13-ppt raster (364x403 px) fits the
        // board's 507x406 px box and lands centered at (19, 5).
        let l = compute_pixels(
            100,
            40,
            Some(PixelGeometry {
                cell: (7, 14),
                window: Some((604, 524)),
            }),
        );
        assert!(l.is_pixels());
        assert_eq!((l.cell_cols, l.cell_rows), (3, 1));
        assert_eq!(l.ppt(), 13);
        assert_eq!(l.board_px, (507, 406));
        assert!(WIDTH as u32 * l.ppt() <= l.board_px.0);
        assert!(HEIGHT as u32 * l.ppt() <= l.board_px.1);
        assert_eq!(
            l.image,
            Rect {
                x: 19,
                y: 5,
                w: 61,
                h: 31
            }
        );
        let left = l.image.x - l.board.x;
        let right = l.board.x + l.board.w - l.image.x - l.image.w;
        assert!(right.abs_diff(left) <= 1, "kept centered: {left}/{right}");

        // Without a pixel report the image is the full board box (the
        // Phase 1 stretch) and the board pixel box stays zero.
        let nominal = compute(170, 64);
        assert_eq!(nominal.image, nominal.board);
        assert_eq!(nominal.board_px, (0, 0));

        // Cell-only reports derive the window as cols x cell.
        let derived = compute_pixels(
            170,
            64,
            Some(PixelGeometry {
                cell: (4, 4),
                window: None,
            }),
        );
        assert_eq!(derived.board_px, (560, 248));
        assert_eq!(derived.ppt(), 8);
        assert_eq!(
            derived.image,
            Rect {
                x: 43,
                y: 0,
                w: 56,
                h: 62
            }
        );
    }

    #[test]
    fn raster_always_fits_the_board_pixel_box() {
        // Whatever plausible pixel geometry a terminal reports, the
        // raster's natural size never exceeds the board's pixel box and
        // the image footprint stays inside the board (issue #656 F2).
        for (cols, rows) in [
            (62, 35),
            (100, 40),
            (143, 64),
            (200, 60),
            (62, 80),
            (200, 100),
            (300, 120),
        ] {
            for cell in [(3, 6), (4, 4), (4, 8), (7, 14), (8, 8), (10, 20), (32, 64)] {
                for (wx, wy) in [
                    (cols as u32 * cell.0 as u32, rows as u32 * cell.1 as u32),
                    (
                        cols as u32 * cell.0 as u32 + 3,
                        rows as u32 * cell.1 as u32 + 7,
                    ),
                ] {
                    let l = compute_pixels(
                        cols,
                        rows,
                        Some(PixelGeometry {
                            cell,
                            window: Some((wx, wy)),
                        }),
                    );
                    assert!(l.is_pixels(), "{cols}x{rows} {cell:?}");
                    let raster = (WIDTH as u32 * l.ppt(), HEIGHT as u32 * l.ppt());
                    let min_raster = (MIN_IMAGE_PPT * WIDTH as u32, MIN_IMAGE_PPT * HEIGHT as u32);
                    if l.board_px.0 >= min_raster.0 && l.board_px.1 >= min_raster.1 {
                        assert!(
                            raster.0 <= l.board_px.0 && raster.1 <= l.board_px.1,
                            "{cols}x{rows} {cell:?} {wx}x{wy}: raster {raster:?} > board px {:?}",
                            l.board_px
                        );
                    } else {
                        // A physically absurd report (e.g. 4x4 px cells at
                        // 62x35 means a 248x140 px window) cannot host
                        // even the legibility-floor raster; the floor
                        // wins and the plan stays otherwise sane.
                        assert_eq!(raster, min_raster, "{cols}x{rows} {cell:?}");
                    }
                    assert!(l.image.w > 0 && l.image.h > 0);
                    assert!(l.image.x >= l.board.x && l.image.y >= l.board.y);
                    assert!(l.image.x + l.image.w <= l.board.x + l.board.w);
                    assert!(l.image.y + l.image.h <= l.board.y + l.board.h);
                }
            }
        }
    }

    #[test]
    fn resize_recomputes_cleanly() {
        // Dynamic resize path: recompute must stay consistent across a
        // sweep of sizes, including degenerate ones.
        for cols in (0..200).step_by(7) {
            for rows in (0..80).step_by(5) {
                let l = compute(cols, rows);
                if l.too_small {
                    assert!(cols < MIN_COLS || rows < MIN_ROWS);
                } else {
                    assert!(l.board.w > 0 && l.board.h > 0);
                    assert!(l.board.x + l.board.w <= cols);
                    assert!(l.board.y + l.board.h <= rows);
                }
            }
        }
    }
}
