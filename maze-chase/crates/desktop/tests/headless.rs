//! Headless desktop-layer integration: the shared engine plus the
//! desktop renderer with no window, no audio device, and no input
//! hardware. A scripted run must score, animate (frames change), and
//! reproduce pixel-identical output on replay.

use maze_chase_assets::themes;
use maze_chase_desktop::render::{self, Hud};
use maze_chase_engine::actors::Dir;
use maze_chase_engine::game::Game;
use maze_chase_engine::tuning::STEP;

/// One scripted run: 10 seconds of play from `seed`, one frame per
/// simulated second. Returns (final score, frames).
fn scripted_run(seed: u64) -> (u32, Vec<Vec<u32>>) {
    scripted_run_with(seed, &[Dir::Left, Dir::Up, Dir::Right, Dir::Down])
}

/// Same as [`scripted_run`] but steering through `wants` in rotation
/// (one heading per 90 ticks). Different steering must visibly diverge
/// the hunt: this is the harness's input-sensitivity check.
fn scripted_run_with(seed: u64, wants: &[Dir]) -> (u32, Vec<Vec<u32>>) {
    let theme = &themes::EMBER_WARREN;
    let mut game = Game::new(seed, 1);
    let mut frames = Vec::new();
    for tick in 0..1200 {
        game.step(STEP as f64, Some(wants[(tick / 90) % wants.len()]));
        if tick % 120 == 0 {
            let hud = Hud {
                best: 0,
                frame_no: tick as u64,
                flash: true,
                fps: Some(60.0),
                tune: "OFF",
            };
            let frame = render::render_play(&game, theme, hud, 1100, 760).unwrap();
            frames.push(frame.px);
        }
    }
    (game.score, frames)
}

#[test]
fn scripted_run_scores_and_animates() {
    let (score, frames) = scripted_run(99);
    assert!(score > 0, "ten scripted seconds must eat crumbs");
    assert_eq!(frames.len(), 10);
    let first = &frames[0];
    assert!(
        frames[1..].iter().any(|f| f != first),
        "frames must change as the hunt moves"
    );
}

#[test]
fn scripted_run_reproduces_identical_pixels() {
    let (s1, f1) = scripted_run(99);
    let (s2, f2) = scripted_run(99);
    assert_eq!(s1, s2);
    assert_eq!(f1, f2);
}

#[test]
fn different_inputs_stay_independent() {
    // The scripted hunt never samples RNG (no fright, no wander draws),
    // so seeds alone converge by design; steering is what must diverge
    // the pixels. Both runs stay valid games.
    let (s1, f1) = scripted_run_with(99, &[Dir::Left, Dir::Up, Dir::Right, Dir::Down]);
    let (s2, f2) = scripted_run_with(99, &[Dir::Right, Dir::Down, Dir::Left, Dir::Up]);
    assert!(s1 > 0 && s2 > 0);
    assert_ne!(f1, f2, "opposite steering must diverge the frames");
}
