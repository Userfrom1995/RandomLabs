//! Hostile dynamic-layout coverage for Phase 2 (issues #673/#674/#675):
//! the shipped binary driven through the resize surface a real consumer
//! hits, beyond the pinned contract cases in `tests/plan_contract.rs`.
//!
//! 1. `resize_storm_recovers_and_fresh_frame_obeys_kitty_contract` -
//!    a storm of hostile window sizes (the 62x35 floor, cards, a 1x1,
//!    a 0x0, a 65535x65535, intermediate and wide layouts) lands the
//!    game back on the wide 170x64 plan with a live session; the first
//!    frame of that plan must clear (`ESC[2J`), delete every Kitty
//!    placement (`ESC_Ga=d`), then re-display the board at the exact
//!    5x2 cell footprint (`c=140,r=62`), in that order.
//! 2. `too_small_cards_are_exact_at_the_boundary_and_recover` - the
//!    card is size-stamped and exact on both sides of each minimum
//!    (61x35, 62x34, 40x20), each card frame clears and deletes before
//!    drawing and carries no fresh display, and the board recovers on
//!    every return above the minimum.
//! 3. `pixel_reports_shape_footprint_and_raster` - TIOCGWINSZ pixel
//!    fields on the live PTY: a 10x20 cell report selects the 3x1 band
//!    plan and rasterizes the PNG at 560x620 (28x31 tiles at 20 ppt);
//!    an 8x8 report selects the 3x1 band plan at 224x248; an insane
//!    1x1 report falls back to the nominal 8-ppt plan. The PNG IHDR is
//!    parsed straight from the shipped binary's Kitty escape, so the
//!    raster-fit claim is pinned at the byte level. Each display
//!    escape's `r=`/`c=` footprint and the cursor position it paints at
//!    are pinned too: the image sits centered on its mapped footprint
//!    inside the board box (issue #656 F3), never stretched across the
//!    whole board.
//! 4. `sixel_raster_paints_centered_inside_its_cell_box` - the same
//!    window pixel mapping on the Sixel tier: the DCS raster paints
//!    from the centered image origin, not the board origin anchored
//!    with natural size (issue #656 F2), for both a roomy and a tight
//!    window report.
//! 5. `trace_storm_is_wellformed_and_tracks_every_settled_plan` -
//!    `MAZE_CHASE_TRACE` JSONL stays well-formed and monotonic across
//!    live resizes and records every settled plan (floor, both card
//!    sides, band, side panel).
#![cfg(unix)]

use std::io::{Read, Write};
use std::os::fd::{AsRawFd, FromRawFd, OwnedFd};
use std::os::unix::process::CommandExt;
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

/// Wide 170x64 playing surface: side panel with this marker (5x2 tiles).
const SIDE_MARKER: &str = "move: arrows/WASD";
/// Band/hint playing surfaces carry this marker (62x35, 100x40, 200x100).
const HINT_MARKER: &str = "Arrows/WASD move";

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

fn wait_for(
    master: &mut std::fs::File,
    out: &mut Vec<u8>,
    needle: &str,
    timeout: Duration,
) -> bool {
    let deadline = Instant::now() + timeout;
    loop {
        drain(master, out);
        if String::from_utf8_lossy(out).contains(needle) {
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
            "maze-chase-dyn-{tag}-{}-{}",
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
        wait_for(&mut self.pty.master, &mut self.out, needle, timeout)
    }

    /// Title visible, then Enter starts play; wait for the playing marker
    /// of the current layout.
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

    fn wait_frame_closed(&mut self) {
        assert!(
            self.wait("\x1b[?2026l", Duration::from_secs(10)),
            "no complete frame arrived; tail: {}",
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

/// The first complete synchronized frame whose bytes contain `needle`.
fn frame_containing(bytes: &[u8], needle: &str) -> Option<String> {
    let text = String::from_utf8_lossy(bytes).into_owned();
    let mut from = 0;
    while let Some(end) = text[from..].find("\x1b[?2026l") {
        let end = from + end;
        if let Some(start) = text[..end].rfind("\x1b[?2026h") {
            let frame = &text[start + "\x1b[?2026h".len()..end];
            if frame.contains(needle) {
                return Some(frame.to_string());
            }
        }
        from = end + "\x1b[?2026l".len();
    }
    None
}

/// Exact-order assertion for a fresh frame: clear, delete-all, then the
/// payload (display or card), with `clear < delete < payload`.
fn assert_fresh_order(frame: &str, payload: &str, tag: &str) {
    assert!(
        frame.contains("\x1b[2J"),
        "{tag}: fresh frame must clear stale glyphs"
    );
    assert!(
        frame.contains("\x1b_Ga=d\x1b\\"),
        "{tag}: fresh frame must delete every live placement"
    );
    let clear = frame.find("\x1b[2J").unwrap();
    let delete_all = frame.find("\x1b_Ga=d\x1b\\").unwrap();
    let payload_at = frame.find(payload).unwrap();
    assert!(
        clear < delete_all && delete_all < payload_at,
        "{tag}: order must be clear < delete-all < payload (got {clear} < {delete_all} < {payload_at})"
    );
}

/// Decode the first 24 bytes of a base64 stream (enough for the PNG
/// signature plus the IHDR width and height).
fn b64_prefix_decode(s: &str) -> Vec<u8> {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = Vec::new();
    let mut buf: u32 = 0;
    let mut bits: u32 = 0;
    for c in s.bytes() {
        let Some(v) = TABLE.iter().position(|&t| t == c) else {
            break;
        };
        buf = (buf << 6) | v as u32;
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            out.push((buf >> bits) as u8);
        }
    }
    out
}

/// The `r=`/`c=` cell footprint (rows, cols) of the first Kitty `a=T`
/// display escape in `bytes`.
fn first_display_placement(bytes: &[u8]) -> (u32, u32) {
    let text = String::from_utf8_lossy(bytes).into_owned();
    let start = text.find("\x1b_Ga=T").expect("display escape present");
    let semi = text[start..].find(';').expect("payload separator") + start;
    let params = &text[start..semi];
    let get = |key: &str| {
        params
            .split(',')
            .find_map(|p| p.strip_prefix(key))
            .and_then(|v| v.parse::<u32>().ok())
            .unwrap_or_else(|| panic!("missing {key} in {params:?}"))
    };
    (get("r="), get("c="))
}

/// The 1-based cursor position the frame moves to immediately before
/// `needle` (the payload escape): the last `ESC[<row>;<col>H` sequence
/// ahead of it.
fn cursor_before(frame: &str, needle: &str) -> (u16, u16) {
    let at = frame.find(needle).expect("payload escape present");
    let head = &frame[..at];
    let esc = head.rfind("\x1b[").expect("a cursor move precedes it");
    let tail = &head[esc + 2..];
    let end = tail.find('H').expect("complete cursor position");
    let mut parts = tail[..end].split(';');
    (
        parts.next().unwrap().parse().expect("row"),
        parts.next().unwrap().parse().expect("col"),
    )
}

/// Width and height of the PNG carried by the first Kitty `a=T` display
/// Width and height of the PNG carried by the first Kitty `a=t` transmit
/// escape captured in `bytes`, parsed from the IHDR chunk.
fn first_display_png_dims(bytes: &[u8]) -> (u32, u32) {
    let text = String::from_utf8_lossy(bytes).into_owned();
    let start = text.find("\x1b_Ga=t").expect("transmit escape present");
    let semi = text[start..].find(';').expect("payload separator") + start + 1;
    let prefix: String = text[semi..].chars().take(32).collect();
    let raw = b64_prefix_decode(&prefix);
    assert!(raw.len() >= 24, "short PNG prefix: {raw:?}");
    assert_eq!(
        &raw[..8],
        &[137, 80, 78, 71, 13, 10, 26, 10],
        "Kitty payload must carry a PNG signature"
    );
    assert_eq!(&raw[12..16], b"IHDR", "PNG must start with an IHDR chunk");
    let w = u32::from_be_bytes([raw[16], raw[17], raw[18], raw[19]]);
    let h = u32::from_be_bytes([raw[20], raw[21], raw[22], raw[23]]);
    (w, h)
}

/// A storm of hostile sizes must never kill the session; the settled
/// wide plan repaints from scratch in one frame with the exact 5x2
/// footprint (`c=140,r=62`), and the fresh frame obeys the full Kitty
/// contract: clear, delete-all, re-display, in that order.
#[test]
fn resize_storm_recovers_and_fresh_frame_obeys_kitty_contract() {
    let mut s = Session::start("storm", 170, 64, 0, 0, "kitty", None);
    s.reach_playing(SIDE_MARKER);

    // Hostile storm: floor sizes, cards on both sides of each minimum,
    // degenerate and absurd geometry, wide and intermediate plans.
    for (cols, rows) in [
        (62, 35),
        (61, 35),
        (40, 20),
        (1, 1),
        (0, 0),
        (65535, 65535),
        (143, 70),
        (62, 34),
        (80, 24),
        (300, 120),
        (100, 40),
    ] {
        s.resize(cols, rows);
    }
    s.clear_output();
    assert!(
        s.wait(HINT_MARKER, Duration::from_secs(10)),
        "the storm never settled back onto the 100x40 band plan; tail: {}",
        tail(&s.out)
    );
    s.wait_frame_closed();
    assert!(s.alive(), "the session died in the storm");

    // Settle on the wide plan and pin the fresh-frame contract.
    s.clear_output();
    s.resize(170, 64);
    assert!(
        s.wait(SIDE_MARKER, Duration::from_secs(10)),
        "the wide 170x64 plan never repainted after the storm; tail: {}",
        tail(&s.out)
    );
    s.wait_frame_closed();
    let frame = frame_containing(&s.out, SIDE_MARKER).expect("captured the settled frame");
    assert_fresh_order(&frame, "\x1b_Ga=p", "storm settle 170x64");
    assert!(
        frame.contains("c=140,r=62"),
        "the settled board must display at the exact 5x2 cell footprint (31*2 x 28*5); frame head: {:?}",
        &frame[..frame.len().min(400)]
    );
    assert!(s.alive(), "the session died after the settle");
    s.assert_no_panic();
}

/// The too-small card is exact and size-stamped on both sides of each
/// minimum; every card frame clears and deletes first and carries no
/// fresh display, and the board recovers above the minimum.
#[test]
fn too_small_cards_are_exact_at_the_boundary_and_recover() {
    let mut s = Session::start("cards", 62, 35, 0, 0, "kitty", None);
    s.reach_playing(HINT_MARKER);

    for (cols, rows) in [(61, 35), (62, 34), (40, 20)] {
        let card = format!("window {cols}x{rows} is too small");
        s.clear_output();
        s.resize(cols, rows);
        assert!(
            s.wait(&card, Duration::from_secs(10)),
            "the exact card for {cols}x{rows} never appeared; tail: {}",
            tail(&s.out)
        );
        s.wait_frame_closed();
        let frame = frame_containing(&s.out, &card).expect("captured the card frame");
        assert_fresh_order(&frame, &card, &format!("card {cols}x{rows}"));
        assert!(
            !frame.contains("\x1b_Ga=p"),
            "the card frame for {cols}x{rows} must not display a fresh board image"
        );
    }

    // Return above the minimum: the board must come back.
    s.clear_output();
    s.resize(62, 35);
    assert!(
        s.wait(HINT_MARKER, Duration::from_secs(10)),
        "the board never recovered at the 62x35 minimum; tail: {}",
        tail(&s.out)
    );
    s.wait_frame_closed();

    // And a wide plan after the cards must re-display too.
    s.clear_output();
    s.resize(200, 100);
    assert!(
        s.wait(HINT_MARKER, Duration::from_secs(10)),
        "the 200x100 band plan never repainted after the cards; tail: {}",
        tail(&s.out)
    );
    s.wait_frame_closed();
    assert!(s.alive(), "the session died in the boundary walk");
    s.assert_no_panic();
}

/// Pixel reports from the live tty drive the footprint, the raster, and
/// the placement: 10x20 cells select the 3x1 band plan at 20 ppt (PNG
/// 560x620) displayed across 56x31 cells at (22, 5); 8x8 cells select
/// the 3x1 band plan at 224x248 displayed across 28x31 cells at (36, 5);
/// and an insane 1x1 report falls back to the nominal 8-ppt plan drawn
/// across the full board box.
#[test]
fn pixel_reports_shape_footprint_and_raster() {
    // 10x20 cells at 100x40 (1000x800 window pixels): 3x1 tiles, ppt =
    // min(30, 20, 840/28, 620/31) = 20. The 560x620 raster maps back to
    // a centered 56x31 footprint inside the 84x31 board.
    let mut tall = Session::start("pxtall", 100, 40, 1000, 800, "kitty", None);
    tall.reach_playing(HINT_MARKER);
    tall.wait_frame_closed();
    let dims = first_display_png_dims(&tall.out);
    assert_eq!(
        dims,
        (560, 620),
        "20-ppt raster must be 28x31 tiles at 20 px (560x620)"
    );
    assert_eq!(
        first_display_placement(&tall.out),
        (31, 56),
        "the 560x620 raster occupies 56x31 cells at 10x20"
    );
    let frame = frame_containing(&tall.out, "\x1b_Ga=T").expect("first board frame");
    assert_eq!(
        cursor_before(&frame, "\x1b_Ga=T"),
        (6, 23),
        "the image is centered at cell (22, 5): board x 8 + (84-56)/2"
    );
    tall.assert_no_panic();

    // 8x8 cells at 100x40 (800x320 window pixels): the full-grid scan
    // lands on the 3x1 band plan (not the old derived 2x1), ppt = 8, and
    // the 224x248 raster maps back to a centered 28x31 footprint inside
    // the 84x31 board.
    let mut square = Session::start("pxsquare", 100, 40, 800, 320, "kitty", None);
    square.reach_playing(HINT_MARKER);
    square.wait_frame_closed();
    let dims = first_display_png_dims(&square.out);
    assert_eq!(
        dims,
        (224, 248),
        "8-ppt raster must be 28x31 tiles at 8 px (224x248)"
    );
    assert_eq!(
        first_display_placement(&square.out),
        (31, 28),
        "the 224x248 raster occupies 28x31 cells at 8x8 (1:1, no stretch)"
    );
    let frame = frame_containing(&square.out, "\x1b_Ga=T").expect("first board frame");
    assert_eq!(
        cursor_before(&frame, "\x1b_Ga=T"),
        (6, 37),
        "the image is centered at cell (36, 5): board x 8 + (84-28)/2"
    );
    square.assert_no_panic();

    // Insane 1x1 cell width at 100x40: fall back to nominal 8-ppt; with
    // no trustworthy report the image keeps the Phase 1 full-board box.
    let mut insane = Session::start("pxinsane", 100, 40, 100, 100, "kitty", None);
    insane.reach_playing(HINT_MARKER);
    insane.wait_frame_closed();
    let dims = first_display_png_dims(&insane.out);
    assert_eq!(
        dims,
        (224, 248),
        "an insane 1x1 cell report must fall back to the nominal 8-ppt raster"
    );
    assert_eq!(
        first_display_placement(&insane.out),
        (31, 84),
        "without a pixel report the nominal raster keeps the full board box"
    );
    insane.assert_no_panic();
}

/// The Sixel tier paints the raster from the centered image origin
/// (issue #656 F2): on a 100x40 window with a 604x524 pixel report the
/// 13-ppt raster maps to a 61x31 cell footprint centered at (19, 5), so
/// the DCS must start at row 6, column 20 - not at the board origin.
/// The tight report (no margin: 848x816 pixels at 143x64) must keep the
/// raster inside its board box the same way instead of bleeding into the
/// hint line.
#[test]
fn sixel_raster_paints_centered_inside_its_cell_box() {
    use maze_chase_terminal::geometry::PixelGeometry;
    use maze_chase_terminal::layout;

    // Roomy report: xterm-family 100x40 with real 6.04x13.1 px cells.
    let mut roomy = Session::start("sixelroomy", 100, 40, 604, 524, "sixel", None);
    roomy.reach_playing(HINT_MARKER);
    roomy.wait_frame_closed();
    let l = layout::compute_pixels(
        100,
        40,
        Some(PixelGeometry {
            cell: (7, 14),
            window: Some((604, 524)),
        }),
    );
    assert_eq!((l.cell_cols, l.cell_rows), (3, 1));
    assert_eq!(
        l.image,
        layout::Rect {
            x: 19,
            y: 5,
            w: 61,
            h: 31
        }
    );
    let frame = frame_containing(&roomy.out, "\x1bPq").expect("first sixel frame");
    assert_eq!(
        cursor_before(&frame, "\x1bPq"),
        (l.image.y + 1, l.image.x + 1),
        "the sixel raster must start at the centered image origin"
    );
    // Sanity: the raster's natural size fits the board pixel box.
    assert!(28 * l.ppt() <= l.board_px.0 && 31 * l.ppt() <= l.board_px.1);
    roomy.assert_no_panic();

    // Tight report: 848x816 px at 143x64 (real cells ~5.93x12.75) has
    // only a few pixels of slack; the fit bound must still hold.
    let mut tight = Session::start("sixeltight", 143, 64, 848, 816, "sixel", None);
    tight.reach_playing(HINT_MARKER);
    tight.wait_frame_closed();
    let l = layout::compute_pixels(
        143,
        64,
        Some(PixelGeometry {
            cell: (6, 13),
            window: Some((848, 816)),
        }),
    );
    assert!(28 * l.ppt() <= l.board_px.0 && 31 * l.ppt() <= l.board_px.1);
    let frame = frame_containing(&tight.out, "\x1bPq").expect("first sixel frame");
    assert_eq!(
        cursor_before(&frame, "\x1bPq"),
        (l.image.y + 1, l.image.x + 1),
        "the sixel raster must start at the centered image origin"
    );
    tight.assert_no_panic();
}

/// `MAZE_CHASE_TRACE` must stay well-formed and monotonic across live
/// resizes and record every settled plan: the 62x35 floor (band), both
/// card sides, the 100x40 band, and the 170x64 side panel.
#[test]
fn trace_storm_is_wellformed_and_tracks_every_settled_plan() {
    let trace_path = std::env::temp_dir().join(format!(
        "maze-chase-dyn-trace-{}-{}.jsonl",
        std::process::id(),
        Instant::now().elapsed().as_nanos()
    ));
    let _ = std::fs::remove_file(&trace_path);
    let mut s = Session::start("trace", 62, 35, 0, 0, "kitty", Some(&trace_path));
    s.reach_playing(HINT_MARKER);

    let steps: &[(u16, u16, &str)] = &[
        (61, 35, "window 61x35 is too small"),
        (100, 40, HINT_MARKER),
        (40, 20, "window 40x20 is too small"),
        (170, 64, SIDE_MARKER),
    ];
    for (cols, rows, marker) in steps {
        s.clear_output();
        s.resize(*cols, *rows);
        assert!(
            s.wait(marker, Duration::from_secs(10)),
            "resize to {cols}x{rows} never painted its surface; tail: {}",
            tail(&s.out)
        );
        s.wait_frame_closed();
    }

    let raw = std::fs::read_to_string(&trace_path).expect("trace file written");
    let lines: Vec<&str> = raw.lines().collect();
    assert!(
        lines.len() >= 10,
        "trace must hold start, plans, and frames; got {raw}"
    );
    let mut last_ts: i64 = -1;
    for line in &lines {
        assert!(
            line.starts_with('{') && line.ends_with('}') && line.contains("\"kind\":\""),
            "every trace line must be one JSON object: {line}"
        );
        let ts_field = "\"ts_ms\":";
        let at = line.find(ts_field).expect("timestamped record") + ts_field.len();
        let end = line[at..]
            .find(|c: char| !c.is_ascii_digit())
            .expect("numeric timestamp")
            + at;
        let ts: i64 = line[at..end].parse().expect("parse timestamp");
        assert!(ts >= last_ts, "timestamps must be monotonic: {line}");
        last_ts = ts;
    }
    let plan = |needle: &str| {
        assert!(
            lines
                .iter()
                .any(|l| l.contains("\"kind\":\"plan\"") && l.contains(needle)),
            "missing plan record: {needle} in {raw}"
        );
    };
    plan("\"cols\":62,\"rows\":35,\"cell_cols\":2,\"cell_rows\":1");
    plan("\"cols\":61,\"rows\":35,\"cell_cols\":2");
    plan("\"too_small\":true");
    plan("\"cols\":100,\"rows\":40,\"cell_cols\":3,\"cell_rows\":1");
    plan("\"chrome\":\"band\"");
    plan("\"cols\":170,\"rows\":64,\"cell_cols\":5,\"cell_rows\":2");
    plan("\"chrome\":\"side\"");
    assert!(
        lines
            .iter()
            .filter(|l| l.contains("\"kind\":\"frame\""))
            .count()
            >= 4,
        "frames must be traced across the storm: {raw}"
    );
    s.assert_no_panic();
    let _ = std::fs::remove_file(&trace_path);
}
