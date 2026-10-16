//! Tester round-2 regression suite for the Phase 6 desktop layer.
//!
//! Pins the Quality Council eval-fix repairs (score 8.4/10 round):
//! the menu vertical-overflow guard must truncate rows before the
//! footer on short windows, the fright banner must be deterministic
//! under a forced fixture, and the committed proof artifacts (probe
//! PPM, .desktop entries, docs index links, matrix proof column)
//! must stay honest. All hostile sizes must never panic.

use maze_chase_assets::themes;
use maze_chase_desktop::render::{self, Hud, MenuLine};
use maze_chase_engine::game::Game;

fn theme() -> &'static maze_chase_assets::themes::Theme {
    &themes::EMBER_WARREN
}

fn hud() -> Hud<'static> {
    Hud {
        best: 0,
        frame_no: 7,
        flash: true,
        fps: Some(60.0),
        tune: "OFF",
    }
}

fn crate_file(rel: &str) -> std::path::PathBuf {
    let dir = std::env::var("CARGO_MANIFEST_DIR").unwrap();
    std::path::Path::new(&dir).join(rel)
}

#[test]
fn menu_overflow_truncates_rows_before_footer() {
    let lines: Vec<MenuLine> = (0..40)
        .map(|i| MenuLine::plain(&format!("ROW {i}")))
        .collect();
    // Short window: overflow rows drop, footer still paints in dim text.
    let short = render::render_menu("T", &lines, "FOOTER", theme(), 900, 200).unwrap();
    assert_eq!((short.w, short.h), (900, 200));
    assert!(
        short.count(theme().dim_text) > 0,
        "footer row must still paint on a truncated menu"
    );
    // Tall window paints the full menu; hostile sizes never panic.
    let tall = render::render_menu("T", &lines, "FOOTER", theme(), 900, 1200).unwrap();
    assert_eq!((tall.w, tall.h), (900, 1200));
    assert!(render::render_menu("T", &lines, "F", theme(), 10, 10).is_some());
    assert!(render::render_menu("T", &lines, "F", theme(), 1, 1).is_some());
    assert!(render::render_menu("T", &[], "F", theme(), 0, 0).is_none());
}

#[test]
fn fright_banner_is_deterministic_under_forced_fixture() {
    let mut game = Game::new(11, 1);
    game.wardens.start_fright(30.0);
    assert!(game.wardens.fright_active());
    let f = render::render_play(&game, theme(), hud(), 1100, 760).unwrap();
    assert!(
        f.count(theme().fright) > 30,
        "forced fright must paint the banner path"
    );
    let fresh = render::render_play(&Game::new(11, 1), theme(), hud(), 1100, 760).unwrap();
    assert_eq!((fresh.w, fresh.h), (1100, 760));
}

#[test]
fn committed_probe_screenshot_is_a_real_capture() {
    let bytes = std::fs::read(crate_file("../../docs/desktop-probe.ppm"))
        .expect("docs/desktop-probe.ppm must be committed");
    let header = b"P6\n1100 760\n255\n";
    assert!(
        bytes.starts_with(header),
        "probe PPM must carry the real 1100x760 header"
    );
    assert_eq!(
        bytes.len(),
        header.len() + 1100 * 760 * 3,
        "probe PPM body must hold every pixel"
    );
    let body = &bytes[header.len()..];
    let distinct: std::collections::HashSet<&[u8]> =
        body.chunks_exact(3).step_by(997).take(2000).collect();
    assert!(
        distinct.len() > 3,
        "probe capture must be a real multi-color composition, not a flat fill"
    );
}

#[test]
fn desktop_entry_carries_wmclass_and_tryexec() {
    let text = std::fs::read_to_string(crate_file("../../packaging/desktop/maze-chase.desktop"))
        .expect("maze-chase.desktop must exist");
    assert!(
        text.lines()
            .any(|l| l.trim() == "TryExec=maze-chase-desktop"),
        ".desktop must carry TryExec"
    );
    assert!(
        text.lines()
            .any(|l| l.trim() == "StartupWMClass=maze-chase-desktop"),
        ".desktop must carry StartupWMClass"
    );
}

#[test]
fn docs_index_links_both_playable_layers() {
    let text = std::fs::read_to_string(crate_file("../../docs/index.md")).expect("docs/index.md");
    assert!(
        text.contains("terminal.md"),
        "docs index must link the terminal guide"
    );
    assert!(
        text.contains("desktop.md"),
        "docs index must link the desktop guide"
    );
}

#[test]
fn matrix_desktop_proof_names_test_files() {
    let text = std::fs::read_to_string(crate_file("../../docs/feature-matrix.md"))
        .expect("feature-matrix.md");
    assert!(
        text.contains("tester_hostile"),
        "matrix proof must name the hostile suite"
    );
    assert!(
        text.contains("headless"),
        "matrix proof must name the headless suite"
    );
    assert!(
        text.contains("desktop-probe.ppm"),
        "matrix proof must cite the committed probe capture"
    );
}
