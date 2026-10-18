//! Hostile regression coverage for the live-resize reconciliation fix
//! (issue #634), complementing `tests/resize_race.rs`.
//!
//! The fix makes the render loop compare `crossterm::terminal::size()`
//! against the applied layout every frame, so a Resize event dropped by
//! the event source (same epoll batch as a key) can never leave a stale
//! layout on screen. These tests attack that promise from four angles:
//!
//! 1. `repeated_same_batch_races_never_latch` - the same forced race is
//!    replayed four times back and forth between 100x40 and 61x35: every
//!    single race must converge on its own (no one-shot latch, both
//!    directions, no accumulated drift).
//! 2. `same_batch_race_into_degenerate_size_then_back` - the race is
//!    forced into a size below the 62x35 minimum (the size-stamped "too
//!    small" card) and then raced back up to the full playing layout.
//! 3. `resize_storm_in_one_stopped_window_converges_to_last_size` - four
//!    winsize flips piled up inside one stopped window produce a single
//!    coalesced SIGWINCH; the stale event source drops it, and the
//!    layout must still land on the *last* kernel size on the next frame.
//! 4. `same_batch_race_while_paused_still_re_fits` - reconciliation must
//!    be screen-independent: the same race while paused on the menu has
//!    to repaint, then resume back into play.
//!
//! Every convergence assertion is preceded by draining the PTY, so the
//! expected marker can only come from a frame painted after the race;
//! no test ever performs a second size change to unstick itself.
#![cfg(unix)]

use std::io::{Read, Write};
use std::os::fd::{AsRawFd, FromRawFd, OwnedFd};
use std::os::unix::process::CommandExt;
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

/// Playing surface at 100x40: the wide side panel carries this marker.
const PLAYING_MARKER: &str = "move: arrows/WASD";
/// Pause menu title, visible at any non-degenerate size.
const PAUSED_MARKER: &str = "PAUSED";
/// The race target below the 62x35 minimum renders a size-stamped card.
const CARD_61X35: &str = "window 61x35 is too small";
const CARD_40X20: &str = "window 40x20 is too small";

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
        set_winsize_raw(master, cols, rows);
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

unsafe fn set_winsize_raw(fd: i32, cols: u16, rows: u16) {
    let ws = libc::winsize {
        ws_row: rows,
        ws_col: cols,
        ws_xpixel: 0,
        ws_ypixel: 0,
    };
    assert_eq!(
        libc::ioctl(fd, libc::TIOCSWINSZ as _, &ws as *const libc::winsize),
        0,
        "TIOCSWINSZ failed"
    );
}

fn set_winsize(master: &std::fs::File, cols: u16, rows: u16) {
    unsafe { set_winsize_raw(master.as_raw_fd(), cols, rows) }
}

fn send_signal(pid: u32, signal: i32) {
    let rc = unsafe { libc::kill(pid as libc::pid_t, signal) };
    assert_eq!(rc, 0, "kill({pid}, {signal}) failed");
}

/// SIGSTOP the child and block until the kernel confirms it is stopped,
/// so the forced batch ordering below is deterministic on resume.
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
            "maze-chase-hostile-{tag}-{}-{}",
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

    fn reach_playing(&mut self) {
        assert!(
            self.wait("video tier:", Duration::from_secs(15)),
            "title screen never appeared; tail: {}",
            tail(&self.out)
        );
        self.type_bytes(b"\r");
        assert!(
            self.wait(PLAYING_MARKER, Duration::from_secs(5)),
            "Enter did not start play; tail: {}",
            tail(&self.out)
        );
    }

    /// Force the issue #634 race: key byte arms the TTY epoll edge, then
    /// the winsize change + SIGWINCH queue behind it while stopped, so
    /// the first post-resume `epoll_wait` consumes the key and drops the
    /// signal byte.
    fn force_same_batch_race(&mut self, cols: u16, rows: u16) {
        stop_child(&self.child);
        self.type_bytes(b"x");
        set_winsize(&self.pty.master, cols, rows);
        send_signal(self.child.id(), libc::SIGWINCH);
        send_signal(self.child.id(), libc::SIGCONT);
    }

    /// Assert the session converges on `needle` after the forced race,
    /// with no second size change to unstick it.
    fn assert_converges(&mut self, needle: &str) {
        let ok = self.wait(needle, Duration::from_secs(3));
        assert!(
            ok,
            "race was never reconciled to {needle:?}; tail: {}",
            tail(&self.out)
        );
    }
}

impl Drop for Session {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
        let _ = std::fs::remove_dir_all(&self.dir);
    }
}

/// Replay the exact same-batch race four times, alternating directions.
/// Each race must heal independently: a latch, a dropped second race, or
/// drift in either direction fails the loop.
#[test]
fn repeated_same_batch_races_never_latch() {
    let mut s = Session::start("repeat", 100, 40);
    s.reach_playing();

    for (round, (cols, rows, marker)) in [
        (61u16, 35u16, CARD_61X35),
        (100, 40, PLAYING_MARKER),
        (61, 35, CARD_61X35),
        (100, 40, PLAYING_MARKER),
    ]
    .into_iter()
    .enumerate()
    {
        s.clear_output();
        s.force_same_batch_race(cols, rows);
        let ok = s.wait(marker, Duration::from_secs(3));
        assert!(
            ok,
            "race round {round} ({cols}x{rows}) was never reconciled; tail: {}",
            tail(&s.out)
        );
    }

    // Liveness after four races: a clean resize still repaints.
    s.clear_output();
    set_winsize(&s.pty.master, 61, 35);
    send_signal(s.child.id(), libc::SIGWINCH);
    assert!(
        s.wait(CARD_61X35, Duration::from_secs(5)),
        "session stopped re-fitting after the race loop; tail: {}",
        tail(&s.out)
    );
}

/// The race target can undershoot the minimum window entirely; the
/// size-stamped card must appear, and a second race must climb back to
/// the full playing layout.
#[test]
fn same_batch_race_into_degenerate_size_then_back() {
    let mut s = Session::start("degenerate", 100, 40);
    s.reach_playing();

    s.clear_output();
    s.force_same_batch_race(40, 20);
    s.assert_converges(CARD_40X20);

    s.clear_output();
    s.force_same_batch_race(100, 40);
    s.assert_converges(PLAYING_MARKER);

    // The simulation survived both races: steering still repaints play.
    s.clear_output();
    s.type_bytes(b"\x1b[C");
    assert!(
        s.wait(PLAYING_MARKER, Duration::from_secs(3)),
        "play did not continue after the degenerate-size race; tail: {}",
        tail(&s.out)
    );
}

/// Four winsize flips pile up behind one SIGSTOP; the kernel coalesces
/// them into a single SIGWINCH and the event source loses it in the same
/// batch as the queued keys. The layout must land on the *last* size.
#[test]
fn resize_storm_in_one_stopped_window_converges_to_last_size() {
    let mut s = Session::start("storm", 100, 40);
    s.reach_playing();

    s.clear_output();
    stop_child(&s.child);
    s.type_bytes(b"xxx");
    for (cols, rows) in [(80u16, 30u16), (61, 35), (100, 40), (61, 35)] {
        set_winsize(&s.pty.master, cols, rows);
    }
    send_signal(s.child.id(), libc::SIGWINCH);
    send_signal(s.child.id(), libc::SIGCONT);

    // Only the final 61x35 may be painted: no intermediate 80x30 card
    // and never a stale 100x40 play frame.
    let ok = s.wait(CARD_61X35, Duration::from_secs(3));
    assert!(
        ok,
        "storm did not converge on the last size 61x35; tail: {}",
        tail(&s.out)
    );
    let seen = String::from_utf8_lossy(&s.out);
    assert!(
        !seen.contains("window 80x30") && !seen.contains(PLAYING_MARKER),
        "storm painted a stale/intermediate layout; tail: {}",
        tail(&s.out)
    );
}

/// Reconciliation must not be a playing-screen special case: the same
/// race while paused re-fits the menu, and play resumes afterwards.
#[test]
fn same_batch_race_while_paused_still_re_fits() {
    let mut s = Session::start("paused", 100, 40);
    s.reach_playing();

    s.clear_output();
    s.type_bytes(b"p");
    assert!(
        s.wait(PAUSED_MARKER, Duration::from_secs(5)),
        "p did not pause; tail: {}",
        tail(&s.out)
    );

    s.clear_output();
    s.force_same_batch_race(61, 35);
    s.assert_converges(CARD_61X35);

    s.clear_output();
    s.force_same_batch_race(100, 40);
    s.assert_converges(PAUSED_MARKER);

    s.clear_output();
    s.type_bytes(b"\r");
    assert!(
        s.wait(PLAYING_MARKER, Duration::from_secs(5)),
        "Enter did not resume play after the paused races; tail: {}",
        tail(&s.out)
    );
}
