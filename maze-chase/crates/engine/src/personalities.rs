//! Warden personality target functions (Phase 3).
//!
//! The four wardens hunt as pure functions of Pip's tile and heading:
//! Bram the leader runs Pip down directly, Kessa the ambusher aims four
//! tiles ahead, Jory the flanker mirrors Bram across a pivot two tiles
//! ahead of Pip, and Nib the lurker hunts while far and retreats to its
//! corner when close. In scatter legs every warden targets its authored
//! corner instead ([`crate::maze::SCATTER_CORNERS`]). Frightened wardens
//! ignore targets and wander at random (handled in `ghosts.rs`).
//!
//! These are original functions authored for this project from the genre
//! feel pinned in `docs/behavior-spec.md`, per `docs/legal.md`. Targets
//! may point at walls or off-board tiles: the greedy exit choice only
//! minimizes distance toward them, so clamping would change the hunt.

use crate::actors::Dir;

/// Tiles ahead of Pip that Kessa aims at.
pub const AHEAD_AMBUSH: i32 = 4;
/// Tiles ahead of Pip that Jory's mirror pivots on.
pub const AHEAD_FLANK: i32 = 2;
/// Euclidean tiles within which Nib retreats to its corner.
pub const SHY_TILES: f32 = 8.0;

/// Bram the leader: Pip's tile, always.
pub fn bram_target(player: (i32, i32)) -> (i32, i32) {
    player
}

/// Kessa the ambusher: four tiles ahead of Pip's heading.
pub fn kessa_target(player: (i32, i32), dir: Dir) -> (i32, i32) {
    let (dx, dy) = dir.delta();
    (player.0 + dx * AHEAD_AMBUSH, player.1 + dy * AHEAD_AMBUSH)
}

/// Jory the flanker: Bram mirrored across a pivot two tiles ahead of
/// Pip (`2 * pivot - bram`).
pub fn jory_target(bram: (i32, i32), player: (i32, i32), dir: Dir) -> (i32, i32) {
    let (dx, dy) = dir.delta();
    let pivot = (player.0 + dx * AHEAD_FLANK, player.1 + dy * AHEAD_FLANK);
    (2 * pivot.0 - bram.0, 2 * pivot.1 - bram.1)
}

/// Nib the lurker: Pip's tile while Nib itself stands farther than 8
/// tiles away (euclidean), else its scatter corner.
pub fn nib_target(player: (i32, i32), self_tile: (i32, i32), scatter: (i32, i32)) -> (i32, i32) {
    let dx = (player.0 - self_tile.0) as f32;
    let dy = (player.1 - self_tile.1) as f32;
    if dx.hypot(dy) > SHY_TILES {
        player
    } else {
        scatter
    }
}

/// Personality target for warden `index` in a chase leg: `bram_tile` is
/// Bram's current tile (Jory's mirror reference), `self_tile` is the
/// warden's own tile (Nib's shyness is measured from itself).
pub fn chase_target(
    index: usize,
    player: (i32, i32),
    dir: Dir,
    bram_tile: (i32, i32),
    self_tile: (i32, i32),
    scatter: (i32, i32),
) -> (i32, i32) {
    match index {
        0 => bram_target(player),
        1 => kessa_target(player, dir),
        2 => jory_target(bram_tile, player, dir),
        _ => nib_target(player, self_tile, scatter),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn leader_runs_pip_down() {
        assert_eq!(bram_target((13, 23)), (13, 23));
    }

    #[test]
    fn ambusher_aims_four_ahead() {
        assert_eq!(kessa_target((13, 23), Dir::Up), (13, 19));
        assert_eq!(kessa_target((13, 23), Dir::Left), (9, 23));
        assert_eq!(kessa_target((13, 23), Dir::Right), (17, 23));
        assert_eq!(kessa_target((13, 23), Dir::Down), (13, 27));
    }

    #[test]
    fn flanker_mirrors_bram_across_pivot() {
        // Pip at (13,23) heading up: pivot (13,21). Bram at (10,20)
        // mirrors to (16,22).
        assert_eq!(
            jory_target((10, 20), (13, 23), Dir::Up),
            (2 * 13 - 10, 2 * 21 - 20)
        );
        assert_eq!(jory_target((10, 20), (13, 23), Dir::Up), (16, 22));
        // Bram sitting exactly on the pivot reflects to the pivot.
        assert_eq!(jory_target((13, 21), (13, 23), Dir::Up), (13, 21));
    }

    #[test]
    fn lurker_hunts_far_and_retreats_near() {
        let corner = (1, 29);
        // Far: hunts Pip.
        assert_eq!(nib_target((13, 23), (26, 1), corner), (13, 23));
        assert_eq!(nib_target((9, 0), (0, 0), corner), (9, 0));
        // Exactly 8 tiles away is not farther than 8: retreats.
        assert_eq!(nib_target((8, 0), (0, 0), corner), corner);
        // Close: retreats to its corner.
        assert_eq!(nib_target((13, 23), (13, 20), corner), corner);
        assert_eq!(nib_target((5, 5), (5, 5), corner), corner);
    }

    #[test]
    fn chase_dispatch_matches_cast_order() {
        let player = (13, 23);
        let bram = (10, 20);
        assert_eq!(
            chase_target(0, player, Dir::Up, bram, (1, 1), (1, 1)),
            bram_target(player)
        );
        assert_eq!(
            chase_target(1, player, Dir::Up, bram, (26, 1), (26, 1)),
            kessa_target(player, Dir::Up)
        );
        assert_eq!(
            chase_target(2, player, Dir::Up, bram, (1, 29), (1, 29)),
            jory_target(bram, player, Dir::Up)
        );
        // Nib far from itself hunts; near retreats.
        assert_eq!(
            chase_target(3, player, Dir::Up, bram, (26, 1), (26, 29)),
            player
        );
        assert_eq!(
            chase_target(3, player, Dir::Up, bram, (13, 22), (26, 29)),
            (26, 29)
        );
    }
}
