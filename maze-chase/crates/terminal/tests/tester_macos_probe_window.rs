//! macOS tester regression suite: keys typed during the startup Sixel probe
//! window must never be consumed or misread.
//!
//! Two residual defects found on a real macOS terminal after the first fix
//! pass (bounded probe):
//!
//! 1. In-window steal: an Enter typed immediately at launch (while the DA1
//!    probe is still waiting for a reply) is read by the probe and silently
//!    discarded, so play never starts. The probe must not swallow it.
//! 2. False Sixel: a stray `4` key typed in the same window is parsed as an
//!    (unframed) DA1 reply and flips the renderer to Sixel on a terminal
//!    that never announced it. `probe_ok` must only accept a positively
//!    framed `ESC [ ? ... c` reply.
#![cfg(unix)]

use std::io::{Read, Write};
use std::os::fd::{AsRawFd, FromRawFd, OwnedFd};
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

struct Pty {
    master: std::fs::File,
    slave: std::fs::File,
}

/// Open a PTY pair with a fixed window size and non-blocking master reads.
fn open_pty(cols: u16, rows: u16) -> Pty {
    unsafe {
        let master = libc::posix_openpt(libc::O_RDWR | libc::O_NOCTTY);
        assert!(master >= 0, "posix_openpt failed");
        assert_eq!(libc::grantpt(master), 0, "grantpt failed");
        assert_eq!(libc::unlockpt(master), 0, "unlockpt failed");
        let name = libc::ptsname(master);
        assert!(!name.is_null(), "ptsname failed");
        let slave = libc::open(name, libc::O_RDWR | libc::O_NOCTTY);
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

/// Drain the PTY until `needle` appears in the accumulated output.
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

fn spawn_terminal(tag: &str) -> (Pty, std::process::Child, std::path::PathBuf) {
    let pty = open_pty(100, 40);
    let dir = std::env::temp_dir().join(format!("maze-chase-{tag}-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    let child = Command::new(env!("CARGO_BIN_EXE_maze-chase-terminal"))
        .arg("--dir")
        .arg(&dir)
        .env("TERM", "xterm-256color")
        .env("COLORTERM", "truecolor")
        .env_remove("MAZE_CHASE_TIER")
        .stdin(Stdio::from(pty.slave.try_clone().unwrap()))
        .stdout(Stdio::from(pty.slave.try_clone().unwrap()))
        .stderr(Stdio::from(pty.slave.try_clone().unwrap()))
        .spawn()
        .expect("spawn maze-chase-terminal");
    (pty, child, dir)
}

/// A `4` typed while the probe window is open must not be mistaken for a
/// DA1 reply. On a truecolor terminal the title must keep reporting
/// `truecolor-cells` and no Sixel payload may be emitted.
#[test]
fn stray_four_during_probe_window_never_flips_to_sixel() {
    let (mut pty, mut child, dir) = spawn_terminal("probe-window-four");

    // Queued in the input line discipline before the probe even starts, so
    // the probe reads it as "the terminal's reply".
    (&pty.master).write_all(b"4").unwrap();

    let mut out = Vec::new();
    let titled = wait_for(
        &mut pty.master,
        &mut out,
        "video tier:",
        Duration::from_secs(15),
    );
    assert!(titled, "title screen never appeared; tail: {}", tail(&out));

    // Let the tier decision settle: a false positive repaints as sixel.
    let deadline = Instant::now() + Duration::from_millis(1500);
    while Instant::now() < deadline {
        drain(&mut pty.master, &mut out);
        std::thread::sleep(Duration::from_millis(20));
    }
    let text = String::from_utf8_lossy(&out);

    let _ = child.kill();
    let _ = child.wait();
    let _ = std::fs::remove_dir_all(&dir);

    assert!(
        !text.contains("video tier: sixel"),
        "a stray '4' key flipped the renderer to sixel; tail: {}",
        tail(&out)
    );
    assert!(
        text.contains("video tier: truecolor-cells"),
        "title must report the truecolor tier; tail: {}",
        tail(&out)
    );
    assert!(
        !text.contains("\x1bPq"),
        "no Sixel payload may be emitted on a non-sixel terminal; tail: {}",
        tail(&out)
    );
}

/// An Enter typed while the probe window is open must not be swallowed:
/// the game must start without a second press.
#[test]
fn enter_during_probe_window_still_starts_play() {
    let (mut pty, mut child, dir) = spawn_terminal("probe-window-enter");

    // Queued before the probe starts; a stealing probe consumes it here.
    (&pty.master).write_all(b"\r").unwrap();

    let mut out = Vec::new();
    let titled = wait_for(
        &mut pty.master,
        &mut out,
        "video tier:",
        Duration::from_secs(15),
    );
    assert!(titled, "title screen never appeared; tail: {}", tail(&out));

    let started = wait_for(
        &mut pty.master,
        &mut out,
        "Arrows/WASD move",
        Duration::from_secs(5),
    );

    let _ = child.kill();
    let _ = child.wait();
    let _ = std::fs::remove_dir_all(&dir);

    assert!(
        started,
        "the Enter typed during the probe window was swallowed; tail: {}",
        tail(&out)
    );
}

/// `probe_ok` must be conservative: only a positively framed DA1 reply
/// (`ESC [ ? ... c`) announcing parameter 4 counts as Sixel support.
#[test]
fn probe_ok_rejects_unframed_stray_keys() {
    use maze_chase_terminal::sixel::probe_ok;
    assert!(probe_ok("\x1b[?62;4c"));
    assert!(probe_ok("\x1b[?63;1;2;4;6c"));
    assert!(!probe_ok("4"));
    assert!(!probe_ok("4c"));
    assert!(!probe_ok("m4"));
    assert!(!probe_ok("\x1b[?62c"));
    assert!(!probe_ok("garbage"));
}
