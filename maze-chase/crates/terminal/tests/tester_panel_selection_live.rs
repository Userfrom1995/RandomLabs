//! Live selection-affordance contracts for the terminal panels.
//!
//! The title card paints its selected row in the theme accent. The
//! Settings screen must do the same: `paint_panel` carries an accent
//! branch for `> ` rows, so a selected row that renders in `theme.text`
//! instead is a real selection-affordance defect. These tests drive the
//! shipped binary through a PTY (the same path a player uses) rather than
//! calling the private painter.
//!
//! The high-contrast companion proves the Settings row toggles the
//! committed theme end to end: the panel repaints with the Moonwake
//! background, the choice is written back to `settings.txt`, and the
//! returned title card carries the Moonwake accent.
#![cfg(unix)]

use std::io::{Read, Write};
use std::os::fd::{AsRawFd, FromRawFd, OwnedFd};
use std::os::unix::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

const DUSK_ACCENT: &[u8] = b"\x1b[38;2;240;180;90m";
const MOONWAKE_ACCENT: &[u8] = b"\x1b[38;2;127;232;255m";
const MOONWAKE_BG: &[u8] = b"\x1b[48;2;6;8;12m";

struct Pty {
    master: std::fs::File,
    slave: std::fs::File,
}

/// `ptsname` returns a shared static buffer; serialize it across the
/// parallel test threads in this binary.
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
    needle: &[u8],
    timeout: Duration,
) -> bool {
    let deadline = Instant::now() + timeout;
    loop {
        drain(master, out);
        if out.windows(needle.len()).any(|w| w == needle) {
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

fn wait_for_file(path: &Path, needle: &str, timeout: Duration) -> bool {
    let deadline = Instant::now() + timeout;
    loop {
        if let Ok(text) = std::fs::read_to_string(path) {
            if text.contains(needle) {
                return true;
            }
        }
        if Instant::now() >= deadline {
            return false;
        }
        std::thread::sleep(Duration::from_millis(20));
    }
}

struct Session {
    pty: Pty,
    child: Child,
    dir: PathBuf,
    out: Vec<u8>,
}

impl Session {
    fn start(tag: &str, settings: &str) -> Self {
        let pty = open_pty(90, 40);
        let dir =
            std::env::temp_dir().join(format!("maze-chase-panel-{tag}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).expect("settings dir");
        std::fs::write(dir.join("settings.txt"), settings).expect("seed settings");
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

    fn write(&mut self, bytes: &[u8]) {
        (&self.pty.master)
            .write_all(bytes)
            .expect("write to the game PTY");
    }

    fn wait(&mut self, needle: &[u8], timeout: Duration) -> bool {
        wait_for(&mut self.pty.master, &mut self.out, needle, timeout)
    }

    fn clear(&mut self) {
        drain(&mut self.pty.master, &mut self.out);
        self.out.clear();
    }

    fn settle(&mut self) {
        std::thread::sleep(Duration::from_millis(120));
        drain(&mut self.pty.master, &mut self.out);
    }

    fn title(&mut self) {
        assert!(
            self.wait(b"start a hunt in the pond", Duration::from_secs(15)),
            "title card never appeared; tail: {}",
            tail(&self.out)
        );
    }

    fn down_until(&mut self, marker: &[u8]) {
        self.write(b"\x1b[B");
        assert!(
            self.wait(marker, Duration::from_secs(5)),
            "Down did not select {:?}; tail: {}",
            String::from_utf8_lossy(marker),
            tail(&self.out)
        );
    }

    fn open_settings(&mut self) {
        self.title();
        self.clear();
        self.down_until(b"> How to play");
        self.down_until(b"> High scores");
        self.down_until(b"> Settings");
        self.write(b"\r");
        assert!(
            self.wait(b"SETTINGS", Duration::from_secs(5))
                && self.wait(b"> Difficulty", Duration::from_secs(5)),
            "Enter did not open Settings; tail: {}",
            tail(&self.out)
        );
    }

    fn select_high_contrast(&mut self) {
        self.open_settings();
        self.clear();
        for _ in 0..8 {
            self.write(b"\x1b[B");
            std::thread::sleep(Duration::from_millis(120));
        }
        assert!(
            self.wait(b"> High contrast", Duration::from_secs(5)),
            "eight Downs did not reach High contrast; tail: {}",
            tail(&self.out)
        );
        self.settle();
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
fn title_selection_uses_the_theme_accent() {
    let mut session = Session::start("title-accent", "");
    session.title();
    session.settle();
    assert!(
        session
            .out
            .windows(DUSK_ACCENT.len())
            .any(|w| w == DUSK_ACCENT),
        "control: the selected title row must paint in the Dusk accent; tail: {}",
        tail(&session.out)
    );
}

#[test]
fn selected_settings_row_uses_the_theme_accent() {
    let mut session = Session::start("accent", "high_contrast = false\ntheme = dusk-pond\n");
    session.select_high_contrast();

    let frame = String::from_utf8_lossy(&session.out);
    assert!(
        frame.contains("> High contrast"),
        "the High contrast row must be selected; frame tail: {}",
        tail(&session.out)
    );
    assert!(
        session
            .out
            .windows(DUSK_ACCENT.len())
            .any(|w| w == DUSK_ACCENT),
        "the selected Settings row must paint in the Dusk accent (#F0B45A), like the \
         title/pause selection does. paint_panel checks starts_with(\"> \") after \
         chrome::centered has prepended padding, so the accent branch is dead and the \
         row renders in theme.text. Frame tail: {}",
        tail(&session.out)
    );
}

#[test]
fn high_contrast_toggle_repaints_and_persists() {
    let mut session = Session::start(
        "high-contrast",
        "high_contrast = false\ntheme = dusk-pond\n",
    );
    session.select_high_contrast();
    session.clear();

    session.write(b"\x1b[C");
    assert!(
        session.wait(MOONWAKE_BG, Duration::from_secs(5)),
        "toggling High contrast must repaint the panel in the Moonwake background; tail: {}",
        tail(&session.out)
    );
    assert!(
        wait_for_file(
            &session.dir.join("settings.txt"),
            "high_contrast = true",
            Duration::from_secs(2)
        ),
        "the High contrast toggle must be written back to settings.txt; file: {:?}",
        std::fs::read_to_string(session.dir.join("settings.txt"))
    );

    session.clear();
    session.write(b"\x1b");
    assert!(
        session.wait(b"clear 445 crumbs", Duration::from_secs(5)),
        "Esc must return to the title; tail: {}",
        tail(&session.out)
    );
    session.settle();
    assert!(
        session
            .out
            .windows(MOONWAKE_ACCENT.len())
            .any(|w| w == MOONWAKE_ACCENT),
        "the title selection must carry the Moonwake accent after the toggle; tail: {}",
        tail(&session.out)
    );
    assert!(
        !session
            .out
            .windows(DUSK_ACCENT.len())
            .any(|w| w == DUSK_ACCENT),
        "the title must not keep the old Dusk accent after High contrast is on; tail: {}",
        tail(&session.out)
    );
}
