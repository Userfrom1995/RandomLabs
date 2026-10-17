//! macOS tester end-to-end suite for the shipped terminal binary.
//!
//! Pins the native user flows proven on a real Mac against the real
//! binary on a real PTY (macOS 26.6.2, arm64): a full title -> play ->
//! pause -> resume -> quit-to-title session that exits 0 and restores
//! the terminal modes it found, live resize across the 62x35 too-small
//! boundary while playing (the running session survives the round
//! trip), and a real game-over run that persists its score row to
//! `scores.txt`.
//!
//! The child is given a controlling terminal (`setsid` plus
//! `TIOCSCTTY`) so `TIOCSWINSZ` delivers `SIGWINCH` exactly as a real
//! terminal window resize does; the earlier probe suites do not need
//! that and deliberately skip it.
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

/// Open a PTY pair with a fixed window size and non-blocking master
/// reads, and snapshot the slave's initial termios state.
fn open_pty(cols: u16, rows: u16) -> (Pty, libc::termios) {
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
        let mut attrs = std::mem::zeroed::<libc::termios>();
        assert_eq!(libc::tcgetattr(slave, &mut attrs), 0, "tcgetattr failed");
        let master = std::fs::File::from(OwnedFd::from_raw_fd(master));
        let flags = libc::fcntl(master.as_raw_fd(), libc::F_GETFL);
        assert_ne!(flags, -1, "F_GETFL failed");
        assert_ne!(
            libc::fcntl(master.as_raw_fd(), libc::F_SETFL, flags | libc::O_NONBLOCK),
            -1,
            "F_SETFL failed"
        );
        (
            Pty {
                master,
                slave: std::fs::File::from(OwnedFd::from_raw_fd(slave)),
            },
            attrs,
        )
    }
}

fn termios_state(fd: i32) -> libc::termios {
    unsafe {
        let mut attrs = std::mem::zeroed::<libc::termios>();
        assert_eq!(libc::tcgetattr(fd, &mut attrs), 0, "tcgetattr failed");
        attrs
    }
}

fn termios_equal(a: &libc::termios, b: &libc::termios) -> bool {
    a.c_iflag == b.c_iflag
        && a.c_oflag == b.c_oflag
        && a.c_cflag == b.c_cflag
        && a.c_lflag == b.c_lflag
        && a.c_cc == b.c_cc
}

/// The session under test: PTY, child, and a background reader thread
/// that continuously drains the master. Without a continuous reader a
/// full-speed repaint fills the PTY output buffer, the child blocks on
/// its frame write, and its game clock (dt clamped at 250 ms) falls
/// behind wall time; every timing-sensitive flow here then degrades.
struct Session {
    pty: Pty,
    child: Child,
    out: std::sync::Arc<std::sync::Mutex<Vec<u8>>>,
    stop: std::sync::Arc<std::sync::atomic::AtomicBool>,
    reader: Option<std::thread::JoinHandle<()>>,
    dir_hint: std::path::PathBuf,
}

fn spawn(tag: &str, args: &[&str]) -> (Session, libc::termios, std::path::PathBuf) {
    let dir =
        std::env::temp_dir().join(format!("maze-chase-macos-e2e-{tag}-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    let (session, attrs) = spawn_at(&dir, args);
    (session, attrs, dir)
}

/// Spawn the shipped binary against an explicit scratch directory that
/// the caller may have pre-seeded (config files must exist before the
/// process boots).
fn spawn_at(dir: &std::path::Path, args: &[&str]) -> (Session, libc::termios) {
    let (pty, attrs) = open_pty(100, 40);
    let mut cmd = Command::new(env!("CARGO_BIN_EXE_maze-chase-terminal"));
    cmd.arg("--dir")
        .arg(dir)
        .args(args)
        .env("TERM", "xterm-256color")
        .env("COLORTERM", "truecolor")
        .env_remove("MAZE_CHASE_TIER")
        .stdin(Stdio::from(pty.slave.try_clone().unwrap()))
        .stdout(Stdio::from(pty.slave.try_clone().unwrap()))
        .stderr(Stdio::from(pty.slave.try_clone().unwrap()));
    unsafe {
        cmd.pre_exec(|| {
            libc::setsid();
            libc::ioctl(0, libc::TIOCSCTTY as _, 0);
            Ok(())
        });
    }
    let child = cmd.spawn().expect("spawn maze-chase-terminal");

    let out = std::sync::Arc::new(std::sync::Mutex::new(Vec::new()));
    let stop = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
    let mut reader_master = pty.master.try_clone().expect("clone master for reader");
    let reader_out = out.clone();
    let reader_stop = stop.clone();
    let reader = std::thread::spawn(move || {
        let mut buf = [0u8; 8192];
        loop {
            match reader_master.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let mut guard = reader_out.lock().unwrap();
                    guard.extend_from_slice(&buf[..n]);
                    // Keep memory bounded on multi-minute game runs: the
                    // search markers repaint every frame, so dropping old
                    // bytes can never lose a marker for long.
                    if guard.len() > 8 * 1024 * 1024 {
                        let keep = guard.len() - 4 * 1024 * 1024;
                        guard.drain(..keep);
                    }
                }
                Err(e) if e.kind() == std::io::ErrorKind::Interrupted => continue,
                Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    if reader_stop.load(std::sync::atomic::Ordering::Relaxed) {
                        break;
                    }
                    std::thread::sleep(Duration::from_millis(2));
                }
                Err(_) => break,
            }
        }
    });

    (
        Session {
            pty,
            child,
            out,
            stop,
            reader: Some(reader),
            dir_hint: dir.to_path_buf(),
        },
        attrs,
    )
}

impl Session {
    fn send(&self, bytes: &[u8]) {
        (&self.pty.master).write_all(bytes).unwrap();
    }

    fn resize(&self, cols: u16, rows: u16) {
        let ws = libc::winsize {
            ws_row: rows,
            ws_col: cols,
            ws_xpixel: 0,
            ws_ypixel: 0,
        };
        let rc = unsafe {
            libc::ioctl(
                self.pty.master.as_raw_fd(),
                libc::TIOCSWINSZ as _,
                &ws as *const libc::winsize,
            )
        };
        assert_eq!(rc, 0, "TIOCSWINSZ on the master failed");
    }

    /// Wait until `needle` appears; the matched bytes (and everything
    /// before them) are then discarded so later markers must arrive in
    /// a later frame.
    fn wait_for(&mut self, needle: &str, timeout: Duration) -> bool {
        let deadline = Instant::now() + timeout;
        loop {
            {
                let mut guard = self.out.lock().unwrap();
                let hay = String::from_utf8_lossy(&guard);
                if let Some(idx) = hay.find(needle) {
                    guard.drain(..idx + needle.len());
                    return true;
                }
            }
            if Instant::now() >= deadline {
                return false;
            }
            std::thread::sleep(Duration::from_millis(10));
        }
    }

    fn wait_exit(&mut self, timeout: Duration) -> Option<std::process::ExitStatus> {
        let deadline = Instant::now() + timeout;
        loop {
            if let Some(status) = self.child.try_wait().unwrap() {
                return Some(status);
            }
            if Instant::now() >= deadline {
                return None;
            }
            std::thread::sleep(Duration::from_millis(20));
        }
    }

    fn tail(&self) -> String {
        let guard = self.out.lock().unwrap();
        let text: Vec<char> = String::from_utf8_lossy(&guard).chars().collect();
        let start = text.len().saturating_sub(400);
        text[start..].iter().collect()
    }

    fn finish(mut self) -> std::process::ExitStatus {
        let status = if let Some(status) = self.child.try_wait().unwrap() {
            status
        } else {
            let _ = self.child.kill();
            self.child.wait().unwrap()
        };
        self.stop.store(true, std::sync::atomic::Ordering::Relaxed);
        if let Some(reader) = self.reader.take() {
            let _ = reader.join();
        }
        let _ = std::fs::remove_dir_all(&self.dir_hint);
        status
    }
}

/// Title -> play -> pause -> resume -> pause -> quit-to-title -> Esc
/// exits cleanly with code 0 and leaves the terminal modes exactly as
/// they were found (no raw-mode leak for the user's shell).
#[test]
fn full_session_exits_clean_and_restores_termios() {
    let (mut s, before, dir) = spawn("full-session", &["--tier", "truecolor"]);

    assert!(
        s.wait_for("video tier: truecolor-cells", Duration::from_secs(15)),
        "title screen never appeared; tail: {}",
        s.tail()
    );
    s.send(b"\r");
    assert!(
        s.wait_for("SCORE ", Duration::from_secs(6)),
        "Enter on Play must start the run; tail: {}",
        s.tail()
    );
    s.send(b"p");
    assert!(
        s.wait_for("PAUSED", Duration::from_secs(5)),
        "P must pause; tail: {}",
        s.tail()
    );
    s.send(b"p");
    assert!(
        s.wait_for("SCORE ", Duration::from_secs(5)),
        "P on the pause menu must resume; tail: {}",
        s.tail()
    );
    s.send(b"p");
    assert!(
        s.wait_for("PAUSED", Duration::from_secs(5)),
        "second P must pause again; tail: {}",
        s.tail()
    );
    s.send(b"\x1b[B");
    std::thread::sleep(Duration::from_millis(300));
    s.send(b"\r");
    assert!(
        s.wait_for("video tier:", Duration::from_secs(6)),
        "Down + Enter on the pause menu must return to the title; tail: {}",
        s.tail()
    );
    s.send(b"\x1b");
    let status = s.wait_exit(Duration::from_secs(8));

    let restored = {
        let attrs_after = termios_state(s.pty.master.as_raw_fd());
        termios_equal(&before, &attrs_after)
    };
    let status_copy = status;
    s.finish();

    let status = status_copy.expect("Esc on the title must exit the game");
    assert_eq!(status.code(), Some(0), "a clean quit exits 0");
    assert!(
        restored,
        "the terminal modes were not restored after exit (raw-mode leak)"
    );
    let _ = std::fs::remove_dir_all(&dir);
}

/// Shrinking the window below 62x35 mid-play shows the too-small card,
/// growing back repaints the live game (the simulation never
/// restarts), and a normal quit still works afterwards.
#[test]
fn live_resize_too_small_card_recovers_mid_play() {
    let (mut s, _before, dir) = spawn("live-resize", &["--tier", "truecolor"]);

    assert!(
        s.wait_for("video tier: truecolor-cells", Duration::from_secs(15)),
        "title screen never appeared; tail: {}",
        s.tail()
    );
    s.resize(50, 20);
    assert!(
        s.wait_for("needs at least 62x35", Duration::from_secs(8)),
        "shrinking below the minimum must show the too-small card; tail: {}",
        s.tail()
    );
    s.resize(100, 40);
    assert!(
        s.wait_for("video tier:", Duration::from_secs(8)),
        "growing back must repaint the title; tail: {}",
        s.tail()
    );
    s.send(b"\r");
    assert!(
        s.wait_for("SCORE ", Duration::from_secs(6)),
        "Play must start; tail: {}",
        s.tail()
    );
    s.resize(50, 20);
    assert!(
        s.wait_for("needs at least 62x35", Duration::from_secs(8)),
        "a mid-play shrink must show the too-small card; tail: {}",
        s.tail()
    );
    s.resize(61, 35);
    assert!(
        s.wait_for("window 61x35 is too small", Duration::from_secs(8)),
        "one column short of the minimum must stay on the too-small card; tail: {}",
        s.tail()
    );
    s.resize(62, 34);
    assert!(
        s.wait_for("window 62x34 is too small", Duration::from_secs(8)),
        "one row short of the minimum must stay on the too-small card; tail: {}",
        s.tail()
    );
    s.resize(62, 35);
    assert!(
        s.wait_for("SCORE ", Duration::from_secs(8)),
        "the exact 62x35 minimum must repaint the running game; tail: {}",
        s.tail()
    );
    s.resize(100, 40);
    assert!(
        s.wait_for("SCORE ", Duration::from_secs(8)),
        "growing back must repaint the running game; tail: {}",
        s.tail()
    );
    s.send(b"p");
    assert!(
        s.wait_for("PAUSED", Duration::from_secs(5)),
        "P must still pause after the resize round-trip; tail: {}",
        s.tail()
    );
    s.send(b"\x1b[B");
    std::thread::sleep(Duration::from_millis(300));
    s.send(b"\r");
    assert!(
        s.wait_for("video tier:", Duration::from_secs(6)),
        "quit-to-title after resize; tail: {}",
        s.tail()
    );
    s.send(b"\x1b");
    let status = s.wait_exit(Duration::from_secs(8));
    let status_copy = status;
    s.finish();
    assert_eq!(
        status_copy.expect("clean exit after resize").code(),
        Some(0),
        "the resized session must still quit cleanly"
    );
    let _ = std::fs::remove_dir_all(&dir);
}

/// A real game-over run (Harsh preset: single life, so the wardens end
/// it quickly when the player stands still) writes exactly one score
/// row to `scores.txt` and returns to the title.
#[test]
fn game_over_writes_a_scores_row() {
    let dir = std::env::temp_dir().join(format!(
        "maze-chase-macos-e2e-game-over-{}",
        std::process::id()
    ));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    std::fs::write(
        dir.join("settings.txt"),
        "# maze-chase config (hand-rolled key = value; see persist.rs)\ndifficulty = harsh\n",
    )
    .unwrap();
    let (mut s, _before) = spawn_at(&dir, &["--tier", "truecolor"]);

    assert!(
        s.wait_for("video tier: truecolor-cells", Duration::from_secs(15)),
        "title screen never appeared; tail: {}",
        s.tail()
    );
    s.send(b"\r");
    assert!(
        s.wait_for("SCORE ", Duration::from_secs(6)),
        "Play must start; tail: {}",
        s.tail()
    );
    assert!(
        s.wait_for("GAME OVER", Duration::from_secs(240)),
        "a still player must eventually be caught by the wardens; tail: {}",
        s.tail()
    );
    std::thread::sleep(Duration::from_millis(800));
    s.send(b"\r");
    assert!(
        s.wait_for("video tier:", Duration::from_secs(6)),
        "Enter on the game-over screen returns to the title; tail: {}",
        s.tail()
    );
    s.send(b"\x1b");
    let status = s.wait_exit(Duration::from_secs(8));

    assert_eq!(
        status.expect("clean exit after game over").code(),
        Some(0),
        "the game-over session must still quit cleanly"
    );
    let body =
        std::fs::read_to_string(dir.join("scores.txt")).expect("scores.txt written at game over");
    let rows: Vec<&str> = body
        .lines()
        .filter(|l| !l.trim().is_empty() && !l.starts_with('#'))
        .collect();
    assert_eq!(rows.len(), 1, "exactly one run recorded; body:\n{body}");
    let fields: Vec<&str> = rows[0].split('|').map(str::trim).collect();
    assert_eq!(
        fields.len(),
        4,
        "the recorded row must be `score | level | mode | date`; row: {}",
        rows[0]
    );
    let score: u32 = fields[0].parse().unwrap_or_else(|_| {
        panic!(
            "the recorded row must carry a numeric score; row: {}",
            rows[0]
        )
    });
    assert!(
        score > 0,
        "a Harsh run must record a positive score; row: {}",
        rows[0]
    );
    let level: u32 = fields[1].parse().unwrap_or_else(|_| {
        panic!(
            "the recorded row must carry a numeric level; row: {}",
            rows[0]
        )
    });
    assert_eq!(
        level, 1,
        "Harsh starts at level 1, so a parse fallback is caught here; row: {}",
        rows[0]
    );
    assert_eq!(
        fields[2], "sprint",
        "Harsh maps to the sprint mode, not the Classic fallback; row: {}",
        rows[0]
    );
    s.finish();
    let _ = std::fs::remove_dir_all(&dir);
}
