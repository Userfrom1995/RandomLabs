//! Wave clock and extra mode rules (Phase 3).
//!
//! [`WaveClock`] alternates the wardens between scatter (each warden
//! drifts to its authored corner) and chase (the four personalities hunt
//! Pip). Every leg switch reverses all active wardens, and the second
//! pursuer stage pins the clock to chase. [`GameMode`] carries the extra
//! rulesets that run on the same engine: classic, time-attack, sprint,
//! and fright-frenzy. All tables live in [`crate::tuning`]; this module
//! only advances clocks and answers rule queries, so layers can never
//! grow their own gameplay branches.

use crate::tuning;

/// Which leg of the wave clock is running.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum WavePhase {
    Scatter,
    Chase,
}

/// Scatter/chase alternation for one level.
///
/// Leg `index` counts completed scatter legs: legs come from
/// [`tuning::WAVE_TABLE`] with the scatter shave for the level, and past
/// the last chase leg the clock holds chase forever (`index == len`).
/// The clock ticks simulation time only; fright, death, and clearing
/// beats neither advance nor reset it beyond the fresh clock that
/// [`crate::ghosts::Wardens::new`] builds per life.
#[derive(Clone, Debug)]
pub struct WaveClock {
    level: u32,
    /// Completed scatter legs (== WAVE_TABLE.len() means chase-hold).
    pub index: usize,
    phase: WavePhase,
    /// Seconds left on the current leg (meaningless in chase-hold).
    timer: f32,
    /// Latched by the second pursuer stage; chase never leaves.
    pinned: bool,
}

impl WaveClock {
    /// Fresh clock for `level`, starting on the first scatter leg.
    pub fn new(level: u32) -> Self {
        assert!(level >= 1, "level must be >= 1");
        Self {
            level,
            index: 0,
            phase: WavePhase::Scatter,
            timer: tuning::wave_scatter(0, level),
            pinned: false,
        }
    }

    /// Current leg.
    pub fn phase(&self) -> WavePhase {
        self.phase
    }

    /// Seconds left on the current leg (0 in chase-hold).
    pub fn timer(&self) -> f32 {
        if self.index >= tuning::WAVE_TABLE.len() {
            0.0
        } else {
            self.timer
        }
    }

    /// Pin to chase (second pursuer stage). Returns true when the pin
    /// changed the leg, so the caller can reverse the wardens.
    pub fn pin_chase(&mut self) -> bool {
        self.pinned = true;
        if self.phase != WavePhase::Chase {
            self.phase = WavePhase::Chase;
            self.index = tuning::WAVE_TABLE.len();
            self.timer = 0.0;
            return true;
        }
        // Already chasing on an early leg: latch the hold so the clock
        // can never swing back to scatter.
        if self.index < tuning::WAVE_TABLE.len() {
            self.index = tuning::WAVE_TABLE.len();
            self.timer = 0.0;
        }
        false
    }

    /// Advance by `dt`. Returns true exactly when the leg switched, which
    /// is the caller's cue to reverse all active wardens.
    pub fn tick(&mut self, dt: f32) -> bool {
        if self.pinned || self.index >= tuning::WAVE_TABLE.len() {
            return false;
        }
        self.timer -= dt;
        if self.timer > 0.0 {
            return false;
        }
        match self.phase {
            WavePhase::Scatter => {
                self.phase = WavePhase::Chase;
                self.timer = tuning::wave_chase(self.index);
                true
            }
            WavePhase::Chase => {
                self.index += 1;
                if self.index >= tuning::WAVE_TABLE.len() {
                    // Chase-hold: the hunt never lets up again.
                    self.phase = WavePhase::Chase;
                    self.timer = 0.0;
                } else {
                    self.phase = WavePhase::Scatter;
                    self.timer = tuning::wave_scatter(self.index, self.level);
                }
                true
            }
        }
    }

    /// Canonical clock string for the state hash.
    pub fn canonical(&self) -> String {
        let phase = match self.phase {
            WavePhase::Scatter => "scatter",
            WavePhase::Chase => "chase",
        };
        format!(
            "{}:{}:{:.3}:{}",
            phase,
            self.index,
            self.timer.max(0.0),
            u8::from(self.pinned)
        )
    }
}

/// Extra rulesets running on the same engine (Phase 3).
///
/// - Classic: the standard endless loop.
/// - TimeAttack: 120 s on a clock; cleared mazes refill at the same
///   level instead of descending, and the run ends at time-up.
/// - Sprint: a single life with no spare wick, no fright windows, and a
///   par-time bonus of 10 points per spare second against 300 s on every
///   level clear.
/// - FrightFrenzy: fright windows run 4x with a 1.0 s floor and the
///   wardens cruise 10 percent slower, so chains are the whole game.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum GameMode {
    Classic,
    TimeAttack,
    Sprint,
    FrightFrenzy,
}

impl GameMode {
    /// Stable identifier for hashes, logs, and layer menus.
    pub fn as_str(self) -> &'static str {
        match self {
            GameMode::Classic => "classic",
            GameMode::TimeAttack => "time-attack",
            GameMode::Sprint => "sprint",
            GameMode::FrightFrenzy => "fright-frenzy",
        }
    }

    /// Sunseed fright window for `level` under this mode.
    pub fn fright_duration(self, level: u32) -> f32 {
        match self {
            GameMode::Sprint => 0.0,
            GameMode::FrightFrenzy => (tuning::fright_duration(level) * tuning::FRIGHT_FRENZY_MULT)
                .max(tuning::FRIGHT_FRENZY_FLOOR_S),
            _ => tuning::fright_duration(level),
        }
    }

    /// Warden cruise multiplier for this mode (frenzy hunts slower).
    pub fn ghost_factor(self) -> f32 {
        match self {
            GameMode::FrightFrenzy => tuning::FRIGHT_FRENZY_GHOST_FRACTION,
            _ => 1.0,
        }
    }

    /// Lives at game start (sprint grants no spare wick: one life means
    /// the run ends on the first caught, matching the engine's
    /// defeat-below-zero accounting).
    pub fn start_lives(self) -> i32 {
        match self {
            GameMode::Sprint => 0,
            _ => tuning::START_LIVES,
        }
    }

    /// Whether the extra-life rule applies (sprint forbids it: one life
    /// is one life).
    pub fn extra_life_allowed(self) -> bool {
        !matches!(self, GameMode::Sprint)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wave_runs_the_table_then_holds_chase() {
        let mut clock = WaveClock::new(1);
        assert_eq!(clock.phase(), WavePhase::Scatter);
        // First scatter leg is 7 s: no switch before the boundary.
        assert!(!clock.tick(6.9));
        assert!(clock.tick(0.2));
        assert_eq!(clock.phase(), WavePhase::Chase);
        // First chase leg is 20 s.
        assert!(!clock.tick(19.9));
        assert!(clock.tick(0.2));
        assert_eq!(clock.phase(), WavePhase::Scatter);
        assert_eq!(clock.index, 1);
        // Drain the whole table: 6 scatter + 6 chase legs switch 12 times.
        let mut switches = 2;
        for _ in 0..40_000 {
            if clock.index >= tuning::WAVE_TABLE.len() {
                break;
            }
            if clock.tick(tuning::STEP) {
                switches += 1;
            }
        }
        assert_eq!(switches, 12);
        assert_eq!(clock.phase(), WavePhase::Chase);
        assert_eq!(clock.index, tuning::WAVE_TABLE.len());
        // Chase-hold never switches again.
        for _ in 0..1200 {
            assert!(!clock.tick(tuning::STEP));
        }
    }

    #[test]
    fn wave_scatter_shaves_with_level() {
        let mut l1 = WaveClock::new(1);
        let mut l5 = WaveClock::new(5);
        assert!((l1.timer - 7.0).abs() < 1e-4);
        // Level 5 shaves 7 - 4 = 3 s off the first scatter leg.
        assert!((l5.timer - 3.0).abs() < 1e-4);
        // Deep levels floor at 1.0 s.
        assert!((WaveClock::new(30).timer - 1.0).abs() < 1e-4);
        assert!(l1.tick(7.1));
        assert!(l5.tick(3.1));
    }

    #[test]
    fn pin_chase_latches_the_hunt() {
        let mut clock = WaveClock::new(1);
        assert!(clock.pin_chase());
        assert_eq!(clock.phase(), WavePhase::Chase);
        for _ in 0..3600 {
            assert!(!clock.tick(tuning::STEP));
        }
        assert_eq!(clock.phase(), WavePhase::Chase);
    }

    #[test]
    fn mode_fright_rules() {
        assert_eq!(GameMode::Sprint.fright_duration(1), 0.0);
        assert_eq!(GameMode::Classic.fright_duration(1), 6.0);
        assert_eq!(GameMode::FrightFrenzy.fright_duration(1), 24.0);
        // Level 11 base is 0: the frenzy floor still opens a window.
        assert_eq!(GameMode::FrightFrenzy.fright_duration(11), 1.0);
        assert_eq!(GameMode::FrightFrenzy.fright_duration(30), 1.0);
        assert_eq!(GameMode::Sprint.start_lives(), 0);
        assert!(!GameMode::Sprint.extra_life_allowed());
        assert!((GameMode::FrightFrenzy.ghost_factor() - 0.9).abs() < 1e-5);
    }
}
