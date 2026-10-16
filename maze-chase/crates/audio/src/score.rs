//! Original music and SFX data for Maze Chase.
//!
//! All melodies below are original compositions written for this project
//! (no quotations, no public-domain lifts). Notes use MIDI numbers
//! (`21..=108`, piano range A0-C8) with durations in beats.
//!
//! * `TITLE_LOOP`: bouncy D-dorian line (D E F G A B C) that hops up the
//!   mode and tumbles back, built to loop under the attract/title screen.
//! * `FRIGHT_LOOP`: driving low E pedal with F/Bb stabs, built to loop
//!   under fright windows.
//! * `DEATH_STING`: descending G-major tumble to a low C thud.
//! * `CLEAR_JINGLE`: ascending C-major pentatonic climb with a held top.
//! * `GAMEOVER_STING`: slow E-minor lament settling on low E.

use crate::cue::Cue;

/// One pitched note: MIDI key plus length in beats.
#[derive(Clone, Copy, PartialEq, Debug)]
pub struct Note {
    /// MIDI note number, valid range `21..=108`.
    pub midi: u8,
    /// Length in beats, must be positive.
    pub beats: f32,
}

/// A named note sequence; `looped` tunes restart until stopped.
#[derive(Clone, Copy, PartialEq, Debug)]
pub struct Tune {
    pub name: &'static str,
    pub notes: &'static [Note],
    pub looped: bool,
}

/// Bouncy D-dorian title line, 20 notes, loops.
pub const TITLE_LOOP: Tune = Tune {
    name: "title",
    notes: &[
        Note {
            midi: 62,
            beats: 0.5,
        }, // D4
        Note {
            midi: 64,
            beats: 0.5,
        }, // E4
        Note {
            midi: 65,
            beats: 0.5,
        }, // F4
        Note {
            midi: 67,
            beats: 0.5,
        }, // G4
        Note {
            midi: 69,
            beats: 0.5,
        }, // A4
        Note {
            midi: 67,
            beats: 0.5,
        }, // G4
        Note {
            midi: 65,
            beats: 0.5,
        }, // F4
        Note {
            midi: 64,
            beats: 0.5,
        }, // E4
        Note {
            midi: 62,
            beats: 0.5,
        }, // D4
        Note {
            midi: 65,
            beats: 0.5,
        }, // F4
        Note {
            midi: 69,
            beats: 0.5,
        }, // A4
        Note {
            midi: 71,
            beats: 0.5,
        }, // B4 (dorian 6th)
        Note {
            midi: 69,
            beats: 0.5,
        }, // A4
        Note {
            midi: 67,
            beats: 0.5,
        }, // G4
        Note {
            midi: 65,
            beats: 0.5,
        }, // F4
        Note {
            midi: 64,
            beats: 0.5,
        }, // E4
        Note {
            midi: 65,
            beats: 0.5,
        }, // F4
        Note {
            midi: 67,
            beats: 0.5,
        }, // G4
        Note {
            midi: 69,
            beats: 0.5,
        }, // A4
        Note {
            midi: 67,
            beats: 0.5,
        }, // G4 (loops back to D4)
    ],
    looped: true,
};

/// Driving low fright groove, 16 eighth-notes, loops.
pub const FRIGHT_LOOP: Tune = Tune {
    name: "fright",
    notes: &[
        Note {
            midi: 52,
            beats: 0.25,
        }, // E3 pedal
        Note {
            midi: 52,
            beats: 0.25,
        },
        Note {
            midi: 53,
            beats: 0.25,
        }, // F3 stab
        Note {
            midi: 52,
            beats: 0.25,
        },
        Note {
            midi: 50,
            beats: 0.25,
        }, // D3 dip
        Note {
            midi: 50,
            beats: 0.25,
        },
        Note {
            midi: 51,
            beats: 0.25,
        }, // Eb3 climb
        Note {
            midi: 52,
            beats: 0.25,
        },
        Note {
            midi: 52,
            beats: 0.25,
        }, // E3 pedal
        Note {
            midi: 52,
            beats: 0.25,
        },
        Note {
            midi: 53,
            beats: 0.25,
        }, // F3 stab
        Note {
            midi: 52,
            beats: 0.25,
        },
        Note {
            midi: 55,
            beats: 0.25,
        }, // G3 lift
        Note {
            midi: 53,
            beats: 0.25,
        },
        Note {
            midi: 52,
            beats: 0.25,
        },
        Note {
            midi: 50,
            beats: 0.25,
        }, // D3 (loops to E3)
    ],
    looped: true,
};

/// Descending death tumble, 7 notes, one-shot.
pub const DEATH_STING: Tune = Tune {
    name: "death",
    notes: &[
        Note {
            midi: 67,
            beats: 0.5,
        }, // G4
        Note {
            midi: 64,
            beats: 0.5,
        }, // E4
        Note {
            midi: 60,
            beats: 0.5,
        }, // C4
        Note {
            midi: 57,
            beats: 0.5,
        }, // A3
        Note {
            midi: 55,
            beats: 0.5,
        }, // G3
        Note {
            midi: 52,
            beats: 0.5,
        }, // E3
        Note {
            midi: 48,
            beats: 1.5,
        }, // C3 thud
    ],
    looped: false,
};

/// Ascending clear fanfare, 9 notes, one-shot.
pub const CLEAR_JINGLE: Tune = Tune {
    name: "clear",
    notes: &[
        Note {
            midi: 60,
            beats: 0.5,
        }, // C4
        Note {
            midi: 62,
            beats: 0.5,
        }, // D4
        Note {
            midi: 64,
            beats: 0.5,
        }, // E4
        Note {
            midi: 67,
            beats: 0.5,
        }, // G4
        Note {
            midi: 69,
            beats: 0.5,
        }, // A4
        Note {
            midi: 72,
            beats: 0.5,
        }, // C5
        Note {
            midi: 74,
            beats: 0.5,
        }, // D5
        Note {
            midi: 76,
            beats: 0.5,
        }, // E5
        Note {
            midi: 79,
            beats: 1.0,
        }, // G5 held top
    ],
    looped: false,
};

/// Slow game-over lament, 7 notes, one-shot.
pub const GAMEOVER_STING: Tune = Tune {
    name: "gameover",
    notes: &[
        Note {
            midi: 64,
            beats: 0.5,
        }, // E4
        Note {
            midi: 62,
            beats: 0.5,
        }, // D4
        Note {
            midi: 60,
            beats: 0.5,
        }, // C4
        Note {
            midi: 59,
            beats: 0.5,
        }, // B3
        Note {
            midi: 57,
            beats: 0.5,
        }, // A3
        Note {
            midi: 55,
            beats: 1.0,
        }, // G3
        Note {
            midi: 52,
            beats: 2.0,
        }, // E3 rest
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

/// Oscillator shape for a one-shot effect.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Wave {
    Square,
    Triangle,
    Sine,
    Noise,
}

/// A one-shot synthesized effect: sweep from `from_hz` to `to_hz`
/// over `ms` milliseconds.
#[derive(Clone, Copy, PartialEq, Debug)]
pub struct Sfx {
    pub wave: Wave,
    pub from_hz: f32,
    pub to_hz: f32,
    pub ms: u32,
}

/// Short square crumb blip.
pub const SFX_CRUMB: Sfx = Sfx {
    wave: Wave::Square,
    from_hz: 880.0,
    to_hz: 660.0,
    ms: 60,
};

/// Rising sine relish pickup.
pub const SFX_RELISH: Sfx = Sfx {
    wave: Wave::Sine,
    from_hz: 440.0,
    to_hz: 880.0,
    ms: 200,
};

/// Descending warden-eaten sweep.
pub const SFX_WARDEN: Sfx = Sfx {
    wave: Wave::Square,
    from_hz: 800.0,
    to_hz: 100.0,
    ms: 300,
};

/// Arpeggio-ish sweep up for the extra life.
pub const SFX_EXTRA_LIFE: Sfx = Sfx {
    wave: Wave::Triangle,
    from_hz: 523.0,
    to_hz: 1568.0,
    ms: 400,
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
        Cue::Sunseed => Some(Sfx {
            wave: Wave::Square,
            from_hz: 440.0,
            to_hz: 880.0,
            ms: 120,
        }),
        Cue::FrightStart
        | Cue::FrightEnd
        | Cue::LevelStart
        | Cue::LevelClear
        | Cue::Death
        | Cue::GameOver => None,
        Cue::WardenEaten { chain } => {
            // Each chain step doubles the bite pitch.
            let top = 400.0 * 2f32.powi(chain.min(3) as i32);
            Some(Sfx {
                wave: SFX_WARDEN.wave,
                from_hz: top,
                to_hz: top / 2.0,
                ms: SFX_WARDEN.ms,
            })
        }
        Cue::RelishSpawn => Some(Sfx {
            wave: Wave::Sine,
            from_hz: 660.0,
            to_hz: 990.0,
            ms: 150,
        }),
        Cue::RelishEaten => Some(SFX_RELISH),
        Cue::RelishGone => Some(Sfx {
            wave: Wave::Sine,
            from_hz: 660.0,
            to_hz: 220.0,
            ms: 150,
        }),
        Cue::Respawn => Some(Sfx {
            wave: Wave::Square,
            from_hz: 220.0,
            to_hz: 440.0,
            ms: 150,
        }),
        Cue::ExtraLife => Some(SFX_EXTRA_LIFE),
        Cue::Refill => Some(Sfx {
            wave: Wave::Noise,
            from_hz: 1000.0,
            to_hz: 1000.0,
            ms: 100,
        }),
        Cue::SprintBonus => Some(Sfx {
            wave: Wave::Triangle,
            from_hz: 523.0,
            to_hz: 2093.0,
            ms: 300,
        }),
        Cue::TimeUp => Some(Sfx {
            wave: Wave::Square,
            from_hz: 440.0,
            to_hz: 110.0,
            ms: 400,
        }),
        Cue::EyesRevived => Some(Sfx {
            wave: Wave::Triangle,
            from_hz: 330.0,
            to_hz: 440.0,
            ms: 100,
        }),
        Cue::UiMove => Some(Sfx {
            wave: Wave::Square,
            from_hz: 660.0,
            to_hz: 660.0,
            ms: 40,
        }),
        Cue::UiSelect => Some(Sfx {
            wave: Wave::Square,
            from_hz: 660.0,
            to_hz: 990.0,
            ms: 80,
        }),
        Cue::UiBack => Some(Sfx {
            wave: Wave::Square,
            from_hz: 440.0,
            to_hz: 330.0,
            ms: 80,
        }),
        Cue::MuteToggle => Some(Sfx {
            wave: Wave::Square,
            from_hz: 880.0,
            to_hz: 880.0,
            ms: 50,
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn total_beats(tune: &Tune) -> f32 {
        tune.notes.iter().map(|n| n.beats).sum()
    }

    #[test]
    fn tunes_are_valid_note_data() {
        for tune in ALL_TUNES {
            assert!(!tune.notes.is_empty(), "{} is empty", tune.name);
            assert!(!tune.name.is_empty(), "tune with empty name");
            for note in tune.notes {
                assert!(
                    (21..=108).contains(&note.midi),
                    "{}: midi {} out of range",
                    tune.name,
                    note.midi
                );
                assert!(
                    note.beats > 0.0,
                    "{}: non-positive beats {}",
                    tune.name,
                    note.beats
                );
            }
            let total = total_beats(tune);
            assert!(
                (4.0..=64.0).contains(&total),
                "{}: total beats {total} outside 4..=64",
                tune.name
            );
        }
    }

    #[test]
    fn tune_shapes_match_spec() {
        assert!(TITLE_LOOP.notes.len() >= 16 && TITLE_LOOP.looped);
        assert!(FRIGHT_LOOP.notes.len() >= 12 && FRIGHT_LOOP.looped);
        assert!(DEATH_STING.notes.len() >= 6 && !DEATH_STING.looped);
        assert!(CLEAR_JINGLE.notes.len() >= 8 && !CLEAR_JINGLE.looped);
        assert!(GAMEOVER_STING.notes.len() >= 6 && !GAMEOVER_STING.looped);
        // Death descends overall, clear ascends overall.
        assert!(DEATH_STING.notes.first().unwrap().midi > DEATH_STING.notes.last().unwrap().midi);
        assert!(CLEAR_JINGLE.notes.first().unwrap().midi < CLEAR_JINGLE.notes.last().unwrap().midi);
    }

    #[test]
    fn sfx_consts_are_sane() {
        for sfx in [SFX_CRUMB, SFX_RELISH, SFX_WARDEN, SFX_EXTRA_LIFE] {
            assert!(sfx.from_hz > 0.0 && sfx.to_hz > 0.0);
            assert!(sfx.ms > 0);
        }
        // Crumb is the shortest blip.
        const { assert!(SFX_CRUMB.ms <= 100) };
    }

    #[test]
    fn every_non_music_cue_has_an_sfx() {
        for cue in ALL_CUES {
            let is_music = MUSIC_CUES.contains(cue);
            match sfx_for_cue(*cue) {
                Some(sfx) => {
                    assert!(!is_music, "{cue:?} is a music cue but has an Sfx");
                    assert!(sfx.from_hz > 0.0 && sfx.to_hz > 0.0);
                    assert!(sfx.ms > 0);
                }
                None => assert!(
                    is_music,
                    "{cue:?} has no Sfx but is not a documented music cue"
                ),
            }
        }
        // UI cues explicitly have SFX (not silent).
        for ui in [Cue::UiMove, Cue::UiSelect, Cue::UiBack, Cue::MuteToggle] {
            assert!(sfx_for_cue(ui).is_some(), "{ui:?} should click");
        }
    }

    #[test]
    fn warden_sfx_pitch_rises_with_chain() {
        let tops: Vec<f32> = (0..4)
            .map(|chain| sfx_for_cue(Cue::WardenEaten { chain }).unwrap().from_hz)
            .collect();
        assert!(tops.windows(2).all(|w| w[0] < w[1]));
    }
}
