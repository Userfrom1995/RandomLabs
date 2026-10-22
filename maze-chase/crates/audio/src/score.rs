//! Original music and SFX data for Maze Chase.
//!
//! All melodies below are original compositions written for this project
//! (no quotations, no public-domain lifts). Notes use MIDI numbers
//! (`21..=108`, piano range A0-C8), a [`Voice`] timbre, a velocity, and a
//! track. Tracks sequence independently, so a tune can carry a lead, a
//! counterline and sparse accents at once.
//!
//! One tempo source: [`TEMPO`] (108 BPM) with swung eighths. Every layer
//! reads the same constants and the same [`presentation_beats`] helper, so
//! terminal, desktop and web cannot drift apart.
//!
//! * `TITLE_LOOP`: pond-at-dusk mallet lead with a quiet reed counterline
//!   and water-drop blips at phrase ends.
//! * `FRIGHT_LOOP`: low rising drone with a reed pulse, resolved by a
//!   two-note fall.
//! * `DEATH_STING`: sinking glass glissando over a low drone.
//! * `CLEAR_JINGLE`: ascending three-note figure closing on a warm bell.
//! * `GAMEOVER_STING`: low settled reed cadence over a C drone.

use crate::cue::Cue;

/// Single presentation tempo in beats per minute (binding direction).
pub const TEMPO: f32 = 108.0;
/// Long share of a swung eighth pair (first note of the pair).
pub const SWING_LONG: f32 = 0.583;
/// Short share of a swung eighth pair (second note of the pair).
pub const SWING_SHORT: f32 = 0.417;
/// Live volume fade duration shared by every layer.
pub const FADE_MS: u32 = 120;
/// Conservative default master level (design tokens: 80 percent).
pub const DEFAULT_MASTER: f32 = 0.80;
/// Conservative default music level (design tokens: 60 percent).
pub const DEFAULT_MUSIC: f32 = 0.60;
/// Conservative default SFX level (design tokens: 80 percent).
pub const DEFAULT_SFX: f32 = 0.80;
/// Per-play crumb pitch variation (slight, deterministic, musical).
pub const CRUMB_VARIATION: f32 = 0.012;

/// Timbre family used by tunes and effects.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Voice {
    /// Soft mallet pluck: triangle body with a fast decay.
    Mallet,
    /// Water-drop blip: near-sine with a short pitch drop.
    Drop,
    /// Reed flute: triangle with a soft breath of harmonics.
    Reed,
    /// Low drone: square-ish fundamental with a slow swell.
    Drone,
    /// Sparkling glass: sine with inharmonic partials.
    Glass,
    /// Warm bell: sine with a long, quiet tail.
    Bell,
    /// Dry pluck: fast triangle transient.
    Pluck,
}

impl Voice {
    /// Every voice, for validation and wire-code tests.
    pub const ALL: [Voice; 7] = [
        Voice::Mallet,
        Voice::Drop,
        Voice::Reed,
        Voice::Drone,
        Voice::Glass,
        Voice::Bell,
        Voice::Pluck,
    ];

    /// Stable wire code (`mc_tune_meta` field 0, `mc_sfx_tone_field` field 0).
    pub fn code(self) -> u8 {
        match self {
            Voice::Mallet => 0,
            Voice::Drop => 1,
            Voice::Reed => 2,
            Voice::Drone => 3,
            Voice::Glass => 4,
            Voice::Bell => 5,
            Voice::Pluck => 6,
        }
    }

    /// Decode a wire code; `None` for unknown values.
    pub fn from_code(code: u32) -> Option<Voice> {
        match code {
            0 => Some(Voice::Mallet),
            1 => Some(Voice::Drop),
            2 => Some(Voice::Reed),
            3 => Some(Voice::Drone),
            4 => Some(Voice::Glass),
            5 => Some(Voice::Bell),
            6 => Some(Voice::Pluck),
            _ => None,
        }
    }

    /// Legacy waveform code used by `mc_sfx_wave` (0 square, 1 triangle,
    /// 2 sine, 3 noise).
    pub fn wave(self) -> Wave {
        match self {
            Voice::Mallet => Wave::Triangle,
            Voice::Drop => Wave::Sine,
            Voice::Reed => Wave::Triangle,
            Voice::Drone => Wave::Square,
            Voice::Glass => Wave::Sine,
            Voice::Bell => Wave::Sine,
            Voice::Pluck => Wave::Triangle,
        }
    }

    /// Human-readable label for docs and tests.
    pub fn label(self) -> &'static str {
        match self {
            Voice::Mallet => "mallet",
            Voice::Drop => "drop",
            Voice::Reed => "reed",
            Voice::Drone => "drone",
            Voice::Glass => "glass",
            Voice::Bell => "bell",
            Voice::Pluck => "pluck",
        }
    }
}

/// Oscillator shape for a legacy one-shot effect view.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Wave {
    Square,
    Triangle,
    Sine,
    Noise,
}

/// One sequenced note on one track.
#[derive(Clone, Copy, PartialEq, Debug)]
pub struct Note {
    /// MIDI note number (`21..=108`), or `0` for a rest.
    pub midi: u8,
    /// Raw score length in beats, always positive.
    pub beats: f32,
    /// Timbre used by every layer.
    pub voice: Voice,
    /// Note velocity in `0.0..=1.0` (rests use 0).
    pub velocity: f32,
    /// Independent sequencing lane (`0..=2`).
    pub track: u8,
}

impl Note {
    /// True when this entry is a rest (silent, but advances its track).
    pub fn is_rest(self) -> bool {
        self.midi == 0
    }
}

const fn n(midi: u8, beats: f32, voice: Voice, velocity: f32, track: u8) -> Note {
    Note {
        midi,
        beats,
        voice,
        velocity,
        track,
    }
}

const fn rest(beats: f32, track: u8) -> Note {
    n(0, beats, Voice::Mallet, 0.0, track)
}

/// A named note sequence; `looped` tunes restart until stopped.
#[derive(Clone, Copy, PartialEq, Debug)]
pub struct Tune {
    pub name: &'static str,
    pub notes: &'static [Note],
    pub looped: bool,
}

/// Pond-at-dusk title line: mallet lead, reed counterline, drop accents.
pub const TITLE_LOOP: Tune = Tune {
    name: "title",
    notes: &[
        // Track 0: mallet lead, 20 eighths (10 beats).
        n(62, 0.5, Voice::Mallet, 0.82, 0),
        n(64, 0.5, Voice::Mallet, 0.70, 0),
        n(65, 0.5, Voice::Mallet, 0.78, 0),
        n(67, 0.5, Voice::Mallet, 0.84, 0),
        n(69, 0.5, Voice::Mallet, 0.88, 0),
        n(67, 0.5, Voice::Mallet, 0.74, 0),
        n(65, 0.5, Voice::Mallet, 0.80, 0),
        n(64, 0.5, Voice::Mallet, 0.68, 0),
        n(62, 0.5, Voice::Mallet, 0.82, 0),
        n(65, 0.5, Voice::Mallet, 0.72, 0),
        n(69, 0.5, Voice::Mallet, 0.86, 0),
        n(71, 0.5, Voice::Mallet, 0.80, 0),
        n(69, 0.5, Voice::Mallet, 0.74, 0),
        n(67, 0.5, Voice::Mallet, 0.78, 0),
        n(65, 0.5, Voice::Mallet, 0.70, 0),
        n(64, 0.5, Voice::Mallet, 0.76, 0),
        n(65, 0.5, Voice::Mallet, 0.72, 0),
        n(67, 0.5, Voice::Mallet, 0.80, 0),
        n(69, 0.5, Voice::Mallet, 0.84, 0),
        n(67, 0.5, Voice::Mallet, 0.70, 0),
        // Track 1: reed counterline walking underneath (10 beats).
        rest(2.0, 1),
        n(57, 2.0, Voice::Reed, 0.46, 1),
        n(62, 2.0, Voice::Reed, 0.50, 1),
        n(65, 2.0, Voice::Reed, 0.48, 1),
        n(64, 2.0, Voice::Reed, 0.44, 1),
        // Track 2: water-drop blips at phrase ends (10 beats).
        rest(4.0, 2),
        n(81, 0.5, Voice::Drop, 0.42, 2),
        rest(1.0, 2),
        n(86, 0.5, Voice::Drop, 0.38, 2),
        rest(2.0, 2),
        n(79, 0.5, Voice::Drop, 0.40, 2),
        rest(1.5, 2),
    ],
    looped: true,
};

/// Low fright groove: rising drone, reed pulse, two-note fall.
pub const FRIGHT_LOOP: Tune = Tune {
    name: "fright",
    notes: &[
        // Track 0: rising drone over eight beats.
        n(40, 4.0, Voice::Drone, 0.52, 0),
        n(41, 4.0, Voice::Drone, 0.58, 0),
        // Track 1: sixteenth pulse for four beats.
        n(52, 0.25, Voice::Reed, 0.32, 1),
        n(52, 0.25, Voice::Reed, 0.26, 1),
        n(53, 0.25, Voice::Reed, 0.34, 1),
        n(52, 0.25, Voice::Reed, 0.26, 1),
        n(50, 0.25, Voice::Reed, 0.30, 1),
        n(50, 0.25, Voice::Reed, 0.24, 1),
        n(51, 0.25, Voice::Reed, 0.32, 1),
        n(52, 0.25, Voice::Reed, 0.28, 1),
        n(52, 0.25, Voice::Reed, 0.32, 1),
        n(52, 0.25, Voice::Reed, 0.26, 1),
        n(53, 0.25, Voice::Reed, 0.34, 1),
        n(52, 0.25, Voice::Reed, 0.26, 1),
        n(55, 0.25, Voice::Reed, 0.36, 1),
        n(53, 0.25, Voice::Reed, 0.30, 1),
        n(52, 0.25, Voice::Reed, 0.28, 1),
        n(50, 0.25, Voice::Reed, 0.24, 1),
        // Two-note fall, then air before the loop restarts.
        rest(3.0, 1),
        n(55, 0.5, Voice::Mallet, 0.62, 1),
        n(52, 0.5, Voice::Mallet, 0.50, 1),
    ],
    looped: true,
};

/// Sinking death glissando over a low C drone.
pub const DEATH_STING: Tune = Tune {
    name: "death",
    notes: &[
        // Track 0: glass glissando, 3.75 beats.
        n(79, 0.25, Voice::Glass, 0.66, 0),
        n(77, 0.25, Voice::Glass, 0.64, 0),
        n(76, 0.25, Voice::Glass, 0.62, 0),
        n(74, 0.25, Voice::Glass, 0.60, 0),
        n(72, 0.25, Voice::Glass, 0.58, 0),
        n(71, 0.25, Voice::Glass, 0.56, 0),
        n(69, 0.25, Voice::Glass, 0.54, 0),
        n(67, 0.25, Voice::Glass, 0.52, 0),
        n(64, 0.25, Voice::Glass, 0.50, 0),
        n(60, 0.25, Voice::Glass, 0.48, 0),
        n(55, 0.25, Voice::Glass, 0.46, 0),
        n(48, 1.0, Voice::Glass, 0.44, 0),
        // Track 1: low drone bed.
        n(36, 3.75, Voice::Drone, 0.40, 1),
    ],
    looped: false,
};

/// Ascending clear figure closing on a warm bell (exactly three notes).
pub const CLEAR_JINGLE: Tune = Tune {
    name: "clear",
    notes: &[
        n(72, 0.5, Voice::Mallet, 0.82, 0),
        n(76, 0.5, Voice::Mallet, 0.88, 0),
        n(79, 1.0, Voice::Bell, 0.92, 0),
    ],
    looped: false,
};

/// Low settled game-over cadence over a C drone.
pub const GAMEOVER_STING: Tune = Tune {
    name: "gameover",
    notes: &[
        n(52, 1.0, Voice::Reed, 0.56, 0),
        n(50, 1.0, Voice::Reed, 0.52, 0),
        n(48, 2.0, Voice::Reed, 0.48, 0),
        n(36, 4.0, Voice::Drone, 0.36, 1),
    ],
    looped: false,
};

/// All shipped tunes, useful for validation and backends.
pub const ALL_TUNES: &[Tune] = &[
    TITLE_LOOP,
    FRIGHT_LOOP,
    DEATH_STING,
    CLEAR_JINGLE,
    GAMEOVER_STING,
];

/// Highest track lane used by shipped tunes.
pub const MAX_TRACKS: u8 = 3;

/// Number of independent sequencing lanes in `tune` (at least 1).
pub fn track_count(tune: &Tune) -> u8 {
    tune.notes.iter().map(|n| n.track + 1).max().unwrap_or(1)
}

/// Presentation length of one note after swung-eighth timing.
///
/// Only runs of consecutive `0.5`-beat notes on the same track swing; the
/// first of each pair is long, the second short, and a dangling eighth
/// keeps its plain half-beat so the pulse never stretches a bar.
pub fn presentation_beats(tune: &Tune, index: usize) -> f32 {
    let Some(note) = tune.notes.get(index) else {
        return 0.0;
    };
    if (note.beats - 0.5).abs() > 1e-6 {
        return note.beats;
    }
    let mut run_index = 0usize;
    for prev in tune.notes[..index].iter().rev() {
        if prev.track != note.track {
            continue;
        }
        if (prev.beats - 0.5).abs() > 1e-6 {
            break;
        }
        run_index += 1;
    }
    let mut run_after = 0usize;
    let mut seen_self = false;
    for next in &tune.notes[index..] {
        if next.track != note.track {
            continue;
        }
        if !seen_self {
            seen_self = true;
            continue;
        }
        if (next.beats - 0.5).abs() > 1e-6 {
            break;
        }
        run_after += 1;
    }
    let run_len = run_index + 1 + run_after;
    if run_len % 2 == 1 && run_index + 1 == run_len {
        0.5
    } else if (run_index & 1) == 0 {
        SWING_LONG
    } else {
        SWING_SHORT
    }
}

/// Total presentation beats on one track.
pub fn track_beats(tune: &Tune, track: u8) -> f32 {
    tune.notes
        .iter()
        .enumerate()
        .filter(|(_, note)| note.track == track)
        .map(|(i, _)| presentation_beats(tune, i))
        .sum()
}

/// Total presentation length of a tune (its longest track).
pub fn tune_beats(tune: &Tune) -> f32 {
    (0..track_count(tune))
        .map(|track| track_beats(tune, track))
        .fold(0.0, f32::max)
}

/// One synthesized effect layer.
#[derive(Clone, Copy, PartialEq, Debug)]
pub struct Tone {
    pub voice: Voice,
    pub from_hz: f32,
    pub to_hz: f32,
    pub ms: u32,
    pub delay_ms: u32,
    pub gain: f32,
}

const fn tone(voice: Voice, from_hz: f32, to_hz: f32, ms: u32, delay_ms: u32, gain: f32) -> Tone {
    Tone {
        voice,
        from_hz,
        to_hz,
        ms,
        delay_ms,
        gain,
    }
}

/// A one-shot effect: one or more layered tones, an optional chain pitch
/// multiplier, and an optional deterministic per-play pitch variation.
#[derive(Clone, Copy, PartialEq, Debug)]
pub struct Sfx {
    pub tones: &'static [Tone],
    pub pitch: f32,
    pub variation: f32,
}

impl Sfx {
    /// Length of the longest tone including its delay.
    pub fn ms(&self) -> u32 {
        self.tones
            .iter()
            .map(|t| t.delay_ms + t.ms)
            .max()
            .unwrap_or(0)
    }

    /// First tone (legacy single-tone wire views).
    pub fn first(&self) -> Option<Tone> {
        self.tones.first().copied()
    }
}

const CRUMB_TONES: &[Tone] = &[
    tone(Voice::Pluck, 880.0, 820.0, 40, 0, 0.90),
    tone(Voice::Pluck, 1320.0, 1240.0, 30, 8, 0.24),
];

const SUNSEED_TONES: &[Tone] = &[
    tone(Voice::Drop, 660.0, 780.0, 70, 0, 0.80),
    tone(Voice::Drop, 990.0, 1220.0, 90, 60, 0.72),
];

const WARDEN_TONES: &[Tone] = &[
    tone(Voice::Pluck, 400.0, 360.0, 90, 0, 0.86),
    tone(Voice::Pluck, 840.0, 720.0, 60, 15, 0.28),
];

const RELISH_SPAWN_TONES: &[Tone] = &[tone(Voice::Drop, 660.0, 990.0, 150, 0, 0.72)];

const RELISH_TONES: &[Tone] = &[
    tone(Voice::Glass, 784.0, 784.0, 140, 0, 0.70),
    tone(Voice::Glass, 988.0, 988.0, 140, 45, 0.64),
    tone(Voice::Glass, 1175.0, 1175.0, 140, 90, 0.58),
];

const RELISH_GONE_TONES: &[Tone] = &[tone(Voice::Drop, 660.0, 220.0, 150, 0, 0.60)];

const RESPAWN_TONES: &[Tone] = &[
    tone(Voice::Drop, 330.0, 440.0, 80, 0, 0.66),
    tone(Voice::Drop, 440.0, 660.0, 90, 70, 0.62),
];

const SPARE_WICK_TONES: &[Tone] = &[
    tone(Voice::Bell, 523.0, 523.0, 240, 0, 0.74),
    tone(Voice::Bell, 784.0, 784.0, 260, 90, 0.58),
    tone(Voice::Glass, 1046.0, 1046.0, 180, 180, 0.34),
];

const REFILL_TONES: &[Tone] = &[
    tone(Voice::Pluck, 1200.0, 1000.0, 70, 0, 0.36),
    tone(Voice::Drop, 800.0, 900.0, 50, 45, 0.30),
];

const SPRINT_TONES: &[Tone] = &[
    tone(Voice::Glass, 784.0, 784.0, 200, 0, 0.60),
    tone(Voice::Glass, 1046.0, 1046.0, 200, 60, 0.54),
    tone(Voice::Glass, 1318.0, 1318.0, 220, 120, 0.48),
];

const TIMEUP_TONES: &[Tone] = &[
    tone(Voice::Bell, 440.0, 440.0, 180, 0, 0.66),
    tone(Voice::Bell, 330.0, 330.0, 220, 140, 0.58),
];

const EYES_TONES: &[Tone] = &[
    tone(Voice::Drop, 330.0, 440.0, 80, 0, 0.56),
    tone(Voice::Drop, 440.0, 660.0, 90, 70, 0.50),
];

const UI_MOVE_TONES: &[Tone] = &[tone(Voice::Pluck, 660.0, 660.0, 30, 0, 0.34)];

const UI_SELECT_TONES: &[Tone] = &[
    tone(Voice::Pluck, 660.0, 880.0, 70, 0, 0.62),
    tone(Voice::Glass, 1320.0, 1320.0, 40, 30, 0.26),
];

const UI_BACK_TONES: &[Tone] = &[tone(Voice::Pluck, 440.0, 330.0, 70, 0, 0.52)];

const MUTE_TONES: &[Tone] = &[
    tone(Voice::Pluck, 880.0, 880.0, 35, 0, 0.44),
    tone(Voice::Pluck, 660.0, 660.0, 35, 30, 0.36),
];

/// Soft pluck crumb blip with slight pitch variation.
pub const SFX_CRUMB: Sfx = Sfx {
    tones: CRUMB_TONES,
    pitch: 1.0,
    variation: CRUMB_VARIATION,
};

/// Two-note sunseed rise.
pub const SFX_SUNSEED: Sfx = Sfx {
    tones: SUNSEED_TONES,
    pitch: 1.0,
    variation: 0.0,
};

/// Rising warden-chain ladder (pitch doubles per arm).
pub const SFX_WARDEN: Sfx = Sfx {
    tones: WARDEN_TONES,
    pitch: 1.0,
    variation: 0.0,
};

/// Sparkling relish triad.
pub const SFX_RELISH: Sfx = Sfx {
    tones: RELISH_TONES,
    pitch: 1.0,
    variation: 0.0,
};

/// Warm spare-wick bell.
pub const SFX_EXTRA_LIFE: Sfx = Sfx {
    tones: SPARE_WICK_TONES,
    pitch: 1.0,
    variation: 0.0,
};

/// Cues served by the music system (loops/stings in [`ALL_TUNES`]) rather
/// than one-shot SFX; [`sfx_for_cue`] returns `None` for exactly these.
pub const MUSIC_CUES: &[Cue] = &[
    Cue::FrightStart, // starts FRIGHT_LOOP
    Cue::FrightEnd,   // back to TITLE_LOOP
    Cue::LevelStart,  // (re)starts TITLE_LOOP
    Cue::LevelClear,  // CLEAR_JINGLE
    Cue::Death,       // DEATH_STING
    Cue::GameOver,    // GAMEOVER_STING
];

/// Every cue the crate knows about (all [`Cue`] variants).
pub const ALL_CUES: &[Cue] = &[
    Cue::Crumb,
    Cue::Sunseed,
    Cue::FrightStart,
    Cue::WardenEaten { chain: 0 },
    Cue::WardenEaten { chain: 1 },
    Cue::WardenEaten { chain: 2 },
    Cue::WardenEaten { chain: 3 },
    Cue::RelishSpawn,
    Cue::RelishEaten,
    Cue::RelishGone,
    Cue::Death,
    Cue::Respawn,
    Cue::ExtraLife,
    Cue::LevelClear,
    Cue::LevelStart,
    Cue::Refill,
    Cue::SprintBonus,
    Cue::TimeUp,
    Cue::GameOver,
    Cue::FrightEnd,
    Cue::EyesRevived,
    Cue::UiMove,
    Cue::UiSelect,
    Cue::UiBack,
    Cue::MuteToggle,
];

/// One-shot effect for `cue`, or `None` when the cue is served by the
/// music system (see [`MUSIC_CUES`]). Every other cue, including all four
/// UI cues, has a concrete SFX.
pub fn sfx_for_cue(cue: Cue) -> Option<Sfx> {
    match cue {
        Cue::Crumb => Some(SFX_CRUMB),
        Cue::Sunseed => Some(SFX_SUNSEED),
        Cue::FrightStart
        | Cue::FrightEnd
        | Cue::LevelStart
        | Cue::LevelClear
        | Cue::Death
        | Cue::GameOver => None,
        Cue::WardenEaten { chain } => Some(Sfx {
            pitch: 2f32.powi(chain.min(3) as i32),
            ..SFX_WARDEN
        }),
        Cue::RelishSpawn => Some(Sfx {
            tones: RELISH_SPAWN_TONES,
            pitch: 1.0,
            variation: 0.0,
        }),
        Cue::RelishEaten => Some(SFX_RELISH),
        Cue::RelishGone => Some(Sfx {
            tones: RELISH_GONE_TONES,
            pitch: 1.0,
            variation: 0.0,
        }),
        Cue::Respawn => Some(Sfx {
            tones: RESPAWN_TONES,
            pitch: 1.0,
            variation: 0.0,
        }),
        Cue::ExtraLife => Some(SFX_EXTRA_LIFE),
        Cue::Refill => Some(Sfx {
            tones: REFILL_TONES,
            pitch: 1.0,
            variation: 0.0,
        }),
        Cue::SprintBonus => Some(Sfx {
            tones: SPRINT_TONES,
            pitch: 1.0,
            variation: 0.0,
        }),
        Cue::TimeUp => Some(Sfx {
            tones: TIMEUP_TONES,
            pitch: 1.0,
            variation: 0.0,
        }),
        Cue::EyesRevived => Some(Sfx {
            tones: EYES_TONES,
            pitch: 1.0,
            variation: 0.0,
        }),
        Cue::UiMove => Some(Sfx {
            tones: UI_MOVE_TONES,
            pitch: 1.0,
            variation: 0.0,
        }),
        Cue::UiSelect => Some(Sfx {
            tones: UI_SELECT_TONES,
            pitch: 1.0,
            variation: 0.0,
        }),
        Cue::UiBack => Some(Sfx {
            tones: UI_BACK_TONES,
            pitch: 1.0,
            variation: 0.0,
        }),
        Cue::MuteToggle => Some(Sfx {
            tones: MUTE_TONES,
            pitch: 1.0,
            variation: 0.0,
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tunes_are_valid_note_data() {
        for tune in ALL_TUNES {
            assert!(!tune.notes.is_empty(), "{} is empty", tune.name);
            assert!(!tune.name.is_empty(), "tune with empty name");
            assert!(track_count(tune) <= MAX_TRACKS);
            for note in tune.notes {
                assert!(
                    note.is_rest() || (21..=108).contains(&note.midi),
                    "{}: midi {} out of range",
                    tune.name,
                    note.midi
                );
                assert!(
                    note.beats.is_finite() && note.beats > 0.0,
                    "{}: non-positive beats {}",
                    tune.name,
                    note.beats
                );
                assert!(
                    note.velocity.is_finite() && (0.0..=1.0).contains(&note.velocity),
                    "{}: bad velocity {}",
                    tune.name,
                    note.velocity
                );
                assert!(note.track < MAX_TRACKS, "{}: bad track", tune.name);
            }
            let total = tune_beats(tune);
            assert!(
                (1.0..=64.0).contains(&total),
                "{}: total beats {total} outside 1..=64",
                tune.name
            );
        }
    }

    #[test]
    fn tune_shapes_match_spec() {
        assert!(TITLE_LOOP.notes.len() >= 16 && TITLE_LOOP.looped);
        assert!(track_count(&TITLE_LOOP) == 3, "title has lead/pad/accents");
        assert!(TITLE_LOOP
            .notes
            .iter()
            .any(|n| n.voice == Voice::Reed && !n.is_rest()));
        assert!(TITLE_LOOP
            .notes
            .iter()
            .any(|n| n.voice == Voice::Drop && !n.is_rest()));
        const { assert!(FRIGHT_LOOP.looped) };
        assert!(FRIGHT_LOOP.notes.iter().any(|n| n.voice == Voice::Drone));
        const { assert!(!DEATH_STING.looped) };
        assert!(DEATH_STING
            .notes
            .iter()
            .filter(|n| !n.is_rest())
            .all(|n| n.voice == Voice::Glass || n.voice == Voice::Drone));
        assert_eq!(
            CLEAR_JINGLE.notes.iter().filter(|n| !n.is_rest()).count(),
            3,
            "clear is a three-note figure"
        );
        const { assert!(!GAMEOVER_STING.looped) };
        // Death descends overall, clear ascends overall.
        let death: Vec<u8> = DEATH_STING
            .notes
            .iter()
            .filter(|n| !n.is_rest() && n.track == 0)
            .map(|n| n.midi)
            .collect();
        assert!(death.first() > death.last());
        let clear: Vec<u8> = CLEAR_JINGLE
            .notes
            .iter()
            .filter(|n| !n.is_rest())
            .map(|n| n.midi)
            .collect();
        assert!(clear.first() < clear.last());
    }

    #[test]
    fn swing_is_paired_and_time_preserving() {
        // Title lead is 20 consecutive eighths: each pair sums to one beat.
        let eighths: Vec<usize> = TITLE_LOOP
            .notes
            .iter()
            .enumerate()
            .filter(|(_, n)| n.track == 0)
            .map(|(i, _)| i)
            .collect();
        assert_eq!(eighths.len(), 20);
        for pair in eighths.chunks(2) {
            let a = presentation_beats(&TITLE_LOOP, pair[0]);
            let b = presentation_beats(&TITLE_LOOP, pair[1]);
            assert!((a - SWING_LONG).abs() < 1e-6, "first eighth is long");
            assert!((b - SWING_SHORT).abs() < 1e-6, "second eighth is short");
            assert!((a + b - 1.0).abs() < 1e-6, "pair keeps one beat");
        }
        // A lone eighth is not stretched.
        assert!((presentation_beats(&TITLE_LOOP, 21) - 2.0).abs() < 1e-6);
        // Non-eighth lengths are untouched.
        let idx = TITLE_LOOP
            .notes
            .iter()
            .position(|n| (n.beats - 0.5).abs() > 1e-6 && n.track == 0);
        assert!(idx.is_none(), "title lead is pure eighths");
        assert!((presentation_beats(&CLEAR_JINGLE, 2) - 1.0).abs() < 1e-6);
    }

    #[test]
    fn swing_run_ignores_interleaved_lanes() {
        // Track 1 interleaves between track 0's eighths: the swing scan
        // must skip the foreign lane instead of treating it as a run break.
        static NOTES: [Note; 4] = [
            n(60, 0.5, Voice::Mallet, 0.8, 0),
            n(40, 0.5, Voice::Drone, 0.5, 1),
            n(62, 0.5, Voice::Mallet, 0.8, 0),
            n(64, 0.5, Voice::Mallet, 0.8, 0),
        ];
        let tune = Tune {
            name: "interleaved",
            notes: &NOTES,
            looped: false,
        };
        assert!((presentation_beats(&tune, 0) - SWING_LONG).abs() < 1e-6);
        assert!((presentation_beats(&tune, 1) - 0.5).abs() < 1e-6);
        assert!((presentation_beats(&tune, 2) - SWING_SHORT).abs() < 1e-6);
        assert!((presentation_beats(&tune, 3) - 0.5).abs() < 1e-6);
        assert!((track_beats(&tune, 0) - 1.5).abs() < 1e-6);
    }

    #[test]
    fn tune_tracks_share_one_length() {
        for tune in ALL_TUNES {
            let count = track_count(tune);
            let beats: Vec<f32> = (0..count).map(|t| track_beats(tune, t)).collect();
            assert!(
                beats.iter().all(|b| *b > 0.0),
                "{} has an empty track",
                tune.name
            );
            let max = beats.iter().copied().fold(0.0, f32::max);
            assert!((tune_beats(tune) - max).abs() < 1e-6);
        }
    }

    #[test]
    fn sfx_recipes_are_sane_and_layered() {
        for cue in ALL_CUES {
            if MUSIC_CUES.contains(cue) {
                assert!(sfx_for_cue(*cue).is_none());
                continue;
            }
            let sfx = sfx_for_cue(*cue).expect("non-music cue has SFX");
            assert!(!sfx.tones.is_empty(), "{cue:?} has no tones");
            assert!((1.0..=8.0).contains(&sfx.pitch), "{cue:?} bad pitch");
            assert!((0.0..=0.1).contains(&sfx.variation));
            for tone in sfx.tones {
                assert!(tone.from_hz.is_finite() && tone.from_hz > 0.0);
                assert!(tone.to_hz.is_finite() && tone.to_hz > 0.0);
                assert!(tone.ms > 0 && tone.ms <= 1000);
                assert!(tone.delay_ms <= 500);
                assert!(tone.gain > 0.0 && tone.gain <= 1.0);
            }
        }
        // The bank's signature shapes are explicit.
        assert_eq!(SFX_CRUMB.ms(), 40);
        assert_eq!(SFX_RELISH.tones.len(), 3);
        assert_eq!(SFX_SUNSEED.tones.len(), 2);
        assert!(SFX_EXTRA_LIFE.tones.iter().any(|t| t.voice == Voice::Bell));
        const { assert!(SFX_CRUMB.variation > 0.0) };
    }

    #[test]
    fn crumb_is_short_and_chain_pitch_rises() {
        assert!(SFX_CRUMB.ms() <= 60);
        let tops: Vec<f32> = (0..4)
            .map(|chain| sfx_for_cue(Cue::WardenEaten { chain }).unwrap().pitch)
            .collect();
        assert_eq!(tops, vec![1.0, 2.0, 4.0, 8.0]);
        assert_eq!(
            sfx_for_cue(Cue::WardenEaten { chain: 9 }).unwrap().pitch,
            8.0
        );
    }

    #[test]
    fn every_voice_has_a_stable_code_and_wave() {
        for (i, voice) in Voice::ALL.iter().enumerate() {
            assert_eq!(voice.code() as usize, i);
            assert_eq!(Voice::from_code(i as u32), Some(*voice));
            let _ = voice.wave();
            assert!(!voice.label().is_empty());
        }
        assert_eq!(Voice::from_code(99), None);
    }

    #[test]
    fn mix_constants_match_the_binding_direction() {
        assert!((TEMPO - 108.0).abs() < 1e-6);
        assert!((SWING_LONG + SWING_SHORT - 1.0).abs() < 1e-6);
        const { assert!(SWING_LONG > SWING_SHORT) };
        assert_eq!(FADE_MS, 120);
        assert!((DEFAULT_MUSIC - 0.60).abs() < 1e-6);
        assert!((DEFAULT_SFX - 0.80).abs() < 1e-6);
    }
}
