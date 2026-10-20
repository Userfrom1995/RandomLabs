//! Tester round-11 contract: the fright badge is HUD information for the
//! whole active window, while the 30-segment countdown meter joins only for
//! the final 1.5 s. The design of record lists the fright badge as part of
//! the play HUD (`docs/design.md`), and the desktop HUD already paints it.

use maze_chase_engine::game::Game;
use maze_chase_terminal::chrome::{fright_readout, side_panel, top_bar};

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

    let bar = top_bar(&game, 0, false);
    assert!(
        bar.iter().any(|line| line.contains("FRIGHT")),
        "compact top bar must carry the active fright badge: {bar:?}"
    );
}

#[test]
fn fright_meter_still_joins_only_for_the_final_tail() {
    let early = active_fright(3.0);
    let early_readout = fright_readout(&early, false).expect("early badge");
    assert!(
        !early_readout.contains('█') && !early_readout.contains('░'),
        "the 30-segment meter must stay out of the early window, got {early_readout:?}"
    );

    let late = active_fright(1.2);
    let late_readout = fright_readout(&late, false).expect("tail readout");
    assert_eq!(late_readout.matches('█').count(), 24);
    assert_eq!(late_readout.matches('░').count(), 6);

    let reduced = fright_readout(&late, true).expect("reduced-flash tail banner");
    assert!(reduced.starts_with("THE TURN ENDS "), "got {reduced:?}");
}
