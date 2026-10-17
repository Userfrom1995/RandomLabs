//! Tier precedence regressions for the shipped binary (issue #615).
//!
//! The explicit `--tier` flag is the highest-precedence render-tier
//! source: an exported `MAZE_CHASE_TIER` must never shadow it
//! (CLI flag > exported env > auto-detect).
//!
//! The portable test pins which value the binary reads through the
//! unrecognized-value warning (the deterministic observable on a pipe);
//! the Unix PTY test proves the effective tier on the live title screen.

use std::process::{Command, Stdio};

const WARNING: &str = "unrecognized MAZE_CHASE_TIER";

/// Run the shipped binary with piped stdio and no ambient tier variable
/// beyond `env_extra`.
fn run(args: &[&str], env_extra: &[(&str, &str)]) -> (i32, String, String) {
    let mut cmd = Command::new(env!("CARGO_BIN_EXE_maze-chase-terminal"));
    cmd.args(args)
        .env_remove("MAZE_CHASE_TIER")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    for (k, v) in env_extra {
        cmd.env(k, v);
    }
    let out = cmd.output().expect("spawn maze-chase-terminal");
    (
        out.status.code().unwrap_or(-1),
        String::from_utf8_lossy(&out.stdout).into_owned(),
        String::from_utf8_lossy(&out.stderr).into_owned(),
    )
}

#[test]
fn exported_env_cannot_shadow_the_flag() {
    // A recognized flag value over an unrecognized exported value: the
    // flag must win, so the ambient value is never read and no warning
    // fires. Piped stdio then refuses with exit 1 and no takeover bytes.
    let (code, stdout, stderr) = run(&["--tier", "kitty"], &[("MAZE_CHASE_TIER", "bogus")]);
    assert_eq!(code, 1, "stderr was: {stderr}");
    assert!(
        !stderr.contains(WARNING),
        "the flag must shadow the exported MAZE_CHASE_TIER=bogus, stderr was: {stderr}"
    );
    assert!(
        stderr.contains("cannot take over the terminal"),
        "stderr was: {stderr}"
    );
    assert!(
        stdout.is_empty(),
        "a refused run must write no takeover frames, wrote {} bytes",
        stdout.len()
    );

    // The reverse: an unrecognized flag value over a recognized exported
    // value must warn with the flag's value, proving the exported value
    // was replaced, not merely preferred.
    let (code, _, stderr) = run(&["--tier", "bogus"], &[("MAZE_CHASE_TIER", "legacy")]);
    assert_eq!(code, 1, "stderr was: {stderr}");
    assert!(
        stderr.contains(&format!("{WARNING} 'bogus'")),
        "the flag's value must be the one warned about, stderr was: {stderr}"
    );
    assert!(
        !stderr.contains("'legacy'"),
        "the exported value must never surface, stderr was: {stderr}"
    );

    // The exported variable alone keeps its documented behavior: it is
    // still read (and the warning still names it) when no flag is given.
    let (code, _, stderr) = run(&[], &[("MAZE_CHASE_TIER", "bogus")]);
    assert_eq!(code, 1, "stderr was: {stderr}");
    assert!(
        stderr.contains(&format!("{WARNING} 'bogus'")),
        "an exported bogus tier must still warn, stderr was: {stderr}"
    );
}

#[cfg(unix)]
mod live {
    //! PTY half: the title screen must run the flag's tier even when a
    //! conflicting value is exported.

    use std::io::{Read, Write};
    use std::os::fd::{AsRawFd, FromRawFd, OwnedFd};
    use std::process::{Child, Command, Stdio};
    use std::time::{Duration, Instant};

    struct Pty {
        master: std::fs::File,
        slave: std::fs::File,
    }

    /// Open a PTY pair with a fixed window size and non-blocking reads.
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
                // WouldBlock (nothing ready) and EIO (child exited) both
                // end this drain; the caller decides whether to wait more.
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

    /// Spawn the shipped binary on a PTY with `ambient` exported as the
    /// tier variable, `--tier <flag>` on the command line, and a
    /// deterministic non-truecolor detection base.
    fn spawn_tiered(flag: &str, ambient: &str, dir: &std::path::Path) -> (Pty, Child) {
        let pty = open_pty(100, 40);
        let child = Command::new(env!("CARGO_BIN_EXE_maze-chase-terminal"))
            .arg("--tier")
            .arg(flag)
            .arg("--dir")
            .arg(dir)
            .env("TERM", "xterm")
            .env("MAZE_CHASE_TIER", ambient)
            .env_remove("COLORTERM")
            .env_remove("TERM_PROGRAM")
            .env_remove("KITTY_WINDOW_ID")
            .stdin(Stdio::from(pty.slave.try_clone().unwrap()))
            .stdout(Stdio::from(pty.slave.try_clone().unwrap()))
            .stderr(Stdio::from(pty.slave.try_clone().unwrap()))
            .spawn()
            .expect("spawn maze-chase-terminal");
        (pty, child)
    }

    #[test]
    fn flag_tier_runs_on_the_live_title_over_exported_env() {
        let base =
            std::env::temp_dir().join(format!("maze-chase-tier-precedence-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&base);
        for (case, ambient, flag, want) in [
            ("flag-up", "legacy", "kitty", "video tier: kitty-graphics"),
            ("flag-down", "kitty", "legacy", "video tier: legacy-cells"),
            (
                "flag-sixel-over-bogus",
                "bogus",
                "sixel",
                "video tier: sixel",
            ),
        ] {
            let dir = base.join(case);
            let (mut pty, mut child) = spawn_tiered(flag, ambient, &dir);
            let mut out = Vec::new();
            let seen = wait_for(&mut pty.master, &mut out, want, Duration::from_secs(15));
            let _ = child.kill();
            let _ = child.wait();
            let _ = std::fs::remove_dir_all(&dir);
            assert!(
                seen,
                "ambient MAZE_CHASE_TIER={ambient} with --tier {flag} must run {want}; tail: {}",
                tail(&out)
            );
        }
        let _ = std::fs::remove_dir_all(&base);
    }
}
