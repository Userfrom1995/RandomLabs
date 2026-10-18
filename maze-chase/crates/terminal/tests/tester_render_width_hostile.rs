//! Hostile PTY geometry coverage for the one-character-per-column cell
//! renderer (Quality Council finding on PR #635): the board must paint
//! inside the window after a live same-batch key+SIGWINCH race, in both
//! compact (2x1) and magnified (4x2) cell modes.
//!
//! `tests/render_geometry.rs` proves the startup path at the 62x35
//! minimum. These tests attack the seam between the resize reconciliation
//! and the renderer through the shipped binary:
//!
//! 1. `same_batch_race_refits_exact_width_rows` - race 100x40 -> 62x35
//!    (compact) and back to 100x40 (side panel): every board row must
//!    account for exactly one character per terminal column, no visible
//!    glyph may ever be written past the window edge, and the walls must
//!    sit at their exact columns after each heal.
//! 2. `magnified_race_geometry_is_exact_and_transitions_cleanly` - start
//!    in the magnified 4x2 layout at 200x100, verify exact widths and
//!    wall columns there, then race down to the 62x35 compact minimum
//!    (the largest possible cell-size transition) and re-verify.
//!
//! The doubled-row bug this guards against wrote 118-char rows in a
//! 62-column window; both tests fail on that renderer (verified
//! out-of-tree) and pass on the fixed one.
#![cfg(unix)]

use std::io::{Read, Write};
use std::os::fd::{AsRawFd, FromRawFd, OwnedFd};
use std::os::unix::process::CommandExt;
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

use maze_chase_terminal::layout::{compute, Layout};

/// Wide layouts (>=96 cols) carry the side panel including this marker.
const SIDE_PANEL_MARKER: &str = "move: arrows/WASD";
/// Narrow layouts fall back to the top bar plus this hint line.
const COMPACT_HINT: &str = "Arrows/WASD move";

struct Pty {
    master: std::fs::File,
    slave: std::fs::File,
}

/// Serializes the MT-Unsafe `ptsname` static buffer across the parallel
/// test threads in this binary (`ptsname_r` is ENOTSUP on macOS).
static PTSNAME_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());

fn open_pty(cols: u16, rows: u16) -> Pty {
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
            ws_xpixel: 0,
            ws_ypixel: 0,
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

fn set_winsize(master: &std::fs::File, cols: u16, rows: u16) {
    let ws = libc::winsize {
        ws_row: rows,
        ws_col: cols,
        ws_xpixel: 0,
        ws_ypixel: 0,
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

fn stop_child(child: &Child) {
    send_signal(child.id(), libc::SIGSTOP);
    let mut status = 0i32;
    let rc = unsafe { libc::waitpid(child.id() as libc::pid_t, &mut status, libc::WUNTRACED) };
    assert_eq!(rc, child.id() as libc::pid_t, "waitpid(WUNTRACED) failed");
    assert!(
        libc::WIFSTOPPED(status),
        "child did not stop; wait status {status:#x}"
    );
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
}

impl Session {
    fn start(tag: &str, cols: u16, rows: u16) -> Self {
        let pty = open_pty(cols, rows);
        let dir = std::env::temp_dir().join(format!(
            "maze-chase-width-{tag}-{}-{}",
            std::process::id(),
            cols
        ));
        let _ = std::fs::remove_dir_all(&dir);
        let mut cmd = Command::new(env!("CARGO_BIN_EXE_maze-chase-terminal"));
        cmd.arg("--dir")
            .arg(&dir)
            .arg("--tier")
            .arg("legacy")
            .env("TERM", "xterm-256color")
            .env_remove("MAZE_CHASE_TIER")
            .stdin(Stdio::from(pty.slave.try_clone().unwrap()))
            .stdout(Stdio::from(pty.slave.try_clone().unwrap()))
            .stderr(Stdio::from(pty.slave.try_clone().unwrap()));
        // Own session + PTY as controlling terminal: `crossterm::size()`
        // must read the PTY under test via /dev/tty even when this test
        // binary itself runs on a developer terminal.
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
        }
    }

    fn wait(&mut self, needle: &str, timeout: Duration) -> bool {
        wait_for(&mut self.pty.master, &mut self.out, needle, timeout)
    }

    fn clear_output(&mut self) {
        drain(&mut self.pty.master, &mut self.out);
        self.out.clear();
    }

    fn type_bytes(&mut self, bytes: &[u8]) {
        (&self.pty.master).write_all(bytes).unwrap();
    }

    fn reach_playing(&mut self, marker: &str, tag: &str) {
        assert!(
            self.wait("video tier:", Duration::from_secs(15)),
            "{tag}: title screen never appeared; tail: {}",
            tail(&self.out)
        );
        self.type_bytes(b"\r");
        assert!(
            self.wait(marker, Duration::from_secs(5)),
            "{tag}: Enter did not start play; tail: {}",
            tail(&self.out)
        );
    }

    /// Force the issue #634 race: key byte arms the TTY epoll edge, then
    /// the winsize change + SIGWINCH queue behind it while stopped, so
    /// the first post-resume `epoll_wait` consumes the key and drops the
    /// signal byte. The layout must self-heal within one frame.
    fn force_same_batch_race(&mut self, cols: u16, rows: u16) {
        stop_child(&self.child);
        self.type_bytes(b"x");
        set_winsize(&self.pty.master, cols, rows);
        send_signal(self.child.id(), libc::SIGWINCH);
        send_signal(self.child.id(), libc::SIGCONT);
    }

    /// Capture the last complete synchronized frame painted from now on.
    fn capture_frame(&mut self, tag: &str) -> String {
        self.clear_output();
        assert!(
            self.wait("\x1b[?2026l", Duration::from_secs(5)),
            "{tag}: no complete frame after this point; tail: {}",
            tail(&self.out)
        );
        last_complete_frame(&self.out).expect("captured a complete frame")
    }
}

impl Drop for Session {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
        let _ = std::fs::remove_dir_all(&self.dir);
    }
}

/// The last complete synchronized-output frame (`?2026h` ... `?2026l`)
/// in `bytes`, so a drain that stopped mid-frame still yields a full one.
fn last_complete_frame(bytes: &[u8]) -> Option<String> {
    let text = String::from_utf8_lossy(bytes);
    let end = text.rfind("\x1b[?2026l")?;
    let start = text[..end].rfind("\x1b[?2026h")?;
    Some(text[start + "\x1b[?2026h".len()..end].to_string())
}

/// A minimal terminal emulator over one frame: tracks cursor position
/// (CSI `H`), applies printable characters to the grid, and records both
/// the per-row write count and `overflow` (visible glyphs written at
/// column >= cols, which a real terminal would wrap onto the next row).
/// Every other escape sequence is ignored. MATCHES: `\x1b[?2026h/l`,
/// SGR `m`, cursor `H`.
struct PaintedFrame {
    cells: Vec<Vec<char>>,
    written: Vec<usize>,
    overflow: Vec<usize>,
    cursor: (usize, usize),
}

impl PaintedFrame {
    fn feed(frame: &str, cols: usize, rows: usize) -> Self {
        let mut grid = PaintedFrame {
            cells: vec![vec![' '; cols]; rows],
            written: vec![0; rows],
            overflow: vec![0; rows],
            cursor: (0, 0),
        };
        let chars: Vec<char> = frame.chars().collect();
        let mut i = 0;
        while i < chars.len() {
            if chars[i] == '\x1b' && chars.get(i + 1) == Some(&'[') {
                let mut j = i + 2;
                let mut params = String::new();
                while j < chars.len() && !('\x40'..='\x7e').contains(&chars[j]) {
                    params.push(chars[j]);
                    j += 1;
                }
                if chars.get(j) == Some(&'H') {
                    let mut parts = params.split(';');
                    let row: usize = parts.next().unwrap_or("1").parse().unwrap_or(1);
                    let col: usize = parts.next().unwrap_or("1").parse().unwrap_or(1);
                    grid.cursor = (row.saturating_sub(1), col.saturating_sub(1));
                }
                i = j + 1;
                continue;
            }
            let c = chars[i];
            i += 1;
            if c.is_control() {
                continue;
            }
            let (r, col) = grid.cursor;
            if r < grid.written.len() {
                grid.written[r] += 1;
                if col < grid.cells[r].len() {
                    grid.cells[r][col] = c;
                } else if c != ' ' {
                    grid.overflow[r] += 1;
                }
            }
            grid.cursor = (r, col + 1);
        }
        grid
    }

    fn row_text(&self, row: usize) -> String {
        self.cells[row].iter().collect()
    }
}

/// Assert the frame paints exactly one character per terminal column on
/// every board row (narrow layouts), keeps the walls at their exact
/// columns, and never writes a visible glyph past the window edge.
fn assert_exact_geometry(frame: &str, layout: &Layout, tag: &str) {
    let cols = layout.cols as usize;
    let rows = layout.rows as usize;
    let grid = PaintedFrame::feed(frame, cols, rows);

    let over: Vec<(usize, usize)> = grid
        .overflow
        .iter()
        .enumerate()
        .filter(|(_, &n)| n > 0)
        .map(|(i, &n)| (i, n))
        .collect();
    assert!(
        over.is_empty(),
        "{tag}: visible glyphs written past the window edge (would wrap): {over:?}"
    );

    let bx = layout.board.x as usize;
    let by = layout.board.y as usize;
    let bw = layout.board.w as usize;
    let bh = layout.board.h as usize;
    let cc = layout.cell_cols as usize;
    let cr = layout.cell_rows as usize;

    if layout.side.is_none() {
        // Narrow layout: the board row is a single pad+board+pad run, so
        // its write count must be exactly one per terminal column (the
        // doubled-row bug wrote 118 here at 62 columns).
        for y in by..by + bh {
            assert_eq!(
                grid.written[y],
                cols,
                "{tag}: board row {y} wrote {} characters, expected exactly {cols}; row: {:?}",
                grid.written[y],
                grid.row_text(y)
            );
        }
    }

    // Top border row: the right wall block must sit at the board's exact
    // right edge, inside the window.
    let top = by;
    for x in bx + bw - cc..bx + bw {
        assert_eq!(
            grid.cells[top][x],
            '█',
            "{tag}: top-border right wall missing at column {x}; row: {:?}",
            grid.row_text(top)
        );
    }

    // Maze row 4 is `#..........................#`: wall, dot corridor,
    // wall. Both wall blocks must land at their exact columns and the
    // corridor interior must never contain a wall glyph.
    let cy = by + 4 * cr;
    for x in bx..bx + cc {
        assert_eq!(
            grid.cells[cy][x],
            '█',
            "{tag}: left wall missing at column {x}; row: {:?}",
            grid.row_text(cy)
        );
    }
    for x in bx + bw - cc..bx + bw {
        assert_eq!(
            grid.cells[cy][x],
            '█',
            "{tag}: right wall missing at column {x}; row: {:?}",
            grid.row_text(cy)
        );
    }
    assert!(
        !grid.cells[cy][bx + cc..bx + bw - cc].contains(&'█'),
        "{tag}: wall glyph painted inside the corridor; row: {:?}",
        grid.row_text(cy)
    );
}

/// Race into the compact 62x35 minimum and back to the side-panel 100x40
/// layout. After each heal the board must paint exactly within its
/// window with the walls at their expected columns.
#[test]
fn same_batch_race_refits_exact_width_rows() {
    let mut s = Session::start("compact", 100, 40);
    s.reach_playing(SIDE_PANEL_MARKER, "compact");

    // Forced race down to the minimum: compact layout, top bar + hint.
    s.force_same_batch_race(62, 35);
    assert!(
        s.wait(COMPACT_HINT, Duration::from_secs(3)),
        "race to 62x35 never healed; tail: {}",
        tail(&s.out)
    );
    let frame = s.capture_frame("compact-62");
    let layout = compute(62, 35);
    assert!(!layout.too_small && layout.side.is_none());
    assert_exact_geometry(&frame, &layout, "race->62x35");

    // Forced race back to the wide layout: the side panel returns and the
    // board must re-fit at its 100x40 origin.
    s.force_same_batch_race(100, 40);
    assert!(
        s.wait(SIDE_PANEL_MARKER, Duration::from_secs(3)),
        "race back to 100x40 never healed; tail: {}",
        tail(&s.out)
    );
    let frame = s.capture_frame("compact-100");
    let layout = compute(100, 40);
    assert!(layout.side.is_some());
    assert_exact_geometry(&frame, &layout, "race->100x40");
}

/// Start in the magnified 4x2 layout at 200x100, verify exact geometry,
/// then take the largest possible cell-size transition (4x2 magnified ->
/// 2x1 compact minimum) through the forced race and re-verify.
#[test]
fn magnified_race_geometry_is_exact_and_transitions_cleanly() {
    let mut s = Session::start("magnified", 200, 100);
    s.reach_playing(SIDE_PANEL_MARKER, "magnified");

    let layout = compute(200, 100);
    assert!(layout.magnified && layout.cell_cols == 4 && layout.cell_rows == 2);
    let frame = s.capture_frame("magnified-200");
    assert_exact_geometry(&frame, &layout, "200x100-magnified");

    // Cross-mode race: magnified 4x2 -> compact 2x1 at the minimum.
    s.force_same_batch_race(62, 35);
    assert!(
        s.wait(COMPACT_HINT, Duration::from_secs(3)),
        "cross-mode race to 62x35 never healed; tail: {}",
        tail(&s.out)
    );
    let frame = s.capture_frame("magnified-62");
    let layout = compute(62, 35);
    assert!(!layout.magnified && layout.side.is_none());
    assert_exact_geometry(&frame, &layout, "magnified->62x35");
}
