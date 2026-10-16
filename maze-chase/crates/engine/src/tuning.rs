//! Single home for every authored gameplay number.
//!
//! Provenance: all tables below are originals written for this project from
//! genre-level behavioral descriptions (crumb maze, four wardens, sunseeds,
//! relish bonuses, escalating levels), tuned for feel. They match the values
//! pinned in `docs/behavior-spec.md`, which were measured from the in-repo
//! Python feel reference (`pacman/`, issue #552) that this project authors
//! its own tables against. Nothing here is transcribed from any proprietary
//! game's data.
//!
//! Conventions: speeds are tiles per second at 100 percent; level index is
//! 1-based and curves clamp at their last entry; durations are seconds.

/// Fixed simulation rate. The accumulator in [`crate::game::Game::step`]
/// clamps at 0.5 s so a hitch can never spiral the sim to death.
pub const SIM_HZ: u32 = 120;
/// One fixed tick in seconds.
pub const STEP: f32 = 1.0 / 120.0;
/// Spiral-of-death clamp on the accumulator, in seconds.
pub const MAX_ACCUMULATOR: f32 = 0.5;

/// Base cruise speed of Pip on level 1. Brisk on a 28-wide maze while still
/// controllable at 120 Hz.
pub const PLAYER_BASE_SPEED: f32 = 8.5;

/// Fractional player speed per level (index 0 is level 1). Ramps gently,
/// then holds so endless levels stay hard but fair.
pub const PLAYER_SPEED_CURVE: [f32; 9] = [1.00, 1.03, 1.06, 1.09, 1.12, 1.14, 1.16, 1.18, 1.20];

/// Warden cruise as a fraction of current player speed. Slightly slower in
/// open corridors so sharp cornering escapes; tunnel and fright modifiers
/// apply on top.
pub const WARDEN_SPEED_FRACTION: f32 = 0.96;
/// Warden speed inside the side tunnel, as a fraction of cruise.
pub const WARDEN_TUNNEL_FRACTION: f32 = 0.55;
/// Pip speed inside the side tunnel, as a fraction of current speed.
pub const PLAYER_TUNNEL_FRACTION: f32 = 0.95;
/// Pip speed while sunseed fright runs, as a fraction of current speed.
pub const FRIGHT_PLAYER_FRACTION: f32 = 1.04;
/// Warden speed while frightened, as a fraction of cruise.
pub const FRIGHT_WARDEN_FRACTION: f32 = 0.62;
/// Scripted gatehouse-exit pace, as a fraction of cruise.
pub const LEAVING_SPEED_FRACTION: f32 = 0.55;
/// Eaten-warden return pace (Phase 3 drifts eyes home at this pace; Phase 2
/// respawns on a timer documented in `ghosts.rs`).
pub const EYES_SPEED_FRACTION: f32 = 1.5;

/// Sunseed fright duration per level, in seconds. Long early, then a steep
/// falloff so late levels reward routing over button-pressing.
pub const FRIGHT_DURATION_CURVE: [f32; 11] =
    [6.0, 5.0, 4.0, 3.5, 3.0, 2.5, 2.0, 1.5, 1.0, 0.5, 0.0];
/// Final seconds of fright rendered as a flashing warning (Phase 3 art;
/// the timer itself is simulated here from Phase 2).
pub const FRIGHT_FLASH_THRESHOLD: f32 = 1.5;

/// Warden-chain bonus for eating wardens on one sunseed.
pub const WARDEN_CHAIN_SCORE: [u32; 4] = [200, 400, 800, 1600];

/// Points per crumb.
pub const DOT_SCORE: u32 = 10;
/// Points per sunseed (energizer).
pub const ENERGIZER_SCORE: u32 = 50;
/// Score threshold granting one extra life, once per game.
pub const EXTRA_LIFE_AT: u32 = 10_000;

/// Gatehouse exit: crumbs Pip must eat before each warden walks out.
/// Level 1 values; deeper levels ease toward the floor.
pub const HOUSE_DOT_COUNTERS: [u32; 4] = [0, 7, 17, 32];
/// Floor for the per-warden dot counters on deep levels.
pub const HOUSE_COUNTER_MIN: [u32; 4] = [0, 0, 0, 0];
/// No crumb eaten for this long releases the next warden anyway.
pub const HOUSE_IDLE_TIMEOUT_S: f32 = 4.0;
/// Fixed delay before an eaten warden returns to the gatehouse mouth.
/// Phase 2 simplification: Phase 3 replaces this with eyes that drift home
/// at [`EYES_SPEED_FRACTION`] and revive at the door.
pub const EATEN_RETURN_S: f32 = 4.0;

/// Lives at game start.
pub const START_LIVES: i32 = 3;
/// Death cinematics length, in seconds, before respawn or defeat.
pub const DEATH_SEQUENCE_S: f32 = 1.4;
/// Level-clear cinematics length, in seconds, before the next maze.
pub const LEVEL_CLEAR_SEQUENCE_S: f32 = 2.0;
/// Buffered-turn cornering assist window, in tiles.
pub const TURN_WINDOW_TILES: f32 = 0.35;
/// Pip-warden touch distance in tiles (same tile or within this radius).
pub const COLLIDE_DISTANCE: f32 = 0.55;

fn clamped(curve: &[f32], level: u32) -> f32 {
    assert!(level >= 1, "level must be >= 1");
    curve[(core::cmp::min(level as usize, curve.len())) - 1]
}

/// Current player cruise speed in tiles per second.
pub fn player_speed(level: u32) -> f32 {
    PLAYER_BASE_SPEED * clamped(&PLAYER_SPEED_CURVE, level)
}

/// Sunseed fright duration for a level, in seconds.
pub fn fright_duration(level: u32) -> f32 {
    clamped(&FRIGHT_DURATION_CURVE, level)
}

/// Per-warden gatehouse dot counters, easing to the floor on deep levels.
pub fn house_counters(level: u32) -> [u32; 4] {
    let ease = 5u32.saturating_sub(level);
    let mut out = [0u32; 4];
    for i in 0..4 {
        out[i] = HOUSE_DOT_COUNTERS[i]
            .saturating_sub(ease)
            .max(HOUSE_COUNTER_MIN[i]);
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn curves_clamp_at_depth() {
        assert_eq!(player_speed(1), 8.5);
        assert!((player_speed(9) - 8.5 * 1.20).abs() < 1e-4);
        assert_eq!(player_speed(999), player_speed(9));
        assert_eq!(fright_duration(1), 6.0);
        assert_eq!(fright_duration(11), 0.0);
        assert_eq!(fright_duration(40), 0.0);
    }

    #[test]
    fn house_counters_ease_to_floor() {
        assert_eq!(house_counters(1), [0, 3, 13, 28]);
        assert_eq!(house_counters(5), [0, 7, 17, 32]);
        assert_eq!(house_counters(99), [0, 7, 17, 32]);
    }
}
