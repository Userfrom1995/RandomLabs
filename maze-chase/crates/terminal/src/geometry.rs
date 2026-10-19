//! Real terminal geometry: window size plus the cell pixel size.
//!
//! Dynamic layout needs to know how large one terminal cell is in physical
//! pixels: the cell tier uses it to keep tile glyphs square at any scale,
//! and the bitmap tiers use it to rasterize at (close to) the real cell
//! pixel size instead of a fixed nominal 8x16, which is what made pixel
//! frames blurry on terminals whose cells are not exactly nominal
//! (issue #673).
//!
//! Detection is best-effort and read-only: the `TIOCGWINSZ` pixel fields
//! on Unix (`ws_xpixel`/`ws_ypixel`, filled by Kitty, WezTerm, Ghostty,
//! and configured xterm) and `GetCurrentConsoleFontEx` on Windows. When
//! the terminal does not report pixels, the caller falls back to nominal
//! cells and the cell tier keeps working; nothing here ever fails a run.

/// Which kind of board surface the terminal can present.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum RenderKind {
    /// Unicode text cells (all terminals).
    Cells,
    /// Pixel graphics (Kitty or Sixel tiers).
    Pixels,
}

/// Detected terminal geometry for one window size.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub struct Geometry {
    pub cols: u16,
    pub rows: u16,
    /// Physical pixel size of one cell, when the terminal reports it.
    pub cell_px: Option<(u16, u16)>,
    pub kind: RenderKind,
}

/// Physical pixel geometry of one window: the cell size a terminal
/// reports (already sanity-checked) plus the whole window's pixel size
/// when the source can report it.
///
/// Unix `TIOCGWINSZ` fills both fields; the Windows console font API
/// only knows the cell, so `window` stays `None` there and the layout
/// derives it from `cols x cell` / `rows x cell`.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub struct PixelGeometry {
    /// Physical size of one cell.
    pub cell: (u16, u16),
    /// Whole-window physical size, when reported.
    pub window: Option<(u32, u32)>,
}

impl PixelGeometry {
    /// Window pixel size for a `cols`x`rows` window: the reported size
    /// when available, `cols x cell` / `rows x cell` otherwise. A
    /// zero-sized report is nonsense and falls back like a missing one,
    /// matching the layout solver's own filter.
    pub fn window_px(&self, cols: u16, rows: u16) -> (u32, u32) {
        self.window.filter(|&(w, h)| w > 0 && h > 0).unwrap_or((
            cols as u32 * self.cell.0 as u32,
            rows as u32 * self.cell.1 as u32,
        ))
    }
}

/// Nominal fallback cell size in pixels (roughly 1:2, like most fonts).
pub const NOMINAL_CELL_W_PX: u16 = 8;
pub const NOMINAL_CELL_H_PX: u16 = 16;

/// Sanity bounds for reported cell sizes: outside these, a terminal is
/// reporting something we cannot trust and nominal cells are safer.
const MIN_CELL_W_PX: u16 = 2;
const MAX_CELL_W_PX: u16 = 64;
const MIN_CELL_H_PX: u16 = 4;
const MAX_CELL_H_PX: u16 = 128;

/// Shared by the geometry detector, [`Geometry::new`], and the public
/// layout solver (`layout::compute_with`), so every caller enforces the
/// same bounds on a reported cell size.
pub(crate) fn sane(cell_px: Option<(u16, u16)>) -> Option<(u16, u16)> {
    match cell_px {
        Some((w, h))
            if (MIN_CELL_W_PX..=MAX_CELL_W_PX).contains(&w)
                && (MIN_CELL_H_PX..=MAX_CELL_H_PX).contains(&h) =>
        {
            Some((w, h))
        }
        _ => None,
    }
}

impl Geometry {
    /// Geometry for `cols`x`rows` with an optional detected cell size.
    /// `kind` is decided by [`Geometry::new`]: a sane report selects
    /// [`RenderKind::Pixels`], anything else [`RenderKind::Cells`].
    pub fn new(cols: u16, rows: u16, cell_px: Option<(u16, u16)>) -> Self {
        let cell_px = sane(cell_px);
        Self {
            cols,
            rows,
            cell_px,
            kind: if cell_px.is_some() {
                RenderKind::Pixels
            } else {
                RenderKind::Cells
            },
        }
    }

    /// Cell size for rasterization: detected when available, nominal
    /// otherwise.
    pub fn cell_px_or_nominal(&self) -> (u16, u16) {
        self.cell_px
            .unwrap_or((NOMINAL_CELL_W_PX, NOMINAL_CELL_H_PX))
    }

    /// True when the terminal reported a physical cell size.
    pub fn pixels_known(&self) -> bool {
        self.cell_px.is_some()
    }
}

/// Query the active terminal's pixel geometry, best-effort.
///
/// Uses stdout when it is a terminal (the surface the game paints); a
/// piped or redirected stdout reports nothing and the caller falls back
/// to nominal cells.
pub fn detect_pixels() -> Option<PixelGeometry> {
    #[cfg(unix)]
    {
        use std::io::IsTerminal;
        use std::os::fd::AsRawFd;
        if !std::io::stdout().is_terminal() {
            return None;
        }
        let fd = std::io::stdout().as_raw_fd();
        pixels_from_fd(fd)
    }
    #[cfg(windows)]
    {
        use std::io::IsTerminal;
        if !std::io::stdout().is_terminal() {
            return None;
        }
        cell_px_from_console().map(|cell| PixelGeometry { cell, window: None })
    }
    #[cfg(not(any(unix, windows)))]
    {
        None
    }
}

/// Query the active terminal's cell pixel size, best-effort (cell-only
/// convenience wrapper over [`detect_pixels`]).
pub fn detect_cell_px() -> Option<(u16, u16)> {
    detect_pixels().map(|p| p.cell)
}

/// Pixel geometry from a `TIOCGWINSZ` query on `fd` (Unix).
///
/// The pixel fields are only meaningful as a pair; a terminal that
/// reports zeroes there does not know its pixel size (common on plain
/// PTYs and serial lines), so `None` is the honest answer.
#[cfg(unix)]
pub fn pixels_from_fd(fd: std::os::fd::RawFd) -> Option<PixelGeometry> {
    let mut ws: libc::winsize = unsafe { std::mem::zeroed() };
    let rc = unsafe { libc::ioctl(fd, libc::TIOCGWINSZ as _, &mut ws as *mut libc::winsize) };
    if rc != 0 || ws.ws_xpixel == 0 || ws.ws_ypixel == 0 || ws.ws_col == 0 || ws.ws_row == 0 {
        return None;
    }
    // Derived per-cell size rounds up so the reported window pixel size
    // is always covered by cols x cell_w.
    let cell = sane(Some((
        ws.ws_xpixel.div_ceil(ws.ws_col),
        ws.ws_ypixel.div_ceil(ws.ws_row),
    )))?;
    Some(PixelGeometry {
        cell,
        window: Some((ws.ws_xpixel as u32, ws.ws_ypixel as u32)),
    })
}

/// Cell pixel size from a `TIOCGWINSZ` query on `fd` (Unix).
#[cfg(unix)]
pub fn cell_px_from_fd(fd: std::os::fd::RawFd) -> Option<(u16, u16)> {
    pixels_from_fd(fd).map(|p| p.cell)
}

/// Cell pixel size from the console font info (Windows), best-effort.
///
/// `GetCurrentConsoleFontEx` reports the face's font size, which is the
/// raster cell size for console bitmap fonts and a good approximation
/// for TrueType faces in the console. Failures degrade to `None`.
#[cfg(windows)]
pub fn cell_px_from_console() -> Option<(u16, u16)> {
    use windows_sys::Win32::System::Console::{
        GetCurrentConsoleFontEx, GetStdHandle, CONSOLE_FONT_INFOEX, STD_OUTPUT_HANDLE,
    };
    let handle = unsafe { GetStdHandle(STD_OUTPUT_HANDLE) };
    if handle.is_null() {
        return None;
    }
    let mut font: CONSOLE_FONT_INFOEX = unsafe { std::mem::zeroed() };
    font.cbSize = std::mem::size_of::<CONSOLE_FONT_INFOEX>() as u32;
    let ok = unsafe { GetCurrentConsoleFontEx(handle, 0, &mut font) };
    if ok == 0 {
        return None;
    }
    sane(Some((font.dwFontSize.X as u16, font.dwFontSize.Y as u16)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn nominal_fallback_when_pixels_unknown() {
        let g = Geometry::new(100, 40, None);
        assert_eq!(g.kind, RenderKind::Cells);
        assert!(!g.pixels_known());
        assert_eq!(g.cell_px_or_nominal(), (8, 16));
    }

    #[test]
    fn detected_pixels_select_the_pixel_kind() {
        let g = Geometry::new(100, 40, Some((10, 20)));
        assert_eq!(g.kind, RenderKind::Pixels);
        assert_eq!(g.cell_px_or_nominal(), (10, 20));
    }

    #[test]
    fn insane_reports_fall_back_to_nominal() {
        for bad in [
            Some((0, 20)),
            Some((10, 0)),
            Some((1, 16)),
            Some((200, 16)),
            Some((10, 500)),
        ] {
            let g = Geometry::new(80, 24, bad);
            assert_eq!(g.kind, RenderKind::Cells, "{bad:?}");
            assert_eq!(g.cell_px_or_nominal(), (8, 16), "{bad:?}");
        }
    }

    #[cfg(unix)]
    #[test]
    fn pty_without_pixel_fields_reports_none() {
        // A pipe is not a tty at all; detection must be a clean None.
        let mut fds = [0i32; 2];
        assert_eq!(unsafe { libc::pipe(fds.as_mut_ptr()) }, 0);
        assert_eq!(cell_px_from_fd(fds[0]), None);
        assert_eq!(pixels_from_fd(fds[0]), None);
        unsafe {
            libc::close(fds[0]);
            libc::close(fds[1]);
        }
    }

    #[cfg(unix)]
    #[test]
    fn pty_pixel_fields_shape_the_geometry() {
        use std::os::fd::{AsRawFd, FromRawFd, OwnedFd};
        // A real PTY with TIOCSWINSZ pixel fields: the cell size derives
        // by rounding up and the window size is reported verbatim.
        //
        // The slave must be open before the ioctl: macOS rejects
        // TIOCSWINSZ on a master with no attached slave (ENOTTY), the
        // same discipline every integration harness already follows.
        // `OwnedFd` closes both fds even when an assertion panics.
        unsafe {
            let master = libc::posix_openpt(libc::O_RDWR | libc::O_NOCTTY);
            assert!(master >= 0, "posix_openpt failed");
            let master = OwnedFd::from_raw_fd(master);
            assert_eq!(libc::grantpt(master.as_raw_fd()), 0, "grantpt failed");
            assert_eq!(libc::unlockpt(master.as_raw_fd()), 0, "unlockpt failed");
            let name = libc::ptsname(master.as_raw_fd());
            assert!(!name.is_null(), "ptsname failed");
            let slave = libc::open(name, libc::O_RDWR | libc::O_NOCTTY);
            assert!(slave >= 0, "open slave failed");
            let _slave = OwnedFd::from_raw_fd(slave);
            let ws = libc::winsize {
                ws_row: 40,
                ws_col: 100,
                ws_xpixel: 604,
                ws_ypixel: 524,
            };
            assert_eq!(
                libc::ioctl(
                    master.as_raw_fd(),
                    libc::TIOCSWINSZ as _,
                    &ws as *const libc::winsize
                ),
                0,
                "TIOCSWINSZ failed"
            );
            let geom = pixels_from_fd(master.as_raw_fd()).expect("pixel fields present");
            assert_eq!(geom.cell, (7, 14)); // ceil(604/100), ceil(524/40)
            assert_eq!(geom.window, Some((604, 524)));
            assert_eq!(geom.window_px(100, 40), (604, 524));
            let mut zero = ws;
            zero.ws_xpixel = 0;
            zero.ws_ypixel = 0;
            assert_eq!(
                libc::ioctl(
                    master.as_raw_fd(),
                    libc::TIOCSWINSZ as _,
                    &zero as *const libc::winsize
                ),
                0,
                "TIOCSWINSZ failed"
            );
            assert_eq!(pixels_from_fd(master.as_raw_fd()), None);
        }
    }

    #[test]
    fn window_px_falls_back_to_cols_times_cell() {
        let derived = PixelGeometry {
            cell: (8, 16),
            window: None,
        };
        assert_eq!(derived.window_px(100, 40), (800, 640));
        let reported = PixelGeometry {
            cell: (7, 14),
            window: Some((604, 524)),
        };
        assert_eq!(reported.window_px(100, 40), (604, 524));
        // A zero-sized report is as good as none (the solver's filter
        // treats it the same way).
        let zero = PixelGeometry {
            cell: (8, 16),
            window: Some((0, 0)),
        };
        assert_eq!(zero.window_px(100, 40), (800, 640));
        let half_zero = PixelGeometry {
            cell: (8, 16),
            window: Some((0, 524)),
        };
        assert_eq!(half_zero.window_px(100, 40), (800, 640));
    }
}
