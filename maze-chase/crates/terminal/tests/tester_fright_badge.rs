//! Fright badge contract: the badge names the active window, and the
//! final 1.5 s shows a fixed 30-segment meter that drains by glyph as
//! well as brightness. The design of record lists the fright badge and
//! the 30-segment countdown as part of the play HUD (`docs/design.md`).

use maze_chase_engine::game::Game;
use maze_chase_terminal::app::App;
use maze_chase_terminal::chrome::{fright_lines, fright_readout, side_panel, top_bar};
use std::path::PathBuf;

fn active_fright(t_left: f32) -> Game {
    let mut game = Game::new(1, 1);
    game.wardens.start_fright(6.0);
    game.wardens.fright_t = t_left;
    assert!(game.wardens.fright_active());
    game
}

#[test]
fn fright_badge_covers_the_whole_active_window() {
    let game = active_fright(3.0);
    assert!(
        !game.wardens.fright_flashing(),
        "3.0 s left is outside the final 1.5 s warning tail"
    );

    let readout = fright_readout(&game, false)
        .expect("active fright must show a HUD badge before the final 1.5 s");
    assert!(
        readout.contains("FRIGHT"),
        "early fright badge must name the fright, got {readout:?}"
    );

    let panel = side_panel(&game, 0, "off", "truecolor-cells", false);
    assert!(
        panel.iter().any(|line| line.contains("FRIGHT")),
        "wide-window side panel must carry the active fright badge: {panel:?}"
    );

    let bar = top_bar(&game, 0, false, 56);
    assert!(
        bar.iter().any(|line| line.contains("FRIGHT")),
        "compact top bar must carry the active fright badge: {bar:?}"
    );
}

#[test]
fn fright_meter_is_thirty_shape_distinct_segments() {
    let late = active_fright(1.2);
    let readout = fright_readout(&late, false).expect("tail readout");
    assert_eq!(
        readout.matches('█').count() + readout.matches('░').count(),
        30,
        "the meter is always exactly 30 segments, got {readout:?}"
    );
    assert!(
        readout.contains('█') && readout.contains('░'),
        "the half-drained meter needs filled and empty glyphs, got {readout:?}"
    );
    assert_eq!(readout.matches('█').count(), 24);

    let reduced = fright_readout(&late, true).expect("reduced-flash tail banner");
    assert!(reduced.starts_with("THE TURN ENDS "), "got {reduced:?}");
    assert_eq!(reduced.matches('█').count(), 24);
    assert_eq!(reduced.matches('░').count(), 6);

    let mut previous = 31;
    let mut t = 1.5f32;
    while t > 0.0 {
        let game = active_fright(t);
        let line = fright_readout(&game, false).expect("tail readout");
        let lit = line.matches('█').count();
        assert!(lit <= 30, "t={t} lit={lit} readout={line:?}");
        assert!(
            lit <= previous,
            "t={t} meter must drain, got {lit} after {previous}"
        );
        assert_eq!(
            line.matches('█').count() + line.matches('░').count(),
            30,
            "t={t} must keep 30 segments, got {line:?}"
        );
        previous = lit;
        t -= 0.05;
    }
}

#[test]
fn fright_lines_wrap_the_fixed_meter_inside_a_narrow_panel() {
    let late = active_fright(1.2);
    for reduced in [false, true] {
        let lines = fright_lines(&late, reduced, 26);
        assert!(
            lines.iter().all(|line| line.chars().count() <= 26),
            "{lines:?}"
        );
        let bar: String = lines.iter().skip(1).cloned().collect();
        assert_eq!(bar.matches('█').count(), 24, "{lines:?}");
        assert_eq!(bar.matches('░').count(), 6, "{lines:?}");
    }
    let early = active_fright(3.0);
    assert_eq!(fright_lines(&early, false, 26), vec!["FRIGHT!".to_string()]);
}

fn app_dir(name: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!(
        "maze-chase-fright-badge-{}-{name}",
        std::process::id()
    ));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    dir
}

#[test]
fn fright_readout_fits_the_rendered_side_panel_and_top_bar() {
    let dir = app_dir("layout");
    let mut app = App::new(170, 64, &[], dir.clone());
    app.game.wardens.start_fright(6.0);
    app.game.wardens.fright_t = 1.2;
    let side = app.layout.side.expect("170x64 must use the side panel");
    assert_eq!(side.w, 26);
    let panel = side_panel(
        &app.game,
        0,
        "off",
        "truecolor-cells",
        app.settings.reduced_flash,
    );
    assert!(
        panel.iter().all(|line| line.chars().count() <= 26),
        "every side-panel line must fit 26 cells: {panel:?}"
    );
    assert!(panel.iter().any(|l| l.starts_with("DOTS")), "{panel:?}");

    let compact_dir = app_dir("compact");
    let mut compact = App::new(62, 35, &[], compact_dir.clone());
    compact.game.wardens.start_fright(6.0);
    compact.game.wardens.fright_t = 1.2;
    compact.game.mode = maze_chase_engine::modes::GameMode::Sprint;
    compact.game.mode_t = 60.0;
    let bar = compact.layout.top_bar.expect("62x35 must use the top bar");
    let lines = top_bar(&compact.game, 0, true, bar.w as usize);
    assert!(
        lines
            .iter()
            .all(|line| line.chars().count() <= bar.w as usize),
        "every top-bar line must fit {} cells: {lines:?}",
        bar.w
    );
    assert!(lines[2].contains("TURN ENDS"), "got {:?}", lines[2]);
    assert!(lines[1].contains("DOTS"), "got {:?}", lines[1]);
    assert_eq!(
        lines[1].matches('█').count() + lines[1].matches('░').count(),
        30
    );

    let _ = std::fs::remove_dir_all(dir);
    let _ = std::fs::remove_dir_all(compact_dir);
}
