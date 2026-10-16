//! Difficulty presets and user settings.
//!
//! Difficulty uses **only shipped engine knobs**: each [`Difficulty`] maps
//! to an [`EnginePreset`] holding a `maze_chase_engine::modes::GameMode`
//! and a start level. Layers construct the game with
//! `Game::with_mode(seed, preset.start_level, preset.mode)`. No tuning
//! constants are duplicated here, so replays stay portable: the same
//! (seed, level, mode) triple reproduces the same simulation on any layer.

use maze_chase_engine::modes::GameMode;

/// Player-facing difficulty.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Difficulty {
    Cozy,
    Standard,
    Harsh,
}

impl Difficulty {
    /// Stable lowercase identifier for menus and save files.
    pub fn as_str(self) -> &'static str {
        match self {
            Difficulty::Cozy => "cozy",
            Difficulty::Standard => "standard",
            Difficulty::Harsh => "harsh",
        }
    }

    /// Parse [`Difficulty::as_str`] output (case-insensitive, trimmed).
    /// Returns `None` for unknown ids.
    pub fn parse(text: &str) -> Option<Self> {
        match text.trim().to_ascii_lowercase().as_str() {
            "cozy" => Some(Difficulty::Cozy),
            "standard" => Some(Difficulty::Standard),
            "harsh" => Some(Difficulty::Harsh),
            _ => None,
        }
    }
}

/// Engine launch parameters for one difficulty.
///
/// `mode` and `start_level` are the only knobs difficulty touches; both
/// are passed straight to `Game::with_mode`, keeping every difficulty a
/// portable shipped-engine configuration.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub struct EnginePreset {
    pub mode: GameMode,
    pub start_level: u32,
}

/// Map a difficulty to its engine preset.
///
/// - Cozy -> Classic at level 1 (full fright windows, gentle wardens).
/// - Standard -> Classic at level 2 (shorter fright, faster wardens: a
///   real step up using only the existing engine level tables).
/// - Harsh -> Sprint at level 1 (single life, no fright windows, par
///   bonus against the engine's 300 s par clock).
pub fn preset(d: Difficulty) -> EnginePreset {
    match d {
        Difficulty::Cozy => EnginePreset {
            mode: GameMode::Classic,
            start_level: 1,
        },
        Difficulty::Standard => EnginePreset {
            mode: GameMode::Classic,
            start_level: 2,
        },
        Difficulty::Harsh => EnginePreset {
            mode: GameMode::Sprint,
            start_level: 1,
        },
    }
}

/// Known theme ids accepted by [`Settings::validate`].
pub const KNOWN_THEMES: [&str; 3] = ["ember-warren", "abyss-lantern", "parchment-dawn"];

/// Player-facing settings (audio, theme, accessibility).
#[derive(Clone, PartialEq, Debug)]
pub struct Settings {
    pub difficulty: Difficulty,
    pub master: f32,
    pub music: f32,
    pub sfx: f32,
    pub mute: bool,
    pub theme: String,
    pub reduced_flash: bool,
    pub high_contrast: bool,
    pub show_fps: bool,
}

impl Settings {
    /// Default settings for one difficulty. Volumes are 0.8 / 0.7 / 0.9,
    /// unmuted, theme `"ember-warren"`, contrast / fps flags off; only
    /// `reduced_flash` varies (on for Cozy, off otherwise).
    pub fn for_difficulty(d: Difficulty) -> Self {
        Self {
            difficulty: d,
            master: 0.8,
            music: 0.7,
            sfx: 0.9,
            mute: false,
            theme: "ember-warren".to_string(),
            reduced_flash: matches!(d, Difficulty::Cozy),
            high_contrast: false,
            show_fps: false,
        }
    }

    /// Check field ranges and ids. Returns one human-readable string per
    /// problem; an empty vec means valid.
    pub fn validate(&self) -> Vec<String> {
        let mut problems = Vec::new();
        for (name, v) in [
            ("master", self.master),
            ("music", self.music),
            ("sfx", self.sfx),
        ] {
            if !v.is_finite() || !(0.0..=1.0).contains(&v) {
                problems.push(format!("{name} volume {v} out of range 0..=1"));
            }
        }
        if self.theme.trim().is_empty() {
            problems.push("theme id must be non-empty".to_string());
        } else if !KNOWN_THEMES.contains(&self.theme.as_str()) {
            problems.push(format!(
                "unknown theme '{}' (known: {})",
                self.theme,
                KNOWN_THEMES.join(", ")
            ));
        }
        problems
    }
}

impl Default for Settings {
    fn default() -> Self {
        Self::for_difficulty(Difficulty::Standard)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_are_valid_and_standard() {
        let s = Settings::default();
        assert_eq!(s.difficulty, Difficulty::Standard);
        assert_eq!(s.validate(), Vec::<String>::new());
        assert!((s.master - 0.8).abs() < 1e-6);
        assert!((s.music - 0.7).abs() < 1e-6);
        assert!((s.sfx - 0.9).abs() < 1e-6);
        assert!(!s.mute);
        assert_eq!(s.theme, "ember-warren");
        assert!(!s.reduced_flash);
        assert!(!s.high_contrast);
        assert!(!s.show_fps);
    }

    #[test]
    fn cozy_defaults_enable_reduced_flash() {
        assert!(Settings::for_difficulty(Difficulty::Cozy).reduced_flash);
        assert!(!Settings::for_difficulty(Difficulty::Standard).reduced_flash);
        assert!(!Settings::for_difficulty(Difficulty::Harsh).reduced_flash);
        assert_eq!(
            Settings::for_difficulty(Difficulty::Cozy).validate(),
            Vec::<String>::new()
        );
    }

    #[test]
    fn difficulty_round_trips_through_str() {
        for d in [Difficulty::Cozy, Difficulty::Standard, Difficulty::Harsh] {
            assert_eq!(Difficulty::parse(d.as_str()), Some(d));
        }
        assert_eq!(Difficulty::parse("  COZY "), Some(Difficulty::Cozy));
        assert_eq!(Difficulty::parse("nightmare"), None);
    }

    #[test]
    fn preset_mapping_correctness() {
        let cozy = preset(Difficulty::Cozy);
        assert_eq!(cozy.mode, GameMode::Classic);
        assert_eq!(cozy.start_level, 1);
        // Full fright windows on the gentle end.
        assert!(cozy.mode.fright_duration(1) > 0.0);

        let standard = preset(Difficulty::Standard);
        assert_eq!(standard.mode, GameMode::Classic);
        assert_eq!(standard.start_level, 2);
        // A real step up from Cozy using only engine tables: level 2
        // shortens fright vs level 1 under the same mode.
        assert!(
            standard.mode.fright_duration(standard.start_level)
                < cozy.mode.fright_duration(cozy.start_level)
        );

        let harsh = preset(Difficulty::Harsh);
        assert_eq!(harsh.mode, GameMode::Sprint);
        assert_eq!(harsh.start_level, 1);
        // Single life, no fright, par bonus: asserted via the mode API.
        assert_eq!(harsh.mode.fright_duration(1), 0.0);
        assert_eq!(harsh.mode.start_lives(), 0);
        assert!(!harsh.mode.extra_life_allowed());
    }

    #[test]
    fn out_of_range_volumes_flagged() {
        let s = Settings {
            master: 1.5,
            music: -0.1,
            sfx: f32::NAN,
            ..Settings::default()
        };
        let problems = s.validate();
        assert_eq!(problems.len(), 3);
        assert!(problems.iter().any(|p| p.contains("master")));
        assert!(problems.iter().any(|p| p.contains("music")));
        assert!(problems.iter().any(|p| p.contains("sfx")));
    }

    #[test]
    fn unknown_and_empty_themes_flagged() {
        let s = Settings {
            theme: "neon-void".to_string(),
            ..Settings::default()
        };
        let problems = s.validate();
        assert_eq!(problems.len(), 1);
        assert!(problems[0].contains("unknown theme"));

        let s = Settings {
            theme: "   ".to_string(),
            ..Settings::default()
        };
        let problems = s.validate();
        assert!(problems.iter().any(|p| p.contains("non-empty")));
    }
}
