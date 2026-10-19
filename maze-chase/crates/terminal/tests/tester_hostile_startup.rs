//! Tester hostile-startup regression suite for the Phase 3 terminal
//! overhaul (PR #693).
//!
//! A FIFO in the game's config directory used to hang the shipped
//! binary before it painted its first frame. The E5 repair guarded the
//! two *writers* (`persist::save_to`, `scores::save_to`) against FIFO
//! paths, but the two *readers* still call `std::fs::read_to_string`
//! (`persist::load_from`, `scores::load_from`), and opening a FIFO
//! read-only blocks until a writer appears. A `--dir` whose
//! `settings.txt` or `scores.txt` is a FIFO must fail fast (defaults
//! plus a notice) and paint the title, exactly like every other hostile
//! state the hostile suite already covers.
#![cfg(unix)]

use std::ffi::CString;
use std::io::{Read, Write};
use std::os::fd::{AsRawFd, FromRawFd, OwnedFd};
use std::os::unix::ffi::OsStrExt;
use std::os::unix::process::CommandExt;
use std::path::Path;
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

/// First line of the ASCII-art title banner (`screens.rs`); it is
/// painted at every tier, so its absence proves startup never finished.
const TITLE_MARKER: &str = "a maze-chase arcade original";

struct Pty {
    master: std::fs::File,
    slave: std::fs::File,
}

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

fn session_dir(tag: &str) -> std::path::PathBuf {
    let dir = std::env::temp_dir().join(format!("maze-chase-{tag}-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).expect("create session dir");
    dir
}

fn own_controlling_tty() -> impl FnMut() -> std::io::Result<()> {
    || {
        unsafe {
            libc::setsid();
            libc::ioctl(0, libc::TIOCSCTTY as _, 0);
        }
        Ok(())
    }
}

fn spawn_pty(dir: &Path) -> (Pty, Child) {
    let pty = open_pty(100, 40);
    let mut cmd = Command::new(env!("CARGO_BIN_EXE_maze-chase-terminal"));
    cmd.arg("--dir")
        .arg(dir)
        .arg("--tier")
        .arg("legacy")
        .env("TERM", "xterm-256color")
        .env("COLORTERM", "truecolor")
        .stdin(Stdio::from(pty.slave.try_clone().unwrap()))
        .stdout(Stdio::from(pty.slave.try_clone().unwrap()))
        .stderr(Stdio::from(pty.slave.try_clone().unwrap()));
    unsafe {
        cmd.pre_exec(own_controlling_tty());
    }
    let child = cmd.spawn().expect("spawn maze-chase-terminal");
    (pty, child)
}

fn mkfifo(path: &Path) {
    let c = CString::new(path.as_os_str().as_bytes()).expect("fifo path has no NUL");
    let rc = unsafe { libc::mkfifo(c.as_ptr(), 0o600) };
    assert_eq!(rc, 0, "mkfifo {} failed", path.display());
    let meta = std::fs::symlink_metadata(path).expect("fifo metadata");
    use std::os::unix::fs::FileTypeExt;
    assert!(
        meta.file_type().is_fifo(),
        "{} is not a FIFO",
        path.display()
    );
}

fn drain(master: &mut std::fs::File, out: &mut Vec<u8>) {
    let mut buf = [0u8; 8192];
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
        let ms = remaining.as_millis().min(25) as i32;
        unsafe { libc::poll(&mut pfd, 1, ms) };
    }
}

/// Reap a killed PTY child without ever blocking the suite, draining
/// the non-blocking master so a pending write can finish on macOS.
fn reap(
    child: &mut Child,
    master: &mut std::fs::File,
    out: &mut Vec<u8>,
) -> Option<std::process::ExitStatus> {
    let _ = child.kill();
    let deadline = Instant::now() + Duration::from_secs(5);
    loop {
        drain(master, out);
        match child.try_wait() {
            Ok(Some(status)) => return Some(status),
            Ok(None) => {}
            Err(_) => return None,
        }
        if Instant::now() >= deadline {
            return None;
        }
        std::thread::sleep(Duration::from_millis(10));
    }
}

fn tail(bytes: &[u8]) -> String {
    let text: Vec<char> = String::from_utf8_lossy(bytes).chars().collect();
    let start = text.len().saturating_sub(400);
    text[start..].iter().collect()
}

/// Spawn the shipped binary against `dir`, require the title banner
/// within the bound, then quit with Esc and require a clean exit.
fn assert_startup_paints_title(dir: &Path, what: &str) {
    let (mut pty, mut child) = spawn_pty(dir);
    let mut out = Vec::new();
    let painted = wait_for(
        &mut pty.master,
        &mut out,
        TITLE_MARKER,
        Duration::from_secs(8),
    );
    if !painted {
        let status = reap(&mut child, &mut pty.master, &mut out);
        panic!(
            "startup blocked with {what}: no title banner within 8s \
             (child status {status:?}); output tail: {:?}",
            tail(&out)
        );
    }
    pty.master
        .write_all(b"\x1b")
        .expect("send Esc to quit on the title");
    let deadline = Instant::now() + Duration::from_secs(5);
    loop {
        drain(&mut pty.master, &mut out);
        match child.try_wait() {
            Ok(Some(status)) => {
                assert!(status.success(), "unclean exit after {what}: {status:?}");
                return;
            }
            Ok(None) => {}
            Err(e) => panic!("wait failed after {what}: {e}"),
        }
        if Instant::now() >= deadline {
            let status = reap(&mut child, &mut pty.master, &mut out);
            panic!(
                "binary did not exit after Esc with {what} (reaped {status:?}); \
                 output tail: {:?}",
                tail(&out)
            );
        }
        std::thread::sleep(Duration::from_millis(10));
    }
}

/// Control: an ordinary config directory paints the title, so a failure
/// of the FIFO tests below means the child really blocked, not that the
/// harness looked for the wrong bytes.
#[test]
fn regular_config_dir_paints_title() {
    let dir = session_dir("startup-control");
    assert_startup_paints_title(&dir, "a regular config directory");
    let _ = std::fs::remove_dir_all(&dir);
}

/// A FIFO at `settings.txt` must fail fast with defaults plus a notice;
/// `persist::load_from` blocking in `std::fs::read_to_string` hangs the
/// game before the first frame.
#[test]
fn fifo_settings_does_not_block_startup() {
    let dir = session_dir("startup-fifo-settings");
    mkfifo(&dir.join("settings.txt"));
    assert_startup_paints_title(&dir, "a FIFO settings.txt");
    let _ = std::fs::remove_dir_all(&dir);
}

/// Same contract for the score table: `scores::load_from` must not
/// block on a FIFO `scores.txt`.
#[test]
fn fifo_scores_does_not_block_startup() {
    let dir = session_dir("startup-fifo-scores");
    mkfifo(&dir.join("scores.txt"));
    assert_startup_paints_title(&dir, "a FIFO scores.txt");
    let _ = std::fs::remove_dir_all(&dir);
}
