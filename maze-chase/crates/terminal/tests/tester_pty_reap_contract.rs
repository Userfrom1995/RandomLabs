//! Contract test for the issue #656 F2 reap fix: a child SIGKILLed
//! while blocked writing to a full PTY master must be reaped by
//! draining the non-blocking master, within a bounded time.
//!
//! The macOS arm's F2 finding (run 39199219952): `Session::drop` used
//! `kill(); wait()`, and on macOS a child killed mid-write while the
//! master's buffer is full stays unreapable until the pending write
//! completes, so `wait()` hung the suite forever (`plan_contract`,
//! `tester_dynamic_layout_hostile`, `tester_layout_goldens_live`). Every
//! PTY harness now reaps through a bounded, drain-first loop.
//!
//! This suite pins that mechanism against the exact precondition: a
//! writer child saturated on an undrained master (kill while blocked).
//! The bounded reap must observe the exit status (`Ok(Some(_))`) before
//! its 5 s cap, not merely return; a platform that never reaps must
//! fail this test loudly instead of hanging the binary.
#![cfg(unix)]

use std::io::Read;
use std::os::fd::{AsRawFd, FromRawFd, OwnedFd};
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

struct Pty {
    master: std::fs::File,
    slave: std::fs::File,
}

/// Open a PTY pair with a fixed window size and non-blocking master
/// reads (the same discipline every live harness in this crate follows:
/// O_NONBLOCK is what makes the drain in the reap loop safe).
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

/// Bounded, drain-first reap (the harness helper contract): returns
/// `Some(status)` when the child was observed reaped, `None` when the
/// 5 s cap elapsed without a reap. It can never block the caller.
fn bounded_reap(
    child: &mut Child,
    master: &mut std::fs::File,
    out: &mut Vec<u8>,
) -> Option<std::process::ExitStatus> {
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

#[test]
fn killed_writer_on_a_saturated_master_is_reaped_after_draining() {
    let mut pty = open_pty(100, 40);

    // A shell writing forever to the slave: with nobody draining, the
    // master's finite buffer fills within a few hundred milliseconds
    // and the loop blocks mid-write. That is F2's exact precondition.
    let slave_out = pty.slave.try_clone().expect("clone slave");
    let slave_err = pty.slave.try_clone().expect("clone slave");
    let mut child = Command::new("sh")
        .arg("-c")
        .arg("while :; do printf '%s\\n' 0123456789012345678901234567890123456789012345678901234567890123; done")
        .stdin(Stdio::null())
        .stdout(Stdio::from(slave_out))
        .stderr(Stdio::from(slave_err))
        .spawn()
        .expect("spawn writer");

    // No drain here: let the writer fill the master buffer and block.
    std::thread::sleep(Duration::from_millis(400));
    assert!(
        child.try_wait().expect("try_wait").is_none(),
        "writer exited before the kill; the saturated-master precondition never held"
    );

    let _ = child.kill();

    let started = Instant::now();
    let mut out = Vec::new();
    let reaped = bounded_reap(&mut child, &mut pty.master, &mut out);
    let elapsed = started.elapsed();

    assert!(
        !out.is_empty(),
        "the drain observed no buffered output; the master was never saturated"
    );
    assert!(
        reaped.is_some(),
        "a writer killed while blocked on a saturated master was not reaped within the 5 s cap \
         (issue #656 F2: drain the master before reaping, never wait() first)"
    );
    let status = reaped.expect("checked above");
    assert!(
        !status.success(),
        "the writer unexpectedly reported a clean exit; it should have died to SIGKILL"
    );
    assert!(
        elapsed < Duration::from_secs(5),
        "the bounded reap overran its cap: {elapsed:?}"
    );
}
