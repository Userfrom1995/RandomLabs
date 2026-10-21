//! Tester round-11 contract: the fright badge is HUD information for the
//! whole active window, while the 30-segment countdown meter joins only for
//! the final 1.5 s. The design of record lists the fright badge as part of
//! the play HUD (`docs/design.md`), and the desktop HUD already paints it.

use maze_chase_engine::game::Game;
use maze_chase_terminal::app::App;
use maze_chase_terminal::chrome::{fright_readout, side_panel, top_bar};
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

    let readout = fright_readout(&game, false, 26)
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

    let bar = top_bar(&game, 0, false, 62);
    assert!(
        bar.iter().any(|line| line.contains("FRIGHT")),
        "compact top bar must carry the active fright badge: {bar:?}"
    );
}

#[test]
fn fright_readout_matches_the_requested_width_at_every_edge() {
    for reduced in [false, true] {
        let label = if reduced { "THE TURN ENDS " } else { "FRIGHT " };
        let label_len = label.chars().count();
        for max_width in 0..=80 {
            let game = active_fright(1.2);
            let readout =
                fright_readout(&game, reduced, max_width).expect("active fright must read out");
            if max_width > label_len {
                assert_eq!(
                    readout.chars().count(),
                    max_width,
                    "width {max_width} reduced={reduced} must fill exactly, got {readout:?}"
                );
                assert!(
                    readout.starts_with(label),
                    "width {max_width} reduced={reduced} must keep its label, got {readout:?}"
                );
                let bars: String = readout.chars().skip(label_len).collect();
                assert!(
                    bars.chars().all(|c| c == '█' || c == '░'),
                    "width {max_width} reduced={reduced} must draw only meter cells, got {readout:?}"
                );
            } else {
                assert_eq!(
                    readout,
                    label.trim_end(),
                    "width {max_width} reduced={reduced} has no room for a meter; the label \
                     must stay intact for the caller to clip"
                );
            }
        }
    }
}

#[test]
fn fright_meter_still_joins_only_for_the_final_tail() {
    let early = active_fright(3.0);
    let early_readout = fright_readout(&early, false, 26).expect("early badge");
    assert!(
        !early_readout.contains('█') && !early_readout.contains('░'),
        "the 30-segment meter must stay out of the early window, got {early_readout:?}"
    );

    let late = active_fright(1.2);
    let late_readout = fright_readout(&late, false, 26).expect("tail readout");
    assert_eq!(late_readout.matches('█').count(), 15);
    assert_eq!(late_readout.matches('░').count(), 4);
    assert_eq!(late_readout.chars().count(), 26);

    let reduced = fright_readout(&late, true, 26).expect("reduced-flash tail banner");
    assert!(reduced.starts_with("THE TURN ENDS "), "got {reduced:?}");
    assert_eq!(reduced.chars().count(), 26);
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
    assert!(lines[1].contains("TURN ENDS"), "got {:?}", lines[1]);

    let _ = std::fs::remove_dir_all(dir);
    let _ = std::fs::remove_dir_all(compact_dir);
}
