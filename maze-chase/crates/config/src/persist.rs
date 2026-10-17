//! Hand-rolled `key = value` persistence (std only, no deps).
//!
//! Format: one `key = value` per line. Blank lines and `#` comments are
//! skipped. Known scalar keys are `difficulty`, `master`, `music`, `sfx`,
//! `mute`, `theme`, `reduced_flash`, `high_contrast`, `show_fps`; per-action
//! keys are `bind_<action>` with a comma list (`bind_up = Up,W`).
//! [`load`] never fails: unknown keys are ignored with a warning entry,
//! malformed values keep the default with an error entry, and missing keys
//! silently keep defaults.

use std::io;
use std::path::Path;

use crate::keymap::{Action, Key, Keymap};
use crate::settings::{Difficulty, Settings};

fn parse_bool(text: &str) -> Option<bool> {
    match text.trim().to_ascii_lowercase().as_str() {
        "true" => Some(true),
        "false" => Some(false),
        _ => None,
    }
}

fn parse_volume(text: &str) -> Option<f32> {
    let v: f32 = text.trim().parse().ok()?;
    if v.is_finite() && (0.0..=1.0).contains(&v) {
        Some(v)
    } else {
        None
    }
}

/// Serialize settings and keymap to the `key = value` text format.
pub fn save(s: &Settings, map: &Keymap) -> String {
    let mut out = String::new();
    out.push_str("# maze-chase config (hand-rolled key = value; see persist.rs)\n");
    out.push_str(&format!("difficulty = {}\n", s.difficulty.as_str()));
    out.push_str(&format!("master = {}\n", s.master));
    out.push_str(&format!("music = {}\n", s.music));
    out.push_str(&format!("sfx = {}\n", s.sfx));
    out.push_str(&format!("mute = {}\n", s.mute));
    out.push_str(&format!("theme = {}\n", s.theme));
    out.push_str(&format!("reduced_flash = {}\n", s.reduced_flash));
    out.push_str(&format!("high_contrast = {}\n", s.high_contrast));
    out.push_str(&format!("show_fps = {}\n", s.show_fps));
    for a in Action::ALL {
        let keys: Vec<String> = map.keys(a).iter().map(|k| k.as_str()).collect();
        out.push_str(&format!("bind_{} = {}\n", a.as_str(), keys.join(",")));
    }
    out
}

/// Parse [`save`] output back into settings and keymap.
///
/// Returns `(settings, keymap, problems)` where `problems` holds
/// human-readable warnings (unknown keys) and errors (malformed values
/// that fell back to defaults). Missing keys keep defaults silently.
pub fn load(text: &str) -> (Settings, Keymap, Vec<String>) {
    let mut settings = Settings::default();
    let mut map = Keymap::defaults();
    let mut problems = Vec::new();
    // Whether the file set reduced_flash explicitly: difficulty carries a
    // Cozy reduced_flash default, adopted only when the flag is absent.
    let mut reduced_flash_explicit = false;

    for (lineno, raw) in text.lines().enumerate() {
        let line = raw.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        let Some((k, v)) = line.split_once('=') else {
            problems.push(format!("line {}: malformed (no '='): {raw:?}", lineno + 1));
            continue;
        };
        let key = k.trim();
        let value = v.trim();
        match key {
            "difficulty" => match Difficulty::parse(value) {
                Some(d) => {
                    settings.difficulty = d;
                    if !reduced_flash_explicit {
                        settings.reduced_flash = matches!(d, Difficulty::Cozy);
                    }
                }
                None => problems.push(format!(
                    "line {}: bad difficulty {value:?}; keeping default '{}'",
                    lineno + 1,
                    settings.difficulty.as_str()
                )),
            },
            "master" => match parse_volume(value) {
                Some(f) => settings.master = f,
                None => problems.push(format!(
                    "line {}: bad master {value:?}; keeping default {}",
                    lineno + 1,
                    Settings::default().master
                )),
            },
            "music" => match parse_volume(value) {
                Some(f) => settings.music = f,
                None => problems.push(format!(
                    "line {}: bad music {value:?}; keeping default {}",
                    lineno + 1,
                    Settings::default().music
                )),
            },
            "sfx" => match parse_volume(value) {
                Some(f) => settings.sfx = f,
                None => problems.push(format!(
                    "line {}: bad sfx {value:?}; keeping default {}",
                    lineno + 1,
                    Settings::default().sfx
                )),
            },
            "mute" => match parse_bool(value) {
                Some(b) => settings.mute = b,
                None => problems.push(format!(
                    "line {}: bad mute {value:?}; keeping default {}",
                    lineno + 1,
                    Settings::default().mute
                )),
            },
            "theme" => {
                if value.is_empty() {
                    problems.push(format!(
                        "line {}: empty theme; keeping default 'ember-warren'",
                        lineno + 1
                    ));
                } else {
                    settings.theme = value.to_string();
                }
            }
            "reduced_flash" => match parse_bool(value) {
                Some(b) => {
                    settings.reduced_flash = b;
                    reduced_flash_explicit = true;
                }
                None => problems.push(format!(
                    "line {}: bad reduced_flash {value:?}; keeping default {}",
                    lineno + 1,
                    Settings::default().reduced_flash
                )),
            },
            "high_contrast" => match parse_bool(value) {
                Some(b) => settings.high_contrast = b,
                None => problems.push(format!(
                    "line {}: bad high_contrast {value:?}; keeping default {}",
                    lineno + 1,
                    Settings::default().high_contrast
                )),
            },
            "show_fps" => match parse_bool(value) {
                Some(b) => settings.show_fps = b,
                None => problems.push(format!(
                    "line {}: bad show_fps {value:?}; keeping default {}",
                    lineno + 1,
                    Settings::default().show_fps
                )),
            },
            _ if key.starts_with("bind_") => {
                let id = &key["bind_".len()..];
                match Action::parse(id) {
                    None => problems.push(format!(
                        "line {}: unknown bind action {id:?}; ignoring",
                        lineno + 1
                    )),
                    Some(action) => {
                        if value.is_empty() {
                            problems.push(format!(
                                "line {}: empty key list for {id:?}; keeping defaults",
                                lineno + 1
                            ));
                            continue;
                        }
                        let mut keys = Vec::new();
                        let mut bad: Option<String> = None;
                        for tok in value.split(',') {
                            match Key::parse(tok) {
                                Some(k) => keys.push(k),
                                None => {
                                    bad = Some(tok.trim().to_string());
                                    break;
                                }
                            }
                        }
                        if let Some(tok) = bad {
                            problems.push(format!(
                                "line {}: bad key {tok:?} for bind_{id}; keeping defaults",
                                lineno + 1
                            ));
                        } else if let Err(e) = map.set_keys(action, keys) {
                            problems.push(format!(
                                "line {}: bind_{id} rejected ({e}); keeping defaults",
                                lineno + 1
                            ));
                        }
                    }
                }
            }
            _ => problems.push(format!(
                "line {}: unknown key {key:?}; ignoring",
                lineno + 1
            )),
        }
    }

    (settings, map, problems)
}

/// Write [`save`] output to `path` (creates or truncates the file).
pub fn save_to(s: &Settings, map: &Keymap, path: &Path) -> io::Result<()> {
    std::fs::write(path, save(s, map))
}

/// Read a file written by [`save_to`].
///
/// A missing file yields defaults plus one notice entry; an unreadable
/// file yields defaults plus one error entry; otherwise this is [`load`]
/// of the file contents.
pub fn load_from(path: &Path) -> (Settings, Keymap, Vec<String>) {
    match std::fs::read_to_string(path) {
        Ok(text) => load(&text),
        Err(e) if e.kind() == io::ErrorKind::NotFound => (
            Settings::default(),
            Keymap::defaults(),
            vec![format!(
                "notice: {} not found; using defaults",
                path.display()
            )],
        ),
        Err(e) => (
            Settings::default(),
            Keymap::defaults(),
            vec![format!(
                "error: cannot read {} ({e}); using defaults",
                path.display()
            )],
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rebound_map() -> Keymap {
        let mut m = Keymap::defaults();
        m.rebind(Action::Pause, Key::Char('x')).unwrap();
        m.rebind(Action::Mute, Key::Char('q')).unwrap();
        m
    }

    #[test]
    fn round_trip_equality() {
        let mut s = Settings::for_difficulty(Difficulty::Cozy);
        s.master = 0.3;
        s.music = 0.0;
        s.sfx = 1.0;
        s.mute = true;
        s.theme = "abyss-lantern".to_string();
        s.high_contrast = true;
        s.show_fps = true;
        let m = rebound_map();
        let (s2, m2, problems) = load(&save(&s, &m));
        assert!(problems.is_empty(), "unexpected: {problems:?}");
        assert_eq!(s2, s);
        assert_eq!(m2, m);
    }

    #[test]
    fn round_trip_second_profile() {
        let mut s = Settings::for_difficulty(Difficulty::Harsh);
        s.theme = "parchment-dawn".to_string();
        s.master = 0.55;
        let m = Keymap::defaults();
        let (s2, m2, problems) = load(&save(&s, &m));
        assert!(problems.is_empty(), "unexpected: {problems:?}");
        assert_eq!(s2, s);
        assert_eq!(m2, m);
    }

    #[test]
    fn corrupt_values_yield_errors_plus_defaults() {
        let (s, _, problems) = load("master = banana\nmute = maybe\n");
        assert_eq!(s.master, Settings::default().master);
        assert_eq!(s.mute, Settings::default().mute);
        assert_eq!(problems.len(), 2);
        assert!(problems.iter().any(|p| p.contains("master")));
        assert!(problems.iter().any(|p| p.contains("mute")));

        // Out-of-range volumes are malformed too.
        let (s, _, problems) = load("sfx = 7\nmusic = -2\n");
        assert_eq!(s.sfx, Settings::default().sfx);
        assert_eq!(problems.len(), 2);
    }

    #[test]
    fn unknown_keys_warned_not_fatal() {
        let (s, m, problems) = load("difficulty = harsh\nfavourite_cheese = gouda\n");
        assert_eq!(s.difficulty, Difficulty::Harsh);
        assert_eq!(m, Keymap::defaults());
        assert_eq!(problems.len(), 1);
        assert!(problems[0].contains("unknown key"));
    }

    #[test]
    fn missing_keys_are_silent_defaults() {
        let (s, m, problems) = load("# nothing here\n");
        assert_eq!(s, Settings::default());
        assert_eq!(m, Keymap::defaults());
        assert!(problems.is_empty());
    }

    #[test]
    fn missing_file_notice() {
        let path = std::env::temp_dir().join("maze-chase-config-test-missing-file-abcdef.cfg");
        let _ = std::fs::remove_file(&path);
        let (s, m, problems) = load_from(&path);
        assert_eq!(s, Settings::default());
        assert_eq!(m, Keymap::defaults());
        assert_eq!(problems.len(), 1);
        assert!(problems[0].contains("notice"));
    }

    #[test]
    fn save_to_and_load_from_round_trip() {
        let path = std::env::temp_dir().join("maze-chase-config-test-roundtrip-abcdef.cfg");
        let s = Settings::for_difficulty(Difficulty::Standard);
        let m = rebound_map();
        save_to(&s, &m, &path).unwrap();
        let (s2, m2, problems) = load_from(&path);
        let _ = std::fs::remove_file(&path);
        assert!(problems.is_empty(), "unexpected: {problems:?}");
        assert_eq!(s2, s);
        assert_eq!(m2, m);
    }
}
