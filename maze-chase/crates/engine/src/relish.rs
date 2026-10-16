//! Bonus relishes (Phase 3).
//!
//! Twice per level, after Pip eats enough crumbs, a relish ripens on the
//! tile just below the gatehouse ([`tuning::RELISH_TILE`]) and waits
//! [`tuning::RELISH_EXPIRE_S`] seconds for pickup. Eating it scores the
//! level tier ([`tuning::relish_value`]). A relish on the board when Pip
//! dies fades (the spawn schedule, driven by total crumbs eaten, does
//! not rewind); a fresh level starts a fresh schedule.

use crate::tuning;

/// Bonus relish state for one level.
#[derive(Clone, Debug)]
pub struct Relish {
    level: u32,
    /// Spawn windows already opened (indexes [`tuning::RELISH_SPAWN_AT`]).
    spawned: usize,
    /// A relish is waiting on the board.
    pub active: bool,
    /// Seconds until the waiting relish expires.
    pub timer: f32,
    /// Points the waiting relish is worth.
    pub value: u32,
}

impl Relish {
    /// Fresh schedule for `level`.
    pub fn new(level: u32) -> Self {
        assert!(level >= 1, "level must be >= 1");
        Self {
            level,
            spawned: 0,
            active: false,
            timer: 0.0,
            value: tuning::relish_value(level),
        }
    }

    /// Crumbs eaten so far this level crossed a spawn threshold.
    /// Returns true when a relish ripens (the caller logs the event).
    pub fn notify_dots(&mut self, dots_eaten: usize) -> bool {
        if self.active || self.spawned >= tuning::RELISH_SPAWN_AT.len() {
            return false;
        }
        if dots_eaten >= tuning::RELISH_SPAWN_AT[self.spawned] {
            self.spawned += 1;
            self.active = true;
            self.timer = tuning::RELISH_EXPIRE_S;
            self.value = tuning::relish_value(self.level);
            return true;
        }
        false
    }

    /// Advance the expiry clock. Returns true when a waiting relish just
    /// faded (the caller logs the event).
    pub fn tick(&mut self, dt: f32) -> bool {
        if !self.active {
            return false;
        }
        self.timer -= dt;
        if self.timer <= 0.0 {
            self.active = false;
            self.timer = 0.0;
            return true;
        }
        false
    }

    /// Pip's death fades a waiting relish without rewinding the schedule.
    pub fn clear_active(&mut self) {
        self.active = false;
        self.timer = 0.0;
    }

    /// Eat the waiting relish when Pip stands on its tile. Returns the
    /// points scored, or 0 when nothing is there.
    pub fn try_eat(&mut self, player_tile: (i32, i32)) -> u32 {
        if self.active && player_tile == tuning::RELISH_TILE {
            self.active = false;
            self.timer = 0.0;
            return self.value;
        }
        0
    }

    /// Canonical relish string for the state hash.
    pub fn canonical(&self) -> String {
        format!(
            "{}:{}:{:.3}:{}",
            self.spawned,
            u8::from(self.active),
            self.timer.max(0.0),
            self.value
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn spawn_windows_open_once_each() {
        let mut relish = Relish::new(1);
        assert!(!relish.notify_dots(69));
        assert!(relish.notify_dots(70));
        assert!(relish.active);
        assert_eq!(relish.value, 100);
        // While one waits, the second window cannot double-open.
        assert!(!relish.notify_dots(200));
        assert!(relish.tick(tuning::RELISH_EXPIRE_S + 0.1));
        assert!(!relish.active);
        assert!(relish.notify_dots(170));
        assert!(relish.active);
        // Both windows spent: no third relish ever.
        relish.tick(tuning::RELISH_EXPIRE_S + 0.1);
        assert!(!relish.notify_dots(449));
    }

    #[test]
    fn pickup_scores_tier_and_expiry_fades() {
        let mut relish = Relish::new(5);
        assert!(relish.notify_dots(70));
        assert_eq!(relish.try_eat((1, 1)), 0);
        assert_eq!(relish.try_eat(tuning::RELISH_TILE), 1000);
        assert!(!relish.active);
        assert!(relish.notify_dots(170));
        assert!(!relish.tick(9.4));
        assert!(relish.tick(0.2));
        assert!(!relish.active);
        assert_eq!(relish.try_eat(tuning::RELISH_TILE), 0);
    }

    #[test]
    fn death_fades_without_rewinding() {
        let mut relish = Relish::new(1);
        assert!(relish.notify_dots(70));
        relish.clear_active();
        assert!(!relish.active);
        // The spent window stays spent: 70 dots cannot reopen it.
        assert!(!relish.notify_dots(70));
        assert!(relish.notify_dots(170));
    }
}
