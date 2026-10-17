//! macOS-Tester regression suite for the desktop layer: first-run settings
//! persistence.
//!
//! Pins the native macOS finding that the desktop's first settings commit
//! on a machine with no config directory yet was silently dropped.
//! The terminal layer's `save_settings` creates the directory
//! (crates/terminal/src/app.rs), so a fresh user's mute/difficulty/rebind
//! must persist through the desktop path too (crates/desktop/src/app.rs).
//! Repro before the fix: run `maze-chase-desktop --dir <missing>`, press
//! M, quit; no settings.txt appears (only the later scores save creates
//! the directory), while the terminal in the same directory does write it.

use maze_chase_audio::sink::NullSink;
use maze_chase_config::{persist, Action};
use maze_chase_desktop::app::App;

fn fresh_dir_path(tag: &str) -> std::path::PathBuf {
    let path = std::env::temp_dir().join(format!(
        "maze-chase-desktop-persistence-{}-{}",
        tag,
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.subsec_nanos())
            .unwrap_or(0)
    ));
    let _ = std::fs::remove_dir_all(&path);
    // Deliberately NOT created: a fresh machine has no ~/.maze-chase yet.
    path
}

#[test]
fn first_settings_commit_creates_the_config_directory() {
    let dir = fresh_dir_path("first-commit");
    let mut app = App::with_audio(dir.clone(), Box::new(NullSink::new()), false);
    assert!(!dir.exists(), "precondition: fresh machine, no config dir");
    app.on_action(Action::Mute);
    assert!(
        dir.join("settings.txt").exists(),
        "mute on a fresh config dir must persist settings.txt"
    );
    let (settings, _, _) = persist::load_from(&dir.join("settings.txt"));
    assert!(
        settings.mute,
        "persisted file must carry the new mute state"
    );
    let _ = std::fs::remove_dir_all(&dir);
}
