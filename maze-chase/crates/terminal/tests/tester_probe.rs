//! Tester regression suite for the startup Sixel DA1 probe.
//!
//! Pins the native macOS finding: when the terminal never answers the DA1
//! probe (some multiplexers swallow replies), the old probe helper thread
//! stayed blocked in `stdin().read()` and consumed the next key the user
//! typed, so the first Enter was silently dropped and play only started
//! on a second press. The probe is now a bounded, non-stealing wait: on a
//! PTY that never answers DA1, one single Enter right after the title
//! must start the game.
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
            // WouldBlock (nothing ready) and EIO (child exited) both end
            // this drain; the caller decides whether to keep waiting.
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

/// A DA1 reply split across two writes must still be assembled inside
/// the probe budget: the fragmented `ESC[?6` + `2;4c` announces Sixel,
/// so the session must enter the sixel tier without swallowing the
/// single Enter that follows.
#[test]
fn fragmented_da1_reply_selects_sixel_and_play_still_starts() {
    let mut pty = open_pty(100, 40);
    let dir = std::env::temp_dir().join(format!("maze-chase-probe-frag-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    let mut child = Command::new(env!("CARGO_BIN_EXE_maze-chase-terminal"))
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

    let mut out = Vec::new();
    assert!(
        wait_for(&mut pty.master, &mut out, "\x1b[c", Duration::from_secs(15)),
        "DA1 probe request never appeared; tail: {}",
        tail(&out)
    );
    (&pty.master).write_all(b"\x1b[?6").unwrap();
    std::thread::sleep(Duration::from_millis(60));
    (&pty.master).write_all(b"2;4c").unwrap();

    assert!(
        wait_for(
            &mut pty.master,
            &mut out,
            "video tier: sixel",
            Duration::from_secs(10)
        ),
        "fragmented DA1 reply must select the sixel tier; tail: {}",
        tail(&out)
    );

    // One Enter, after the probe already consumed its reply. The playing
    // surface's top bar / side panel carry "SCORE " (the title does not),
    // and the probe trail replaces the hint line, so that is the marker.
    (&pty.master).write_all(b"\r").unwrap();
    let started = wait_for(&mut pty.master, &mut out, "SCORE ", Duration::from_secs(5));
    let _ = child.kill();
    let _ = child.wait();
    let _ = std::fs::remove_dir_all(&dir);
    assert!(
        started,
        "one Enter after sixel detection must start play; tail: {}",
        tail(&out)
    );
}

/// A DA1 reply that arrives after the 250 ms deadline (a slow or busy
/// terminal) must not corrupt the input stream: it is parsed as an
/// internal crossterm event and dropped, the tier stays on cells, and
/// the next single Enter still starts play.
#[test]
fn late_da1_reply_never_steals_the_next_key() {
    let mut pty = open_pty(100, 40);
    let dir = std::env::temp_dir().join(format!("maze-chase-probe-late-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    let mut child = Command::new(env!("CARGO_BIN_EXE_maze-chase-terminal"))
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

    let mut out = Vec::new();
    assert!(
        wait_for(
            &mut pty.master,
            &mut out,
            "video tier: truecolor-cells",
            Duration::from_secs(15)
        ),
        "title never appeared; tail: {}",
        tail(&out)
    );
    // The probe returned long ago; this reply is late by construction.
    std::thread::sleep(Duration::from_millis(150));
    (&pty.master).write_all(b"\x1b[?62;4c").unwrap();
    std::thread::sleep(Duration::from_millis(150));
    (&pty.master).write_all(b"\r").unwrap();

    let started = wait_for(&mut pty.master, &mut out, "SCORE ", Duration::from_secs(5));
    let _ = child.kill();
    let _ = child.wait();
    let _ = std::fs::remove_dir_all(&dir);
    assert!(
        started,
        "late DA1 reply must not break the next single Enter; tail: {}",
        tail(&out)
    );
    assert!(
        !String::from_utf8_lossy(&out).contains("video tier: sixel"),
        "a reply after the deadline must not upgrade the tier; tail: {}",
        tail(&out)
    );
}

#[test]
fn one_enter_starts_the_game_after_a_silent_da1_probe() {
    let mut pty = open_pty(100, 40);
    let dir = std::env::temp_dir().join(format!("maze-chase-probe-e2e-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    let mut child = Command::new(env!("CARGO_BIN_EXE_maze-chase-terminal"))
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

    // Title marker: the title panel's "video tier:" line. The DA1 probe
    // gets no reply on this PTY, so this also proves the game starts
    // within its 250 ms probe budget.
    let mut out = Vec::new();
    assert!(
        wait_for(
            &mut pty.master,
            &mut out,
            "video tier:",
            Duration::from_secs(15)
        ),
        "title screen never appeared; tail: {}",
        tail(&out)
    );

    // Exactly one Enter, typed while the probe is long past and the PTY
    // never sent a DA1 reply.
    (&pty.master).write_all(b"\r").unwrap();

    // The playing hint only exists on the play surface (the title uses
    // "Arrows move" without the WASD pair).
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
        "one Enter must start play (key was swallowed); tail: {}",
        tail(&out)
    );
}
