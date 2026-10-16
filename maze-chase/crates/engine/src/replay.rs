//! Input replay log: record ticks, re-simulate, compare hashes.
//!
//! A [`Replay`] captures the seed, level, and per-tick heading intents of a
//! run. [`replay`] rebuilds a fresh [`Game`] from the header and applies
//! the logged intents, so any two platforms must converge on the same
//! [`Game::state_hash`]. The verify harness fails the determinism rows when
//! they diverge.

use crate::actors::Dir;
use crate::game::Game;

/// One recorded run: header plus per-tick intents.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Replay {
    pub seed: u64,
    pub level: u32,
    /// Per-tick heading intents (`None` = hold current heading).
    pub intents: Vec<Option<Dir>>,
}

impl Replay {
    /// Record `ticks` ticks of `game` under the scripted `intents`
    /// function (tick index -> want). The game is advanced as part of
    /// recording; use the returned replay for independent re-simulation.
    pub fn record(game: &mut Game, ticks: usize, intents: impl Fn(usize) -> Option<Dir>) -> Self {
        let seed = game.seed;
        let level = game.level;
        let mut wants = Vec::with_capacity(ticks);
        for i in 0..ticks {
            if !game.running() {
                break;
            }
            let want = intents(i);
            game.step(1.0 / 120.0, want);
            wants.push(want);
        }
        Self {
            seed,
            level,
            intents: wants,
        }
    }

    /// Re-simulate from the header and return the final state hash.
    /// Level-ups are deterministic functions of state, so a recording that
    /// spans a level transition still converges.
    pub fn replay_hash(&self) -> String {
        let mut game = Game::new(self.seed, self.level);
        for &want in &self.intents {
            if !game.running() {
                break;
            }
            game.step(1.0 / 120.0, want);
        }
        game.state_hash()
    }
}

/// Re-simulate `replay` and require hash equality with `expected`.
pub fn verify(replay: &Replay, expected: &str) -> bool {
    replay.replay_hash() == expected
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn record_replay_converges() {
        let mut game = Game::new(2026, 1);
        let replay = Replay::record(&mut game, 900, |i| match i % 240 {
            0..=59 => Some(Dir::Left),
            60..=119 => Some(Dir::Up),
            120..=179 => Some(Dir::Right),
            _ => None,
        });
        let live = game.state_hash();
        assert!(verify(&replay, &live), "replay diverged from live run");
    }
}
