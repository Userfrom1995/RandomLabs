//! Golden replay hashes: the determinism contract across platforms.
//!
//! These scripts drive fixed seeds with fixed intents; any platform, any
//! build profile, must reproduce the pinned hashes bit-for-bit. If a golden
//! changes, the simulation changed: investigate, never re-pin blindly.

use maze_chase_engine::actors::Dir;
use maze_chase_engine::Game;

fn script(i: usize) -> Option<Dir> {
    match i % 240 {
        0..=59 => Some(Dir::Left),
        60..=119 => Some(Dir::Up),
        120..=179 => Some(Dir::Right),
        _ => None,
    }
}

fn run(seed: u64, level: u32, ticks: usize) -> Game {
    let mut game = Game::new(seed, level);
    for i in 0..ticks {
        if !game.running() {
            break;
        }
        game.step(1.0 / 120.0, script(i));
    }
    game
}

#[test]
fn golden_seed_777_level_1_1200_ticks() {
    let game = run(777, 1, 1200);
    assert_eq!(
        game.state_hash(),
        "6a401db306eea9631a544c3af42e485f66cf90da60d60dfb9b7100bd92edb181"
    );
    assert_eq!(game.score, 50);
    assert!(game.running());
}

#[test]
fn golden_higher_level_progresses_deterministically() {
    let a = run(20260, 4, 2400);
    let b = run(20260, 4, 2400);
    assert_eq!(a.state_hash(), b.state_hash());
    assert_ne!(
        a.state_hash(),
        run(20260, 5, 2400).state_hash(),
        "level must change the trajectory"
    );
}
