//! Presentation-only effect clocks: pickups, turns, gulp, hop, spares.
//!
//! This module owns no gameplay rules and is deliberately absent from
//! [`crate::game::Game::canonical`], so replays and golden hashes are
//! unchanged. It only records short-lived, deterministic timestamps that
//! every publication layer reads to draw the Pondwake effects vocabulary:
//!
//! - pickup burst (four frames on a 66.7 ms grid),
//! - turn spark (a committed-turn cue at the corner),
//! - gulp (three cheek-swell frames at 12 fps),
//! - hop (two squash/stretch poses at 6 fps while Rill is moving),
//! - Golden Lily (six 9x9 frames at 12 fps after a spare wick),
//! - score floaters (desktop and web only; 500 ms rise).
//!
//! All timers advance from the same fixed tick that advances the
//! simulation, so the layers can sample them without owning clocks.

/// Seconds per pickup-burst frame (four frames, 66.7 ms each).
pub const PICKUP_FRAME_S: f32 = 0.0667;
/// Number of pickup-burst frames.
pub const PICKUP_FRAMES: usize = 4;
/// Seconds per gulp frame (three frames at 12 fps).
pub const GULP_FRAME_S: f32 = 1.0 / 12.0;
/// Number of gulp frames.
pub const GULP_FRAMES: usize = 3;
/// How long a committed-turn spark stays at the corner.
pub const TURN_SPARK_S: f32 = 0.18;
/// Seconds per Golden Lily frame (six frames at 12 fps).
pub const LILY_FRAME_S: f32 = 1.0 / 12.0;
/// Number of Golden Lily frames.
pub const LILY_FRAMES: usize = 6;
/// How long one score floater rises over the board.
pub const FLOATER_S: f32 = 0.5;
/// Seconds per hop pose (two poses at 6 fps).
pub const HOP_FRAME_S: f32 = 1.0 / 6.0;
/// Most floaters that can be live at once.
pub const FLOATER_CAP: usize = 8;

/// A short-lived effect anchored at a board position in tile units.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Anchor {
    pub x: f32,
    pub y: f32,
    pub t: f32,
}

/// One rising score value (desktop and web render the numerals).
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Floater {
    pub x: f32,
    pub y: f32,
    pub points: u32,
    pub t: f32,
}

/// Deterministic effect clocks owned by the game.
#[derive(Clone, Debug, Default, PartialEq)]
pub struct Effects {
    pickup: Option<Anchor>,
    turn: Option<Anchor>,
    gulp_t: Option<f32>,
    lily: Option<Anchor>,
    floaters: Vec<Floater>,
    moving: bool,
    hop_t: f32,
}

impl Effects {
    /// Fresh, idle effect state.
    pub fn new() -> Self {
        Self::default()
    }

    /// Advance every clock by `dt` seconds and retire finished effects.
    pub fn advance(&mut self, dt: f32) {
        advance_anchor(&mut self.pickup, dt, PICKUP_FRAME_S * PICKUP_FRAMES as f32);
        advance_anchor(&mut self.turn, dt, TURN_SPARK_S);
        advance_anchor(&mut self.lily, dt, LILY_FRAME_S * LILY_FRAMES as f32);
        if let Some(t) = self.gulp_t {
            let next = t + dt;
            self.gulp_t = if next < GULP_FRAME_S * GULP_FRAMES as f32 {
                Some(next)
            } else {
                None
            };
        }
        for floater in &mut self.floaters {
            floater.t += dt;
        }
        self.floaters.retain(|f| f.t < FLOATER_S);
        if self.moving {
            self.hop_t += dt;
        }
    }

    /// Record whether Rill actually moved this tick (drives the hop poses).
    pub fn set_moving(&mut self, moving: bool) {
        self.moving = moving;
        if !moving {
            self.hop_t = 0.0;
        }
    }

    /// A crumb or sunseed was picked up at `(x, y)` in tile units.
    pub fn pickup(&mut self, x: f32, y: f32) {
        self.pickup = Some(Anchor { x, y, t: 0.0 });
        self.gulp_t = Some(0.0);
    }

    /// A committed turn happened at the corner tile `(x, y)`.
    pub fn turn(&mut self, x: f32, y: f32) {
        self.turn = Some(Anchor { x, y, t: 0.0 });
    }

    /// A spare wick (extra life) bloomed.
    pub fn spare_wick(&mut self) {
        self.lily = Some(Anchor {
            x: 0.0,
            y: 0.0,
            t: 0.0,
        });
    }

    /// Record one score event for the desktop and web floaters.
    pub fn score(&mut self, points: u32, x: f32, y: f32) {
        if points == 0 {
            return;
        }
        if self.floaters.len() >= FLOATER_CAP {
            self.floaters.remove(0);
        }
        self.floaters.push(Floater {
            x,
            y,
            points,
            t: 0.0,
        });
    }

    /// Live pickup burst (anchor plus frame index), if any.
    pub fn pickup_burst(&self) -> Option<(Anchor, usize)> {
        let anchor = self.pickup?;
        let frame = (anchor.t / PICKUP_FRAME_S) as usize;
        if frame < PICKUP_FRAMES {
            Some((anchor, frame))
        } else {
            None
        }
    }

    /// Live turn spark anchor, if any.
    pub fn turn_spark(&self) -> Option<Anchor> {
        self.turn
    }

    /// Current gulp phase (three frames at 12 fps), if a gulp is live.
    pub fn gulp_phase(&self) -> Option<usize> {
        let t = self.gulp_t?;
        let frame = (t / GULP_FRAME_S) as usize;
        (frame < GULP_FRAMES).then_some(frame)
    }

    /// Current Golden Lily frame, if the spare-wick bloom is live.
    pub fn lily_frame(&self) -> Option<usize> {
        let anchor = self.lily?;
        let frame = (anchor.t / LILY_FRAME_S) as usize;
        (frame < LILY_FRAMES).then_some(frame)
    }

    /// The live spare-wick bloom time, if any (renderers center the bloom
    /// over the board rather than at a tile).
    pub fn lily_live(&self) -> bool {
        self.lily_frame().is_some()
    }

    /// Hop pose (0 squash, 1 stretch) while moving, if Rill is moving.
    pub fn hop_frame(&self) -> Option<usize> {
        if !self.moving {
            return None;
        }
        Some(((self.hop_t / HOP_FRAME_S) as usize) % 2)
    }

    /// Live score floaters with their normalized rise progress.
    pub fn floaters(&self) -> impl Iterator<Item = (Floater, f32)> + '_ {
        self.floaters
            .iter()
            .map(|f| (*f, (f.t / FLOATER_S).clamp(0.0, 1.0)))
    }
}

fn advance_anchor(slot: &mut Option<Anchor>, dt: f32, life: f32) {
    if let Some(anchor) = slot {
        anchor.t += dt;
        if anchor.t >= life {
            *slot = None;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pickup_burst_runs_four_frames_then_retires() {
        let mut fx = Effects::new();
        fx.pickup(3.5, 4.5);
        assert_eq!(fx.pickup_burst().map(|(_, f)| f), Some(0));
        fx.advance(PICKUP_FRAME_S);
        assert_eq!(fx.pickup_burst().map(|(_, f)| f), Some(1));
        fx.advance(PICKUP_FRAME_S * 3.0);
        assert_eq!(fx.pickup_burst(), None);
        assert_eq!(fx.gulp_phase(), None);
    }

    #[test]
    fn gulp_is_three_frames_at_twelve_fps() {
        let mut fx = Effects::new();
        fx.pickup(0.0, 0.0);
        assert_eq!(fx.gulp_phase(), Some(0));
        fx.advance(GULP_FRAME_S + 0.001);
        assert_eq!(fx.gulp_phase(), Some(1));
        fx.advance(GULP_FRAME_S + 0.001);
        assert_eq!(fx.gulp_phase(), Some(2));
        fx.advance(GULP_FRAME_S + 0.001);
        assert_eq!(fx.gulp_phase(), None);
    }

    #[test]
    fn turn_spark_and_spare_wick_expire_independently() {
        let mut fx = Effects::new();
        fx.turn(2.0, 3.0);
        fx.spare_wick();
        assert!(fx.turn_spark().is_some());
        assert!(fx.lily_frame().is_some());
        fx.advance(TURN_SPARK_S + 0.01);
        assert!(fx.turn_spark().is_none());
        assert!(fx.lily_frame().is_some());
        fx.advance(LILY_FRAME_S * LILY_FRAMES as f32 + 0.01);
        assert!(!fx.lily_live());
    }

    #[test]
    fn hop_poses_alternate_only_while_moving() {
        let mut fx = Effects::new();
        assert_eq!(fx.hop_frame(), None);
        fx.set_moving(true);
        assert_eq!(fx.hop_frame(), Some(0));
        fx.advance(HOP_FRAME_S + 0.001);
        assert_eq!(fx.hop_frame(), Some(1));
        fx.set_moving(false);
        assert_eq!(fx.hop_frame(), None);
    }

    #[test]
    fn floaters_rise_for_half_a_second_and_cap() {
        let mut fx = Effects::new();
        for i in 0..FLOATER_CAP + 2 {
            fx.score(10, i as f32, 0.0);
        }
        assert_eq!(fx.floaters().count(), FLOATER_CAP);
        let first = fx.floaters().next().expect("a live floater").1;
        assert_eq!(first, 0.0);
        fx.advance(FLOATER_S + 0.01);
        assert_eq!(fx.floaters().count(), 0);
    }
}
