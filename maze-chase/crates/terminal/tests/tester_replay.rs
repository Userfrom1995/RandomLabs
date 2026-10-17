//! Tester regression suite: every key typed during the startup Sixel
//! probe window is replayed into the game, not just Enter.
//!
//! The macOS-pinned suite (`tester_macos_probe_window.rs`) proves an
//! in-window Enter starts play and a stray `4` cannot announce Sixel.
//! This suite pins the rest of the replay contract end to end against
//! the real binary on a real PTY:
//!
//! 1. A non-Enter key (`m`) captured by the probe is decoded and applied
//!    through the same `on_key` path as live input: the mute toggle
//!    lands and persists to `settings.txt`, so replay is not limited to
//!    the Confirm action.
//! 2. Captured escape sequences replay in order (`ArrowDown` then
//!    `Enter` opens the Help entry, proving the arrow was applied before
//!    the Enter and not dropped).
//! 3. Random capture garbage never panics the decoder and decodes
//!    deterministically (hostile red-team pin for the replay path).
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

/// A non-Enter key captured by the probe (`m`, mute) must replay through
/// the live input path: play still starts on the captured Enter AND the
/// mute toggle persists to `settings.txt`. Before the replay fix this
/// path only ever re-read bytes as an internal event and dropped them.
#[test]
fn in_window_mute_key_replays_and_persists() {
    let (mut pty, mut child, dir) = spawn_terminal("replay-mute");

    // Queued before the probe starts: the probe reads both bytes as user
    // input, keeps them out of the reply, and replays them in order.
    (&pty.master).write_all(b"m\r").unwrap();

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

    // The mute replay saves immediately; give the write a moment to land
    // before the assertion (it happens in the same on_key call).
    let settings = dir.join("settings.txt");
    let mut muted = false;
    let deadline = Instant::now() + Duration::from_secs(3);
    while Instant::now() < deadline {
        if let Ok(text) = std::fs::read_to_string(&settings) {
            if text.contains("mute = true") {
                muted = true;
                break;
            }
        }
        std::thread::sleep(Duration::from_millis(25));
    }

    let _ = child.kill();
    let _ = child.wait();
    let _ = std::fs::remove_dir_all(&dir);

    assert!(
        started,
        "the Enter captured during the probe window was swallowed; tail: {}",
        tail(&out)
    );
    assert!(
        muted,
        "the in-window 'm' was not replayed into the settings commit; settings.txt: {:?}",
        std::fs::read_to_string(dir.join("settings.txt"))
    );
}

/// Captured escape sequences replay in order: `ArrowDown` then `Enter`
/// typed during the probe window must move the title menu off Play and
/// confirm Help, not start the game.
#[test]
fn in_window_arrow_replays_before_enter() {
    let (mut pty, mut child, dir) = spawn_terminal("replay-arrow");

    // Down moves the menu from Play to "How to play"; Enter confirms it.
    (&pty.master).write_all(b"\x1b[B\r").unwrap();

    let mut out = Vec::new();
    let titled = wait_for(
        &mut pty.master,
        &mut out,
        "video tier:",
        Duration::from_secs(15),
    );
    assert!(titled, "title screen never appeared; tail: {}", tail(&out));

    let helped = wait_for(
        &mut pty.master,
        &mut out,
        "HOW TO PLAY",
        Duration::from_secs(5),
    );

    let _ = child.kill();
    let _ = child.wait();
    let _ = std::fs::remove_dir_all(&dir);

    assert!(
        helped,
        "the captured ArrowDown+Enter did not replay in order; tail: {}",
        tail(&out)
    );
    // Confirm the arrow really moved the cursor: Help opened instead of
    // the game starting.
    assert!(
        !String::from_utf8_lossy(&out).contains("Arrows/WASD move"),
        "the captured arrow was dropped and Enter started play; tail: {}",
        tail(&out)
    );
}

/// Hostile pin: random capture garbage never panics the decoder and the
/// decode is deterministic (same bytes, same keys).
#[test]
fn captured_garbage_decodes_deterministically_without_panic() {
    use maze_chase_terminal::input::keys_from_captured_bytes;

    let mut state: u64 = 0x9E3779B97F4A7C15;
    for round in 0..8192usize {
        let len = (round * 31 % 64) + 1;
        let mut bytes = Vec::with_capacity(len);
        for _ in 0..len {
            // xorshift64*: deterministic, dependency-free.
            state ^= state << 13;
            state ^= state >> 7;
            state ^= state << 17;
            bytes.push((state >> 32) as u8);
        }
        let first = keys_from_captured_bytes(&bytes);
        let second = keys_from_captured_bytes(&bytes);
        assert_eq!(
            first.len(),
            second.len(),
            "non-deterministic decode for {bytes:02x?}"
        );
        for (a, b) in first.iter().zip(second.iter()) {
            assert_eq!(a, b, "non-deterministic key for {bytes:02x?}");
        }
    }
}
