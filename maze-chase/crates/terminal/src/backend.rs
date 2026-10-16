//! Render tier selection with a degrading watchdog.
//!
//! Tiers, best first: [`Tier::Kitty`] (bitmap graphics on Kitty-family
//! terminals), [`Tier::Sixel`] (bitmap pixels after a live DA1 probe),
//! [`Tier::Truecolor`] (24-bit cell art; the Ghostty/Wezterm/foot path),
//! [`Tier::Legacy`] (16-color cells for conventional terminals).
//!
//! Selection is honest: Kitty engages only on positive environment proof,
//! Sixel only after the terminal answers the probe, truecolor only when
//! the environment claims it. The [`Watchdog`] drops one tier per failure
//! burst and remembers why, so logs and the help screen can say exactly
//! what degraded and what the fallback is.

/// Render tier, best first.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Tier {
    Kitty,
    Sixel,
    Truecolor,
    Legacy,
}

impl Tier {
    /// One step down the fidelity ladder.
    pub fn degrade(self) -> Option<Tier> {
        match self {
            Tier::Kitty => Some(Tier::Sixel),
            Tier::Sixel => Some(Tier::Truecolor),
            Tier::Truecolor => Some(Tier::Legacy),
            Tier::Legacy => None,
        }
    }

    pub fn name(self) -> &'static str {
        match self {
            Tier::Kitty => "kitty-graphics",
            Tier::Sixel => "sixel",
            Tier::Truecolor => "truecolor-cells",
            Tier::Legacy => "legacy-cells",
        }
    }
}

/// Failures tolerated before one downgrade step.
pub const MAX_FAILURES: u32 = 3;

/// Degrading watchdog over the active tier.
#[derive(Clone, Debug)]
pub struct Watchdog {
    tier: Tier,
    failures: u32,
    /// Human-readable downgrade trail, newest last.
    pub trail: Vec<String>,
}

impl Watchdog {
    pub fn new(tier: Tier) -> Self {
        Self {
            tier,
            failures: 0,
            trail: Vec::new(),
        }
    }

    pub fn tier(&self) -> Tier {
        self.tier
    }

    /// Record one clean frame.
    pub fn note_ok(&mut self) {
        self.failures = 0;
    }

    /// Record one failed frame; downgrades after [`MAX_FAILURES`].
    /// Returns the new tier (or `None` when already at the bottom with
    /// no further fallback).
    pub fn note_error(&mut self, what: &str) -> Option<Tier> {
        self.failures += 1;
        if self.failures < MAX_FAILURES {
            return Some(self.tier);
        }
        self.failures = 0;
        match self.tier.degrade() {
            Some(next) => {
                self.trail.push(format!(
                    "{} -> {} ({})",
                    self.tier.name(),
                    next.name(),
                    what
                ));
                self.tier = next;
                Some(next)
            }
            None => {
                self.trail.push(format!("legacy-cells held ({})", what));
                None
            }
        }
    }

    /// Force the Sixel upgrade after a live probe answered (only from the
    /// tier the probe was issued on; never upgrades past Kitty).
    pub fn note_sixel_probe_ok(&mut self) {
        if self.tier == Tier::Truecolor || self.tier == Tier::Legacy {
            self.trail.push(format!(
                "{} -> sixel (DA1 probe answered)",
                self.tier.name()
            ));
            self.tier = Tier::Sixel;
            self.failures = 0;
        }
    }
}

fn get<'a>(env: &'a [(String, String)], key: &str) -> Option<&'a str> {
    env.iter().find(|(k, _)| k == key).map(|(_, v)| v.as_str())
}

/// Pick the starting tier from the environment (pure, testable).
///
/// Precedence: explicit `MAZE_CHASE_TIER` override (`kitty`, `sixel`,
/// `truecolor`, `legacy`) wins for testing and stubborn terminals; then
/// Kitty on positive proof; then truecolor when `COLORTERM` is
/// `truecolor`/`24bit` or `TERM_PROGRAM` names a known truecolor
/// terminal; otherwise legacy. Sixel never starts active: it needs the
/// live DA1 probe (the main loop upgrades via [`Watchdog`]).
pub fn initial_tier(env: &[(String, String)]) -> Tier {
    if let Some(force) = get(env, "MAZE_CHASE_TIER") {
        match force.trim().to_ascii_lowercase().as_str() {
            "kitty" => return Tier::Kitty,
            "sixel" => return Tier::Sixel,
            "truecolor" => return Tier::Truecolor,
            "legacy" => return Tier::Legacy,
            _ => {
                eprintln!(
                    "maze-chase-terminal: unrecognized MAZE_CHASE_TIER '{force}'; falling back to auto-detect"
                );
            }
        }
    }
    if crate::kitty::kitty_present(env) {
        return Tier::Kitty;
    }
    let colorterm = get(env, "COLORTERM").unwrap_or("");
    if colorterm == "truecolor" || colorterm == "24bit" {
        return Tier::Truecolor;
    }
    match get(env, "TERM_PROGRAM").unwrap_or("") {
        "ghostty" | "WezTerm" | "foot" | "iTerm.app" | "vscode" | "kitty" => Tier::Truecolor,
        _ => {
            if get(env, "TERM").is_some_and(|t| t.contains("256color") || t.contains("direct")) {
                Tier::Truecolor
            } else {
                Tier::Legacy
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn env(pairs: &[(&str, &str)]) -> Vec<(String, String)> {
        pairs
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect()
    }

    #[test]
    fn override_wins_over_everything() {
        let e = env(&[("KITTY_WINDOW_ID", "1"), ("MAZE_CHASE_TIER", "legacy")]);
        assert_eq!(initial_tier(&e), Tier::Legacy);
        let e = env(&[("MAZE_CHASE_TIER", "sixel")]);
        assert_eq!(initial_tier(&e), Tier::Sixel);
        let e = env(&[("MAZE_CHASE_TIER", "bogus")]);
        assert_eq!(initial_tier(&e), Tier::Legacy);
    }

    #[test]
    fn kitty_and_truecolor_detection() {
        assert_eq!(initial_tier(&env(&[("KITTY_WINDOW_ID", "7")])), Tier::Kitty);
        assert_eq!(
            initial_tier(&env(&[("COLORTERM", "truecolor")])),
            Tier::Truecolor
        );
        assert_eq!(
            initial_tier(&env(&[("TERM_PROGRAM", "ghostty")])),
            Tier::Truecolor
        );
        assert_eq!(initial_tier(&env(&[])), Tier::Legacy);
        assert_eq!(
            initial_tier(&env(&[("TERM", "xterm-256color")])),
            Tier::Truecolor
        );
    }

    #[test]
    fn watchdog_degrades_step_by_step() {
        let mut w = Watchdog::new(Tier::Kitty);
        assert_eq!(w.note_error("probe timeout"), Some(Tier::Kitty));
        assert_eq!(w.note_error("probe timeout"), Some(Tier::Kitty));
        assert_eq!(w.note_error("probe timeout"), Some(Tier::Sixel));
        assert_eq!(w.tier(), Tier::Sixel);
        assert_eq!(w.trail.len(), 1);
        w.note_ok();
        // Success resets the burst counter.
        assert_eq!(w.note_error("x"), Some(Tier::Sixel));
        assert_eq!(w.note_error("x"), Some(Tier::Sixel));
        assert_eq!(w.note_error("x"), Some(Tier::Truecolor));
        assert_eq!(w.note_error("x"), Some(Tier::Truecolor));
        assert_eq!(w.note_error("x"), Some(Tier::Truecolor));
        assert_eq!(w.note_error("x"), Some(Tier::Legacy));
        assert_eq!(w.note_error("x"), Some(Tier::Legacy));
        assert_eq!(w.note_error("x"), Some(Tier::Legacy));
        assert_eq!(w.note_error("x"), None);
        assert!(w.trail.iter().any(|t| t.contains("legacy-cells held")));
    }

    #[test]
    fn sixel_upgrade_only_from_cell_tiers() {
        let mut w = Watchdog::new(Tier::Truecolor);
        w.note_sixel_probe_ok();
        assert_eq!(w.tier(), Tier::Sixel);
        let mut k = Watchdog::new(Tier::Kitty);
        k.note_sixel_probe_ok();
        assert_eq!(k.tier(), Tier::Kitty);
    }
}
