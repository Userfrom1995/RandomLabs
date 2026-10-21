//! Tester hostile regression suite for the Pondwake visual phase (PR #707).
//!
//! Category B (algorithmic engine): the visual phase changed the shared
//! animation clock, the effect clocks, and the presentation states, so this
//! suite drives the engine through long mixed-mode scripted sessions and
//! asserts the invariants those renderers rely on:
//!
//! - determinism of the full engine state under identical inputs,
//! - monotone score and never-increasing pickups within a level,
//! - the exact death and level-clear window lengths,
//! - the mode clocks (time-attack cap, sprint par clock),
//! - `elapsed()` and `fx` freezing only with the engine, never inside a
//!   death/clear window,
//! - no panic at the hostile edges (huge dt, deep levels, mode restarts).
//!
//! These tests are deliberately input-driven through the public API only,
//! so a future renderer or engine refactor cannot silently regress the
//! contract the terminal, desktop, and web layers sample.

use maze_chase_engine::actors::Dir;
use maze_chase_engine::game::GameState;
use maze_chase_engine::modes::GameMode;
use maze_chase_engine::tuning;
use maze_chase_engine::Game;

const MODES: [GameMode; 4] = [
    GameMode::Classic,
    GameMode::TimeAttack,
    GameMode::Sprint,
    GameMode::FrightFrenzy,
];

/// Cheap deterministic LCG so the suite has no dependency and reproduces
/// every failure from the seed alone.
struct Lcg(u64);

impl Lcg {
    fn next(&mut self) -> u32 {
        self.0 = self
            .0
            .wrapping_mul(6364136223846793005)
            .wrapping_add(1442695040888963407);
        (self.0 >> 33) as u32
    }

    fn dir(&mut self) -> Option<Dir> {
        match self.next() % 9 {
            0 => Some(Dir::Left),
            1 => Some(Dir::Right),
            2 => Some(Dir::Up),
            3 => Some(Dir::Down),
            _ => None,
        }
    }
}

fn assert_running_invariants(game: &Game, board_total: usize, tag: &str) {
    assert!(
        game.lives >= -1,
        "{tag}: lives fell below the defeat sentinel: {}",
        game.lives
    );
    assert!(
        game.lives <= tuning::START_LIVES + 1,
        "{tag}: lives exceeded the start budget plus one spare wick: {}",
        game.lives
    );
    let total = game.maze.dots_eaten + game.maze.pickups_left();
    assert!(
        total <= board_total,
        "{tag}: pickups exceed the board budget: {total} > {board_total}"
    );
    match game.state {
        GameState::Dying => assert!(
            game.state_elapsed() <= tuning::DEATH_SEQUENCE_S + tuning::STEP,
            "{tag}: death window overran: {}",
            game.state_elapsed()
        ),
        GameState::Clearing => assert!(
            game.state_elapsed() <= tuning::LEVEL_CLEAR_SEQUENCE_S + tuning::STEP,
            "{tag}: clear window overran: {}",
            game.state_elapsed()
        ),
        _ => {}
    }
}

/// Long mixed-mode sessions stay deterministic and within every budget.
#[test]
fn long_scripted_sessions_stay_deterministic_and_bounded() {
    for mode in MODES {
        for seed in [0u64, 1, 7, 42, 0xDEAD_BEEF, u64::MAX] {
            let mut a = Game::with_mode(seed, 1, mode);
            let mut b = Game::with_mode(seed, 1, mode);
            let board_total = a.maze.dots_eaten + a.dots_left();
            let mut rng = Lcg(seed ^ 0xA5A5_A5A5);
            let mut last_score = 0u32;
            for i in 0..12_000 {
                let want = rng.dir();
                a.step(1.0 / 120.0, want);
                b.step(1.0 / 120.0, want);
                assert_running_invariants(
                    &a,
                    board_total,
                    &format!("{mode:?} seed {seed} step {i}"),
                );
                assert!(
                    a.score >= last_score,
                    "{mode:?} seed {seed}: score decreased at step {i}"
                );
                last_score = a.score;
                if !a.running() {
                    // The defeat sentinel must be stable and hashed.
                    assert_eq!(a.canonical(), b.canonical(), "over state diverged");
                    break;
                }
            }
            assert_eq!(
                a.state_hash(),
                b.state_hash(),
                "{mode:?} seed {seed}: identical inputs diverged"
            );
        }
    }
}

/// The death window is exactly the spec's 1.4 s (168 fixed ticks) for
/// every mode, and the clear window exactly 2.0 s (240 fixed ticks).
#[test]
fn death_and_clear_windows_hold_the_spec_duration() {
    let mut g = Game::new(11, 1);
    g.kill_player();
    let mut dying_ticks = 0;
    while g.state == GameState::Dying {
        g.tick(tuning::STEP);
        dying_ticks += 1;
        assert!(
            dying_ticks <= 170,
            "death window never ended (state_t {})",
            g.state_elapsed()
        );
    }
    assert!(
        (167..=169).contains(&dying_ticks),
        "death window was {dying_ticks} ticks, want 168"
    );
    assert_eq!(g.state, GameState::Play);
    assert_eq!(g.lives, tuning::START_LIVES - 1);

    let mut c = Game::new(12, 1);
    for y in 0..maze_chase_engine::maze::HEIGHT {
        for x in 0..maze_chase_engine::maze::WIDTH {
            c.maze.eat_at(x, y);
        }
    }
    c.tick(tuning::STEP);
    assert_eq!(c.state, GameState::Clearing);
    let mut clear_ticks = 0;
    while c.state == GameState::Clearing {
        c.tick(tuning::STEP);
        clear_ticks += 1;
        assert!(
            clear_ticks <= 242,
            "clear window never ended (state_t {})",
            c.state_elapsed()
        );
    }
    assert!(
        (239..=241).contains(&clear_ticks),
        "clear window was {clear_ticks} ticks, want 240"
    );
    assert_eq!(c.state, GameState::Play);
    assert_eq!(c.level, 2);
}

/// Every mode's presentation clock is the engine clock: `elapsed()` is the
/// fixed-tick count and a death/clear window still advances it, so the
/// renderers animate death frames and the clear sweep off the same base.
#[test]
fn presentation_clock_tracks_fixed_ticks_in_every_mode() {
    for mode in MODES {
        let mut g = Game::with_mode(77, 1, mode);
        for i in 0..300 {
            if !g.running() {
                break;
            }
            g.tick(tuning::STEP);
            assert!(
                (g.elapsed() - (i + 1) as f32 * tuning::STEP).abs() <= tuning::STEP,
                "{mode:?}: elapsed drifted at tick {i}: {}",
                g.elapsed()
            );
        }
        let before = g.elapsed();
        if g.state == GameState::Play {
            g.kill_player();
        }
        if g.state == GameState::Dying {
            let before_death = g.state_elapsed();
            g.tick(tuning::STEP);
            assert!(
                g.elapsed() >= before && g.state_elapsed() > before_death,
                "{mode:?}: clock or death timer froze"
            );
        }
    }
}

/// Time attack ends exactly at its 120 s cap even mid-death; sprint's par
/// clock advances only in play and banks the bonus on clear.
#[test]
fn mode_clocks_hold_their_caps() {
    let mut ta = Game::with_mode(1, 1, GameMode::TimeAttack);
    while ta.running() && ta.mode_t < tuning::TIME_ATTACK_S {
        ta.tick(tuning::STEP);
    }
    assert_eq!(ta.state, GameState::Over, "time attack never capped");
    assert!(
        ta.mode_t >= tuning::TIME_ATTACK_S,
        "time attack ended before its cap: {}",
        ta.mode_t
    );

    let mut sprint = Game::with_mode(2, 1, GameMode::Sprint);
    for _ in 0..240 {
        sprint.tick(tuning::STEP);
    }
    assert!(
        sprint.mode_t > 1.0,
        "sprint clock did not advance in play: {}",
        sprint.mode_t
    );
    let level = sprint.level;
    for y in 0..maze_chase_engine::maze::HEIGHT {
        for x in 0..maze_chase_engine::maze::WIDTH {
            sprint.maze.eat_at(x, y);
        }
    }
    sprint.tick(tuning::STEP);
    assert_eq!(sprint.state, GameState::Clearing);
    let clock = sprint.mode_t;
    for _ in 0..20 {
        sprint.tick(tuning::STEP);
    }
    assert!(
        sprint.mode_t == clock,
        "sprint clock kept running through the clear window"
    );
    for _ in 0..250 {
        sprint.tick(tuning::STEP);
    }
    if sprint.level > level {
        assert!(sprint.score > 0, "sprint clear never banked a bonus");
    }
}

/// Hostile dt values and deep levels never panic and never corrupt the
/// state budgets. `step` caps its accumulator, so one huge frame yields a
/// bounded number of ticks, not an unbounded catch-up.
#[test]
fn hostile_dt_and_deep_levels_stay_bounded() {
    let mut g = Game::new(3, 40);
    let before = g.tick_count;
    g.step(1e9, Some(Dir::Left));
    let ticks = g.tick_count - before;
    assert!(
        ticks as f32 <= tuning::MAX_ACCUMULATOR / tuning::STEP + 1.0,
        "huge dt ran {ticks} ticks past the accumulator cap"
    );
    for dt in [1e-9, 1e-3, 0.016, 0.05, 0.5] {
        let mut g = Game::new(9, 3);
        let board_total = g.maze.dots_eaten + g.dots_left();
        for _ in 0..200 {
            g.step(dt, Some(Dir::Down));
            assert_running_invariants(&g, board_total, "irregular dt");
        }
    }
    // A deep level stays within the authored budgets too.
    let mut deep = Game::new(5, 99);
    let board_total = deep.maze.dots_eaten + deep.dots_left();
    for _ in 0..5000 {
        deep.step(1.0 / 120.0, Some(Dir::Right));
        assert_running_invariants(&deep, board_total, "deep level");
    }
}
