//! Tester hostile regression suite for Phase 2 engine core (PR #584).
//!
//! Category B (algorithmic engine): boundary extremes, degenerate payloads,
//! and long-run stability. The builder's own 23 unit + 2 golden tests cover
//! the happy path; these tests try to break the deliverable and pin the
//! failure modes (panics vs graceful handling) so future phases cannot
//! silently regress them.

use maze_chase_engine::actors::Dir;
use maze_chase_engine::maze::Maze;
use maze_chase_engine::replay::Replay;
use maze_chase_engine::rng::Rng;
use maze_chase_engine::{Game, TickInput};

fn script(i: usize) -> TickInput {
    match i % 240 {
        0..=59 => Some(Dir::Left),
        60..=119 => Some(Dir::Up),
        120..=179 => Some(Dir::Right),
        _ => None,
    }
}

fn run_ticks(seed: u64, level: u32, ticks: usize) -> Game {
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
fn hostile_seed_extremes_stay_deterministic() {
    for seed in [0u64, 1, u64::MAX, u64::MAX - 1] {
        let a = run_ticks(seed, 1, 600);
        let b = run_ticks(seed, 1, 600);
        assert_eq!(
            a.state_hash(),
            b.state_hash(),
            "seed {seed} must be deterministic"
        );
        assert_eq!(a.state_hash().len(), 64, "hash must stay 64 hex chars");
    }
    // Distinct seeds must diverge (guards against a constant-hash stub).
    let z = run_ticks(0, 1, 600).state_hash();
    let m = run_ticks(u64::MAX, 1, 600).state_hash();
    assert_ne!(z, m, "seed 0 and seed MAX converged: suspicious");
}

#[test]
fn hostile_high_level_runs_without_panic() {
    // Level 99 exercises every clamped tuning curve at depth.
    let game = run_ticks(7, 99, 1200);
    assert_eq!(game.state_hash().len(), 64);
}

#[test]
#[should_panic]
fn hostile_level_zero_rejected() {
    let _ = Game::new(1, 0);
}

#[test]
#[should_panic]
fn hostile_zero_dt_rejected() {
    let mut game = Game::new(1, 1);
    game.step(0.0, None);
}

#[test]
#[should_panic]
fn hostile_negative_dt_rejected() {
    let mut game = Game::new(1, 1);
    game.step(-1.0 / 120.0, None);
}

#[test]
fn hostile_dt_extremes_do_not_panic_or_corrupt() {
    let mut game = Game::new(5, 1);
    // Tiny dt: simulated time barely advances but state stays valid.
    for _ in 0..120 {
        game.step(f64::MIN_POSITIVE, None);
    }
    assert_eq!(game.state_hash().len(), 64);
    // Huge dt: accumulator clamp must absorb it without panic or death spiral.
    let mut game2 = Game::new(5, 1);
    for _ in 0..120 {
        if !game2.running() {
            break;
        }
        game2.step(10.0, Some(Dir::Left));
    }
    assert_eq!(game2.state_hash().len(), 64);
}

#[test]
fn hostile_replay_converges_across_game_over() {
    // 36000 ticks = 300 simulated seconds of blind scripted play: the run
    // reaches Game Over (lives -1). The replay module documents that a
    // recording must re-simulate to the same hash; record/replay must agree
    // even when the run dies. (The builder's own determinism row uses 1200
    // ticks and never reaches game-over, so it cannot catch this.)
    let mut game = Game::new(99, 1);
    let replay = Replay::record(&mut game, 36_000, script);
    assert_eq!(
        game.state,
        maze_chase_engine::game::GameState::Over,
        "trigger condition: scripted run must reach game-over"
    );
    assert_eq!(
        replay.replay_hash(),
        game.state_hash(),
        "replay diverged from live run across game-over"
    );
}

#[test]
fn hostile_oob_maze_queries_are_safe() {
    let mut maze = Maze::new();
    // eat_at outside the board must return None, never panic.
    assert_eq!(maze.eat_at(-1, 14), None);
    assert_eq!(maze.eat_at(28, 14), None);
    assert_eq!(maze.eat_at(0, -1), None);
    assert_eq!(maze.eat_at(0, 31), None);
    assert_eq!(maze.eat_at(i32::MIN, i32::MAX), None);
    // Walkability probes must not panic on extremes either.
    let _ = maze.is_walkable(-1000, 14, false);
    let _ = maze.is_walkable(1000, -1000, true);
}

#[test]
#[should_panic]
fn hostile_maze_wrong_height_rejected() {
    let _ = Maze::from_rows("..........\n");
}

#[test]
#[should_panic]
fn hostile_maze_unknown_byte_rejected() {
    // 31 rows x 28 cols of an illegal byte: dimension parse passes,
    // tile decode must refuse it loudly instead of mapping to a default.
    let bad = "@".repeat(28) + "\n";
    let text = bad.repeat(31);
    let _ = Maze::from_rows(&text);
}

#[test]
#[should_panic]
fn hostile_rng_zero_bound_rejected() {
    let mut rng = Rng::new(3);
    let _ = rng.fork("test").next_bounded(0);
}

#[test]
fn hostile_kill_player_outside_play_is_noop() {
    let mut game = Game::new(12, 1);
    game.kill_player();
    assert!(!matches!(
        game.state,
        maze_chase_engine::game::GameState::Play
    ));
    // Second kill during the death sequence must not corrupt the machine.
    game.kill_player();
    for _ in 0..400 {
        game.tick(maze_chase_engine::tuning::STEP);
    }
    // After the death beat the machine must have respawned or ended the run.
    assert!(matches!(
        game.state,
        maze_chase_engine::game::GameState::Play | maze_chase_engine::game::GameState::Over
    ));
}
