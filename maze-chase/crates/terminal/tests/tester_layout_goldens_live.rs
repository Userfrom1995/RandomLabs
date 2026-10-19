//! Live full-grid and centered-raster coverage for the issue #656 fix
//! (round re-verification by the Tester):
//!
//! 1. `live_kitty_goldens_cover_wide_and_tall_rooms` - the two plans the
//!    F1 fix exists for, driven through the shipped binary on a real PTY:
//!    200x60 settles on the 7x1 wide band (board 196x31 at (2, 15)) and
//!    62x80 on the 2x2 tall band (board 56x62 at (3, 9)). The exact Kitty
//!    display footprint and the centered cursor position are pinned from
//!    the wire bytes, and the `MAZE_CHASE_TRACE` plan record must carry
//!    the new pixel/image fields the fix added.
//! 2. `live_resize_walk_matches_the_pure_solver` - one session walked
//!    across every column and row family of the 2..8 x 1..4 scale grid
//!    plus the documented 399x62 coverage-floor case; each settled
//!    frame's display footprint and cursor must equal the pure solver's
//!    `image` rect for that size, so the binary and the layout crate can
//!    never diverge on any reachable plan.
//! 3. `live_pixel_reports_map_the_raster_onto_the_solver_footprint` -
//!    real TIOCGWINSZ pixel reports on the live PTY: the wire footprint
//!    and cursor must equal the in-process solver's `image` rect for a
//!    wide golden, a tall golden, the documented tiny-pixel-window case
//!    where the 6-ppt legibility floor wins, and the 80x63 / 8x6-cell
//!    case where the 2x1 compact floor must keep the plan at two columns
//!    per tile; the Sixel tier must paint from the same centered origin
//!    when pixels are reported and from the board origin (natural size)
//!    when they are not.
#![cfg(unix)]

use std::io::{Read, Write};
use std::os::fd::{AsRawFd, FromRawFd, OwnedFd};
use std::os::unix::process::CommandExt;
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

use maze_chase_terminal::geometry::PixelGeometry;
use maze_chase_terminal::layout;

/// Band/hint playing surfaces carry this marker.
const HINT_MARKER: &str = "Arrows/WASD move";
/// Wide 170x64 playing surface: side panel with this marker.
const SIDE_MARKER: &str = "move: arrows/WASD";

struct Pty {
    master: std::fs::File,
    slave: std::fs::File,
}

/// Serializes the MT-Unsafe `ptsname` static buffer across the parallel
/// test threads in this binary (`ptsname_r` is ENOTSUP on macOS).
static PTSNAME_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());

fn open_pty(cols: u16, rows: u16, xpix: u16, ypix: u16) -> Pty {
    unsafe {
        let master = libc::posix_openpt(libc::O_RDWR | libc::O_NOCTTY);
        assert!(master >= 0, "posix_openpt failed");
        assert_eq!(libc::grantpt(master), 0, "grantpt failed");
        assert_eq!(libc::unlockpt(master), 0, "unlockpt failed");
        let slave = {
            let _guard = PTSNAME_LOCK.lock().unwrap();
            let name = libc::ptsname(master);
            assert!(!name.is_null(), "ptsname failed");
            libc::open(name, libc::O_RDWR | libc::O_NOCTTY)
        };
        assert!(slave >= 0, "open slave failed");
        let ws = libc::winsize {
            ws_row: rows,
            ws_col: cols,
            ws_xpixel: xpix,
            ws_ypixel: ypix,
        };
        assert_eq!(
            libc::ioctl(master, libc::TIOCSWINSZ as _, &ws as *const libc::winsize),
            0,
            "TIOCSWINSZ failed"
        );
        let master = std::fs::File::from(OwnedFd::from_raw_fd(master));
        let flags = libc::fcntl(master.as_raw_fd(), libc::F_GETFL);
        assert_ne!(flags, -1, "F_GETFL failed");
        assert_ne!(
            libc::fcntl(master.as_raw_fd(), libc::F_SETFL, flags | libc::O_NONBLOCK),
            -1,
            "F_SETFL failed"
        );
        Pty {
            master,
            slave: std::fs::File::from(OwnedFd::from_raw_fd(slave)),
        }
    }
}

fn set_winsize(master: &std::fs::File, cols: u16, rows: u16, xpix: u16, ypix: u16) {
    let ws = libc::winsize {
        ws_row: rows,
        ws_col: cols,
        ws_xpixel: xpix,
        ws_ypixel: ypix,
    };
    unsafe {
        assert_eq!(
            libc::ioctl(
                master.as_raw_fd(),
                libc::TIOCSWINSZ as _,
                &ws as *const libc::winsize
            ),
            0,
            "TIOCSWINSZ failed"
        );
    }
}

fn send_signal(pid: u32, signal: i32) {
    let rc = unsafe { libc::kill(pid as libc::pid_t, signal) };
    assert_eq!(rc, 0, "kill({pid}, {signal}) failed");
}

fn drain(master: &mut std::fs::File, out: &mut Vec<u8>) {
    let mut buf = [0u8; 4096];
    loop {
        match master.read(&mut buf) {
            Ok(0) => break,
            Ok(n) => out.extend_from_slice(&buf[..n]),
            Err(e) if e.kind() == std::io::ErrorKind::Interrupted => continue,
            Err(_) => break,
        }
    }
}

/// Reap a killed PTY child without ever blocking the suite.
///
/// A child SIGKILLed while blocked writing to a full PTY master stays
/// unreapable on macOS until the pending write completes, so the old
/// `kill(); wait()` dropped straight into a hung `Child::wait` (issue
/// #656 macOS arm). Draining the non-blocking master lets the write
/// finish and the kill land; the bounded loop can never hang a suite
/// even if a platform never reaps.
fn reap(child: &mut Child, master: &mut std::fs::File, out: &mut Vec<u8>) {
    let deadline = Instant::now() + Duration::from_secs(5);
    loop {
        drain(master, out);
        match child.try_wait() {
            Ok(Some(_)) | Err(_) => return,
            Ok(None) => {}
        }
        if Instant::now() >= deadline {
            return;
        }
        std::thread::sleep(Duration::from_millis(10));
    }
}

/// Count occurrences of `needle` in `hay` that were not already counted
/// by a previous call with `from` equal to the then-current `hay.len()`.
///
/// The search starts up to `needle.len() - 1` bytes before `from` and
/// counts every match that ends after `from`: a needle split across two
/// drains is counted exactly once, on the call where its final byte
/// arrives, and a match fully present before `from` is never re-counted.
fn count_from(hay: &[u8], needle: &[u8], from: usize) -> usize {
    if needle.is_empty() || hay.len() < needle.len() {
        return 0;
    }
    let start = from.saturating_sub(needle.len() - 1);
    let mut count = 0;
    let mut i = start;
    while i + needle.len() <= hay.len() {
        if &hay[i..i + needle.len()] == needle {
            if i + needle.len() > from {
                count += 1;
            }
            i += needle.len();
        } else {
            i += 1;
        }
    }
    count
}

#[test]
fn count_from_counts_straddled_needles_exactly_once() {
    let needle = b"FRAME";
    let mut out = b"xxFR".to_vec();
    assert_eq!(count_from(&out, needle, 0), 0, "no complete needle yet");
    out.extend_from_slice(b"AMEyyFR");
    assert_eq!(
        count_from(&out, needle, 4),
        1,
        "a needle split across drains is counted when its final byte lands"
    );
    assert_eq!(
        count_from(&out, needle, out.len()),
        0,
        "an already-counted needle is never re-counted"
    );
    out.extend_from_slice(b"AME");
    assert_eq!(
        count_from(&out, needle, 11),
        1,
        "the second straddled needle is counted exactly once"
    );
    assert_eq!(count_from(&out, needle, out.len()), 0);
}

fn wait_for(
    master: &mut std::fs::File,
    out: &mut Vec<u8>,
    pred: impl Fn(&[u8]) -> bool,
    timeout: Duration,
) -> bool {
    let deadline = Instant::now() + timeout;
    loop {
        drain(master, out);
        if pred(out) {
            return true;
        }
        let remaining = deadline.saturating_duration_since(Instant::now());
        if remaining.is_zero() {
            return false;
        }
        let mut pfd = libc::pollfd {
            fd: master.as_raw_fd(),
            events: libc::POLLIN,
            revents: 0,
        };
        let ms = remaining.as_millis().min(50) as i32;
        unsafe { libc::poll(&mut pfd, 1, ms) };
    }
}

fn tail(bytes: &[u8]) -> String {
    let text: Vec<char> = String::from_utf8_lossy(bytes).chars().collect();
    let start = text.len().saturating_sub(400);
    text[start..].iter().collect()
}

/// True when `bytes` carries a Kitty display escape with the exact
/// `r=`/`c=` footprint whose immediately preceding cursor move is
/// `(row, col)` (1-based). Every frame re-displays the image, so this
/// settles as soon as one complete fresh frame has landed; stale frames
/// from a previous plan with the same footprint can never pass the
/// cursor check.
fn display_at(bytes: &[u8], rows: u32, cols: u32, cursor: (u16, u16)) -> bool {
    let text = String::from_utf8_lossy(bytes).into_owned();
    let dims = format!("\x1b_Ga=T,f=100,r={rows},c={cols}");
    let want = format!("\x1b[{};{}H", cursor.0, cursor.1);
    let mut from = 0;
    while let Some(i) = text[from..].find(&dims) {
        let i = from + i;
        let head = &text[i.saturating_sub(96)..i];
        if let Some(esc) = head.rfind("\x1b[") {
            let tail = &head[esc..];
            if let Some(end) = tail.find('H') {
                if tail[..=end] == want {
                    return true;
                }
            }
        }
        from = i + dims.len();
    }
    false
}

struct Session {
    pty: Pty,
    child: Child,
    dir: std::path::PathBuf,
    out: Vec<u8>,
    xpix: u16,
    ypix: u16,
}

impl Session {
    fn start(
        tag: &str,
        cols: u16,
        rows: u16,
        xpix: u16,
        ypix: u16,
        tier: &str,
        trace: Option<&std::path::Path>,
    ) -> Self {
        let pty = open_pty(cols, rows, xpix, ypix);
        let dir = std::env::temp_dir().join(format!(
            "maze-chase-goldens-{tag}-{}-{}",
            std::process::id(),
            cols
        ));
        let _ = std::fs::remove_dir_all(&dir);
        let mut cmd = Command::new(env!("CARGO_BIN_EXE_maze-chase-terminal"));
        cmd.arg("--dir")
            .arg(&dir)
            .arg("--tier")
            .arg(tier)
            .env(
                "TERM",
                if tier == "kitty" {
                    "xterm-kitty"
                } else {
                    "xterm-256color"
                },
            )
            .env_remove("MAZE_CHASE_TIER")
            .stdin(Stdio::from(pty.slave.try_clone().unwrap()))
            .stdout(Stdio::from(pty.slave.try_clone().unwrap()))
            .stderr(Stdio::from(pty.slave.try_clone().unwrap()));
        if let Some(path) = trace {
            cmd.env("MAZE_CHASE_TRACE", path);
        }
        let ctl_fd = pty.slave.as_raw_fd();
        unsafe {
            cmd.pre_exec(move || {
                if libc::setsid() == -1 {
                    return Err(std::io::Error::last_os_error());
                }
                if libc::ioctl(ctl_fd, libc::TIOCSCTTY as _, 0) == -1 {
                    return Err(std::io::Error::last_os_error());
                }
                Ok(())
            });
        }
        let child = cmd.spawn().expect("spawn maze-chase-terminal");
        Self {
            pty,
            child,
            dir,
            out: Vec::new(),
            xpix,
            ypix,
        }
    }

    fn wait(&mut self, needle: &str, timeout: Duration) -> bool {
        wait_for(
            &mut self.pty.master,
            &mut self.out,
            |out| String::from_utf8_lossy(out).contains(needle),
            timeout,
        )
    }

    fn wait_display(
        &mut self,
        rows: u32,
        cols: u32,
        cursor: (u16, u16),
        timeout: Duration,
    ) -> bool {
        wait_for(
            &mut self.pty.master,
            &mut self.out,
            |out| display_at(out, rows, cols, cursor),
            timeout,
        )
    }

    fn reach_playing(&mut self, marker: &str) {
        assert!(
            self.wait("video tier:", Duration::from_secs(15)),
            "title screen never appeared; tail: {}",
            tail(&self.out)
        );
        (&self.pty.master).write_all(b"\r").unwrap();
        assert!(
            self.wait(marker, Duration::from_secs(10)),
            "Enter did not reach the playing surface ({marker}); tail: {}",
            tail(&self.out)
        );
    }

    fn clear_output(&mut self) {
        drain(&mut self.pty.master, &mut self.out);
        self.out.clear();
    }

    /// Wait until at least `want` display escapes for the exact `rows`x`cols`
    /// footprint have been observed, up to `timeout`.
    ///
    /// The drain is wire-speed: the master is polled (no fixed sleep) and
    /// read until EAGAIN, so a small PTY buffer (macOS) transfers frames as
    /// fast as the game produces them instead of at a 4 KiB per 20 ms
    /// cadence. Matches are counted incrementally as bytes arrive, so the
    /// growing session buffer is never re-scanned from the start. The
    /// bounded deadline makes a genuinely stalled frame stream a failure,
    /// never a hang.
    fn wait_displays(&mut self, rows: u32, cols: u32, want: usize, timeout: Duration) -> bool {
        let needle = format!("\x1b_Ga=T,f=100,r={rows},c={cols},");
        let needle = needle.as_bytes();
        let deadline = Instant::now() + timeout;
        let mut found = 0usize;
        let mut scanned = 0usize;
        loop {
            drain(&mut self.pty.master, &mut self.out);
            found += count_from(&self.out, needle, scanned);
            scanned = self.out.len();
            if found >= want {
                return true;
            }
            let remaining = deadline.saturating_duration_since(Instant::now());
            if remaining.is_zero() {
                return false;
            }
            let mut pfd = libc::pollfd {
                fd: self.pty.master.as_raw_fd(),
                events: libc::POLLIN,
                revents: 0,
            };
            let ms = remaining.as_millis().min(50) as i32;
            unsafe { libc::poll(&mut pfd, 1, ms) };
        }
    }

    fn resize(&mut self, cols: u16, rows: u16) {
        set_winsize(&self.pty.master, cols, rows, self.xpix, self.ypix);
        send_signal(self.child.id(), libc::SIGWINCH);
    }

    fn alive(&mut self) -> bool {
        self.child.try_wait().expect("try_wait").is_none()
    }

    fn assert_no_panic(&self) {
        let text = String::from_utf8_lossy(&self.out);
        assert!(
            !text.contains("panicked"),
            "the binary panicked; tail: {}",
            tail(&self.out)
        );
    }
}

impl Drop for Session {
    fn drop(&mut self) {
        let _ = self.child.kill();
        reap(&mut self.child, &mut self.pty.master, &mut self.out);
        let _ = std::fs::remove_dir_all(&self.dir);
    }
}

fn plan_records(trace: &std::path::Path) -> Vec<String> {
    let raw = std::fs::read_to_string(trace).expect("trace file written");
    raw.lines()
        .filter(|l| l.contains("\"kind\":\"plan\""))
        .map(str::to_string)
        .collect()
}

/// The F1 fix exists for exactly these two rooms: 200x60 must reach the
/// 7x1 wide band (196x31 board) and 62x80 the 2x2 tall band (56x62), on
/// the live wire, with the centered cursor at the board/image origin and
/// the trace plan record carrying the new pixel fields.
#[test]
fn live_kitty_goldens_cover_wide_and_tall_rooms() {
    // 200x60: the old solver stranded this at 21.7% board coverage; the
    // full-grid scan lands on 7x1 band, board (2, 15, 196, 31).
    let wide_trace = std::env::temp_dir().join(format!(
        "maze-chase-goldens-wide-{}.jsonl",
        std::process::id()
    ));
    let _ = std::fs::remove_file(&wide_trace);
    let mut wide = Session::start("wide", 200, 60, 0, 0, "kitty", Some(&wide_trace));
    wide.reach_playing(HINT_MARKER);
    assert!(
        wide.wait_display(31, 196, (16, 3), Duration::from_secs(10)),
        "200x60 never painted the 7x1 band footprint r=31,c=196 at cursor (16,3); tail: {}",
        tail(&wide.out)
    );
    assert!(
        !String::from_utf8_lossy(&wide.out).contains("\x1b_Ga=T,f=100,r=31,c=84"),
        "the pre-fix 3x1 plan's 84-wide footprint must not be on the wire at 200x60"
    );
    let plans = plan_records(&wide_trace);
    assert!(
        plans
            .iter()
            .any(|p| p.contains("\"cell_cols\":7,\"cell_rows\":1")
                && p.contains("\"chrome\":\"band\"")),
        "the 200x60 trace plan must record the 7x1 band plan: {plans:?}"
    );
    assert!(
        plans.iter().any(|p| p.contains("\"img_w\":196")
            && p.contains("\"img_h\":31")
            && p.contains("\"board_px_w\":0")
            && p.contains("\"board_px_h\":0")),
        "the plan record must carry the new image and pixel fields: {plans:?}"
    );
    wide.assert_no_panic();
    let _ = std::fs::remove_file(&wide_trace);

    // 62x80: the old solver settled at 35% coverage; the fixed one lands
    // on 2x2 band, board (3, 9, 56, 62).
    let tall_trace = std::env::temp_dir().join(format!(
        "maze-chase-goldens-tall-{}.jsonl",
        std::process::id()
    ));
    let _ = std::fs::remove_file(&tall_trace);
    let mut tall = Session::start("tall", 62, 80, 0, 0, "kitty", Some(&tall_trace));
    tall.reach_playing(HINT_MARKER);
    assert!(
        tall.wait_display(62, 56, (10, 4), Duration::from_secs(10)),
        "62x80 never painted the 2x2 band footprint r=62,c=56 at cursor (10,4); tail: {}",
        tail(&tall.out)
    );
    let plans = plan_records(&tall_trace);
    assert!(
        plans
            .iter()
            .any(|p| p.contains("\"cell_cols\":2,\"cell_rows\":2")
                && p.contains("\"chrome\":\"band\"")
                && p.contains("\"img_w\":56")
                && p.contains("\"img_h\":62")),
        "the 62x80 trace plan must record the 2x2 band plan with image dims: {plans:?}"
    );
    tall.assert_no_panic();
    let _ = std::fs::remove_file(&tall_trace);
}

/// One live session walked across every column family (2..8) and row
/// family (1..4) of the scale grid, plus the 399x62 window that
/// `docs/terminal.md` cites as the measured coverage floor of the
/// 62..400 x 35..120 sweep: each settled frame's display footprint and
/// cursor must equal the pure solver's `image` rect, so the shipped
/// render path and the layout crate can never disagree, and the cited
/// 280/1000 floor figure itself is pinned against the solver.
#[test]
fn live_resize_walk_matches_the_pure_solver() {
    let mut s = Session::start("walk", 62, 35, 0, 0, "kitty", None);
    s.reach_playing(HINT_MARKER);

    let sizes: &[(u16, u16)] = &[
        (200, 60),  // 7x1 band, wide golden
        (62, 80),   // 2x2 band, tall golden
        (300, 120), // 8x3 side
        (100, 200), // 3x4 band
        (195, 35),  // 6x1 band
        (143, 64),  // coverage tie decided by squareness (4x2 side)
        (144, 66),  // 5x2 band
        (137, 84),  // 4x2 band
        (64, 90),   // 2x2 band (same footprint as 62x80, different origin)
        (300, 40),  // 8x1 side
        (399, 62),  // the documented coverage-floor case (E1)
    ];
    for &(cols, rows) in sizes {
        let l = layout::compute(cols, rows);
        assert!(!l.too_small, "{cols}x{rows}");
        assert!(l.cell_cols >= 2, "{cols}x{rows}: below the compact floor");
        s.clear_output();
        s.resize(cols, rows);
        assert!(
            s.wait_display(
                l.image.h as u32,
                l.image.w as u32,
                (l.image.y + 1, l.image.x + 1),
                Duration::from_secs(10)
            ),
            "{cols}x{rows}: live frame diverged from the solver plan {:?}; tail: {}",
            (l.cell_cols, l.cell_rows, l.chrome),
            tail(&s.out)
        );
        assert!(s.alive(), "{cols}x{rows}: session died");
    }
    s.assert_no_panic();

    // The public docs cite the measured sweep floor exactly: 399x62 is
    // the worst case of the 62..400 x 35..120 sweep at 280/1000
    // (`docs/terminal.md`, the E1-scoped coverage sentence). Pin the
    // figure so the doc claim and the solver can never drift apart.
    let floor = layout::compute(399, 62);
    let cov = floor.board.w as u64 * floor.board.h as u64 * 1000 / (399 * 62);
    assert_eq!(
        cov, 280,
        "the documented 399x62 sweep floor changed: {cov}/1000"
    );
}

/// Pixel reports from the live tty: the wire display footprint and the
/// cursor must equal the in-process solver's `image` rect for a wide
/// golden, a tall golden, the tiny-pixel-window case where the 6-ppt
/// legibility floor clamps the image, and the 80x63 / 8x6-cell case
/// where the 2x1 compact floor keeps the pixel path at two columns per
/// tile; the Sixel tier must start painting from the same centered
/// origin when pixels are reported, and from the board origin at the
/// natural nominal raster size when they are not (the documented
/// per-tier fallback in `layout.rs` and `docs/terminal.md`).
#[test]
fn live_pixel_reports_map_the_raster_onto_the_solver_footprint() {
    // 200x60 with 10x20 cells: a wide golden under a real pixel report.
    let mut wide = Session::start("pxwide", 200, 60, 2000, 1200, "kitty", None);
    wide.reach_playing(HINT_MARKER);
    let l = layout::compute_pixels(
        200,
        60,
        Some(PixelGeometry {
            cell: (10, 20),
            window: Some((2000, 1200)),
        }),
    );
    assert!(l.is_pixels());
    assert_eq!((l.cell_cols, l.cell_rows), (7, 1));
    assert!(
        wide.wait_display(
            l.image.h as u32,
            l.image.w as u32,
            (l.image.y + 1, l.image.x + 1),
            Duration::from_secs(10)
        ),
        "200x60 pixel report: wire must match the solver image {:?}; tail: {}",
        l.image,
        tail(&wide.out)
    );
    wide.assert_no_panic();

    // 300x120 with 8x16 cells: a tall golden under a real pixel report.
    let mut tall = Session::start("pxtall", 300, 120, 2400, 1920, "kitty", None);
    tall.reach_playing(SIDE_MARKER);
    let l = layout::compute_pixels(
        300,
        120,
        Some(PixelGeometry {
            cell: (8, 16),
            window: Some((2400, 1920)),
        }),
    );
    assert!(l.is_pixels());
    assert!(
        tall.wait_display(
            l.image.h as u32,
            l.image.w as u32,
            (l.image.y + 1, l.image.x + 1),
            Duration::from_secs(10)
        ),
        "300x120 pixel report: wire must match the solver image {:?}; tail: {}",
        l.image,
        tail(&tall.out)
    );
    tall.assert_no_panic();

    // Hostile tiny pixel window: 4x4 px cells at 62x35 is a 248x140 px
    // window that cannot host even the 6-ppt raster (168x186), so the
    // floor wins and the clamp caps the image inside the board. The live
    // wire must still equal the solver's clamped image and the session
    // must stay alive and panic-free.
    let mut tiny = Session::start("pxtiny", 62, 35, 248, 140, "kitty", None);
    tiny.reach_playing(HINT_MARKER);
    let l = layout::compute_pixels(
        62,
        35,
        Some(PixelGeometry {
            cell: (4, 4),
            window: Some((248, 140)),
        }),
    );
    assert!(l.is_pixels());
    assert_eq!(l.ppt(), 6, "the legibility floor must win here");
    assert!(28 * l.ppt() > l.board_px.0 || 31 * l.ppt() > l.board_px.1);
    assert!(
        l.image.x + l.image.w <= l.board.x + l.board.w
            && l.image.y + l.image.h <= l.board.y + l.board.h,
        "the clamped image must stay inside the board"
    );
    assert!(
        tiny.wait_display(
            l.image.h as u32,
            l.image.w as u32,
            (l.image.y + 1, l.image.x + 1),
            Duration::from_secs(10)
        ),
        "tiny-window floor case: wire must match the solver image {:?}; tail: {}",
        l.image,
        tail(&tiny.out)
    );
    tiny.assert_no_panic();

    // Sixel on the wide golden with a pixel report: the DCS must start
    // at the solver's centered image origin, never the board origin.
    let mut sixel = Session::start("sixelwide", 200, 60, 2000, 1200, "sixel", None);
    sixel.reach_playing(HINT_MARKER);
    let l = layout::compute_pixels(
        200,
        60,
        Some(PixelGeometry {
            cell: (10, 20),
            window: Some((2000, 1200)),
        }),
    );
    assert!(
        sixel.wait("\x1bPq", Duration::from_secs(10)),
        "the Sixel raster never painted; tail: {}",
        tail(&sixel.out)
    );
    let text = String::from_utf8_lossy(&sixel.out).into_owned();
    let at = text.find("\x1bPq").expect("sixel escape present");
    let esc = text[..at]
        .rfind("\x1b[")
        .expect("a cursor move precedes it");
    let tail_txt = &text[esc + 2..];
    let end = tail_txt.find('H').expect("complete cursor position");
    let mut parts = tail_txt[..end].split(';');
    let row: u16 = parts.next().unwrap().parse().expect("row");
    let col: u16 = parts.next().unwrap().parse().expect("col");
    assert_eq!(
        (row, col),
        (l.image.y + 1, l.image.x + 1),
        "the sixel raster must start at the centered image origin {:?}",
        l.image
    );
    sixel.assert_no_panic();

    // No pixel report on the Sixel tier: the documented per-tier
    // fallback paints the natural-size nominal raster from the board
    // origin, unlike the centered footprint the reported path uses.
    let mut sixel_nopx = Session::start("sixelnopx", 200, 60, 0, 0, "sixel", None);
    sixel_nopx.reach_playing(HINT_MARKER);
    assert!(
        sixel_nopx.wait("\x1bPq", Duration::from_secs(10)),
        "the no-report sixel raster never painted; tail: {}",
        tail(&sixel_nopx.out)
    );
    let nominal = layout::compute(200, 60);
    assert_eq!(
        nominal.image, nominal.board,
        "with no report the image footprint is the full board box"
    );
    let text = String::from_utf8_lossy(&sixel_nopx.out).into_owned();
    let at = text.find("\x1bPq").expect("sixel escape present");
    let esc = text[..at]
        .rfind("\x1b[")
        .expect("a cursor move precedes it");
    let tail_txt = &text[esc + 2..];
    let end = tail_txt.find('H').expect("complete cursor position");
    let mut parts = tail_txt[..end].split(';');
    let row: u16 = parts.next().unwrap().parse().expect("row");
    let col: u16 = parts.next().unwrap().parse().expect("col");
    assert_eq!(
        (row, col),
        (nominal.board.y + 1, nominal.board.x + 1),
        "the no-report sixel raster must paint from the board origin"
    );
    sixel_nopx.assert_no_panic();

    // The pixel-path compact floor: 80x63 with an 8x6 cell report used
    // to tie a 1x2 side plan against the 2x2 minimal plan and win the
    // chrome tie-break; the floor skip in the solver must keep two
    // columns per tile, and the live wire must follow the 2x2 plan.
    let mut floor = Session::start("pxfloor", 80, 63, 640, 378, "kitty", None);
    floor.reach_playing(HINT_MARKER);
    let l = layout::compute_pixels(
        80,
        63,
        Some(PixelGeometry {
            cell: (8, 6),
            window: Some((640, 378)),
        }),
    );
    assert!(l.is_pixels());
    assert_eq!(
        (l.cell_cols, l.cell_rows),
        (2, 2),
        "the pixel path must pick the 2x2 minimal plan, never a 1-column scale"
    );
    assert!(
        floor.wait_display(
            l.image.h as u32,
            l.image.w as u32,
            (l.image.y + 1, l.image.x + 1),
            Duration::from_secs(10)
        ),
        "80x63 @8x6: wire must match the solver image {:?}; tail: {}",
        l.image,
        tail(&floor.out)
    );
    floor.assert_no_panic();
}

/// A live animated session in the wide golden room: steering input must
/// be followed by a sustained run of real frames that keep every display
/// escape on the same 7x1 footprint (no drift on the non-fresh repaint
/// path), keep the per-frame image delete cycling, and never panic.
///
/// The five re-displays are waited for with a generous 30 s deadline
/// rather than inside a fixed wall-clock slice: a 200x60 board frame is
/// about 230800 bytes, and macOS PTY buffers are far smaller than Linux's,
/// so a fixed slice sized on Linux measured the harness's sleep cadence
/// instead of the product (issue #656 macOS arm, F3). Every observed
/// escape is still drift-checked below, so the assertion stays strict.
#[test]
fn live_wide_room_animates_and_steers_without_footprint_drift() {
    let mut s = Session::start("soak", 200, 60, 0, 0, "kitty", None);
    s.reach_playing(HINT_MARKER);
    s.clear_output();

    for _ in 0..6 {
        s.pty.master.write_all(b"\x1b[A").unwrap();
        std::thread::sleep(Duration::from_millis(60));
        s.pty.master.write_all(b"d").unwrap();
        std::thread::sleep(Duration::from_millis(60));
        s.pty.master.write_all(b"s").unwrap();
        std::thread::sleep(Duration::from_millis(60));
    }
    assert!(
        s.wait_displays(31, 196, 5, Duration::from_secs(30)),
        "the animated session must keep re-displaying the 7x1 footprint; tail: {}",
        tail(&s.out)
    );

    let text = String::from_utf8_lossy(&s.out).into_owned();
    let mut from = 0;
    while let Some(i) = text[from..].find("\x1b_Ga=T,f=100,r=") {
        let i = from + i;
        let Some(end) = text[i..].find(';').map(|end| end + i) else {
            // A header split across the capture tail is not a verdict.
            break;
        };
        let params = &text[i..end];
        let get = |key: &str| {
            params
                .split(',')
                .find_map(|p| p.strip_prefix(key))
                .and_then(|v| v.parse::<u32>().ok())
                .unwrap_or_else(|| panic!("missing {key} in {params:?}"))
        };
        assert_eq!(
            (get("r="), get("c=")),
            (31, 196),
            "a display escape drifted off the pinned 7x1 footprint"
        );
        from = end;
    }
    assert!(
        text.contains("\x1b_Ga=d,d=I,i=1"),
        "the per-frame image delete must keep cycling; tail: {}",
        tail(&s.out)
    );
    assert!(s.alive(), "the session died during the animation soak");
    s.assert_no_panic();
}
