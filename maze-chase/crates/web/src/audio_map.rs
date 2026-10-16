//! Audio routing for the web layer: engine events to stable cue codes.
//!
//! The JS harness synthesizes sound with WebAudio, so this module hands it
//! everything data-driven from `maze-chase-audio`: stable cue codes, SFX
//! recipes, and tune note tables. No audio plays here; this is the menu
//! the harness cooks from.

use maze_chase_audio::cue::Cue;
use maze_chase_audio::score::{
    self, Sfx, Tune, Wave, CLEAR_JINGLE, DEATH_STING, FRIGHT_LOOP, GAMEOVER_STING, TITLE_LOOP,
};
use maze_chase_audio::sink::TuneId;

/// Stable wire codes (`mc_poll_cue`, SFX/tune lookups). Never renumber.
pub const CUE_CRUMB: u32 = 1;
/// Sunseed eaten.
pub const CUE_SUNSEED: u32 = 2;
/// Fright window opened (served by the fright loop, no SFX).
pub const CUE_FRIGHT_START: u32 = 3;
/// Warden eaten; chain arm via `mc_last_chain` for pitch doubling.
pub const CUE_WARDEN_EATEN: u32 = 4;
/// Relish spawned.
pub const CUE_RELISH_SPAWN: u32 = 5;
/// Relish eaten.
pub const CUE_RELISH_EATEN: u32 = 6;
/// Relish expired.
pub const CUE_RELISH_GONE: u32 = 7;
/// Pip died (death sting, no SFX).
pub const CUE_DEATH: u32 = 8;
/// Pip respawned.
pub const CUE_RESPAWN: u32 = 9;
/// Spare wick earned.
pub const CUE_EXTRA_LIFE: u32 = 10;
/// Level cleared (clear jingle, no SFX).
pub const CUE_LEVEL_CLEAR: u32 = 11;
/// Level started.
pub const CUE_LEVEL_START: u32 = 12;
/// Time-attack refill tick.
pub const CUE_REFILL: u32 = 13;
/// Sprint par bonus banked.
pub const CUE_SPRINT_BONUS: u32 = 14;
/// Time attack expired.
pub const CUE_TIME_UP: u32 = 15;
/// Game over (game-over sting, no SFX).
pub const CUE_GAME_OVER: u32 = 16;
/// Fright window closed (loop stops, no SFX).
pub const CUE_FRIGHT_END: u32 = 17;
/// Eaten warden revived at the gatehouse mouth.
pub const CUE_EYES_REVIVED: u32 = 18;
/// Menu cursor moved.
pub const CUE_UI_MOVE: u32 = 19;
/// Menu choice confirmed.
pub const CUE_UI_SELECT: u32 = 20;
/// Menu step back.
pub const CUE_UI_BACK: u32 = 21;
/// Mute toggled.
pub const CUE_MUTE_TOGGLE: u32 = 22;

/// Highest cue code.
pub const CUE_MAX: u32 = 22;

/// Presentation tempo in beats per minute. Tune data carries beats only;
/// the layer chooses the tempo: this mirrors the desktop synth's
/// `TUNE_BPM` so loops feel identical across layers.
pub const TUNE_BPM: f32 = 132.0;

/// Map a [`Cue`] to its stable wire code.
pub fn cue_code(cue: Cue) -> u32 {
    match cue {
        Cue::Crumb => CUE_CRUMB,
        Cue::Sunseed => CUE_SUNSEED,
        Cue::FrightStart => CUE_FRIGHT_START,
        Cue::WardenEaten { .. } => CUE_WARDEN_EATEN,
        Cue::RelishSpawn => CUE_RELISH_SPAWN,
        Cue::RelishEaten => CUE_RELISH_EATEN,
        Cue::RelishGone => CUE_RELISH_GONE,
        Cue::Death => CUE_DEATH,
        Cue::Respawn => CUE_RESPAWN,
        Cue::ExtraLife => CUE_EXTRA_LIFE,
        Cue::LevelClear => CUE_LEVEL_CLEAR,
        Cue::LevelStart => CUE_LEVEL_START,
        Cue::Refill => CUE_REFILL,
        Cue::SprintBonus => CUE_SPRINT_BONUS,
        Cue::TimeUp => CUE_TIME_UP,
        Cue::GameOver => CUE_GAME_OVER,
        Cue::FrightEnd => CUE_FRIGHT_END,
        Cue::EyesRevived => CUE_EYES_REVIVED,
        Cue::UiMove => CUE_UI_MOVE,
        Cue::UiSelect => CUE_UI_SELECT,
        Cue::UiBack => CUE_UI_BACK,
        Cue::MuteToggle => CUE_MUTE_TOGGLE,
    }
}

/// Whether the cue is served by a one-shot music sting instead of an SFX
/// blip (the harness must call [`tune_for_cue`] for these).
pub fn cue_is_music(code: u32) -> bool {
    matches!(code, CUE_DEATH | CUE_LEVEL_CLEAR | CUE_GAME_OVER)
}

/// Tune id for a musical cue (see [`tune_for_id`]).
pub fn tune_for_cue(code: u32) -> Option<u32> {
    match code {
        CUE_DEATH => Some(TUNE_DEATH),
        CUE_LEVEL_CLEAR => Some(TUNE_CLEAR),
        CUE_GAME_OVER => Some(TUNE_GAME_OVER),
        _ => None,
    }
}

/// Looping title tune id.
pub const TUNE_TITLE: u32 = 0;
/// Looping fright tune id.
pub const TUNE_FRIGHT: u32 = 1;
/// Death sting tune id.
pub const TUNE_DEATH: u32 = 2;
/// Level-clear jingle tune id.
pub const TUNE_CLEAR: u32 = 3;
/// Game-over sting tune id.
pub const TUNE_GAME_OVER: u32 = 4;

/// Tune data by id. `None` is out of range.
pub fn tune_for_id(id: u32) -> Option<Tune> {
    match id {
        TUNE_TITLE => Some(TITLE_LOOP),
        TUNE_FRIGHT => Some(FRIGHT_LOOP),
        TUNE_DEATH => Some(DEATH_STING),
        TUNE_CLEAR => Some(CLEAR_JINGLE),
        TUNE_GAME_OVER => Some(GAMEOVER_STING),
        _ => None,
    }
}

/// Loop music requested by screen/flow state.
pub fn tune_id_for_loop(loop_id: u32) -> Option<TuneId> {
    match loop_id {
        1 => Some(TuneId::Title),
        2 => Some(TuneId::Fright),
        _ => None,
    }
}

/// Waveform code for the harness oscillator: 0 square, 1 triangle,
/// 2 sine, 3 noise.
pub fn wave_code(wave: Wave) -> u32 {
    match wave {
        Wave::Square => 0,
        Wave::Triangle => 1,
        Wave::Sine => 2,
        Wave::Noise => 3,
    }
}

/// SFX recipe for a cue code, with the warden-eaten chain arm applied
/// (pitch doubles per chain in engine domain 0..=3, matching the audio
/// crate contract; the wire 1..=4 is stored+1, never doubled twice).
/// Returns `None` for musical/silent cues.
pub fn sfx_for_code(code: u32, chain: u8) -> Option<Sfx> {
    let cue = match code {
        CUE_CRUMB => Cue::Crumb,
        CUE_SUNSEED => Cue::Sunseed,
        CUE_WARDEN_EATEN => Cue::WardenEaten {
            chain: chain.min(3),
        },
        CUE_RELISH_SPAWN => Cue::RelishSpawn,
        CUE_RELISH_EATEN => Cue::RelishEaten,
        CUE_RELISH_GONE => Cue::RelishGone,
        CUE_RESPAWN => Cue::Respawn,
        CUE_EXTRA_LIFE => Cue::ExtraLife,
        CUE_LEVEL_START => Cue::LevelStart,
        CUE_REFILL => Cue::Refill,
        CUE_SPRINT_BONUS => Cue::SprintBonus,
        CUE_TIME_UP => Cue::TimeUp,
        CUE_EYES_REVIVED => Cue::EyesRevived,
        CUE_UI_MOVE => Cue::UiMove,
        CUE_UI_SELECT => Cue::UiSelect,
        CUE_UI_BACK => Cue::UiBack,
        CUE_MUTE_TOGGLE => Cue::MuteToggle,
        _ => return None,
    };
    score::sfx_for_cue(cue)
}

#[cfg(test)]
mod tests {
    use super::*;
    use maze_chase_audio::cue::cue_for_event;
    use maze_chase_audio::score::{ALL_CUES, MUSIC_CUES};

    #[test]
    fn every_cue_has_a_distinct_stable_code() {
        // (code, chain-arm) pairs are unique: warden chains share one
        // code by design, the arm rides alongside, never in the code.
        let mut seen = std::collections::HashSet::new();
        for cue in ALL_CUES {
            let code = cue_code(*cue);
            assert!((1..=CUE_MAX).contains(&code), "{cue:?}");
            let arm = match cue {
                Cue::WardenEaten { chain } => *chain,
                _ => 0,
            };
            assert!(seen.insert((code, arm)), "duplicate ({code}, {arm})");
        }
    }

    #[test]
    fn every_engine_event_reaches_sound_or_music_or_known_silence() {
        // Engine event strings the session can drain (see game.rs docs).
        let events = [
            "dot",
            "sunseed",
            "fright:6.0",
            "fright-end",
            "warden:200",
            "warden-back:Bram",
            "relish:spawn:100",
            "relish:300",
            "relish:gone",
            "death",
            "respawn",
            "extra-life",
            "level-clear",
            "level:2",
            "refill",
            "sprint-bonus:40",
            "time-up",
            "game-over",
            "wave:scatter",
            "house-release:Kessa",
        ];
        for event in events {
            match cue_for_event(event) {
                None => {
                    // Only wave/house bookkeeping is intentionally silent.
                    assert!(
                        event.starts_with("wave:")
                            || event.starts_with("house-")
                            || event.starts_with("level:"),
                        "event `{event}` silently dropped"
                    );
                }
                Some(cue) => {
                    let code = cue_code(cue);
                    let musical = cue_is_music(code);
                    let sfx = sfx_for_code(code, 1);
                    // Fright windows and the level fanfare are served by
                    // the loop engine, everything else needs an SFX.
                    let loop_served =
                        matches!(cue, Cue::FrightStart | Cue::FrightEnd | Cue::LevelStart);
                    assert!(
                        musical || sfx.is_some() || loop_served,
                        "cue `{cue:?}` has no sound path"
                    );
                    if musical {
                        assert!(tune_for_cue(code).is_some());
                    }
                }
            }
        }
        // The audio crate's own music list agrees with the bridge map.
        for cue in MUSIC_CUES {
            let code = cue_code(*cue);
            assert!(
                cue_is_music(code)
                    || matches!(cue, Cue::FrightStart | Cue::FrightEnd | Cue::LevelStart),
                "{cue:?} disagrees with MUSIC_CUES"
            );
        }
    }

    #[test]
    fn tunes_resolve_with_sane_notes() {
        for id in 0..=4 {
            let tune = tune_for_id(id).expect("tune exists");
            assert!(!tune.notes.is_empty());
            for note in tune.notes {
                assert!((21..=108).contains(&note.midi), "midi range");
                assert!(note.beats > 0.0, "positive beats");
            }
        }
        assert!(tune_for_id(5).is_none());
        assert!(tune_for_id(TUNE_TITLE).unwrap().looped);
        assert!(!tune_for_id(TUNE_DEATH).unwrap().looped);
    }

    #[test]
    fn warden_chain_selects_pitch_arm() {
        // Chain arm is engine domain 0..=3; out-of-range clamps, never wraps.
        let low = sfx_for_code(CUE_WARDEN_EATEN, 0).expect("sfx");
        let high = sfx_for_code(CUE_WARDEN_EATEN, 3).expect("sfx");
        assert_eq!(low.from_hz, 400.0);
        assert_eq!(high.from_hz, 3200.0);
        assert!(high.from_hz > low.from_hz, "chain raises pitch");
        assert_eq!(sfx_for_code(CUE_WARDEN_EATEN, 9).unwrap().from_hz, 3200.0);
        assert!(sfx_for_code(CUE_DEATH, 1).is_none(), "stings use tunes");
        assert!(sfx_for_code(0, 1).is_none());
        assert!(sfx_for_code(99, 1).is_none());
    }
}
