//! Original maze layout, crumb field, tunnel, and walkability queries.
//!
//! The layout below is authored for this project: an orthogonal, left-right
//! symmetric maze on a 28x31 grid with a side tunnel and a central
//! gatehouse. Functional constraints shared with the genre (dimensions,
//! tunnel row, gatehouse anchors, four corner sunseeds) are spec'd in
//! `docs/behavior-spec.md`; every wall run outside the gatehouse block is
//! fresh geometry drawn for this game. See `docs/identity.md` for the
//! authorship log.
//!
//! Legend (one character per tile):
//!   `#`  wall
//!   `.`  corridor with a crumb
//!   `*`  corridor with a sunseed (energizer)
//!   `-`  corridor without a crumb (tunnel row, gatehouse apron)
//!   `D`  gatehouse door (wardens and returnees only)
//!   ` `  gatehouse interior (wardens only; holds no crumbs)

/// Grid width in tiles.
pub const WIDTH: i32 = 28;
/// Grid height in tiles.
pub const HEIGHT: i32 = 31;
/// Row carrying the side tunnel (wraps horizontally past both edges).
pub const TUNNEL_ROW: i32 = 14;

/// Pip's start tile.
pub const PLAYER_START_TILE: (i32, i32) = (13, 23);
/// Gatehouse door tile (wardens exit through here).
pub const GHOST_DOOR_TILE: (i32, i32) = (13, 12);
/// Tile just outside the gatehouse where wardens appear.
pub const GHOST_OUTSIDE_TILE: (i32, i32) = (13, 11);
/// Waiting slots inside the gatehouse for wardens 2-4.
pub const HOUSE_SLOTS: [(i32, i32); 3] = [(11, 14), (13, 14), (15, 14)];
/// Scatter corners, one per warden (used by Phase 3 personalities).
pub const SCATTER_CORNERS: [(i32, i32); 4] = [(1, 1), (26, 1), (1, 29), (26, 29)];

/// Launch maze source, authored in `maze-chase/levels/ember-warren.maze`
/// (authorship header plus reachability proof live in that file).
/// `include_str!` keeps the engine dependency-free and WASM-safe: the
/// layout compiles in, no filesystem reads at runtime. Later phases add
/// levels through the same [`Maze::from_rows`] loader.
const LAUNCH_MAZE: &str = include_str!("../../../levels/ember-warren.maze");

/// Base tile kinds (the immutable walls/doors/house shell).
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Tile {
    Wall,
    Dot,
    Energizer,
    Plain,
    Door,
    House,
}

/// What `eat_at` found on a tile.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Pickup {
    Dot,
    Energizer,
}

fn parse(ch: u8) -> Tile {
    match ch {
        b'#' => Tile::Wall,
        b'.' => Tile::Dot,
        b'*' => Tile::Energizer,
        b'-' => Tile::Plain,
        b'D' => Tile::Door,
        b' ' => Tile::House,
        _ => panic!("maze: unknown tile byte"),
    }
}

/// Parsed maze plus the mutable per-level crumb field.
#[derive(Clone, Debug)]
pub struct Maze {
    grid: Vec<Tile>,
    dots: Vec<bool>,
    energizers: Vec<bool>,
    /// Crumbs on a fresh maze.
    pub total_dots: usize,
    /// Sunseeds on a fresh maze.
    pub total_energizers: usize,
    /// Crumbs still standing.
    pub dots_remaining: usize,
    /// Sunseeds still standing.
    pub energizers_remaining: usize,
    /// Total crumbs + sunseeds eaten this level (drives house exits).
    pub dots_eaten: usize,
}

impl Maze {
    /// Parse the launch maze. Panics if a row is malformed (fail fast).
    pub fn new() -> Self {
        Self::from_rows(LAUNCH_MAZE)
    }

    /// Parse a maze from `#`-commented level text (see
    /// `levels/ember-warren.maze`). Comment lines (`#` alone or `# ` plus
    /// prose) and blank lines are skipped; exactly 31 rows of 28 tiles
    /// must remain. Maze rows start with wall bytes (`##`, `#.` and kin),
    /// never with a bare `#` syllable, so the two never collide.
    pub fn from_rows(text: &str) -> Self {
        let rows: Vec<&str> = text
            .lines()
            .map(str::trim_end)
            .filter(|l| !l.is_empty() && *l != "#" && !l.starts_with("# "))
            .collect();
        assert_eq!(rows.len(), HEIGHT as usize, "maze has wrong height");
        let mut grid = Vec::with_capacity((WIDTH * HEIGHT) as usize);
        let mut dots = vec![false; (WIDTH * HEIGHT) as usize];
        let mut energizers = vec![false; (WIDTH * HEIGHT) as usize];
        let mut dots_remaining = 0;
        let mut energizers_remaining = 0;
        for (y, row) in rows.iter().enumerate() {
            assert_eq!(row.len(), WIDTH as usize, "maze row has wrong width");
            for (x, ch) in row.bytes().enumerate() {
                let tile = parse(ch);
                grid.push(tile);
                let i = y * WIDTH as usize + x;
                match tile {
                    Tile::Dot => {
                        dots[i] = true;
                        dots_remaining += 1;
                    }
                    Tile::Energizer => {
                        energizers[i] = true;
                        energizers_remaining += 1;
                    }
                    _ => {}
                }
            }
        }
        Self {
            grid,
            dots,
            energizers,
            total_dots: dots_remaining,
            total_energizers: energizers_remaining,
            dots_remaining,
            energizers_remaining,
            dots_eaten: 0,
        }
    }

    fn idx(tx: i32, ty: i32) -> usize {
        (ty * WIDTH + tx) as usize
    }

    /// Total pickups (crumbs + sunseeds) on a fresh maze.
    pub fn total_pickups(&self) -> usize {
        self.total_dots + self.total_energizers
    }

    /// Pickups still standing.
    pub fn pickups_left(&self) -> usize {
        self.dots_remaining + self.energizers_remaining
    }

    pub fn in_bounds(tx: i32, ty: i32) -> bool {
        tx >= 0 && tx < WIDTH && ty >= 0 && ty < HEIGHT
    }

    /// Base tile at a coordinate. Panics out of bounds.
    pub fn tile(&self, tx: i32, ty: i32) -> Tile {
        assert!(Self::in_bounds(tx, ty), "tile out of bounds");
        self.grid[Self::idx(tx, ty)]
    }

    /// Walkability with the tunnel wrapping off-grid horizontally.
    pub fn is_walkable(&self, tx: i32, ty: i32, for_ghost: bool) -> bool {
        if ty == TUNNEL_ROW && (tx < 0 || tx >= WIDTH) {
            return true; // the tunnel mouth
        }
        if !Self::in_bounds(tx, ty) {
            return false;
        }
        match self.grid[Self::idx(tx, ty)] {
            Tile::Wall => false,
            Tile::Door | Tile::House => for_ghost,
            Tile::Dot | Tile::Energizer | Tile::Plain => true,
        }
    }

    /// True on the fast tunnel stretches (outer corridor of the tunnel row).
    pub fn is_tunnel(&self, tx: i32, ty: i32) -> bool {
        ty == TUNNEL_ROW
            && Self::in_bounds(tx, ty)
            && self.grid[Self::idx(tx, ty)] == Tile::Plain
            && (tx < 8 || tx >= WIDTH - 8)
    }

    /// Eat whatever pickup stands on a tile.
    pub fn eat_at(&mut self, tx: i32, ty: i32) -> Option<Pickup> {
        if !Self::in_bounds(tx, ty) {
            return None;
        }
        let i = Self::idx(tx, ty);
        if self.energizers[i] {
            self.energizers[i] = false;
            self.energizers_remaining -= 1;
            self.dots_eaten += 1;
            return Some(Pickup::Energizer);
        }
        if self.dots[i] {
            self.dots[i] = false;
            self.dots_remaining -= 1;
            self.dots_eaten += 1;
            return Some(Pickup::Dot);
        }
        None
    }

    /// Raw crumb field bytes (dots then sunseeds) for the state hash.
    pub fn dot_bytes(&self) -> Vec<u8> {
        let mut out = Vec::with_capacity(self.dots.len() + self.energizers.len());
        out.extend(self.dots.iter().map(|&b| u8::from(b)));
        out.extend(self.energizers.iter().map(|&b| u8::from(b)));
        out
    }

    /// Flood fill over Pip-walkable tiles; returns the count of pickups
    /// reachable from `start`. A valid maze reaches every pickup.
    pub fn reachable_pickups_from(&self, start: (i32, i32)) -> usize {
        if !self.is_walkable(start.0, start.1, false) {
            return 0;
        }
        let mut seen = vec![false; (WIDTH * HEIGHT) as usize];
        let mut stack = vec![start];
        seen[Self::idx(start.0, start.1)] = true;
        let mut reached = 0;
        while let Some((x, y)) = stack.pop() {
            let i = Self::idx(x, y);
            if self.dots[i] || self.energizers[i] {
                reached += 1;
            }
            for (nx, ny) in [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)] {
                let (nx, ny) = if nx < 0 || nx >= WIDTH {
                    if y == TUNNEL_ROW {
                        (if nx < 0 { WIDTH - 1 } else { 0 }, y)
                    } else {
                        continue;
                    }
                } else {
                    (nx, ny)
                };
                if !Self::in_bounds(nx, ny) || seen[Self::idx(nx, ny)] {
                    continue;
                }
                if !self.is_walkable(nx, ny, false) {
                    continue;
                }
                seen[Self::idx(nx, ny)] = true;
                stack.push((nx, ny));
            }
        }
        reached
    }
}

impl Default for Maze {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dimensions_and_anchors() {
        let maze = Maze::new();
        assert_eq!((WIDTH, HEIGHT), (28, 31));
        assert_eq!(maze.tile(13, 23), Tile::Dot);
        assert_eq!(maze.tile(13, 12), Tile::Door);
        assert_eq!(maze.tile(13, 11), Tile::Dot);
        assert!(maze.is_walkable(13, 23, false));
        // Tunnel mouths wrap off-grid; off-row edges stay shut.
        assert!(maze.is_walkable(-1, TUNNEL_ROW, false));
        assert!(maze.is_walkable(WIDTH, TUNNEL_ROW, false));
        assert!(!maze.is_walkable(-1, 0, false));
        // The house is ghost-only.
        assert!(!maze.is_walkable(13, 14, false));
        assert!(maze.is_walkable(13, 14, true));
        assert!(!maze.is_walkable(13, 12, false));
        assert!(maze.is_walkable(13, 12, true));
        // Scatter corners are open corridors.
        for (x, y) in SCATTER_CORNERS {
            assert!(maze.is_walkable(x, y, false), "corner {x},{y}");
        }
    }

    #[test]
    fn four_sunseeds_and_full_reachability() {
        let maze = Maze::new();
        assert_eq!(maze.total_dots, 445);
        assert_eq!(maze.total_energizers, 4);
        let total = maze.pickups_left();
        assert_eq!(total, 449);
        assert_eq!(maze.reachable_pickups_from(PLAYER_START_TILE), total);
    }

    #[test]
    fn eat_at_counts_down() {
        let mut maze = Maze::new();
        let before = maze.pickups_left();
        assert_eq!(maze.eat_at(13, 23), Some(Pickup::Dot));
        assert_eq!(maze.eat_at(13, 23), None);
        assert_eq!(maze.pickups_left(), before - 1);
        assert_eq!(maze.dots_eaten, 1);
    }
}
