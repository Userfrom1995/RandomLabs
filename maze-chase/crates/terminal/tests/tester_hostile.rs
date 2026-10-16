//! Tester hostile regression suite for the Phase 5 terminal layer.
//!
//! Pins the Fixer repairs plus adversarial boot/resize/score paths:
//! corrupt config files must never kill boot, bogus tiers must fall back,
//! degenerate resizes must never panic, the watchdog must bottom out at
//! legacy-cells and hold, and Space/Esc/menu behavior must stay pinned.

use crossterm::event::{KeyCode, KeyEvent, KeyEventKind, KeyEventState, KeyModifiers};
use maze_chase_terminal::app::App;
use maze_chase_terminal::backend::{initial_tier, Tier, Watchdog};
use maze_chase_terminal::screens::ScreenId;

fn key(code: KeyCode) -> KeyEvent {
    KeyEvent {
        code,
        modifiers: KeyModifiers::empty(),
        kind: KeyEventKind::Press,
        state: KeyEventState::empty(),
    }
}

struct TmpDir {
    path: std::path::PathBuf,
}

impl TmpDir {
    fn new(tag: &str) -> Self {
        let path = std::env::temp_dir().join(format!(
            "maze-chase-tester-{}-{}",
            tag,
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.subsec_nanos())
                .unwrap_or(0)
        ));
        let _ = std::fs::remove_dir_all(&path);
        std::fs::create_dir_all(&path).unwrap();
        Self { path }
    }
}

impl Drop for TmpDir {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.path);
    }
}

fn env1(k: &str, v: &str) -> Vec<(String, String)> {
    vec![(k.to_string(), v.to_string())]
}

#[test]
fn corrupt_config_files_never_kill_boot() {
    let dir = TmpDir::new("corrupt");
    std::fs::write(
        dir.path.join("scores.txt"),
        "GARBAGE LINE\n-5 | x | | \n999999999999999999999 | 1 | classic | d\n900 | 3 | classic | 2026-10-16\n",
    )
    .unwrap();
    std::fs::write(dir.path.join("settings.txt"), [0u8, 255u8, 10u8, 123u8]).unwrap();
    let mut a = App::new(120, 45, &[], dir.path.clone());
    assert_eq!(a.screens.current, ScreenId::Title);
    // Boot with corrupt files must still play and tick.
    a.on_key(key(KeyCode::Enter));
    assert_eq!(a.screens.current, ScreenId::Playing);
    for _ in 0..60 {
        a.tick(1.0 / 60.0);
    }
    assert!(a.game.tick_count >= 60);
}

#[test]
fn bogus_tier_falls_back_without_panic() {
    // Bogus override ignores the value and falls through to detection.
    assert_eq!(
        initial_tier(&env1("MAZE_CHASE_TIER", "bogus")),
        Tier::Legacy
    );
    assert_eq!(initial_tier(&env1("MAZE_CHASE_TIER", "")), Tier::Legacy);
    // Override is trimmed + case-insensitive.
    assert_eq!(
        initial_tier(&env1("MAZE_CHASE_TIER", "  KITTY ")),
        Tier::Kitty
    );
    // App boots fine on a bogus tier and still renders.
    let dir = TmpDir::new("bogus-tier");
    let a = App::new(120, 45, &env1("MAZE_CHASE_TIER", "bogus"), dir.path.clone());
    assert_eq!(a.tier(), Tier::Legacy);
}

#[test]
fn degenerate_resize_never_panics_and_recovers() {
    let dir = TmpDir::new("resize");
    let mut a = App::new(120, 45, &[], dir.path.clone());
    a.on_key(key(KeyCode::Enter));
    for (c, r) in [
        (0, 0),
        (1, 1),
        (10, 10),
        (61, 34),
        (62, 35),
        (200, 70),
        (0, 70),
        (200, 0),
    ] {
        a.resize(c, r);
        a.tick(1.0 / 60.0);
    }
    // Tiny windows flag too_small; a healthy window recovers.
    a.resize(10, 10);
    assert!(a.layout.too_small);
    a.resize(120, 45);
    a.tick(1.0 / 60.0);
    assert!(!a.layout.too_small);
    assert!(a.game.tick_count > 0);
}

#[test]
fn watchdog_collapse_holds_legacy_and_keeps_ticking() {
    let mut w = Watchdog::new(Tier::Kitty);
    let mut last = Some(Tier::Kitty);
    for _ in 0..30 {
        last = w.note_error("tester storm");
        if last.is_none() {
            break;
        }
    }
    assert_eq!(last, None);
    assert_eq!(w.tier(), Tier::Legacy);
    assert!(w.trail.iter().any(|t| t.contains("legacy-cells held")));
    // The app survives the collapse path: force legacy tier and play.
    let dir = TmpDir::new("collapse");
    let mut a = App::new(
        120,
        45,
        &env1("MAZE_CHASE_TIER", "legacy"),
        dir.path.clone(),
    );
    a.on_key(key(KeyCode::Enter));
    for _ in 0..60 {
        a.tick(1.0 / 60.0);
    }
    assert_eq!(a.screens.current, ScreenId::Playing);
}

#[test]
fn scores_table_caps_hostile_flood() {
    let text = (0..5000)
        .map(|i| format!("{} | 1 | classic | 2026-10-16", 100 + (i % 50)))
        .collect::<Vec<_>>()
        .join("\n")
        + "\nthis is not a score\n1 | 2 | this-mode-name-is-way-too-long-over-24 | d\n";
    let (t, skipped) = maze_chase_terminal::scores::parse_table(&text);
    assert_eq!(t.len(), maze_chase_terminal::scores::MAX_SCORES);
    assert!(skipped >= 2);
    // Sorted best-first.
    for w in t.windows(2) {
        assert!(w[0].score >= w[1].score);
    }
}

#[test]
fn space_confirms_and_key_storm_never_panics() {
    let dir = TmpDir::new("storm");
    let mut a = App::new(120, 45, &[], dir.path.clone());
    // Space is a default Confirm: starts the game from the title.
    a.on_key(key(KeyCode::Char(' ')));
    assert_eq!(a.screens.current, ScreenId::Playing);
    // Hostile key storm across gameplay + menus.
    let codes = [
        KeyCode::Up,
        KeyCode::Down,
        KeyCode::Left,
        KeyCode::Right,
        KeyCode::Enter,
        KeyCode::Esc,
        KeyCode::Char(' '),
        KeyCode::Char('p'),
        KeyCode::Char('m'),
        KeyCode::Backspace,
        KeyCode::Tab,
        KeyCode::F(1),
    ];
    for (i, c) in codes.iter().cycle().take(2000).enumerate() {
        a.on_key(key(*c));
        if i % 10 == 0 {
            a.tick(1.0 / 60.0);
        }
        if i % 250 == 0 {
            a.resize(80 + (i % 60) as u16, 24 + (i % 30) as u16);
        }
    }
    // App is still alive (quit flag may or may not be set; no panic).
    a.tick(1.0 / 60.0);
}
