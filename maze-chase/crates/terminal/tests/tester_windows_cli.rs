//! Windows tester regression suite: a run whose stdio is not a console
//! must refuse honestly and exit fast, never take over and hang.
//!
//! Native Windows evidence (Windows Server 2025, Git Bash, rustc 1.99.0):
//! `maze-chase-terminal.exe --tier bogus < NUL > out.txt 2> err.txt`
//! printed the tier warning, then entered the game loop anyway and wrote
//! 3.3 MB of escape frames in 12 seconds until an external `timeout`
//! killed it (exit 124). crossterm raw mode on Windows talks to the
//! console object (CONIN$/CONOUT$), not to the redirected std handles, so
//! `enable_raw_mode()` succeeds where the Unix arm fails, so on Windows
//! the documented refusal (`docs/terminal.md` troubleshooting: a piped
//! run prints "cannot take over the terminal" and exits 1) was bypassed
//! whenever stdio was redirected.
//! The Phase 5 CLI-strictness suite pins the same contract, and its
//! `bogus_tier_warns_naming_value_then_refuses_without_tty` test hung the
//! whole `cargo test --workspace` run on this machine before the guard
//! existed, because the child never exited.
//!
//! This suite is deliberately time-bounded: the child is killed at the
//! deadline and the test fails with `None` instead of hanging the runner,
//! so the regression is fast and loud on every Windows CI run.
#![cfg(windows)]

use std::io::Read;
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

/// Run the shipped binary with `stdin = NUL` and piped stdout/stderr,
/// bounded by `budget`. Returns `(None, ..)` when the child had to be
/// killed (the defect: it never exits without a console).
fn run_bounded(args: &[&str], budget: Duration) -> (Option<i32>, String, String) {
    let mut child = Command::new(env!("CARGO_BIN_EXE_maze-chase-terminal"))
        .args(args)
        .env_remove("MAZE_CHASE_TIER")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .expect("spawn maze-chase-terminal");
    let deadline = Instant::now() + budget;
    loop {
        if let Some(status) = child.try_wait().expect("try_wait") {
            let mut stdout = String::new();
            let mut stderr = String::new();
            if let Some(mut o) = child.stdout.take() {
                let _ = o.read_to_string(&mut stdout);
            }
            if let Some(mut e) = child.stderr.take() {
                let _ = e.read_to_string(&mut stderr);
            }
            return (status.code(), stdout, stderr);
        }
        if Instant::now() >= deadline {
            let _ = child.kill();
            let _ = child.wait();
            return (None, String::new(), String::new());
        }
        std::thread::sleep(Duration::from_millis(25));
    }
}

#[test]
fn redirected_stdio_is_refused_fast_and_never_taken_over() {
    let (code, stdout, stderr) = run_bounded(&["--tier", "bogus"], Duration::from_secs(10));
    assert_eq!(
        code,
        Some(1),
        "a console-less run must refuse with exit 1 (`None` means it was \
         still rendering after 10 s and had to be killed); stderr: {stderr}; \
         stdout bytes: {}",
        stdout.len()
    );
    assert!(
        stderr.contains("cannot take over the terminal"),
        "stderr must explain the refusal, was: {stderr}"
    );
}

#[test]
fn plain_redirect_without_tier_is_refused_fast() {
    // The same guard must exist on the no-flag path: a double-clicked or
    // scripted launch with no console must not enter the game loop either.
    let (code, stdout, stderr) = run_bounded(&[], Duration::from_secs(10));
    assert_eq!(
        code,
        Some(1),
        "a console-less run must refuse with exit 1 (`None` means it was \
         still rendering after 10 s and had to be killed); stderr: {stderr}; \
         stdout bytes: {}",
        stdout.len()
    );
    assert!(
        stderr.contains("cannot take over the terminal"),
        "stderr must explain the refusal, was: {stderr}"
    );
}
