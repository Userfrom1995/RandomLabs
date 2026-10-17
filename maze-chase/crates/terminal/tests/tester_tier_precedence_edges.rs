//! Tester hostile-boundary regressions for `--tier` precedence (issue #615).
//!
//! The Builder's `tier_flag_precedence.rs` pins the core contract
//! (CLI flag > exported `MAZE_CHASE_TIER` > auto-detect) and the live PTY
//! title screen; `tester_cli_strictness.rs` pins the usage errors and the
//! bare invalid-value paths. This suite attacks the boundaries between
//! those: hostile ambient shapes, flag-value normalization, repeated
//! flags, and invalid flag values over a valid ambient value.
//!
//! Every case drives the shipped binary with piped stdio, where the
//! unrecognized-value warning is the deterministic observable of which
//! value the tier lookup actually read (the same black-box channel the
//! Builder's portable test uses). A refused run must always exit 1,
//! warn nothing when the flag is valid, and write zero takeover frames.

use std::process::{Command, Stdio};

const WARNING: &str = "unrecognized MAZE_CHASE_TIER";

/// Run the shipped binary with piped stdio and exactly the given tier
/// environment (any ambient `MAZE_CHASE_TIER` is removed first).
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

/// A recognized flag over a hostile ambient value must be silent and
/// refuse only because there is no TTY; any warning would prove the
/// ambient value reached the tier lookup instead of being replaced.
#[test]
fn valid_flag_is_silent_over_hostile_ambient_shapes() {
    for (ambient, case) in [
        ("", "empty ambient"),
        ("   ", "whitespace-only ambient"),
        ("  legacy  ", "padded ambient"),
        ("legacy\u{7}", "control-byte ambient"),
        ("kitty; legacy", "shell-metacharacter ambient"),
        ("KITTY", "uppercase ambient"),
    ] {
        let (code, stdout, stderr) = run(&["--tier", "kitty"], &[("MAZE_CHASE_TIER", ambient)]);
        assert_eq!(code, 1, "{case}: stderr was: {stderr}");
        assert!(
            !stderr.contains(WARNING),
            "{case}: the valid flag must shadow MAZE_CHASE_TIER={ambient:?}, stderr was: {stderr}"
        );
        assert!(
            stderr.contains("cannot take over the terminal"),
            "{case}: stderr was: {stderr}"
        );
        assert!(
            stdout.is_empty(),
            "{case}: a refused run must write no takeover frames, wrote {} bytes",
            stdout.len()
        );
    }
}

/// The flag value is normalized (trim + case-fold) exactly like the
/// exported value, so recognized spellings never fall back over a
/// conflicting ambient value.
#[test]
fn flag_case_and_surrounding_whitespace_are_normalized_over_ambient() {
    for (flag, case) in [
        ("KITTY", "uppercase"),
        ("  kitty  ", "padded"),
        ("SiXeL", "mixed case"),
        (" TrueColor ", "padded mixed case"),
    ] {
        let (code, _, stderr) = run(&["--tier", flag], &[("MAZE_CHASE_TIER", "bogus")]);
        assert_eq!(code, 1, "{case}: stderr was: {stderr}");
        assert!(
            !stderr.contains(WARNING),
            "{case}: --tier {flag:?} must be recognized and shadow the ambient bogus, stderr was: {stderr}"
        );
    }
}

/// A later `--tier` replaces an earlier one, and the earlier invalid
/// value never warns: only the final flag value may reach the lookup.
#[test]
fn repeated_flags_last_value_wins_and_never_warns() {
    let (code, _, stderr) = run(
        &["--tier", "bogus", "--tier", "kitty"],
        &[("MAZE_CHASE_TIER", "legacy")],
    );
    assert_eq!(code, 1, "stderr was: {stderr}");
    assert!(
        !stderr.contains(WARNING),
        "the last --tier must replace the earlier flag and the ambient value, stderr was: {stderr}"
    );
}

/// An invalid flag value must warn with the flag's spelling and never
/// with the valid ambient value: the ambient entry was replaced, not
/// merely preferred.
#[test]
fn invalid_flag_value_warns_with_the_flag_never_the_ambient() {
    for (flag, ambient, case) in [
        ("", "legacy", "empty flag value"),
        (" not-a-tier ", "legacy", "padded invalid flag value"),
        ("bogus", "truecolor", "plain invalid flag value"),
    ] {
        let (code, _, stderr) = run(&["--tier", flag], &[("MAZE_CHASE_TIER", ambient)]);
        assert_eq!(code, 1, "{case}: stderr was: {stderr}");
        assert!(
            stderr.contains(&format!("{WARNING} '{flag}'")),
            "{case}: the warning must name the flag value {flag:?}, stderr was: {stderr}"
        );
        assert!(
            !stderr.contains(&format!("'{ambient}'")),
            "{case}: the valid ambient {ambient:?} must never surface, stderr was: {stderr}"
        );
    }
}

/// An ambient value equal to the flag value stays silent for every
/// recognized tier: replacement must not introduce a spurious warning.
#[test]
fn identical_ambient_and_flag_stay_silent() {
    for tier in ["kitty", "sixel", "truecolor", "legacy"] {
        let (code, stdout, stderr) = run(&["--tier", tier], &[("MAZE_CHASE_TIER", tier)]);
        assert_eq!(code, 1, "tier {tier}: stderr was: {stderr}");
        assert!(
            !stderr.contains(WARNING),
            "tier {tier}: stderr was: {stderr}"
        );
        assert!(stdout.is_empty(), "tier {tier}: stdout must stay empty");
        assert!(
            stderr.contains("cannot take over the terminal"),
            "tier {tier}: stderr was: {stderr}"
        );
    }
}
