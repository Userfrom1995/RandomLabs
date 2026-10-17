//! Tester CLI-strictness regression suite for the Phase 5 terminal layer.
//!
//! Pins the Evaluator-gated CLI repairs at the shipped-binary level (not
//! just the library): a missing `--tier`/`--dir` value must print usage to
//! stderr and exit 2, unknown flags must exit 2, and an unrecognized
//! `MAZE_CHASE_TIER` (including empty) must warn naming the value while
//! keeping the safe fallback (which then refuses honestly with exit 1 when
//! there is no TTY to take over).

use std::process::{Command, Stdio};

fn bin() -> Command {
    Command::new(env!("CARGO_BIN_EXE_maze-chase-terminal"))
}

fn run(args: &[&str], env_extra: &[(&str, &str)]) -> (i32, String, String) {
    let mut cmd = bin();
    cmd.args(args)
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
fn help_and_version_exit_zero() {
    let (code, stdout, _) = run(&["--help"], &[]);
    assert_eq!(code, 0);
    assert!(stdout.contains("Usage:"), "help must print usage");
    let (code, stdout, _) = run(&["--version"], &[]);
    assert_eq!(code, 0);
    assert!(
        stdout.contains("maze-chase-terminal"),
        "version must name the binary"
    );
}

#[test]
fn missing_flag_values_exit_two_with_usage() {
    let (code, _, stderr) = run(&["--tier"], &[]);
    assert_eq!(code, 2, "--tier with no value must exit 2");
    assert!(
        stderr.contains("missing value for --tier"),
        "stderr was: {stderr}"
    );
    assert!(stderr.contains("Usage:"), "stderr was: {stderr}");

    let (code, _, stderr) = run(&["--dir"], &[]);
    assert_eq!(code, 2, "--dir with no value must exit 2");
    assert!(
        stderr.contains("missing value for --dir"),
        "stderr was: {stderr}"
    );
    assert!(stderr.contains("Usage:"), "stderr was: {stderr}");
}

#[test]
fn unknown_flag_exits_two() {
    let (code, _, stderr) = run(&["--bogus-flag"], &[]);
    assert_eq!(code, 2, "unknown flag must exit 2");
    assert!(
        stderr.contains("unknown argument: --bogus-flag"),
        "stderr was: {stderr}"
    );
}

#[test]
fn bogus_tier_warns_naming_value_then_refuses_without_tty() {
    // Piped stdio means no TTY: after the safe fallback the binary must
    // refuse honestly (exit 1), never crash, and the warning must name the
    // rejected value (this covers both MAZE_CHASE_TIER=bogus and the
    // `--tier bogus` CLI path, which flows through the same env var).
    for value in ["bogus", ""] {
        let (code, stdout, stderr) = run(&["--tier", value], &[]);
        assert_eq!(code, 1, "non-TTY run must exit 1, value was: {value:?}");
        assert!(
            stdout.is_empty(),
            "a refused run must write zero bytes of takeover frames to stdout, wrote {} (value {value:?})",
            stdout.len()
        );
        assert!(
            stderr.contains(&format!(
                "unrecognized MAZE_CHASE_TIER '{value}'; falling back to auto-detect"
            )),
            "warning must name the value, stderr was: {stderr}"
        );
    }
    let (code, stdout, stderr) = run(&[], &[("MAZE_CHASE_TIER", "bogus")]);
    assert_eq!(code, 1);
    assert!(
        stdout.is_empty(),
        "a refused run must write zero bytes of takeover frames to stdout, wrote {}",
        stdout.len()
    );
    assert!(
        stderr.contains("unrecognized MAZE_CHASE_TIER 'bogus'"),
        "stderr was: {stderr}"
    );
}
