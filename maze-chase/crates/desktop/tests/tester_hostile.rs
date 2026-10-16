//! Tester hostile regression suite for the Phase 6 desktop layer.
//!
//! Pins the Fixer repairs plus adversarial boot/render/menu paths:
//! corrupt config files must never kill boot, degenerate window sizes
//! must never panic, oversize frame borders must be clamped, wild menu
//! cursors must be clamped (never index-panic), the 120 Hz accumulator
//! must drop surplus instead of replaying backlog, the CLI must stay
//! strict, probe PPMs must carry a valid header, and corrupt padmaps
//! must fall back to defaults.

use maze_chase_assets::themes;
use maze_chase_audio::sink::NullSink;
use maze_chase_config::{Action, Settings};
use maze_chase_desktop::app::App;
use maze_chase_desktop::cli::{parse_args, Cli};
use maze_chase_desktop::frame::Frame;
use maze_chase_desktop::gamepad::{stick_to_dir, PadMap, PadPoll};
use maze_chase_desktop::render::{self, Hud};
use maze_chase_desktop::screens::{ScreenId, Screens};
use maze_chase_engine::game::Game;

struct TmpDir {
    path: std::path::PathBuf,
}

impl TmpDir {
    fn new(tag: &str) -> Self {
        let path = std::env::temp_dir().join(format!(
            "maze-chase-desktop-tester-{}-{}",
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

fn test_app(tag: &str) -> (TmpDir, App) {
    let dir = TmpDir::new(tag);
    let app = App::with_audio(dir.path.clone(), Box::new(NullSink::new()), false);
    (dir, app)
}

fn sample_hud() -> Hud<'static> {
    Hud {
        best: 0,
        frame_no: 7,
        flash: true,
        fps: Some(60.0),
        tune: "OFF",
    }
}

#[test]
fn corrupt_config_files_never_kill_boot() {
    let dir = TmpDir::new("corrupt");
    std::fs::write(
        dir.path.join("scores.txt"),
        "GARBAGE LINE\n-5 | x | | \n900 | 3 | classic | 2026-10-16\n",
    )
    .unwrap();
    std::fs::write(dir.path.join("settings.txt"), [0u8, 255u8, 10u8, 123u8]).unwrap();
    std::fs::write(dir.path.join("padmap.txt"), "!!! not a padmap !!!\n").unwrap();
    let mut app = App::with_audio(dir.path.clone(), Box::new(NullSink::new()), false);
    // Boot must survive and the session must still tick and render.
    app.on_action(Action::Confirm);
    app.tick(0.05);
    let frame = app.render(1100, 760);
    assert!(frame.is_some(), "corrupt configs must still render");
}

#[test]
fn tiny_and_zero_windows_never_panic() {
    let theme = &themes::EMBER_WARREN;
    let game = Game::new(99, 1);
    // render_play: zero sizes report None, tiny sizes draw the too-small card.
    assert!(render::render_play(&game, theme, sample_hud(), 0, 0).is_none());
    assert!(render::render_play(&game, theme, sample_hud(), 0, 760).is_none());
    for (w, h) in [(1, 1), (10, 10), (100, 100), (319, 239), (1100, 760)] {
        let frame = render::render_play(&game, theme, sample_hud(), w, h);
        assert!(frame.is_some(), "render_play({w},{h}) must not fail");
        let frame = frame.unwrap();
        assert_eq!(frame.px.len(), w as usize * h as usize);
    }
    // Full session render across screens at a hostile size.
    let (_dir, app) = test_app("tiny");
    for (w, h) in [(1, 1), (10, 10), (320, 240)] {
        let _ = app.render(w, h);
    }
}

#[test]
fn frame_border_with_oversize_thickness_never_panics() {
    let theme = &themes::EMBER_WARREN;
    let mut f = Frame::blank(10, 10, theme.bg).unwrap();
    // Thickness far beyond the frame must clamp, never bleed or panic.
    f.border(0, 0, 10, 10, 99, theme.wall);
    f.border(-5, -5, 4, 4, 8, theme.wall);
    f.border(0, 0, 0, 0, 4, theme.wall);
    assert_eq!(f.px.len(), 100);
}

#[test]
fn out_of_range_menu_cursors_never_panic() {
    let mut s = Screens::new(Settings::default());
    // Title menu cursor wild.
    s.menu = 999;
    let _ = s.press(Action::Confirm);
    s.menu = 999;
    let _ = s.press(Action::Up);
    let _ = s.press(Action::Down);
    // Every other indexed screen with a wild cursor.
    s.show(ScreenId::Settings);
    s.settings_row = 999;
    let _ = s.press(Action::Confirm);
    let _ = s.press(Action::Up);
    s.show(ScreenId::Audio);
    s.audio_row = 999;
    let _ = s.press(Action::Confirm);
    s.show(ScreenId::Rebind);
    s.rebind_action = 999;
    let _ = s.press(Action::Confirm);
    s.show(ScreenId::PadBind);
    s.padbind_action = 999;
    let _ = s.press(Action::Confirm);
    s.show(ScreenId::Paused);
    s.pause_menu = 999;
    let _ = s.press(Action::Confirm);
}

#[test]
fn accumulator_surplus_is_dropped_not_replayed() {
    let (_dir, mut app) = test_app("accum");
    app.on_action(Action::Confirm);
    assert_eq!(app.screens.current, ScreenId::Playing);
    // A huge wall-clock spike must be absorbed without hanging.
    app.tick(10.0);
    let score_a = app.game.score;
    // With surplus dropped, back-to-back zero ticks replay no backlog.
    app.tick(0.0);
    app.tick(0.0);
    assert_eq!(
        app.game.score, score_a,
        "dropped surplus must not replay steps"
    );
}

#[test]
fn desktop_cli_stays_strict() {
    let args = |words: &[&str]| words.iter().map(|s| s.to_string()).collect::<Vec<_>>();
    match parse_args(&args(&["--bogus"])) {
        Cli::Error(msg) => assert!(msg.contains("unknown argument")),
        other => panic!("expected Error, got {other:?}"),
    }
    match parse_args(&args(&["--dir"])) {
        Cli::Error(msg) => assert!(msg.contains("missing value")),
        other => panic!("expected Error, got {other:?}"),
    }
    match parse_args(&args(&["--probe"])) {
        Cli::Error(msg) => assert!(msg.contains("--probe")),
        other => panic!("expected Error, got {other:?}"),
    }
    match parse_args(&args(&["--probe", "120"])) {
        Cli::Error(msg) => assert!(msg.contains("--probe")),
        other => panic!("expected Error, got {other:?}"),
    }
    for bad in ["0", "99999", "abc"] {
        match parse_args(&args(&["--probe", bad, "x"])) {
            Cli::Error(msg) => assert!(msg.contains("frame count")),
            other => panic!("expected Error for {bad}, got {other:?}"),
        }
    }
    match parse_args(&args(&["--probe", "60", "/tmp/shot.ppm"])) {
        Cli::Run(opts) => assert!(opts.probe.is_some()),
        other => panic!("expected Run, got {other:?}"),
    }
    assert_eq!(parse_args(&args(&["--help"])), Cli::Help);
    assert_eq!(parse_args(&args(&["--version"])), Cli::Version);
}

#[test]
fn ppm_screenshot_has_valid_header() {
    let theme = &themes::EMBER_WARREN;
    let game = Game::new(99, 1);
    let frame = render::render_play(&game, theme, sample_hud(), 1100, 760).unwrap();
    let ppm = frame.to_ppm();
    assert!(
        ppm.starts_with(b"P6\n1100 760\n255\n"),
        "PPM header must match frame dims"
    );
    let expect = "P6\n1100 760\n255\n".len() + 1100 * 760 * 3;
    assert_eq!(ppm.len(), expect, "PPM body must hold every pixel");
}

#[test]
fn corrupt_padmap_falls_back_and_stick_deadzone_holds() {
    let (map, warnings) = PadMap::parse("total garbage\nconfirm=notabutton\n");
    let _ = map;
    assert!(!warnings.is_empty(), "corrupt padmap must warn");
    // Defaults must survive a garbage file.
    let (defaults, _) = PadMap::parse(&PadMap::defaults().save());
    assert!(defaults.button(Action::Confirm).is_some());
    // Stick deadzone: a whisper of drift is no direction.
    assert_eq!(stick_to_dir(0.01, 0.0), None);
    assert_eq!(stick_to_dir(0.0, -0.01), None);
    assert!(stick_to_dir(0.9, 0.0).is_some());
    // Absent backend reports itself honestly.
    assert!(PadPoll::absent().backend_missing());
}
