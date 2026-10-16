//! Tile-center movement with buffered turns and cornering assist.
//!
//! Positions are continuous, in tile units: tile (tx, ty) spans
//! `[tx, tx+1) x [ty, ty+1)` and its center is `(tx+0.5, ty+0.5)`.
//!
//! Rules (arcade feel, authored for this project):
//!   - Reversing is instant, anywhere.
//!   - Perpendicular turns latch at the next tile center: the buffered want
//!     executes when the actor comes within [`TURN_WINDOW_TILES`] of the
//!     center and the exit is walkable, with a small corner cut (snap).
//!   - Blocked movement halts exactly on the tile center, never in a wall.
//!   - The tunnel row wraps horizontally past both edges.

use crate::maze::{Maze, TUNNEL_ROW, WIDTH};
use crate::tuning::TURN_WINDOW_TILES;

/// Compass direction. Tie-break priority everywhere is Up, Left, Down,
/// Right, which keeps replays identical on every platform.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Dir {
    Up,
    Left,
    Down,
    Right,
}

impl Dir {
    /// Fixed priority order for steering ties.
    pub const ORDER: [Dir; 4] = [Dir::Up, Dir::Left, Dir::Down, Dir::Right];

    /// Tile step for this direction.
    pub fn delta(self) -> (i32, i32) {
        match self {
            Dir::Up => (0, -1),
            Dir::Left => (-1, 0),
            Dir::Down => (0, 1),
            Dir::Right => (1, 0),
        }
    }

    /// Direct reversal.
    pub fn opposite(self) -> Dir {
        match self {
            Dir::Up => Dir::Down,
            Dir::Left => Dir::Right,
            Dir::Down => Dir::Up,
            Dir::Right => Dir::Left,
        }
    }
}

/// Input intent for one tick: the direction the player (or a test) wants.
pub type TickInput = Option<Dir>;

/// Tile containing a continuous position.
pub fn tile_of(x: f32, y: f32) -> (i32, i32) {
    (x.floor() as i32, y.floor() as i32)
}

/// Center of a tile in continuous coordinates.
pub fn center_of(tx: i32, ty: i32) -> (f32, f32) {
    (tx as f32 + 0.5, ty as f32 + 0.5)
}

/// One moving body: continuous position, heading, buffered want, speed.
#[derive(Clone, Debug)]
pub struct Actor {
    pub x: f32,
    pub y: f32,
    pub dir: Dir,
    pub want: Dir,
    /// Tiles per second (set by the owner every tick from tuning).
    pub speed: f32,
}

impl Actor {
    pub fn new(x: f32, y: f32, dir: Dir, speed: f32) -> Self {
        Self {
            x,
            y,
            dir,
            want: dir,
            speed,
        }
    }

    /// Rounded state tuple for hashes and logs (4-decimal positions).
    pub fn state_tuple(&self) -> (f32, f32, i32, i32) {
        let (dx, dy) = self.dir.delta();
        (
            (self.x * 10_000.0).round() / 10_000.0,
            (self.y * 10_000.0).round() / 10_000.0,
            dx,
            dy,
        )
    }
}

/// Advance one actor by `dt` seconds. Never enters a wall, never NaNs.
///
/// Invariant: the actor rests either on a tile center (blocked) or inside a
/// walkable tile. Strides are capped at 0.1 tiles so boundary crossings are
/// examined one tile at a time.
pub fn step_actor(maze: &Maze, actor: &mut Actor, dt: f32, for_ghost: bool) {
    let mut remaining = (actor.speed * dt).max(0.0);
    let mut guard = 0;
    while remaining > 1e-9 && guard < 256 {
        guard += 1;
        let (tx, ty) = tile_of(actor.x, actor.y);
        let (cx, cy) = center_of(tx, ty);
        let (mut dx, mut dy) = actor.dir.delta();

        // Instant reversal anywhere.
        if actor.want == actor.dir.opposite() {
            actor.dir = actor.want;
            (dx, dy) = actor.dir.delta();
        }

        // Buffered perpendicular turn near the tile center.
        if actor.want != actor.dir && actor.want != actor.dir.opposite() {
            let (wx, wy) = actor.want.delta();
            let near = (cx - actor.x).abs() + (cy - actor.y).abs() <= TURN_WINDOW_TILES;
            if near && maze.is_walkable(tx + wx, ty + wy, for_ghost) {
                actor.x = cx;
                actor.y = cy;
                actor.dir = actor.want;
                (dx, dy) = actor.dir.delta();
            }
        }

        let stride = remaining.min(0.1);
        let (reuse_tx, reuse_ty) = tile_of(actor.x, actor.y);
        let (rcx, rcy) = center_of(reuse_tx, reuse_ty);
        let nx = actor.x + dx as f32 * stride;
        let ny = actor.y + dy as f32 * stride;

        // Tunnel mouth: crossing the edge on the tunnel row wraps around.
        // Gate on the continuous position, not the tile exit: wrapping
        // early teleports in-bounds strides into off-grid limbo and breaks
        // rightward travel.
        if reuse_ty == TUNNEL_ROW
            && (nx < 0.0 || nx >= WIDTH as f32)
            && maze.is_walkable(reuse_tx + dx, reuse_ty + dy, for_ghost)
        {
            let wrapped = if nx < 0.0 {
                nx + WIDTH as f32
            } else {
                nx - WIDTH as f32
            };
            // Float absorption can land exactly on WIDTH: fold back so every
            // post-step position stays in bounds.
            actor.x = wrapped % WIDTH as f32;
            actor.y = ny;
            remaining -= stride;
            continue;
        }

        // Blocked exit: glide to the center if it lies ahead, then halt.
        if !maze.is_walkable(reuse_tx + dx, reuse_ty + dy, for_ghost) {
            if dx > 0 && actor.x < rcx {
                actor.x = nx.min(rcx);
            } else if dx < 0 && actor.x > rcx {
                actor.x = nx.max(rcx);
            } else if dy > 0 && actor.y < rcy {
                actor.y = ny.min(rcy);
            } else if dy < 0 && actor.y > rcy {
                actor.y = ny.max(rcy);
            }
            remaining = 0.0;
            continue;
        }

        actor.x = nx;
        actor.y = ny;
        remaining -= stride;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::maze::PLAYER_START_TILE;

    fn start_actor() -> (Maze, Actor) {
        let maze = Maze::new();
        let (cx, cy) = center_of(PLAYER_START_TILE.0, PLAYER_START_TILE.1);
        (maze, Actor::new(cx, cy, Dir::Left, 8.5))
    }

    #[test]
    fn reversal_is_instant() {
        let (maze, mut actor) = start_actor();
        actor.want = Dir::Right;
        step_actor(&maze, &mut actor, 1.0 / 120.0, false);
        assert_eq!(actor.dir, Dir::Right);
    }

    #[test]
    fn wall_halts_on_center() {
        let (maze, mut actor) = start_actor();
        // Face the center column walls above the start and hold forward.
        actor.dir = Dir::Up;
        actor.want = Dir::Up;
        for _ in 0..240 {
            step_actor(&maze, &mut actor, 1.0 / 120.0, false);
        }
        let (tx, ty) = tile_of(actor.x, actor.y);
        assert!(maze.is_walkable(tx, ty, false));
        // Rested exactly on a center (blocked) or inside a walkable tile.
        let (cx, _) = center_of(tx, ty);
        assert!(
            (actor.x - cx).abs() < 1e-4 || maze.is_walkable(tx, ty, false),
            "actor left walkable space"
        );
    }

    #[test]
    fn tunnel_wraps_around() {
        let maze = Maze::new();
        let (cx, cy) = center_of(1, TUNNEL_ROW);
        let mut actor = Actor::new(cx, cy, Dir::Left, 8.0);
        actor.want = Dir::Left;
        // 60 ticks at 8 tiles/s cover 4 tiles: from x=1.5 leftward across
        // the mouth (1.5 tiles out) and back in from the right mouth.
        for _ in 0..60 {
            step_actor(&maze, &mut actor, 1.0 / 120.0, false);
        }
        assert!(
            actor.x > 24.0,
            "expected wrap to the right mouth, got x={}",
            actor.x
        );
        let (tx, ty) = tile_of(actor.x, actor.y);
        assert_eq!(ty, TUNNEL_ROW);
        assert!(maze.is_walkable(tx, ty, false));
    }

    #[test]
    fn movement_is_deterministic() {
        let (maze, mut a) = start_actor();
        let (maze2, mut b) = start_actor();
        a.want = Dir::Up;
        b.want = Dir::Up;
        for _ in 0..120 {
            step_actor(&maze, &mut a, 1.0 / 120.0, false);
            step_actor(&maze2, &mut b, 1.0 / 120.0, false);
        }
        assert_eq!(a.state_tuple(), b.state_tuple());
    }
}
