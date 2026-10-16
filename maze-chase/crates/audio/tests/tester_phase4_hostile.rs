//! Tester Phase 4 hostile regression suite for `maze-chase-audio`.
//!
//! Red-team focus: the engine-event parser never panics on hostile
//! strings, the SFX/music partition covers every known cue exactly once,
//! score data stays in valid ranges, and sinks clamp hostile volumes.

use maze_chase_audio::cue::{cue_for_event, Cue};
use maze_chase_audio::score::{sfx_for_cue, ALL_CUES, ALL_TUNES, MUSIC_CUES};
use maze_chase_audio::sink::{tune_for_id, Audio, Event, NullSink, RecordSink, TuneId};

#[test]
fn hostile_event_strings_never_panic_and_stay_sane() {
    let hostile = [
        "",
        " ",
        "\n",
        "\t",
        "fright:",
        "fright:abc",
        "fright:NaN",
        "fright:inf",
        "fright:1e999",
        "fright:6.0 ",
        " fright:6.0",
        "FRIGHT:6.0",
        "warden:",
        "warden:abc",
        "warden:-1",
        "warden:-200",
        "warden:99999999999999999999",
        "warden:0",
        "warden:4294967295",
        "warden:4294967296",
        "warden:200 ",
        "WARDEN:200",
        "relish:",
        "relish:abc",
        "relish:-5",
        "relish:spawn:",
        "relish:spawn:abc",
        "relish:spawn:-1",
        "relish:spawn:4294967296",
        "relish:gone ",
        "relish:gone:x",
        "level:",
        "level:abc",
        "level:-2",
        "level:4294967296",
        "level:0",
        "sprint-bonus:",
        "sprint-bonus:abc",
        "sprint-bonus:-1",
        "warden-back:",
        "warden-back",
        "wave:scatter",
        "wave:chase",
        "wave:fright",
        "house-release:",
        "house-release:Bram",
        "house-out:Cyril",
        "dot ",
        " DOT",
        "dotdot",
        "death ",
        "game-over:1",
        "level-clear:2",
        "extra-life:1",
        "time-up:0",
        "refill:1",
        "respawn:now",
        "::",
        ":",
        "fright::6.0",
        "warden::200",
        "\u{1f47e}warden:200",
        "warden:2\u{00b2}00",
        "relish:\u{0661}\u{0660}\u{0660}",
    ];
    for event in hostile {
        // Must not panic; whatever comes back must be a valid Cue.
        let _ = cue_for_event(event);
    }
    // Pin the sane outcomes for the most security-relevant cases:
    // overflows and negatives must not fabricate cues.
    for event in [
        "warden:99999999999999999999",
        "warden:-1",
        "warden:abc",
        "level:4294967296",
        "level:-2",
        "relish:spawn:4294967296",
        "sprint-bonus:-1",
        "warden-back:",
        "",
    ] {
        assert_eq!(cue_for_event(event), None, "event {event:?}");
    }
    // Prefix-ordering traps: exact words win over prefix parses.
    assert_eq!(cue_for_event("relish:gone"), Some(Cue::RelishGone));
    assert_eq!(cue_for_event("fright-end"), Some(Cue::FrightEnd));
    // Chain clamping: below-min pins to 0, above-max pins to 3.
    assert_eq!(
        cue_for_event("warden:0"),
        Some(Cue::WardenEaten { chain: 0 })
    );
    assert_eq!(
        cue_for_event("warden:4294967295"),
        Some(Cue::WardenEaten { chain: 3 })
    );
}

#[test]
fn sfx_music_partition_covers_every_cue_exactly_once() {
    // ALL_CUES must enumerate every Cue variant the crate knows.
    assert_eq!(ALL_CUES.len(), 25);
    for cue in ALL_CUES {
        let is_music = MUSIC_CUES.contains(cue);
        let sfx = sfx_for_cue(*cue);
        assert_eq!(
            is_music,
            sfx.is_none(),
            "cue {cue:?}: music membership and sfx must be exclusive"
        );
        if let Some(s) = sfx {
            assert!(s.ms > 0, "cue {cue:?}: SFX must have positive length");
            assert!(
                s.from_hz.is_finite() && s.from_hz > 0.0,
                "cue {cue:?}: bad from_hz"
            );
            assert!(
                s.to_hz.is_finite() && s.to_hz > 0.0,
                "cue {cue:?}: bad to_hz"
            );
        }
    }
    // Music cues resolve into real shipped tunes, not silence.
    assert_eq!(MUSIC_CUES.len(), 6);
    assert_eq!(ALL_TUNES.len(), 5);
    for tune in ALL_TUNES {
        assert!(!tune.name.is_empty());
        assert!(!tune.notes.is_empty());
        for note in tune.notes {
            assert!(
                (21..=108).contains(&note.midi),
                "tune {}: midi {} out of piano range",
                tune.name,
                note.midi
            );
            assert!(
                note.beats.is_finite() && note.beats > 0.0,
                "tune {}: bad beat length",
                tune.name
            );
        }
    }
}

#[test]
fn sinks_clamp_hostile_volumes_and_keep_event_order() {
    for hostile in [
        f32::NAN,
        f32::INFINITY,
        f32::NEG_INFINITY,
        -1e30,
        1e30,
        -0.5,
        1.5,
    ] {
        let mut null = NullSink::new();
        null.set_master(hostile);
        null.set_music(hostile);
        null.set_sfx(hostile);
        assert!(
            (0.0..=1.0).contains(&null.master()),
            "master not clamped for {hostile}"
        );
        assert!((0.0..=1.0).contains(&null.music()));
        assert!((0.0..=1.0).contains(&null.sfx()));

        let mut rec = RecordSink::new();
        rec.set_master(hostile);
        rec.set_music(hostile);
        rec.set_sfx(hostile);
        assert!((0.0..=1.0).contains(&rec.master()));
        // Volume/mute traffic must never pollute the event log.
        rec.set_muted(true);
        rec.set_muted(false);
        assert!(rec.log().is_empty());
    }
}

#[test]
fn record_sink_survives_event_storm_in_order() {
    let mut rec = RecordSink::new();
    let mut want = Vec::new();
    for i in 0..10_000 {
        let cue = Cue::WardenEaten {
            chain: (i % 4) as u8,
        };
        rec.play(cue);
        want.push(Event::Play(cue));
    }
    rec.start_music(TuneId::Fright);
    want.push(Event::Music(TuneId::Fright));
    rec.stop_music();
    want.push(Event::Stop);
    assert_eq!(rec.log(), want.as_slice());
    let drained = rec.take_log();
    assert_eq!(drained.len(), 10_002);
    assert!(rec.log().is_empty());
    // Draining twice is safe.
    assert!(rec.take_log().is_empty());
}

#[test]
fn engine_event_stream_drives_sink_end_to_end() {
    // A scripted gameplay beat: every event routes to a cue, every cue
    // lands in the sink as either a one-shot or a music change.
    let stream = [
        "level:1",
        "dot",
        "dot",
        "sunseed",
        "fright:6.0",
        "warden:200",
        "warden:400",
        "fright-end",
        "relish:spawn:100",
        "relish:300",
        "relish:gone",
        "death",
        "respawn",
        "extra-life",
        "level-clear",
        "refill",
        "sprint-bonus:2990",
        "time-up",
        "game-over",
        "warden-back:Bram",
        "wave:chase",
        "house-release:Bram",
    ];
    let mut rec = RecordSink::new();
    let mut routed = 0;
    let mut silent = 0;
    for event in stream {
        match cue_for_event(event) {
            Some(cue) => {
                routed += 1;
                if MUSIC_CUES.contains(&cue) {
                    rec.start_music(TuneId::Title);
                } else {
                    rec.play(cue);
                }
            }
            None => silent += 1,
        }
    }
    // Only the two ghost-ambience events are silent by design.
    assert_eq!(silent, 2);
    assert_eq!(routed, stream.len() - 2);
    assert_eq!(rec.log().len(), routed);
}

#[test]
fn tune_ids_resolve_consistently() {
    assert!(tune_for_id(TuneId::Title).unwrap().looped);
    assert!(tune_for_id(TuneId::Fright).unwrap().looped);
    assert_eq!(tune_for_id(TuneId::None), None);
    // Loops are distinct tunes.
    assert_ne!(
        tune_for_id(TuneId::Title).unwrap().name,
        tune_for_id(TuneId::Fright).unwrap().name
    );
}
