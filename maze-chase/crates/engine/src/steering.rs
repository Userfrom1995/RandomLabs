//! Warden steering strategies.
//!
//! Phase 2 ships the [`WanderSteering`] baseline: at each tile center an
//! active warden picks a uniform-random walkable exit (never the direct
//! reversal) from the seeded `wander` stream, with fixed Up/Left/Down/Right
//! tie-breaks. It is a real, deterministic strategy that exercises the full
//! core loop (movement, tunnel clamp, fright slowdown, collisions, house
//! exits), and Phase 3 replaces it with the four authored personalities by
//! implementing this same trait: no core-loop code changes required.

use crate::actors::Dir;
use crate::maze::Maze;
use crate::rng::RngStream;

/// Steering policy: choose the next heading for a warden standing at a
/// tile center. `current` is the incoming heading (excluded as a direct
/// reversal unless it is the only exit).
pub trait Steer {
    fn choose(
        &mut self,
        maze: &Maze,
        tile: (i32, i32),
        current: Dir,
        frightened: bool,
        rng: &mut RngStream,
    ) -> Dir;
}

/// Baseline deterministic wander: uniform-random non-reversing exit.
///
/// Frightened wardens draw from the same stream (Phase 3 gives fright its
/// own stream and personality targets; the trait boundary is unchanged).
#[derive(Default, Debug)]
pub struct WanderSteering;

impl Steer for WanderSteering {
    fn choose(
        &mut self,
        maze: &Maze,
        tile: (i32, i32),
        current: Dir,
        _frightened: bool,
        rng: &mut RngStream,
    ) -> Dir {
        let (tx, ty) = tile;
        let mut exits = Vec::new();
        for dir in Dir::ORDER {
            if dir == current.opposite() {
                continue;
            }
            let (dx, dy) = dir.delta();
            if maze.is_walkable(tx + dx, ty + dy, true) {
                exits.push(dir);
            }
        }
        if exits.is_empty() {
            return current.opposite();
        }
        exits[rng.next_bounded(exits.len())]
    }
}

/// Greedy target steering shared by Phase 3 personalities (shipped now so
/// the helper is tested with the core loop): pick the walkable non-reversing
/// exit minimizing squared Euclidean distance to `target`, breaking ties in
/// [`Dir::ORDER`].
pub fn greedy_exit(maze: &Maze, tile: (i32, i32), current: Dir, target: (i32, i32)) -> Dir {
    let (tx, ty) = tile;
    let mut best: Option<Dir> = None;
    let mut best_d = i32::MAX;
    for dir in Dir::ORDER {
        if dir == current.opposite() {
            continue;
        }
        let (dx, dy) = dir.delta();
        let (nx, ny) = (tx + dx, ty + dy);
        if !maze.is_walkable(nx, ny, true) {
            continue;
        }
        let d = (nx - target.0).pow(2) + (ny - target.1).pow(2);
        if d < best_d {
            best_d = d;
            best = Some(dir);
        }
    }
    best.unwrap_or(current.opposite())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::actors::{center_of, tile_of};
    use crate::maze::PLAYER_START_TILE;
    use crate::rng::Rng;

    #[test]
    fn wander_never_enters_walls_and_replays() {
        let maze = Maze::new();
        let (cx, cy) = center_of(PLAYER_START_TILE.0, PLAYER_START_TILE.1);
        let start = tile_of(cx, cy);
        let mut rng_a = Rng::new(99);
        let mut rng_b = Rng::new(99);
        let mut steer = WanderSteering;
        let (mut t, mut dir) = (start, Dir::Left);
        for _ in 0..40 {
            let a = steer.choose(&maze, t, dir, false, rng_a.fork("wander"));
            let b = steer.choose(&maze, t, dir, false, rng_b.fork("wander"));
            assert_eq!(a, b, "same seed must replay");
            let (dx, dy) = a.delta();
            assert!(
                maze.is_walkable(t.0 + dx, t.1 + dy, true),
                "steering picked a wall exit"
            );
            // Walk one tile along the choice to keep the walk legal.
            t = (t.0 + dx, t.1 + dy);
            dir = a;
        }
    }

    #[test]
    fn greedy_exit_chases_target() {
        let maze = Maze::new();
        // Open row 11: heading right toward a far target keeps going right.
        assert_eq!(
            greedy_exit(&maze, (10, 11), Dir::Right, (26, 11)),
            Dir::Right
        );
        // Dead-end-free choice prefers the exit closest to the target.
        let pick = greedy_exit(&maze, (13, 11), Dir::Up, (13, 1));
        assert_eq!(pick, Dir::Up);
    }
}
