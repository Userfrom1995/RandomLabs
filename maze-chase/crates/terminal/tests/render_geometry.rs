//! Durable PTY geometry regression: the cell renderer must emit exactly
//! one output character per terminal column, so the shipped board fits
//! the window and its right wall is visibly painted inside it.
//!
//! The evaluator found the cell renderer doubling every board row
//! horizontally (each tile's expanded glyph was emitted once per terminal
//! column of the tile), so at the 62x35 minimum the 56-column board
//! painted 118 characters, overflowed the window, wrapped the terminal,
//! and clipped the right wall off-screen. Marker-only tests never saw it:
//! the side panel and hint still painted.
//!
//! This test spawns the shipped binary on a real 62x35 PTY, enters play,
//! reconstructs the last complete frame a character at a time (a small
//! terminal emulator over cursor-position + SGR output), and asserts on a
//! known corridor row (`#..........................#`, maze row 4):
//!
//! 1. exactly 62 characters were written to the row (one per column), and
//! 2. the right wall block `██` is present at window columns 57-58,
//!    inside the 62-column window (board origin x=3, tile 27 at lx 54-55).
#![cfg(unix)]

use std::io::{Read, Write};
use std::os::fd::{AsRawFd, FromRawFd, OwnedFd};
use std::os::unix::process::CommandExt;
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

/// Narrow 62x35 rooms show the top bar and the playing hint line.
const PLAYING_HINT: &str = "Arrows/WASD move";
/// The 62x35 layout is compact: board at (3, 2), 56x31 cells.
const WINDOW_COLS: u16 = 62;
const WINDOW_ROWS: u16 = 35;
const BOARD_X: usize = 3;
const BOARD_Y: usize = 2;
/// Maze row 4 is `#..........................#`: border walls, dot corridor.
const ROW_TY: usize = 4;

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

/// One live terminal session on a PTY, torn down on drop (even on panic).
struct Session {
    pty: Pty,
    child: Child,
    dir: std::path::PathBuf,
    out: Vec<u8>,
}

impl Session {
    fn start(tag: &str, cols: u16, rows: u16) -> Self {
        let pty = open_pty(cols, rows);
        let dir =
            std::env::temp_dir().join(format!("maze-chase-geometry-{tag}-{}", std::process::id()));
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
        // Own session + this PTY as controlling terminal, so the child's
        // crossterm::terminal::size() reads the PTY under test via
        // /dev/tty, not the developer's real terminal.
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
/// (CSI `H`), applies printable characters to the grid, counts every
/// character written per row (overflow included), and ignores all other
/// escape sequences. MATCHES: `\x1b[?2026h/l` (sync), `\x1b[2J` (clear),
/// SGR `m`, cursor `H`.
struct PaintedFrame {
    cells: Vec<Vec<char>>,
    written: Vec<usize>,
    cursor: (usize, usize),
}

impl PaintedFrame {
    fn feed(frame: &str, cols: usize, rows: usize) -> Self {
        let mut grid = PaintedFrame {
            cells: vec![vec![' '; cols]; rows],
            written: vec![0; rows],
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
            // BEL and other control bytes do not advance the cursor.
            if c.is_control() {
                continue;
            }
            let (r, col) = grid.cursor;
            if r < grid.written.len() {
                grid.written[r] += 1;
                if col < grid.cells[r].len() {
                    grid.cells[r][col] = c;
                }
            }
            grid.cursor = (r, col + 1);
        }
        grid
    }
}

/// The shipped board at the 62x35 minimum must paint each row exactly
/// `cols` characters wide and show its right wall inside the window.
/// (Pre-fix this row emitted 118 characters and the right wall landed at
/// column 114, far past the window edge.)
#[test]
fn right_wall_renders_inside_a_62x35_window() {
    let mut s = Session::start("min", WINDOW_COLS, WINDOW_ROWS);
    assert!(
        s.wait("video tier:", Duration::from_secs(15)),
        "title screen never appeared; tail: {}",
        tail(&s.out)
    );
    s.type_bytes(b"\r");
    assert!(
        s.wait(PLAYING_HINT, Duration::from_secs(5)),
        "Enter did not start play at 62x35; tail: {}",
        tail(&s.out)
    );

    // Capture a complete playing frame painted after this point.
    s.clear_output();
    assert!(
        s.wait("\x1b[?2026l", Duration::from_secs(5)),
        "no complete frame after entering play; tail: {}",
        tail(&s.out)
    );
    let frame = last_complete_frame(&s.out).expect("captured a complete frame");
    let grid = PaintedFrame::feed(&frame, WINDOW_COLS as usize, WINDOW_ROWS as usize);

    let row = BOARD_Y + ROW_TY;
    assert_eq!(
        grid.written[row],
        WINDOW_COLS as usize,
        "board row {row} must write exactly one character per terminal column; frame tail: {}",
        tail(&s.out)
    );
    // Maze row 4 is a dot corridor inside border walls: no wall glyph may
    // appear in the interior, and the right border (tile 27, lx 54-55)
    // must be painted at window columns 57-58, inside the 62-column room.
    let text: String = grid.cells[row].iter().collect();
    assert_eq!(
        grid.cells[row][BOARD_X], '█',
        "left wall missing at column {BOARD_X}; row: {text:?}"
    );
    assert_eq!(
        grid.cells[row][BOARD_X + 54],
        '█',
        "right wall missing at column 57; row: {text:?}"
    );
    assert_eq!(
        grid.cells[row][BOARD_X + 55],
        '█',
        "right wall missing at column 58; row: {text:?}"
    );
    assert!(
        !grid.cells[row][BOARD_X + 2..BOARD_X + 54].contains(&'█'),
        "corridor row painted a wall glyph in its interior; row: {text:?}"
    );
}
