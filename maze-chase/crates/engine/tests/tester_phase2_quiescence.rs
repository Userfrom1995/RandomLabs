//! Tester quiescence regression suite for the Phase 2 game-over fix (PR #584).
//!
//! Complements `tester_phase2_hostile.rs`: where the hostile suite pins the
//! record/replay convergence contract across game-over, these tests pin the
//! underlying invariant directly - once the machine reaches `GameState::Over`,
//! further `step`/`tick` calls must be fully quiescent and must not mutate the
//! state hash. Any future change that re-introduces post-mortem `tick_count`
//! bumps (the exact defect fixed in `ea07fdc4`) fails here immediately.

use maze_chase_engine::actors::Dir;
use maze_chase_engine::game::GameState;
use maze_chase_engine::{Game, TickInput};

fn script(i: usize) -> TickInput {
    match i % 240 {
        0..=59 => Some(Dir::Left),
        60..=119 => Some(Dir::Up),
        120..=179 => Some(Dir::Right),
        _ => None,
    }
}

fn drive_to_game_over(seed: u64) -> Game {
    let mut game = Game::new(seed, 1);
    for i in 0..36_000 {
        if !game.running() {
            break;
        }
        game.step(1.0 / 120.0, script(i));
    }
    assert_eq!(
        game.state,
        GameState::Over,
        "trigger condition: scripted run must reach game-over"
    );
    game
}

#[test]
fn quiescent_post_over_steps_leave_hash_frozen() {
    let mut game = drive_to_game_over(99);
    let frozen = game.state_hash();
    // Hammer the dead machine with varied inputs and dt through step().
    for i in 0..600 {
        let events = game.step(1.0 / 120.0, script(i));
        let _ = events;
    }
    assert_eq!(
        game.state_hash(),
        frozen,
        "step() past game-over mutated the state hash"
    );
    assert_eq!(game.state, GameState::Over);
}

#[test]
fn quiescent_post_over_ticks_leave_hash_frozen() {
    let mut game = drive_to_game_over(1234);
    let frozen = game.state_hash();
    // Direct tick() calls past death must also be quiescent.
    for _ in 0..600 {
        game.tick(maze_chase_engine::tuning::STEP);
    }
    assert_eq!(
        game.state_hash(),
        frozen,
        "tick() past game-over mutated the state hash"
    );
    assert_eq!(game.state, GameState::Over);
}
