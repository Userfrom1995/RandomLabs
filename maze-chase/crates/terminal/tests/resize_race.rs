//! Durable regression for the live-resize race (issue #634): a keypress
//! that lands in the same epoll batch as SIGWINCH must never leave the
//! window showing a stale layout.
//!
//! crossterm 0.29 registers the TTY (token 0) and its signal-hook-mio
//! pipe (token 1) on one edge-triggered epoll. When both become ready
//! before the same `epoll_wait` returns, `try_read` processes the TTY
//! token first, parses the key, and returns: the signal pipe byte is
//! left unread and, being edge-triggered, is never reported again. The
//! `Resize` event is lost until the next real size change, so the app
//! used to keep the old layout.
//!
//! The race is forced deterministically instead of probabilistically:
//! SIGSTOP the app, queue a key byte (arming the TTY epoll edge first),
//! change the PTY winsize, queue SIGWINCH (pending while stopped), then
//! SIGCONT. The handler writes the signal byte at resume - after the
//! TTY edge - so the first `epoll_wait` after resume reports
//! `[TTY, SIGNAL]` in that order: the key is consumed and the resize
//! event is dropped. The render loop's per-frame reconciliation must
//! re-fit the layout anyway.
//!
//! Both tests pin the shipped binary on a real PTY:
//!
//! 1. `plain_sigwinch_resize_re_fits` is the control: a plain
//!    `TIOCSWINSZ` + SIGWINCH (no key racing it) must repaint at the
//!    new size. If this fails, the harness itself stopped delivering
//!    resize signals and test 2 would prove nothing.
//! 2. `same_batch_key_and_sigwinch_resize_is_never_lost` is the
//!    regression: after the forced same-batch race the size-stamped
//!    too-small card must paint within one frame, with no second size
//!    change. The unfixed binary fails this (verified 5/5 trials); the
//!    reconciliation fix passes within a frame.
#![cfg(unix)]

use std::io::{Read, Write};
use std::os::fd::{AsRawFd, FromRawFd, OwnedFd};
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

/// Playing surface at 100x40: the wide side panel carries this marker.
const PLAYING_MARKER: &str = "move: arrows/WASD";
/// Too-small card at 61x35 is size-stamped: exactly the raced target.
const CARD_61X35: &str = "window 61x35 is too small";

struct Pty {
    master: std::fs::File,
    slave: std::fs::File,
}

/// Serializes the MT-Unsafe `ptsname` static buffer across the parallel
/// test threads in this binary (`ptsname_r` is ENOTSUP on macOS).
static PTSNAME_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());

/// Open a PTY pair with a fixed window size and non-blocking master reads.
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
        resize_pty_raw(master, cols, rows);
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

unsafe fn resize_pty_raw(master: i32, cols: u16, rows: u16) {
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
}

/// Change the kernel window size behind the PTY (the app only notices
/// via its size reconciliation or a subsequently delivered Resize).
fn set_winsize(master: &std::fs::File, cols: u16, rows: u16) {
    unsafe { resize_pty_raw(master.as_raw_fd(), cols, rows) }
}

fn send_signal(pid: u32, signal: i32) {
    let rc = unsafe { libc::kill(pid as libc::pid_t, signal) };
    assert_eq!(rc, 0, "kill({pid}, {signal}) failed");
}

/// SIGSTOP the child and block until the kernel confirms it is stopped.
/// Only then is it deterministic that the next queued key byte and the
/// pending SIGWINCH both sit on the epoll ready list.
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

/// One live terminal session on a PTY, torn down on drop (even on
/// panic), so a stopped child can never leak past a failing assertion.
struct Session {
    pty: Pty,
    child: Child,
    dir: std::path::PathBuf,
    out: Vec<u8>,
}

impl Session {
    /// Start the shipped binary at `cols`x`rows` on a legacy tier (no
    /// Sixel probe, deterministic text markers) and play its title.
    fn start(tag: &str, cols: u16, rows: u16) -> Self {
        let pty = open_pty(cols, rows);
        let dir = std::env::temp_dir().join(format!("maze-chase-{tag}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        let child = Command::new(env!("CARGO_BIN_EXE_maze-chase-terminal"))
            .arg("--dir")
            .arg(&dir)
            .arg("--tier")
            .arg("legacy")
            .env("TERM", "xterm-256color")
            .env_remove("MAZE_CHASE_TIER")
            .stdin(Stdio::from(pty.slave.try_clone().unwrap()))
            .stdout(Stdio::from(pty.slave.try_clone().unwrap()))
            .stderr(Stdio::from(pty.slave.try_clone().unwrap()))
            .spawn()
            .expect("spawn maze-chase-terminal");
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

    /// Title visible, then Enter starts play; the wide 100x40 layout
    /// shows the side-panel playing marker.
    fn reach_playing(&mut self) {
        assert!(
            self.wait("video tier:", Duration::from_secs(15)),
            "title screen never appeared; tail: {}",
            tail(&self.out)
        );
        (&self.pty.master).write_all(b"\r").unwrap();
        assert!(
            self.wait(PLAYING_MARKER, Duration::from_secs(5)),
            "Enter did not start play; tail: {}",
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

/// Control: a plain SIGWINCH resize (nothing racing it) must repaint at
/// the new size. This pins the harness's signal delivery: if the kernel
/// sizes and the app's event source ever stopped talking, test 2 would
/// be vacuous.
#[test]
fn plain_sigwinch_resize_re_fits() {
    let mut s = Session::start("resize-control", 100, 40);
    s.reach_playing();

    s.clear_output();
    set_winsize(&s.pty.master, 61, 35);
    send_signal(s.child.id(), libc::SIGWINCH);
    let card = s.wait(CARD_61X35, Duration::from_secs(5));
    assert!(
        card,
        "plain SIGWINCH resize never re-fit the layout; tail: {}",
        tail(&s.out)
    );
}

/// Regression for issue #634: after the forced same-batch
/// key+SIGWINCH race the layout must re-fit by itself. The window is
/// read once before the race so the assertion can only be satisfied by
/// a frame painted after it; no second size change ever follows.
#[test]
fn same_batch_key_and_sigwinch_resize_is_never_lost() {
    let mut s = Session::start("resize-race", 100, 40);
    s.reach_playing();

    // Stale-free assertion window: every byte read from here on is a
    // 100x40 playing frame, so the card can only come from the race.
    s.clear_output();

    stop_child(&s.child);
    // Arm the TTY epoll edge first...
    (&s.pty.master).write_all(b"x").unwrap();
    // ...then change the size and queue the resize behind it.
    set_winsize(&s.pty.master, 61, 35);
    send_signal(s.child.id(), libc::SIGWINCH);
    send_signal(s.child.id(), libc::SIGCONT);

    let card = s.wait(CARD_61X35, Duration::from_secs(3));
    assert!(
        card,
        "the resize raced by the key was lost: layout stayed at 100x40; tail: {}",
        tail(&s.out)
    );

    // Liveness echo: a normal resize after the race still re-fits, so
    // the session survived and fresh frames keep flowing.
    s.clear_output();
    set_winsize(&s.pty.master, 100, 40);
    send_signal(s.child.id(), libc::SIGWINCH);
    let playing = s.wait(PLAYING_MARKER, Duration::from_secs(5));
    assert!(
        playing,
        "the session stopped re-fitting after the race; tail: {}",
        tail(&s.out)
    );
}
