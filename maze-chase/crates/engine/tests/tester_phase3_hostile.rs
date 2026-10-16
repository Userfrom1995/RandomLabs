//! Tester hostile regression suite for Phase 3 ghost intelligence (PR #585).
//!
//! Category B (algorithmic engine): the builder's 45 unit + 2 golden tests
//! cover the happy path; these tests attack the new Phase 3 surface
//! (wave clock, personalities, relish, pursuer stages, mode rules) plus the
//! Reviewer Finding 1 re-sync (no phantom crumb delta after descend/refill)
//! so future phases cannot silently regress them.

use maze_chase_engine::actors::{center_of, tile_of, Dir};
use maze_chase_engine::game::GameState;
use maze_chase_engine::modes::{GameMode, WaveClock, WavePhase};
use maze_chase_engine::personalities::{
    bram_target, chase_target, jory_target, kessa_target, nib_target,
};
use maze_chase_engine::relish::Relish;
use maze_chase_engine::replay::Replay;
use maze_chase_engine::{tuning, Game};

fn script(i: usize) -> Option<Dir> {
    match i % 240 {
        0..=59 => Some(Dir::Left),
        60..=119 => Some(Dir::Up),
        120..=179 => Some(Dir::Right),
        _ => None,
    }
}

fn run_ticks_mode(seed: u64, level: u32, mode: GameMode, ticks: usize) -> Game {
    let mut game = Game::with_mode(seed, level, mode);
    for i in 0..ticks {
        if !game.running() {
            break;
        }
        game.step(1.0 / 120.0, script(i));
    }
    game
}

fn clear_board(game: &mut Game) {
    for y in 0..maze_chase_engine::maze::HEIGHT {
        for x in 0..maze_chase_engine::maze::WIDTH {
            game.maze.eat_at(x, y);
        }
    }
}

#[test]
fn phase3_descend_resyncs_crumbs_no_phantom_house_release() {
    // Reviewer Finding 1 regression: finish_clear must re-sync crumbs_seen
    // after eating the fresh start tile, or the first post-descend tick
    // notifies a phantom delta of 1 and releases the house one dot early.
    let mut game = Game::new(501, 1);
    clear_board(&mut game);
    game.tick(tuning::STEP);
    assert_eq!(game.state, GameState::Clearing);
    // Advance tick-by-tick to the exact tick that runs finish_clear (the
    // Clearing branch returns immediately, so no Play movement happens on
    // it): fresh maze, only the start tile eaten, fresh house counters.
    let mut guard = 0;
    while game.state == GameState::Clearing && guard < 600 {
        game.tick(tuning::STEP);
        guard += 1;
    }
    assert_eq!(game.state, GameState::Play, "clearing never finished");
    assert_eq!(game.level, 2);
    assert_eq!(
        game.maze.dots_eaten, 1,
        "descend must eat only the start tile"
    );
    let fresh = tuning::house_counters(2);
    let fresh_counters: [u32; 4] = [
        game.wardens.wardens[0].counter,
        game.wardens.wardens[1].counter,
        game.wardens.wardens[2].counter,
        game.wardens.wardens[3].counter,
    ];
    assert_eq!(fresh_counters, fresh, "descend must reset the house");
    // The first Play tick moves Pip a fraction of a tile (8.5/120 s), so
    // no new crumb can fall: counters must be byte-identical. Without the
    // Finding 1 re-sync the phantom delta of 1 lands on the first housed
    // warden (owed flows in order, warden 1 takes it).
    game.tick(tuning::STEP);
    assert_eq!(game.maze.dots_eaten, 1, "one sub-tile tick eats no crumb");
    let counters: [u32; 4] = [
        game.wardens.wardens[0].counter,
        game.wardens.wardens[1].counter,
        game.wardens.wardens[2].counter,
        game.wardens.wardens[3].counter,
    ];
    assert_eq!(
        counters, fresh,
        "phantom crumb delta leaked into the house after descend"
    );
    // Stronger pin: no house-release event fires on the settle tick when
    // no new crumb was eaten by movement.
    let mut game2 = Game::new(502, 1);
    clear_board(&mut game2);
    game2.tick(tuning::STEP);
    for _ in 0..(2.0 * 120.0 + 10.0) as usize {
        game2.tick(tuning::STEP);
    }
    game2.take_events();
    game2.tick(tuning::STEP);
    let ev = game2.take_events();
    assert!(
        !ev.iter().any(|e| e.starts_with("house-release")),
        "phantom house release after descend: {ev:?}"
    );
}

#[test]
fn phase3_time_attack_refill_resyncs_crumbs() {
    let mut game = Game::with_mode(503, 1, GameMode::TimeAttack);
    clear_board(&mut game);
    game.tick(tuning::STEP);
    for _ in 0..(2.0 * 120.0 + 10.0) as usize {
        game.tick(tuning::STEP);
    }
    assert_eq!(game.level, 1, "time-attack refills at the same level");
    assert!(game.maze.pickups_left() > 0);
    assert!(game.events().iter().any(|e| e == "refill"));
    game.take_events();
    game.tick(tuning::STEP);
    let ev = game.take_events();
    assert!(
        !ev.iter().any(|e| e.starts_with("house-release")),
        "phantom house release after refill: {ev:?}"
    );
}

#[test]
fn phase3_wave_clock_pinned_never_leaves_chase() {
    let mut clock = WaveClock::new(1);
    assert!(clock.pin_chase());
    assert_eq!(clock.phase(), WavePhase::Chase);
    // Pin is idempotent-ish: second pin latches the hold, still chase.
    let _ = clock.pin_chase();
    for _ in 0..6000 {
        assert!(!clock.tick(tuning::STEP), "pinned clock switched");
    }
    assert_eq!(clock.phase(), WavePhase::Chase);
}

#[test]
#[should_panic]
fn phase3_wave_clock_level_zero_rejected() {
    let _ = WaveClock::new(0);
}

#[test]
#[should_panic]
fn phase3_relish_level_zero_rejected() {
    let _ = Relish::new(1 - 1);
}

#[test]
fn phase3_personalities_edge_tiles_deterministic() {
    // Kessa near the board corner aims off-board: pure function, no panic,
    // and dispatch still matches the per-warden functions.
    let corner = (0, 0);
    assert_eq!(kessa_target(corner, Dir::Left), (-4, 0));
    assert_eq!(kessa_target(corner, Dir::Up), (0, -4));
    assert_eq!(bram_target(corner), corner);
    // Jory with extreme mirror inputs stays a pure reflection.
    let j = jory_target((0, 0), (27, 30), Dir::Right);
    assert_eq!(j, (2 * (27 + 2), 2 * 30));
    // Nib boundary: exactly 8.0 tiles away retreats (not farther than 8).
    let sc = (1, 29);
    assert_eq!(nib_target((8, 0), (0, 0), sc), sc);
    assert_eq!(nib_target((9, 0), (0, 0), sc), (9, 0));
    // Dispatch order is the authored cast under hostile tiles too.
    assert_eq!(
        chase_target(0, corner, Dir::Left, (5, 5), (9, 9), sc),
        bram_target(corner)
    );
    assert_eq!(
        chase_target(1, corner, Dir::Left, (5, 5), (9, 9), sc),
        kessa_target(corner, Dir::Left)
    );
}

#[test]
fn phase3_relish_hostile_double_spawn_and_wrong_tile() {
    let mut relish = Relish::new(2);
    assert!(relish.notify_dots(70));
    // Second window cannot double-open while one waits, even far past it.
    assert!(!relish.notify_dots(10_000));
    // Wrong tile eats nothing and keeps the relish waiting.
    assert_eq!(relish.try_eat((0, 0)), 0);
    assert!(relish.active);
    // Expiry fades exactly once: further ticks report nothing.
    assert!(relish.tick(tuning::RELISH_EXPIRE_S + 1.0));
    assert!(!relish.tick(1.0));
    assert_eq!(relish.try_eat(tuning::RELISH_TILE), 0);
    // Second window still opens afterwards.
    assert!(relish.notify_dots(170));
    assert_eq!(relish.try_eat(tuning::RELISH_TILE), tuning::relish_value(2));
}

#[test]
fn phase3_replay_converges_under_every_mode() {
    for mode in [
        GameMode::Classic,
        GameMode::TimeAttack,
        GameMode::Sprint,
        GameMode::FrightFrenzy,
    ] {
        let mut game = Game::with_mode(600, 1, mode);
        let replay = Replay::record(&mut game, 600, script);
        assert_eq!(
            replay.replay_hash(),
            game.state_hash(),
            "replay diverged under mode {:?}",
            mode
        );
    }
    // Modes must actually diverge (guards against a mode-ignored stub).
    let a = run_ticks_mode(601, 1, GameMode::Classic, 600).state_hash();
    let b = run_ticks_mode(601, 1, GameMode::Sprint, 600).state_hash();
    assert_ne!(a, b, "classic and sprint converged: mode ignored?");
}

#[test]
fn phase3_pursuer_pin_holds_chase_to_the_end() {
    let mut game = Game::new(602, 1);
    // Eat down to the second pursuer stage (10 left) through the maze API.
    let mut left = game.maze.pickups_left();
    for y in 0..maze_chase_engine::maze::HEIGHT {
        for x in 0..maze_chase_engine::maze::WIDTH {
            if left <= tuning::PURSUER_SECOND_AT {
                break;
            }
            if game.maze.eat_at(x, y).is_some() {
                left -= 1;
            }
        }
    }
    game.tick(tuning::STEP);
    assert_eq!(game.wardens.mode.phase(), WavePhase::Chase);
    // The pin latches per life: a fresh life gets a fresh wave clock that
    // re-pins to chase on its first play tick, so the respawn tick itself
    // may legitimately read scatter. Allow exactly one grace tick there.
    for _ in 0..3600 {
        if !game.running() {
            break;
        }
        game.step(1.0 / 120.0, script(game.tick_count as usize));
        if game.wardens.mode.phase() != WavePhase::Chase {
            // Grace: only the respawn tick may show scatter, and the very
            // next play tick must re-pin.
            assert_eq!(game.state, GameState::Play, "non-chase wave outside play");
            if !game.running() {
                break;
            }
            game.step(1.0 / 120.0, script(game.tick_count as usize));
            assert_eq!(
                game.wardens.mode.phase(),
                WavePhase::Chase,
                "pursuer pin did not re-latch after respawn"
            );
        }
    }
}

#[test]
fn phase3_eyes_never_enter_walls_on_hostile_trip() {
    use maze_chase_engine::ghosts::WardenState;
    let maze = maze_chase_engine::Maze::new();
    let mut rng = maze_chase_engine::rng::Rng::new(603);
    let mut wardens = maze_chase_engine::ghosts::Wardens::new(3);
    // Strand Bram (warden 0 starts Active at the mouth; housed wardens are
    // not edible) far south so the trip home is a real journey.
    let (sx, sy) = center_of(1, 29);
    wardens.wardens[0].actor.x = sx;
    wardens.wardens[0].actor.y = sy;
    wardens.wardens[0].decided = None;
    wardens.start_fright(600.0);
    let (eaten, _) = wardens.collide((sx, sy));
    assert_eq!(eaten, 1);
    assert_eq!(wardens.wardens[0].state, WardenState::Eyes);
    let ctx = maze_chase_engine::ghosts::PlayerCtx {
        tile: (13, 23),
        dir: Dir::Left,
        speed: 8.5,
        ghost_factor: 1.0,
    };
    for _ in 0..4800 {
        wardens.step(&maze, &mut rng, tuning::STEP, ctx);
        let t = tile_of(wardens.wardens[0].actor.x, wardens.wardens[0].actor.y);
        assert!(
            maze.is_walkable(t.0, t.1, true),
            "eyes entered a wall at {t:?}"
        );
        if wardens.wardens[0].state != WardenState::Eyes {
            break;
        }
    }
    assert_ne!(
        wardens.wardens[0].state,
        WardenState::Eyes,
        "eyes never revived on a long hostile trip"
    );
}

#[test]
fn phase3_frenzy_floor_and_sprint_lifelessness() {
    assert_eq!(GameMode::FrightFrenzy.fright_duration(11), 1.0);
    assert_eq!(GameMode::FrightFrenzy.fright_duration(99), 1.0);
    let mut sprint = Game::with_mode(604, 1, GameMode::Sprint);
    sprint.wardens.start_fright(sprint.mode.fright_duration(1));
    assert!(!sprint.wardens.fright_active());
    assert_eq!(sprint.lives, 0, "sprint starts on one life");
    assert!(!sprint.mode.extra_life_allowed());
}

#[test]
fn phase3_long_run_stability_across_modes_and_depth() {
    // 2400 ticks at depth under every mode: no panic, 64-char hashes.
    for mode in [
        GameMode::Classic,
        GameMode::TimeAttack,
        GameMode::Sprint,
        GameMode::FrightFrenzy,
    ] {
        let game = run_ticks_mode(605, 9, mode, 2400);
        assert_eq!(game.state_hash().len(), 64, "bad hash under {mode:?}");
    }
    // Extreme depth clamps without panic.
    let deep = run_ticks_mode(606, 99, GameMode::Classic, 1200);
    assert_eq!(deep.state_hash().len(), 64);
}
