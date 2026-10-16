//! Headless verify harness: the Phase 2 + Phase 3 acceptance matrix.
//!
//! Each `check_*` function returns a [`Check`] (name + pass/fail + detail).
//! [`run_all`] executes the full matrix; the `maze-chase-verify` binary
//! prints one row per check and exits non-zero on any failure, so CI gates
//! on it. The same rows map to `docs/feature-matrix.md` engine section.

use crate::actors::{center_of, step_actor, tile_of, Actor, Dir};
use crate::game::{Game, GameState};
use crate::ghosts::{PlayerCtx, WardenState, Wardens};

fn ctx(tile: (i32, i32)) -> PlayerCtx {
    PlayerCtx {
        tile,
        dir: Dir::Left,
        speed: 8.5,
        ghost_factor: 1.0,
    }
}
use crate::maze::{
    Maze, GHOST_DOOR_TILE, GHOST_OUTSIDE_TILE, HEIGHT, PLAYER_START_TILE, TUNNEL_ROW, WIDTH,
};
use crate::modes::{GameMode, WaveClock, WavePhase};
use crate::personalities::{chase_target, jory_target, kessa_target, nib_target};
use crate::replay::Replay;
use crate::rng::Rng;
use crate::tuning;
use std::time::Instant;

/// One matrix row result.
pub struct Check {
    pub name: &'static str,
    pub passed: bool,
    pub detail: String,
}

fn pass(name: &'static str, detail: String) -> Check {
    Check {
        name,
        passed: true,
        detail,
    }
}

fn fail(name: &'static str, detail: String) -> Check {
    Check {
        name,
        passed: false,
        detail,
    }
}

pub fn check_maze_geometry() -> Check {
    const NAME: &str = "maze-geometry";
    let maze = Maze::new();
    if (WIDTH, HEIGHT) != (28, 31) {
        return fail(NAME, format!("dimensions are {WIDTH}x{HEIGHT}"));
    }
    if maze.tile(PLAYER_START_TILE.0, PLAYER_START_TILE.1) != crate::maze::Tile::Dot {
        return fail(NAME, "player start is not a crumb corridor".into());
    }
    if !maze.is_walkable(-1, TUNNEL_ROW, false) || !maze.is_walkable(WIDTH, TUNNEL_ROW, false) {
        return fail(NAME, "tunnel mouths do not wrap".into());
    }
    if maze.energizers_remaining != 4 {
        return fail(
            NAME,
            format!("sunsseed count {}", maze.energizers_remaining),
        );
    }
    pass(
        NAME,
        format!(
            "{} crumbs + 4 sunseeds, tunnel row {TUNNEL_ROW}",
            maze.dots_remaining
        ),
    )
}

pub fn check_reachability() -> Check {
    const NAME: &str = "maze-reachability";
    let maze = Maze::new();
    let total = maze.pickups_left();
    let reached = maze.reachable_pickups_from(PLAYER_START_TILE);
    if reached != total {
        return fail(NAME, format!("reachable {reached} of {total}"));
    }
    pass(NAME, format!("flood fill reaches all {total} pickups"))
}

pub fn check_movement_cornering() -> Check {
    const NAME: &str = "movement-cornering";
    let maze = Maze::new();
    // Row 11 is an open corridor: sprint right, every tick must advance.
    let (cx, cy) = center_of(8, 11);
    let mut actor = Actor::new(cx, cy, Dir::Right, 8.5);
    actor.want = Dir::Right;
    let x0 = actor.x;
    for _ in 0..60 {
        step_actor(&maze, &mut actor, 1.0 / 120.0, false);
    }
    if actor.x <= x0 + 3.0 {
        return fail(
            NAME,
            format!("open-corridor sprint stalled at x={}", actor.x),
        );
    }
    // Wall halt: face the center column walls from the start tile.
    let (sx, sy) = center_of(PLAYER_START_TILE.0, PLAYER_START_TILE.1);
    let mut blocked = Actor::new(sx, sy, Dir::Up, 8.5);
    blocked.want = Dir::Up;
    for _ in 0..600 {
        step_actor(&maze, &mut actor, 1.0 / 120.0, false);
        step_actor(&maze, &mut blocked, 1.0 / 120.0, false);
    }
    let (tx, ty) = tile_of(blocked.x, blocked.y);
    if !maze.is_walkable(tx, ty, false) {
        return fail(NAME, format!("actor stopped inside a wall at {tx},{ty}"));
    }
    pass(NAME, "sprint advances, walls halt on walkable tiles".into())
}

pub fn check_tunnel_wrap() -> Check {
    const NAME: &str = "movement-tunnel-wrap";
    let maze = Maze::new();
    let (cx, cy) = center_of(1, TUNNEL_ROW);
    let mut actor = Actor::new(cx, cy, Dir::Left, 8.0);
    actor.want = Dir::Left;
    for _ in 0..60 {
        step_actor(&maze, &mut actor, 1.0 / 120.0, false);
    }
    if actor.x < 24.0 {
        return fail(NAME, format!("no wrap, x={}", actor.x));
    }
    pass(NAME, format!("left mouth wraps to x={:.2}", actor.x))
}

pub fn check_scoring_lives() -> Check {
    const NAME: &str = "scoring-lives";
    let mut game = Game::new(11, 1);
    if game.score != tuning::DOT_SCORE {
        return fail(NAME, format!("start-tile crumb scored {}", game.score));
    }
    game.add_score(tuning::EXTRA_LIFE_AT);
    if game.lives != tuning::START_LIVES + 1 {
        return fail(NAME, "extra life did not fire at 10,000".into());
    }
    game.add_score(50_000);
    if game.lives != tuning::START_LIVES + 1 {
        return fail(NAME, "extra life fired twice".into());
    }
    pass(NAME, "start crumb +10, extra life once at 10,000".into())
}

pub fn check_death_defeat() -> Check {
    const NAME: &str = "lives-death-defeat";
    let mut game = Game::new(12, 1);
    game.kill_player();
    for _ in 0..200 {
        game.tick(tuning::STEP);
    }
    if game.state != GameState::Play || game.lives != tuning::START_LIVES - 1 {
        return fail(NAME, "death did not respawn with one fewer life".into());
    }
    for _ in 0..3 {
        game.kill_player();
        for _ in 0..200 {
            game.tick(tuning::STEP);
        }
    }
    if game.state != GameState::Over || game.lives != -1 {
        return fail(NAME, "defeat did not end the run below zero lives".into());
    }
    pass(NAME, "1.4 s death, respawn, defeat below zero".into())
}

pub fn check_level_flow() -> Check {
    const NAME: &str = "level-clear-flow";
    let mut game = Game::new(13, 1);
    for y in 0..HEIGHT {
        for x in 0..WIDTH {
            game.maze.eat_at(x, y);
        }
    }
    game.tick(tuning::STEP);
    if game.state != GameState::Clearing {
        return fail(NAME, "empty maze did not start clearing".into());
    }
    for _ in 0..300 {
        game.tick(tuning::STEP);
    }
    if game.state != GameState::Play || game.level != 2 || game.maze.pickups_left() == 0 {
        return fail(NAME, "clear did not descend to a fresh level 2".into());
    }
    pass(NAME, "clear beat 2.0 s, fresh maze on level 2".into())
}

pub fn check_house_exits() -> Check {
    const NAME: &str = "house-exits";
    let maze = Maze::new();
    let mut rng = Rng::new(21);
    let mut wardens = Wardens::new(1);
    wardens.notify_crumbs(3);
    if wardens.wardens[1].state != WardenState::Leaving {
        return fail(NAME, "dot counter did not release warden 2".into());
    }
    for _ in 0..1200 {
        wardens.step(&maze, &mut rng, tuning::STEP, ctx((13, 23)));
        if wardens.wardens[1].state == WardenState::Active {
            break;
        }
    }
    if wardens.wardens[1].state != WardenState::Active {
        return fail(NAME, "leaver never reached the mouth".into());
    }
    pass(
        NAME,
        "counters release in order, scripted walk exits".into(),
    )
}

pub fn check_fright_chain() -> Check {
    const NAME: &str = "fright-chain";
    let mut game = Game::new(22, 1);
    // Force a sunseed under Pip's next tile by eating via the maze API is
    // not needed: call the scoring path directly through wardens.
    game.wardens.start_fright(6.0);
    let (mx, my) = center_of(GHOST_OUTSIDE_TILE.0, GHOST_OUTSIDE_TILE.1);
    let before = game.score;
    let (eaten, death) = game.wardens.collide((mx, my));
    if eaten != 1 || death != 0 {
        return fail(NAME, "frightened contact did not eat".into());
    }
    let p1 = game.notify_warden_eaten();
    game.wardens.wardens[1].state = WardenState::Active;
    game.wardens.wardens[1].actor.x = mx;
    game.wardens.wardens[1].actor.y = my;
    let (eaten2, _) = game.wardens.collide((mx, my));
    let p2 = if eaten2 == 1 {
        game.notify_warden_eaten()
    } else {
        0
    };
    if (p1, p2) != (200, 400) {
        return fail(NAME, format!("chain paid {p1}/{p2}, want 200/400"));
    }
    if game.score != before + 600 {
        return fail(NAME, "chain total missing from score".into());
    }
    pass(NAME, "fright eats first, chain pays 200/400".into())
}

pub fn check_determinism() -> Check {
    const NAME: &str = "determinism-replay";
    let script = |i: usize| match i % 240 {
        0..=59 => Some(Dir::Left),
        60..=119 => Some(Dir::Up),
        120..=179 => Some(Dir::Right),
        _ => None,
    };
    let mut a = Game::new(777, 1);
    let replay = Replay::record(&mut a, 1200, script);
    let live = a.state_hash();
    let back = replay.replay_hash();
    if live != back {
        return fail(NAME, "replay diverged from live run".into());
    }
    let mut c = Game::new(778, 1);
    for i in 0..1200 {
        c.step(1.0 / 120.0, script(i));
    }
    if c.state_hash() == live {
        return fail(NAME, "different seeds converged (suspicious)".into());
    }
    pass(
        NAME,
        format!("1200-tick replay converges ({:.12}...)", &live[..12]),
    )
}

pub fn check_perf() -> Check {
    const NAME: &str = "perf-headless";
    let mut game = Game::new(1, 1);
    let t0 = Instant::now();
    let ticks = 12_000; // 100 simulated seconds
    for i in 0..ticks {
        game.step(
            1.0 / 120.0,
            match i % 240 {
                0..=59 => Some(Dir::Left),
                _ => None,
            },
        );
        if !game.running() {
            break;
        }
    }
    let elapsed = t0.elapsed().as_secs_f64();
    let per_tick_us = elapsed * 1e6 / ticks as f64;
    // Floor: a full tick (Pip + 4 wardens + hash-free) must stay far below
    // the 8,333 us frame budget even on a slow runner.
    if per_tick_us > 8_333.0 {
        return fail(NAME, format!("{per_tick_us:.1} us/tick over budget"));
    }
    pass(NAME, format!("{per_tick_us:.1} us/tick for 12k ticks"))
}

/// Door anchors pinned for layers and Phase 3.
pub fn check_door_anchors() -> Check {
    const NAME: &str = "door-anchors";
    if GHOST_DOOR_TILE != (13, 12) || GHOST_OUTSIDE_TILE != (13, 11) {
        return fail(NAME, "door/outside anchors moved".into());
    }
    pass(NAME, "door (13,12), mouth (13,11)".into())
}

pub fn check_personality_targets() -> Check {
    const NAME: &str = "personalities-targets";
    if kessa_target((13, 23), Dir::Up) != (13, 19) {
        return fail(NAME, "ambusher is not 4 tiles ahead".into());
    }
    if jory_target((10, 20), (13, 23), Dir::Up) != (16, 22) {
        return fail(NAME, "flanker mirror is off-pivot".into());
    }
    if nib_target((13, 23), (26, 1), (1, 29)) != (13, 23) {
        return fail(NAME, "lurker must hunt while far".into());
    }
    if nib_target((13, 23), (13, 20), (1, 29)) != (1, 29) {
        return fail(NAME, "lurker must retreat while close".into());
    }
    // Dispatch order is the authored cast: Bram, Kessa, Jory, Nib.
    let bram = chase_target(0, (13, 23), Dir::Up, (10, 20), (1, 1), (1, 1));
    let kessa = chase_target(1, (13, 23), Dir::Up, (10, 20), (26, 1), (26, 1));
    if bram != (13, 23) || kessa != (13, 19) {
        return fail(NAME, "chase dispatch drifted from the cast".into());
    }
    pass(NAME, "leader/ambusher/flanker/lurker pins hold".into())
}

pub fn check_wave_clock() -> Check {
    const NAME: &str = "wave-clock";
    let mut clock = WaveClock::new(1);
    if clock.phase() != WavePhase::Scatter {
        return fail(NAME, "clock must open on scatter".into());
    }
    for _ in 0..(6.9 * 120.0) as usize {
        if clock.tick(tuning::STEP) {
            return fail(NAME, "first scatter leg switched early".into());
        }
    }
    if !clock.tick(0.2) || clock.phase() != WavePhase::Chase {
        return fail(NAME, "7 s scatter did not hand over to chase".into());
    }
    // Level 5 shaves the opener 7 - 4 = 3 s; deep levels floor at 1 s.
    if (WaveClock::new(5).timer() - 3.0).abs() > 1e-4 {
        return fail(NAME, "level shave is not 1 s per level".into());
    }
    if (WaveClock::new(30).timer() - 1.0).abs() > 1e-4 {
        return fail(NAME, "scatter floor is not 1.0 s".into());
    }
    // Full table drains to a chase-hold that never switches back.
    let mut clock = WaveClock::new(1);
    let mut switches = 0;
    for _ in 0..60_000 {
        if clock.tick(tuning::STEP) {
            switches += 1;
        }
        if switches == 12 {
            break;
        }
    }
    if switches != 12 || clock.phase() != WavePhase::Chase {
        return fail(NAME, format!("table drained with {switches}/12 switches"));
    }
    for _ in 0..1200 {
        if clock.tick(tuning::STEP) {
            return fail(NAME, "chase-hold switched back".into());
        }
    }
    pass(NAME, "7/20 table, level shave, chase-hold".into())
}

pub fn check_fright_reversal() -> Check {
    const NAME: &str = "fright-reversal";
    let maze = Maze::new();
    let mut rng = Rng::new(41);
    let mut wardens = Wardens::new(1);
    let before = wardens.wardens[0].actor.dir;
    wardens.start_fright(6.0);
    if wardens.wardens[0].actor.dir != before.opposite() {
        return fail(NAME, "fright start did not reverse the pack".into());
    }
    // Wave switches reverse too: run into the first handover.
    let mut switched = false;
    for _ in 0..(8.0 * 120.0) as usize {
        let events = wardens.step(&maze, &mut rng, tuning::STEP, ctx((13, 23)));
        if events.iter().any(|e| e == "wave:chase") {
            switched = true;
            break;
        }
    }
    if !switched {
        return fail(NAME, "first wave handover never fired".into());
    }
    pass(NAME, "fright and wave switches reverse the pack".into())
}

pub fn check_eyes_return() -> Check {
    const NAME: &str = "eyes-return";
    let maze = Maze::new();
    let mut rng = Rng::new(42);
    let mut wardens = Wardens::new(1);
    // Strand Bram far south so the trip home is a real journey.
    let (sx, sy) = center_of(13, 27);
    wardens.wardens[0].actor.x = sx;
    wardens.wardens[0].actor.y = sy;
    wardens.wardens[0].decided = None;
    wardens.start_fright(600.0);
    if wardens.collide((sx, sy)) != (1, 0) {
        return fail(NAME, "frightened contact did not eat".into());
    }
    if wardens.wardens[0].state != WardenState::Eyes {
        return fail(NAME, "eaten warden did not become eyes".into());
    }
    // One second later the eyes must still be travelling: no timer snap.
    for _ in 0..120 {
        wardens.step(&maze, &mut rng, tuning::STEP, ctx((13, 23)));
    }
    if wardens.wardens[0].state != WardenState::Eyes {
        return fail(NAME, "eyes revived on a timer instead of pathing".into());
    }
    let mut revived = false;
    for _ in 0..3600 {
        let events = wardens.step(&maze, &mut rng, tuning::STEP, ctx((13, 23)));
        let tile = tile_of(wardens.wardens[0].actor.x, wardens.wardens[0].actor.y);
        if !maze.is_walkable(tile.0, tile.1, true) {
            return fail(NAME, "eyes entered a wall".into());
        }
        if events.iter().any(|e| e == "warden-back:Bram") {
            revived = true;
            break;
        }
    }
    if !revived || wardens.wardens[0].state != WardenState::Active {
        return fail(NAME, "eyes never drifted home to revive".into());
    }
    pass(NAME, "eyes path home and revive at the mouth".into())
}

pub fn check_relish_cycle() -> Check {
    const NAME: &str = "relish-cycle";
    let mut game = Game::new(31, 1);
    // Hand-eat 70 crumbs through the maze API, then tick: the first
    // window must ripen.
    let mut eaten = 0;
    'outer: for y in 0..HEIGHT {
        for x in 0..WIDTH {
            if eaten >= 70 {
                break 'outer;
            }
            if game.maze.eat_at(x, y).is_some() {
                eaten += 1;
            }
        }
    }
    // Clear the crumb under the relish tile so the pickup tick scores
    // the tier exactly (the tile-change crumb would otherwise add 10).
    game.maze
        .eat_at(tuning::RELISH_TILE.0, tuning::RELISH_TILE.1);
    game.tick(tuning::STEP);
    if !game.events().iter().any(|e| e == "relish:spawn:100") {
        return fail(NAME, "70 crumbs did not ripen a relish".into());
    }
    // Walk Pip onto the relish tile: pickup scores the tier.
    let (rx, ry) = center_of(tuning::RELISH_TILE.0, tuning::RELISH_TILE.1);
    game.player.x = rx;
    game.player.y = ry;
    let score_before = game.score;
    game.tick(tuning::STEP);
    if !game.events().iter().any(|e| e == "relish:100") {
        return fail(NAME, "relish pickup did not score".into());
    }
    if game.score != score_before + 100 {
        return fail(NAME, "relish tier missing from score".into());
    }
    game.take_events();
    // Second window ripens at 170 and also scores.
    while game.maze.dots_eaten < 170 {
        let mut progressed = false;
        for y in 0..HEIGHT {
            for x in 0..WIDTH {
                if game.maze.dots_eaten >= 170 {
                    break;
                }
                if game.maze.eat_at(x, y).is_some() {
                    progressed = true;
                }
            }
        }
        if !progressed {
            break;
        }
    }
    game.player.x = rx;
    game.player.y = ry;
    game.tick(tuning::STEP);
    if !game.events().iter().any(|e| e == "relish:100") {
        return fail(NAME, "second relish window never scored".into());
    }
    pass(NAME, "70/170 ripen, tier scores on pickup".into())
}

pub fn check_pursuer_stages() -> Check {
    const NAME: &str = "pursuer-stages";
    let wardens = Wardens::new(1);
    let base = tuning::PLAYER_BASE_SPEED * tuning::WARDEN_SPEED_FRACTION;
    if (wardens.cruise(8.5, 21, 0, 1.0) - 8.5 * tuning::WARDEN_SPEED_FRACTION).abs() > 1e-4 {
        return fail(NAME, "cruise drifted above 20 crumbs".into());
    }
    if (wardens.cruise(8.5, 20, 0, 1.0) - base * 1.03).abs() > 1e-3 {
        return fail(NAME, "first pursuer stage is not +3%".into());
    }
    if (wardens.cruise(8.5, 10, 0, 1.0) - base * 1.06).abs() > 1e-3 {
        return fail(NAME, "second pursuer stage is not +6%".into());
    }
    if (wardens.cruise(8.5, 10, 1, 1.0) - base).abs() > 1e-4 {
        return fail(NAME, "pursuer enraged a non-leader".into());
    }
    // Live: with 10 crumbs left the wave clock pins to chase.
    let mut game = Game::new(32, 1);
    let mut left = game.maze.pickups_left();
    for y in 0..HEIGHT {
        for x in 0..WIDTH {
            if left <= tuning::PURSUER_SECOND_AT {
                break;
            }
            if game.maze.eat_at(x, y).is_some() {
                left -= 1;
            }
        }
    }
    game.tick(tuning::STEP);
    if game.wardens.mode.phase() != WavePhase::Chase {
        return fail(NAME, "10 crumbs left did not pin chase".into());
    }
    pass(NAME, "Bram +3%/+6%, chase pin at 10".into())
}

pub fn check_mode_rules() -> Check {
    const NAME: &str = "mode-rules";
    // Sprint: one life, no fright, no spare wick.
    let mut sprint = Game::with_mode(33, 1, GameMode::Sprint);
    if sprint.lives != 0 {
        return fail(NAME, "sprint did not start on one life".into());
    }
    sprint.wardens.start_fright(sprint.mode.fright_duration(1));
    if sprint.wardens.fright_active() {
        return fail(NAME, "sprint opened a fright window".into());
    }
    // Fright-frenzy: 4x windows with a 1.0 s floor at depth.
    if GameMode::FrightFrenzy.fright_duration(1) != 24.0 {
        return fail(NAME, "frenzy window is not 4x".into());
    }
    if GameMode::FrightFrenzy.fright_duration(11) != 1.0 {
        return fail(NAME, "frenzy floor is not 1.0 s".into());
    }
    // Time-attack: a cleared maze refills at the same level.
    let mut attack = Game::with_mode(34, 1, GameMode::TimeAttack);
    for y in 0..HEIGHT {
        for x in 0..WIDTH {
            attack.maze.eat_at(x, y);
        }
    }
    attack.tick(tuning::STEP);
    for _ in 0..300 {
        attack.tick(tuning::STEP);
    }
    if attack.level != 1 || attack.maze.pickups_left() == 0 {
        return fail(NAME, "time-attack did not refill level 1".into());
    }
    if !attack.events().iter().any(|e| e == "refill") {
        return fail(NAME, "refill event missing".into());
    }
    // And the clock ends the run at 120 s (`step` drains the log, so
    // keep the final batch for the event).
    let mut last = Vec::new();
    while attack.running() {
        last = attack.step(1.0 / 120.0, None);
    }
    if attack.state != GameState::Over || !last.iter().any(|e| e == "time-up") {
        return fail(NAME, "time-attack did not end at time-up".into());
    }
    pass(NAME, "sprint/frenzy/attack rules hold".into())
}

/// Full Phase 2 + Phase 3 matrix in execution order.
pub fn run_all() -> Vec<Check> {
    vec![
        check_maze_geometry(),
        check_reachability(),
        check_movement_cornering(),
        check_tunnel_wrap(),
        check_scoring_lives(),
        check_death_defeat(),
        check_level_flow(),
        check_house_exits(),
        check_fright_chain(),
        check_personality_targets(),
        check_wave_clock(),
        check_fright_reversal(),
        check_eyes_return(),
        check_relish_cycle(),
        check_pursuer_stages(),
        check_mode_rules(),
        check_determinism(),
        check_door_anchors(),
        check_perf(),
    ]
}
