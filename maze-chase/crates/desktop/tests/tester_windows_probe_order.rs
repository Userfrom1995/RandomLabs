//! Windows Tester regression: option order around the two-value `--probe`.
//!
//! Native evidence (Windows Server 2025, Git Bash and pwsh, release binary
//! at head 76abb6b0): `maze-chase-desktop.exe --probe 30 --dir C:\tmp\cfg
//! C:\tmp\shot.ppm` exited 2 with `unknown argument: C:\tmp\cfg`:
//! `parse_args` greedily consumed the next two tokens as the frame count
//! and the screenshot path, so the literal `--dir` became the shot path
//! and the directory value was reported as an unknown argument. The same
//! flags in the other order parse fine, and every other flag parses in any
//! order, so the failure is surprising and the error blames the option's
//! value instead of the flag.
//!
//! Contract pinned here: an options-after-`--probe` grouping must either
//! parse with every option honored (the "flags parse in any order"
//! surface) or fail naming `--probe` in the first error line (a clear
//! "missing values for --probe"). A stray `unknown argument` pointing at
//! an option's own value is never acceptable output for this input.

use maze_chase_desktop::cli::{parse_args, Cli};
use std::path::PathBuf;

fn args(words: &[&str]) -> Vec<String> {
    words.iter().map(|s| s.to_string()).collect()
}

#[test]
fn options_after_probe_parse_or_name_the_flag() {
    let parsed = parse_args(&args(&[
        "--probe",
        "30",
        "--dir",
        r"C:\tmp\cfg dir",
        r"C:\tmp\shot.ppm",
    ]));
    match parsed {
        Cli::Run(opts) => {
            assert_eq!(opts.dir, PathBuf::from(r"C:\tmp\cfg dir"));
            assert_eq!(opts.probe, Some((30, PathBuf::from(r"C:\tmp\shot.ppm"))));
        }
        Cli::Error(msg) => {
            let first = msg.lines().next().unwrap_or("").to_string();
            assert!(
                first.contains("--probe"),
                "a bad --probe grouping must name --probe in the first \
                 error line, got: {first}"
            );
        }
        other => panic!("expected Run or a --probe error, got {other:?}"),
    }
}

#[test]
fn probe_pair_with_dir_before_still_parses() {
    let parsed = parse_args(&args(&[
        "--dir",
        r"C:\tmp\cfg dir",
        "--probe",
        "30",
        r"C:\tmp\shot.ppm",
    ]));
    match parsed {
        Cli::Run(opts) => {
            assert_eq!(opts.dir, PathBuf::from(r"C:\tmp\cfg dir"));
            assert_eq!(opts.probe, Some((30, PathBuf::from(r"C:\tmp\shot.ppm"))));
        }
        other => panic!("expected Run, got {other:?}"),
    }
}
