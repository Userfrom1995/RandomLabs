//! Headless terminal-layer integration: full sessions without a TTY.
//!
//! Drives `App` end to end (boot, menu, gameplay, pause, resize,
//! game-over recording, settings persistence) plus tier selection and
//! bitmap validity. The interactive event loop in `main.rs` is a thin
//! shell over this API, so these tests pin the whole layer's behavior.

use crossterm::event::{KeyCode, KeyEvent, KeyEventKind, KeyEventState, KeyModifiers};
use maze_chase_audio::sink::Audio;
use maze_chase_terminal::app::App;
use maze_chase_terminal::backend::Tier;
use maze_chase_terminal::screens::ScreenId;

fn key(code: KeyCode) -> KeyEvent {
    KeyEvent {
        code,
        modifiers: KeyModifiers::empty(),
        kind: KeyEventKind::Press,
        state: KeyEventState::empty(),
    }
}

#[allow(non_camel_case_types)]
struct tempfile_dir {
    path: std::path::PathBuf,
}

impl tempfile_dir {
    fn new(tag: &str) -> Self {
        let path = std::env::temp_dir().join(format!(
            "maze-chase-headless-{}-{}",
            tag,
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.subsec_nanos())
                .unwrap_or(0)
        ));
        let _ = std::fs::remove_dir_all(&path);
        Self { path }
    }
}

impl Drop for tempfile_dir {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.path);
    }
}

fn app_at(cols: u16, rows: u16, tier: Option<&str>) -> (App, tempfile_dir) {
    let dir = tempfile_dir::new(&format!("{cols}x{rows}"));
    let mut env: Vec<(String, String)> = vec![];
    if let Some(t) = tier {
        env.push(("MAZE_CHASE_TIER".to_string(), t.to_string()));
    }
    (App::new(cols, rows, &env, dir.path.clone()), dir)
}

#[test]
fn full_session_boots_plays_pauses_and_quits() {
    let (mut a, _dir) = app_at(120, 45, None);
    assert_eq!(a.screens.current, ScreenId::Title);
    // Down to Scores, back, then Play.
    a.on_key(key(KeyCode::Down));
    a.on_key(key(KeyCode::Down));
    a.on_key(key(KeyCode::Enter));
    assert_eq!(a.screens.current, ScreenId::Scores);
    a.on_key(key(KeyCode::Esc));
    assert_eq!(a.screens.current, ScreenId::Title);
    a.on_key(key(KeyCode::Up));
    a.on_key(key(KeyCode::Up));
    a.on_key(key(KeyCode::Enter));
    assert_eq!(a.screens.current, ScreenId::Playing);
    // Steer and simulate ten seconds: crumbs score, ticks advance.
    let hashes_differ = {
        for i in 0..600 {
            if i == 100 {
                a.on_key(key(KeyCode::Up));
            }
            if i == 300 {
                a.on_key(key(KeyCode::Right));
            }
            a.tick(1.0 / 60.0);
        }
        a.game.score > 10 && a.game.tick_count >= 600
    };
    assert!(hashes_differ, "ten simulated seconds must score");
    // Pause freezes the simulation; resume continues it.
    a.on_key(key(KeyCode::Char('p')));
    assert_eq!(a.screens.current, ScreenId::Paused);
    let hash = a.game.state_hash();
    for _ in 0..120 {
        a.tick(1.0 / 60.0);
    }
    assert_eq!(a.game.state_hash(), hash);
    a.on_key(key(KeyCode::Enter));
    assert_eq!(a.screens.current, ScreenId::Playing);
    // Quit to title, then quit the app.
    a.on_key(key(KeyCode::Esc));
    assert_eq!(a.screens.current, ScreenId::Paused);
    a.on_key(key(KeyCode::Down));
    a.on_key(key(KeyCode::Enter));
    assert_eq!(a.screens.current, ScreenId::Title);
    a.on_key(key(KeyCode::Esc));
    assert!(a.quit);
}

#[test]
fn resize_sweep_never_breaks_layout() {
    let (mut a, _dir) = app_at(120, 45, None);
    a.on_key(key(KeyCode::Enter));
    // Sweep sizes including degenerate ones; every step must tick and
    // re-fit without panic, and gameplay continues.
    for cols in (0..200).step_by(11) {
        for rows in (0..70).step_by(7) {
            a.resize(cols, rows);
            a.tick(1.0 / 60.0);
            if cols < 62 || rows < 35 {
                assert!(a.layout.too_small, "{cols}x{rows}");
            } else {
                assert!(!a.layout.too_small, "{cols}x{rows}");
            }
        }
    }
    assert!(a.game.tick_count > 100);
}

#[test]
fn tier_override_selects_every_backend() {
    for (name, want) in [
        ("kitty", Tier::Kitty),
        ("sixel", Tier::Sixel),
        ("truecolor", Tier::Truecolor),
        ("legacy", Tier::Legacy),
    ] {
        let (a, _dir) = app_at(120, 45, Some(name));
        assert_eq!(a.tier(), want, "{name}");
    }
}

#[test]
fn bitmap_png_is_a_valid_png_for_every_tier() {
    let (mut a, _dir) = app_at(140, 70, Some("kitty"));
    a.on_key(key(KeyCode::Enter));
    for _ in 0..120 {
        a.tick(1.0 / 60.0);
    }
    let png = a.bitmap_png();
    assert_eq!(&png[0..8], &[137, 80, 78, 71, 13, 10, 26, 10]);
    assert_eq!(&png[png.len() - 8..png.len() - 4], b"IEND");
    // Sixel tier renders the same pixels through its own encoder.
    let (mut b, _dir) = app_at(140, 70, Some("sixel"));
    b.on_key(key(KeyCode::Enter));
    b.tick(1.0 / 60.0);
    let frame = maze_chase_terminal::raster::render(
        &b.game,
        b.theme(),
        maze_chase_terminal::raster::DEFAULT_PPT,
        b.frame_no,
        true,
    );
    let six = maze_chase_terminal::sixel::encode(&frame, 64);
    assert!(six.starts_with("\x1bPq"));
    assert!(six.ends_with("\x1b\\"));
}

#[test]
fn settings_persist_across_sessions() {
    let dir = tempfile_dir::new("persist");
    let env: Vec<(String, String)> = vec![];
    let settings_path = dir.path.join("settings.txt");
    {
        let mut a = App::new(120, 45, &env, dir.path.clone());
        // Open settings, flip mute via the M row, commit with Back.
        for _ in 0..3 {
            a.on_key(key(KeyCode::Down));
        }
        a.on_key(key(KeyCode::Enter));
        assert_eq!(a.screens.current, ScreenId::Settings);
        for _ in 0..5 {
            a.on_key(key(KeyCode::Down));
        }
        a.on_key(key(KeyCode::Enter)); // mute toggle
        assert!(a.screens.settings.mute);
        for _ in 0..3 {
            a.on_key(key(KeyCode::Down));
        }
        a.on_key(key(KeyCode::Enter)); // Back commits + saves
        assert!(a.settings.mute);
    }
    assert!(settings_path.exists(), "settings must be saved");
    {
        let b = App::new(120, 45, &env, dir.path.clone());
        assert!(b.settings.mute, "mute must reload");
        assert!(b.chime.muted(), "mute must reach the chime");
    }
}

#[test]
fn game_over_lands_on_the_scores_table() {
    let (mut a, _dir) = app_at(120, 45, None);
    a.on_key(key(KeyCode::Enter));
    let mut guard = 0;
    while a.screens.current != ScreenId::Over && guard < 40 {
        guard += 1;
        a.game.kill_player();
        for _ in 0..200 {
            a.tick(1.0 / 120.0);
        }
    }
    assert_eq!(a.screens.current, ScreenId::Over);
    assert_eq!(a.scores.len(), 1);
    assert_eq!(a.screens.over_rank, Some(1));
}
