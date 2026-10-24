//! Regression for the terminal play path: `reduced_motion` must reach the
//! gameplay renderers, not just the title and pause staging paths.
//!
//! The cell rung draws a sunseed halo as `○○` only while motion is allowed;
//! under reduced motion every sunseed holds `●●`. That makes a live PTY
//! frame the honest observable: this test seeds `reduced_motion = true` in
//! the settings file, starts a real run on the truecolor tier, and fails if
//! any halo glyph appears. The control session runs the same path with
//! motion enabled and requires the halo to appear, so the assertion cannot
//! pass on a renderer that never draws sunseeds.
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

/// The first complete synchronized frame (`?2026h` ... `?2026l`) whose
/// bytes contain `needle`. The title's staged board can paint the same
/// glyphs, so only a frame carrying the play chrome proves what the
/// playing surface painted.
fn first_frame_containing(bytes: &[u8], needle: &str) -> Option<String> {
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

fn reap(child: &mut Child, master: &mut std::fs::File, out: &mut Vec<u8>) {
    let deadline = Instant::now() + Duration::from_secs(5);
    loop {
        drain(master, out);
        match child.try_wait() {
            Ok(Some(_)) | Err(_) => return,
            Ok(None) => {}
        }
        if Instant::now() >= deadline {
            return;
        }
        std::thread::sleep(Duration::from_millis(10));
    }
}

struct Session {
    pty: Pty,
    child: Child,
    dir: std::path::PathBuf,
    out: Vec<u8>,
}

impl Session {
    fn start(tag: &str, reduced_motion: bool) -> Self {
        let pty = open_pty(90, 40);
        let dir =
            std::env::temp_dir().join(format!("maze-chase-fx-motion-{tag}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).expect("settings dir");
        std::fs::write(
            dir.join("settings.txt"),
            format!("reduced_motion = {reduced_motion}\n"),
        )
        .expect("settings file");
        let mut cmd = Command::new(env!("CARGO_BIN_EXE_maze-chase-terminal"));
        cmd.arg("--dir")
            .arg(&dir)
            .arg("--tier")
            .arg("truecolor")
            .env("TERM", "xterm-256color")
            .env_remove("COLORTERM")
            .env_remove("MAZE_CHASE_TIER")
            .stdin(Stdio::from(pty.slave.try_clone().unwrap()))
            .stdout(Stdio::from(pty.slave.try_clone().unwrap()))
            .stderr(Stdio::from(pty.slave.try_clone().unwrap()));
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
            self.wait("video tier: truecolor-cells", Duration::from_secs(15)),
            "title screen never appeared; tail: {}",
            tail(&self.out)
        );
        (&self.pty.master).write_all(b"\r").unwrap();
        assert!(
            self.wait("SCORE ", Duration::from_secs(8)),
            "Enter did not start play; tail: {}",
            tail(&self.out)
        );
        drain(&mut self.pty.master, &mut self.out);
    }

    /// Keep reading for `window` so the child is never blocked on a full
    /// PTY buffer while the animation frames elapse.
    fn drain_for(&mut self, window: Duration) {
        let deadline = Instant::now() + window;
        loop {
            drain(&mut self.pty.master, &mut self.out);
            let remaining = deadline.saturating_duration_since(Instant::now());
            if remaining.is_zero() {
                return;
            }
            std::thread::sleep(remaining.min(Duration::from_millis(25)));
        }
    }

    /// The first complete play frame (a frame carrying the `SCORE `
    /// chrome). It is a full repaint, so the sunseeds and lives it
    /// paints are all in this frame.
    fn play_frame(&mut self, timeout: Duration) -> String {
        let deadline = Instant::now() + timeout;
        loop {
            drain(&mut self.pty.master, &mut self.out);
            if let Some(frame) = first_frame_containing(&self.out, "SCORE ") {
                return frame;
            }
            let remaining = deadline.saturating_duration_since(Instant::now());
            if remaining.is_zero() {
                panic!(
                    "the first play frame never completed; tail: {}",
                    tail(&self.out)
                );
            }
            std::thread::sleep(remaining.min(Duration::from_millis(10)));
        }
    }
}

impl Drop for Session {
    fn drop(&mut self) {
        let _ = self.child.kill();
        reap(&mut self.child, &mut self.pty.master, &mut self.out);
        let _ = std::fs::remove_dir_all(&self.dir);
    }
}

#[test]
fn reduced_motion_holds_the_sunseed_halo_during_play() {
    let mut reduced = Session::start("on", true);
    reduced.reach_playing();
    // The first play frame is a full repaint: assert both invariants on
    // it before the title's staged board is discarded, so an unchanged
    // sunseed cell that is never re-sent cannot hide the glyphs.
    let frame = reduced.play_frame(Duration::from_secs(8));
    assert!(
        !frame.contains('○'),
        "reduced_motion must hold every sunseed as `●●` during play; frame tail: {}",
        tail(frame.as_bytes())
    );
    assert!(
        frame.contains('●'),
        "the first play frame must paint sunseeds/lives; frame tail: {}",
        tail(frame.as_bytes())
    );

    // Several halo windows (halo toggles every 200 ms) with no `○`
    // allowed. Drain while they elapse: a full frame is larger than a
    // PTY buffer, so a sleeping reader can leave the child blocked
    // mid-frame and miss the rows that carry the sunseeds.
    reduced.out.clear();
    reduced.drain_for(Duration::from_millis(900));
    let text = String::from_utf8_lossy(&reduced.out);
    assert!(
        !text.contains('○'),
        "reduced_motion must hold every sunseed as `●●` during play; tail: {}",
        tail(&reduced.out)
    );

    let mut moving = Session::start("off", false);
    moving.reach_playing();
    moving.out.clear();
    assert!(
        wait_for(
            &mut moving.pty.master,
            &mut moving.out,
            "○",
            Duration::from_secs(5)
        ),
        "control session with motion enabled must paint the halo; tail: {}",
        tail(&moving.out)
    );
}
