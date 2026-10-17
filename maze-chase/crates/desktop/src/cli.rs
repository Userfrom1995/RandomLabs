//! Desktop command line: strict flag parsing shared by the binary.
//!
//! Same strictness contract as the terminal layer (missing values and
//! unknown flags exit 2 with usage on stderr): [`parse_args`] is pure
//! and fully tested; `main.rs` only maps the outcome to an exit code.

use maze_chase_terminal::app::config_dir;
use std::path::PathBuf;

/// Parsed launch options.
#[derive(Clone, PartialEq, Eq, Debug)]
pub struct Opts {
    pub fullscreen: bool,
    pub no_pad: bool,
    pub dir: PathBuf,
    /// Bounded verification run: render this many frames, write a PPM
    /// screenshot of the last one, then exit 0. `None` plays normally.
    pub probe: Option<(u32, PathBuf)>,
}

/// CLI outcome: options, a help/version screen, or a fatal usage error.
#[derive(Clone, PartialEq, Eq, Debug)]
pub enum Cli {
    Run(Opts),
    Help,
    Version,
    Error(String),
}

pub const VERSION: &str = env!("CARGO_PKG_VERSION");

pub fn usage() -> String {
    format!(
        "maze-chase-desktop {VERSION}\n\
         A polished fullscreen/windowed maze-chase arcade game for the desktop.\n\
         \n\
         Usage: maze-chase-desktop [OPTIONS]\n\
         \n\
         Options:\n\
         \x20 --fullscreen                           start fullscreen\n\
         \x20 --no-pad                               ignore gamepads\n\
         \x20 --dir <path>                           config/scores directory\n\
         \x20 --probe <frames> <shot.ppm>            render N frames, save a screenshot, exit\n\
         \x20 --help                                 show this help\n\
         \x20 --version                              show the version\n\
         \n\
         Controls: arrows/WASD move, gamepad stick/D-pad, P pause,\n\
         M mute, F fullscreen, Esc menu. Settings and high scores are\n\
         shared with the terminal game in the config directory."
    )
}

/// Parse `args` (without the program name).
///
/// Options parse in any order. `--probe` takes its frame count from the
/// next token and its screenshot path from the next positional token,
/// so `--probe 30 --dir <cfg> <shot.ppm>` honors every option instead
/// of swallowing `--dir` as the shot path.
pub fn parse_args(args: &[String]) -> Cli {
    let mut fullscreen = false;
    let mut no_pad = false;
    let mut dir = config_dir();
    let mut probe_frames: Option<u32> = None;
    let mut probe_shot: Option<PathBuf> = None;
    let mut i = 0;
    while i < args.len() {
        let arg = args[i].as_str();
        i += 1;
        match arg {
            "--help" | "-h" => return Cli::Help,
            "--version" | "-V" => return Cli::Version,
            "--fullscreen" => fullscreen = true,
            "--no-pad" => no_pad = true,
            "--probe" => {
                let Some(value) = args.get(i) else {
                    return Cli::Error(format!("missing values for --probe\n{}", usage()));
                };
                if value.starts_with("--") {
                    return Cli::Error(format!("missing values for --probe\n{}", usage()));
                }
                i += 1;
                match value.parse::<u32>() {
                    Ok(frames) if frames > 0 && frames <= 3600 => probe_frames = Some(frames),
                    _ => {
                        return Cli::Error(format!(
                            "--probe needs a frame count 1..=3600\n{}",
                            usage()
                        ));
                    }
                }
            }
            "--dir" => {
                let Some(value) = args.get(i) else {
                    return Cli::Error(format!("missing value for --dir\n{}", usage()));
                };
                if value.starts_with("--") {
                    return Cli::Error(format!("missing value for --dir\n{}", usage()));
                }
                dir = value.into();
                i += 1;
            }
            other if other.starts_with('-') => {
                return Cli::Error(format!("unknown argument: {other}\n{}", usage()));
            }
            other => {
                if probe_frames.is_some() && probe_shot.is_none() {
                    probe_shot = Some(other.into());
                } else {
                    return Cli::Error(format!("unknown argument: {other}\n{}", usage()));
                }
            }
        }
    }
    let probe = match (probe_frames, probe_shot) {
        (Some(frames), Some(shot)) => Some((frames, shot)),
        (Some(_), None) => {
            return Cli::Error(format!("missing values for --probe\n{}", usage()));
        }
        (None, _) => None,
    };
    Cli::Run(Opts {
        fullscreen,
        no_pad,
        dir,
        probe,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn args(words: &[&str]) -> Vec<String> {
        words.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn empty_args_run_windowed_with_defaults() {
        match parse_args(&args(&[])) {
            Cli::Run(opts) => {
                assert!(!opts.fullscreen);
                assert!(!opts.no_pad);
                assert_eq!(opts.dir, config_dir());
            }
            other => panic!("expected Run, got {other:?}"),
        }
    }

    #[test]
    fn flags_parse_in_any_order() {
        match parse_args(&args(&["--no-pad", "--fullscreen", "--dir", "/tmp/x"])) {
            Cli::Run(opts) => {
                assert!(opts.fullscreen);
                assert!(opts.no_pad);
                assert_eq!(opts.dir, PathBuf::from("/tmp/x"));
            }
            other => panic!("expected Run, got {other:?}"),
        }
    }

    #[test]
    fn strict_failures_report_usage() {
        match parse_args(&args(&["--bogus"])) {
            Cli::Error(msg) => assert!(msg.contains("unknown argument")),
            other => panic!("expected Error, got {other:?}"),
        }
        match parse_args(&args(&["--dir"])) {
            Cli::Error(msg) => assert!(msg.contains("missing value")),
            other => panic!("expected Error, got {other:?}"),
        }
    }

    #[test]
    fn help_and_version_short_circuit() {
        assert_eq!(parse_args(&args(&["--help"])), Cli::Help);
        assert_eq!(parse_args(&args(&["-h"])), Cli::Help);
        assert_eq!(parse_args(&args(&["--version"])), Cli::Version);
        // Help wins over other flags.
        assert_eq!(parse_args(&args(&["--fullscreen", "--help"])), Cli::Help);
    }

    #[test]
    fn probe_parses_frames_and_path_with_bounds() {
        match parse_args(&args(&["--probe", "60", "/tmp/shot.ppm"])) {
            Cli::Run(opts) => {
                assert_eq!(opts.probe, Some((60, PathBuf::from("/tmp/shot.ppm"))));
            }
            other => panic!("expected Run, got {other:?}"),
        }
        match parse_args(&args(&[])) {
            Cli::Run(opts) => assert_eq!(opts.probe, None),
            other => panic!("expected Run, got {other:?}"),
        }
        match parse_args(&args(&["--probe"])) {
            Cli::Error(msg) => assert!(msg.contains("--probe")),
            other => panic!("expected Error, got {other:?}"),
        }
        match parse_args(&args(&["--probe", "120"])) {
            Cli::Error(msg) => assert!(msg.contains("--probe")),
            other => panic!("expected Error, got {other:?}"),
        }
        for bad_count in ["0", "99999", "abc"] {
            let words = vec![
                "--probe".to_string(),
                bad_count.to_string(),
                "x".to_string(),
            ];
            match parse_args(&words) {
                Cli::Error(msg) => assert!(msg.contains("frame count")),
                other => panic!("expected Error, got {other:?}"),
            }
        }
    }
}
