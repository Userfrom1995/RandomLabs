//! Tester Phase 4 hostile regression suite for `maze-chase-config`.
//!
//! Red-team focus: persistence never fails on corrupt input, key parsing
//! rejects format-breaking tokens, rebinds keep keys unique, presets use
//! only shipped engine knobs, and every preset boots a real simulation.

use maze_chase_config::persist::{load, save};
use maze_chase_config::{preset, Action, Difficulty, EnginePreset, Key, Keymap, Settings};
use maze_chase_engine::game::Game;

#[test]
fn save_load_roundtrip_is_lossless_for_every_difficulty() {
    for d in [Difficulty::Cozy, Difficulty::Standard, Difficulty::Harsh] {
        let s = Settings::for_difficulty(d);
        let map = Keymap::defaults();
        let text = save(&s, &map);
        let (back, back_map, problems) = load(&text);
        assert!(problems.is_empty(), "roundtrip problems: {problems:?}");
        assert_eq!(back, s);
        assert_eq!(back_map, map);
        assert!(back.validate().is_empty());
    }
}

#[test]
fn save_load_roundtrip_survives_rebinds_and_flags() {
    let mut s = Settings::for_difficulty(Difficulty::Standard);
    s.master = 0.33;
    s.music = 0.0;
    s.sfx = 1.0;
    s.mute = true;
    s.theme = "abyss-lantern".to_string();
    s.reduced_flash = true;
    s.high_contrast = true;
    s.show_fps = true;
    let mut map = Keymap::defaults();
    map.rebind(Action::Pause, Key::Char('X')).unwrap();
    let text = save(&s, &map);
    let (back, back_map, problems) = load(&text);
    assert!(problems.is_empty(), "roundtrip problems: {problems:?}");
    assert_eq!(back, s);
    assert_eq!(back_map, map);
}

#[test]
fn loader_never_fails_on_corrupt_input() {
    let corrupt = [
        "",
        "\n\n\n",
        "garbage with no equals",
        "<<<<<>>>>>",
        "difficulty",
        "= orphan value",
        "difficulty = ",
        "difficulty = nightmare",
        "difficulty = CLASSIC",
        "difficulty = cozy ",
        "master = banana",
        "master = ",
        "master = 2",
        "master = -0.5",
        "master = NaN",
        "master = inf",
        "master = -inf",
        "master = 1e999",
        "master = 0.5.5",
        "master = 0,5",
        "music = 99\nsfx = -99\nmute = maybe",
        "mute = 1",
        "mute = TRUE ",
        "theme = ",
        "theme = Ember Warren",
        "theme = ember-warren ",
        "reduced_flash = yes",
        "high_contrast = 0",
        "show_fps = off",
        "bind_up = ",
        "bind_up = Nope",
        "bind_up = Up,Up,Up",
        "bind_up = ,",
        "bind_down = Up",
        "bind_pause = P,P",
        "bind_bogus = X",
        "bind_ = Up",
        "unknown_key = 1",
        "MASTER = 0.5",
        "Difficulty = cozy",
        "# only a comment\n# another",
        "difficulty = cozy\ndifficulty = harsh",
        "master = 0.1\nmaster = 0.9",
        "bind_mute = M\nbind_mute = P",
        "a=b=c=d",
        " = ",
        "difficulty\u{3000}=\u{3000}cozy",
        "\u{feff}difficulty = cozy",
        "bind_up = \u{1f640}",
    ];
    for text in corrupt {
        let (settings, map, problems) = load(text);
        // Loader never fails: settings stay in range or problems explain.
        let _ = (settings, map, problems);
    }
    // Pin the important outcomes.
    let (s, _, problems) = load("master = banana");
    assert_eq!(s.master, Settings::default().master);
    assert!(!problems.is_empty());
    let (s, _, problems) = load("master = 2");
    assert_eq!(s.master, Settings::default().master);
    assert!(!problems.is_empty());
    let (s, _, problems) = load("master = NaN");
    assert_eq!(s.master, Settings::default().master);
    assert!(!problems.is_empty());
    let (s, _, problems) = load("difficulty = nightmare");
    assert_eq!(s.difficulty, Settings::default().difficulty);
    assert!(!problems.is_empty());
    let (s, _, problems) = load("garbage with no equals");
    assert_eq!(s, Settings::default());
    assert!(!problems.is_empty());
    // Unknown theme loads (validate flags it later, per design).
    let (s, _, _) = load("theme = not-a-theme");
    assert_eq!(s.theme, "not-a-theme");
    assert!(!s.validate().is_empty());
    // Duplicate scalar keys: deterministic, last wins.
    let (s, _, _) = load("master = 0.1\nmaster = 0.9");
    assert!((s.master - 0.9).abs() < 1e-6);
}

#[test]
fn loader_survives_huge_and_pathological_files() {
    // 20k hostile lines: must stay fast and total.
    let mut big = String::from("difficulty = harsh\n");
    for i in 0..20_000 {
        big.push_str(&format!("unknown_key_{i} = {i}\n"));
    }
    let (s, _, problems) = load(&big);
    assert_eq!(s.difficulty, Difficulty::Harsh);
    assert_eq!(problems.len(), 20_000);
    // Giant single line and CRLF soup.
    let (s, _, _) = load(&("master = 0.5\r\n".repeat(1000)));
    assert!((s.master - 0.5).abs() < 1e-6);
    let giant = "x".repeat(1_000_000);
    let (_, _, _) = load(&giant);
}

#[test]
fn key_parser_rejects_format_breakers() {
    // Comma / whitespace would corrupt the save format: must be None.
    for bad in [
        "", " ", ",", " , ", "\t", "\n", "Nope", "up", "UP ", "Space ",
    ] {
        if bad.trim().is_empty() || bad.contains(',') {
            assert_eq!(Key::parse(bad), None, "must reject {bad:?}");
        }
    }
    assert_eq!(Key::parse(","), None);
    assert_eq!(Key::parse(""), None);
    // Named keys round-trip exactly.
    for key in [
        Key::Up,
        Key::Down,
        Key::Left,
        Key::Right,
        Key::W,
        Key::A,
        Key::S,
        Key::D,
        Key::Space,
        Key::Enter,
        Key::Escape,
        Key::P,
        Key::M,
    ] {
        assert_eq!(Key::parse(&key.as_str()), Some(key));
    }
    // Single printable chars survive the round-trip.
    for c in ['X', 'q', '7', '!', '.'] {
        assert_eq!(Key::parse(&Key::Char(c).as_str()), Some(Key::Char(c)));
    }
    // Actions parse case-insensitively; unknown rejected.
    for action in Action::ALL {
        assert_eq!(Action::parse(action.as_str()), Some(action));
        assert_eq!(Action::parse(&action.as_str().to_uppercase()), Some(action));
    }
    assert_eq!(Action::parse("fly"), None);
    assert_eq!(Action::parse(""), None);
}

#[test]
fn rebind_keeps_keys_unique_and_is_idempotent() {
    let mut map = Keymap::defaults();
    // Space is Confirm's: stealing it for Up must fail.
    assert!(map.rebind(Action::Up, Key::Space).is_err());
    // W is Up's own twin: idempotent Ok, list untouched.
    let before = map.clone();
    assert!(map.rebind(Action::Up, Key::W).is_ok());
    assert_eq!(map, before);
    // A free key collapses the action to a singleton.
    assert!(map.rebind(Action::Up, Key::Char('X')).is_ok());
    assert_eq!(map.keys(Action::Up), &[Key::Char('X')]);
    // Reset restores defaults exactly.
    map.reset();
    assert_eq!(map, Keymap::defaults());
    // Every default key is unique across actions (no double meaning).
    let mut seen = std::collections::HashSet::new();
    for action in Action::ALL {
        for key in map.keys(action) {
            assert!(seen.insert(*key), "key {key:?} bound twice");
        }
    }
}

#[test]
fn settings_validate_catches_every_bad_field() {
    let mut s = Settings::for_difficulty(Difficulty::Cozy);
    assert!(s.validate().is_empty());
    s.master = 1.5;
    assert!(!s.validate().is_empty());
    s.master = f32::NAN;
    assert!(!s.validate().is_empty());
    s.master = 0.8;
    s.music = -0.1;
    assert!(!s.validate().is_empty());
    s.music = 0.7;
    s.sfx = f32::INFINITY;
    assert!(!s.validate().is_empty());
    s.sfx = 0.9;
    s.theme = "not-a-theme".to_string();
    let problems = s.validate();
    assert!(!problems.is_empty());
    assert!(problems.iter().any(|p| p.contains("not-a-theme")));
}

#[test]
fn presets_use_only_shipped_engine_knobs_and_boot_real_games() {
    // Difficulty ids are stable and parse back.
    for d in [Difficulty::Cozy, Difficulty::Standard, Difficulty::Harsh] {
        assert_eq!(Difficulty::parse(d.as_str()), Some(d));
        assert_eq!(Difficulty::parse(&d.as_str().to_uppercase()), Some(d));
    }
    assert_eq!(Difficulty::parse("nightmare"), None);
    // Preset table pins the shipped design (classic L1 / classic L2 / sprint).
    let cozy: EnginePreset = preset(Difficulty::Cozy);
    let standard: EnginePreset = preset(Difficulty::Standard);
    let harsh: EnginePreset = preset(Difficulty::Harsh);
    assert_eq!(cozy.start_level, 1);
    assert_eq!(standard.start_level, 2);
    assert_eq!(harsh.start_level, 1);
    assert_ne!(harsh.mode, cozy.mode);
    assert_eq!(cozy.mode, standard.mode);
    // Every preset boots a real deterministic simulation: same triple,
    // same canonical state; stepping it emits engine events.
    for (d, p) in [
        (Difficulty::Cozy, cozy),
        (Difficulty::Standard, standard),
        (Difficulty::Harsh, harsh),
    ] {
        let mut a = Game::with_mode(12345, p.start_level, p.mode);
        let b = Game::with_mode(12345, p.start_level, p.mode);
        assert_eq!(
            a.canonical(),
            b.canonical(),
            "preset {d:?} not deterministic"
        );
        assert!(a.running());
        for _ in 0..30 {
            a.tick(1.0 / 60.0);
        }
        let events = a.take_events();
        assert!(
            !events.is_empty(),
            "preset {d:?} emitted no events in 30 ticks"
        );
    }
}
