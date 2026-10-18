//! Resize-contract and trace coverage for Phase 2 of the overhaul
//! (issues #673/#674):
//!
//! 1. `kitty_resize_clears_stale_placements_and_repaints` pins the
//!    bitmap resize contract on the shipped binary: the first frame
//!    after a live resize must (a) clear the screen (`ESC[2J`), (b)
//!    delete every live Kitty placement (`ESC_Ga=d ESC\`), and (c)
//!    re-display the board image in that same frame. Before this
//!    contract, a resized frame left the old placement on the old cell
//!    grid until the next image tick and only cleared glyph fragments.
//!    `kitty_shrink_into_too_small_deletes_placements_and_draws_card`
//!    pins the same contract on the shrink-into-too-small path: the
//!    card's first frame must clear, delete every placement, then draw
//!    the card, with no fresh display escape.
//!
//! 2. `trace_env_emits_start_plan_and_frame_records` pins the
//!    `MAZE_CHASE_TRACE` machine trace the compatibility harness
//!    ingests (`tools/compat/collect.py`): one JSON object per line with
//!    `start`, `plan` (including the post-resize plan), and bitmap
//!    `frame` records. A trace that stops after `start`, loses the plan
//!    on resize, or omits frames would leave the harness blind.
#![cfg(unix)]

use std::io::{Read, Write};
use std::os::fd::{AsRawFd, FromRawFd, OwnedFd};
use std::os::unix::process::CommandExt;
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

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
    fn start(tag: &str, cols: u16, rows: u16, trace: Option<&std::path::Path>) -> Self {
        let pty = open_pty(cols, rows);
        let dir = std::env::temp_dir().join(format!(
            "maze-chase-plan-{tag}-{}-{}",
            std::process::id(),
            cols
        ));
        let _ = std::fs::remove_dir_all(&dir);
        let mut cmd = Command::new(env!("CARGO_BIN_EXE_maze-chase-terminal"));
        cmd.arg("--dir")
            .arg(&dir)
            .arg("--tier")
            .arg("kitty")
            .env("TERM", "xterm-kitty")
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
        }
    }

    fn wait(&mut self, needle: &str, timeout: Duration) -> bool {
        wait_for(&mut self.pty.master, &mut self.out, needle, timeout)
    }

    fn reach_playing(&mut self) {
        assert!(
            self.wait("video tier:", Duration::from_secs(15)),
            "title screen never appeared; tail: {}",
            tail(&self.out)
        );
        (&self.pty.master).write_all(b"\r").unwrap();
        assert!(
            self.wait("SCORE ", Duration::from_secs(8)),
            "Enter did not start play; tail: {}",
            tail(&self.out)
        );
    }

    fn clear_output(&mut self) {
        drain(&mut self.pty.master, &mut self.out);
        self.out.clear();
    }
}

impl Drop for Session {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
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

/// A live resize on the Kitty tier must repaint from scratch in one
/// frame: clear, delete every live placement, re-display the board.
#[test]
fn kitty_resize_clears_stale_placements_and_repaints() {
    let mut s = Session::start("contract", 62, 35, None);
    s.reach_playing();
    assert!(
        s.wait("\x1b_Ga=T", Duration::from_secs(8)),
        "the playing frame must carry a Kitty display escape; tail: {}",
        tail(&s.out)
    );

    s.clear_output();
    set_winsize(&s.pty.master, 100, 40);
    send_signal(s.child.id(), libc::SIGWINCH);
    assert!(
        s.wait("\x1b_Ga=T", Duration::from_secs(8)),
        "the resized frame never repainted the board; tail: {}",
        tail(&s.out)
    );
    assert!(
        s.wait("\x1b[?2026l", Duration::from_secs(8)),
        "the resized frame never closed; tail: {}",
        tail(&s.out)
    );

    let frame = frame_containing(&s.out, "\x1b_Ga=T").expect("captured a resized frame");
    assert!(
        frame.contains("\x1b[2J"),
        "the resize frame must clear stale glyphs before repainting"
    );
    assert!(
        frame.contains("\x1b_Ga=d\x1b\\"),
        "the resize frame must delete every live placement before repainting"
    );
    let clear = frame.find("\x1b[2J").unwrap();
    let delete_all = frame.find("\x1b_Ga=d\x1b\\").unwrap();
    let display = frame.find("\x1b_Ga=T").unwrap();
    assert!(
        clear < delete_all && delete_all < display,
        "the resize frame must clear, delete, then re-display (got {clear} < {delete_all} < {display})"
    );
}

/// Shrinking below the minimum on the Kitty tier must take the same
/// stale-placement kill: the too-small card's first frame clears the
/// screen, deletes every live placement, then draws the card, and never
/// displays a fresh board image. Before this contract, the shrink path
/// emitted `ESC[2J` alone, so a Kitty-compatible terminal that does not
/// clear graphics on ED2 kept the old board behind the card.
#[test]
fn kitty_shrink_into_too_small_deletes_placements_and_draws_card() {
    let mut s = Session::start("toosmall", 62, 35, None);
    s.reach_playing();
    assert!(
        s.wait("\x1b_Ga=T", Duration::from_secs(8)),
        "the playing frame must carry a Kitty display escape; tail: {}",
        tail(&s.out)
    );

    s.clear_output();
    set_winsize(&s.pty.master, 40, 20);
    send_signal(s.child.id(), libc::SIGWINCH);
    assert!(
        s.wait("window 40x20 is too small", Duration::from_secs(8)),
        "the too-small card never appeared; tail: {}",
        tail(&s.out)
    );
    assert!(
        s.wait("\x1b[?2026l", Duration::from_secs(8)),
        "the too-small frame never closed; tail: {}",
        tail(&s.out)
    );

    let frame = frame_containing(&s.out, "window 40x20 is too small")
        .expect("captured the too-small frame");
    assert!(
        frame.contains("\x1b[2J"),
        "the too-small frame must clear stale glyphs"
    );
    assert!(
        frame.contains("\x1b_Ga=d\x1b\\"),
        "the too-small frame must delete every live placement"
    );
    let clear = frame.find("\x1b[2J").unwrap();
    let delete_all = frame.find("\x1b_Ga=d\x1b\\").unwrap();
    let card = frame.find("window 40x20 is too small").unwrap();
    assert!(
        clear < delete_all && delete_all < card,
        "the too-small frame must clear, delete, then draw the card (got {clear} < {delete_all} < {card})"
    );
    assert!(
        !frame.contains("\x1b_Ga=T"),
        "the too-small frame must not display a fresh board image"
    );
}

/// `MAZE_CHASE_TRACE` must emit machine-readable JSONL records for the
/// harness: start, plan, the post-resize plan, and bitmap frames.
#[test]
fn trace_env_emits_start_plan_and_frame_records() {
    let trace_path = std::env::temp_dir().join(format!(
        "maze-chase-trace-{}-{}.jsonl",
        std::process::id(),
        Instant::now().elapsed().as_nanos()
    ));
    let _ = std::fs::remove_file(&trace_path);
    let mut s = Session::start("trace", 62, 35, Some(&trace_path));
    s.reach_playing();
    assert!(
        s.wait("\x1b_Ga=T", Duration::from_secs(8)),
        "the playing frame must carry a Kitty display escape; tail: {}",
        tail(&s.out)
    );

    s.clear_output();
    set_winsize(&s.pty.master, 100, 40);
    send_signal(s.child.id(), libc::SIGWINCH);
    assert!(
        s.wait("\x1b_Ga=T", Duration::from_secs(8)),
        "the resized frame never repainted the board; tail: {}",
        tail(&s.out)
    );

    let raw = std::fs::read_to_string(&trace_path).expect("trace file written");
    let lines: Vec<&str> = raw.lines().collect();
    assert!(
        lines.len() >= 4,
        "trace must hold start + plan + frames + post-resize plan, got {raw}"
    );
    for line in &lines {
        assert!(
            line.starts_with('{') && line.ends_with('}') && line.contains("\"kind\":\""),
            "every trace line must be one JSON object: {line}"
        );
        assert!(
            line.contains("\"ts_ms\":"),
            "every record is timestamped: {line}"
        );
    }
    assert!(
        lines
            .iter()
            .any(|l| l.contains("\"kind\":\"start\"") && l.contains("\"cols\":62")),
        "start record must carry the launch size: {raw}"
    );
    assert!(
        lines.iter().any(|l| l.contains("\"kind\":\"plan\"")
            && l.contains("\"cols\":62")
            && l.contains("\"cell_cols\":2")),
        "the launch plan (2x1 at 62x35) must be traced: {raw}"
    );
    assert!(
        lines.iter().any(|l| l.contains("\"kind\":\"plan\"")
            && l.contains("\"cols\":100")
            && l.contains("\"chrome\":\"band\"")),
        "the post-resize plan (100x40 band) must be traced: {raw}"
    );
    assert!(
        lines.iter().any(|l| l.contains("\"kind\":\"frame\"")),
        "bitmap frames must be traced: {raw}"
    );
    let _ = std::fs::remove_file(&trace_path);
}
