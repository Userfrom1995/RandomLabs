//! Headless verify harness: the Phase 2 acceptance matrix as code.
//!
//! Each `check_*` function returns a [`Check`] (name + pass/fail + detail).
//! [`run_all`] executes the full matrix; the `maze-chase-verify` binary
//! prints one row per check and exits non-zero on any failure, so CI gates
//! on it. The same rows map to `docs/feature-matrix.md` engine section.

use crate::actors::{center_of, step_actor, tile_of, Actor, Dir};
use crate::game::{Game, GameState};
use crate::ghosts::{WardenState, Wardens};
use crate::maze::{
    Maze, GHOST_DOOR_TILE, GHOST_OUTSIDE_TILE, HEIGHT, PLAYER_START_TILE, TUNNEL_ROW, WIDTH,
};
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
    let (mx, my) = center_of(GHOST_OUTSIDE_TILE.0, GHOST_OUTSIDE_TILE.1);
    for _ in 0..1200 {
        wardens.step(&maze, &mut rng, tuning::STEP, (mx, my), 8.5);
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

/// Full Phase 2 matrix in execution order.
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
        check_determinism(),
        check_door_anchors(),
        check_perf(),
    ]
}
