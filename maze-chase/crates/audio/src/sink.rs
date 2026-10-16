//! Backend-agnostic audio sinks.
//!
//! [`Audio`] is the only trait a playback backend must implement. Tunes
//! are referenced by [`TuneId`] (not `&'static Tune`) so the trait stays
//! simple for FFI/dynamic backends; map ids to [`crate::score`] tunes with
//! [`tune_for_id`].

use crate::cue::Cue;
use crate::score::{FRIGHT_LOOP, TITLE_LOOP, Tune};

/// Looping music slot. `None` means silence.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum TuneId {
    Title,
    Fright,
    None,
}

/// Resolve a [`TuneId`] to its [`Tune`] data (`None` -> `None`).
pub fn tune_for_id(id: TuneId) -> Option<Tune> {
    match id {
        TuneId::Title => Some(TITLE_LOOP),
        TuneId::Fright => Some(FRIGHT_LOOP),
        TuneId::None => None,
    }
}

/// Recorded sink event.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Event {
    Play(Cue),
    Music(TuneId),
    Stop,
}

/// Playback backend: one-shot cues plus one looping music slot.
pub trait Audio {
    fn play(&mut self, cue: Cue);
    fn start_music(&mut self, id: TuneId);
    fn stop_music(&mut self);
    fn set_master(&mut self, v: f32);
    fn set_music(&mut self, v: f32);
    fn set_sfx(&mut self, v: f32);
    fn set_muted(&mut self, m: bool);
    fn master(&self) -> f32;
    fn music(&self) -> f32;
    fn sfx(&self) -> f32;
    fn muted(&self) -> bool;
}

fn clamp01(v: f32) -> f32 {
    if v.is_nan() {
        0.0
    } else {
        v.clamp(0.0, 1.0)
    }
}

/// Shared volume/mute block behind both bundled sinks.
#[derive(Clone, Copy, PartialEq, Debug)]
struct Levels {
    master: f32,
    music: f32,
    sfx: f32,
    muted: bool,
}

impl Default for Levels {
    fn default() -> Self {
        Self {
            master: 1.0,
            music: 1.0,
            sfx: 1.0,
            muted: false,
        }
    }
}

impl Levels {
    fn set_master(&mut self, v: f32) {
        self.master = clamp01(v);
    }
    fn set_music(&mut self, v: f32) {
        self.music = clamp01(v);
    }
    fn set_sfx(&mut self, v: f32) {
        self.sfx = clamp01(v);
    }
}

/// No-op sink: accepts everything, plays nothing. Never panics.
#[derive(Clone, Debug, Default)]
pub struct NullSink {
    levels: Levels,
}

impl NullSink {
    pub fn new() -> Self {
        Self::default()
    }
}

impl Audio for NullSink {
    fn play(&mut self, _cue: Cue) {}
    fn start_music(&mut self, _id: TuneId) {}
    fn stop_music(&mut self) {}
    fn set_master(&mut self, v: f32) {
        self.levels.set_master(v);
    }
    fn set_music(&mut self, v: f32) {
        self.levels.set_music(v);
    }
    fn set_sfx(&mut self, v: f32) {
        self.levels.set_sfx(v);
    }
    fn set_muted(&mut self, m: bool) {
        self.levels.muted = m;
    }
    fn master(&self) -> f32 {
        self.levels.master
    }
    fn music(&self) -> f32 {
        self.levels.music
    }
    fn sfx(&self) -> f32 {
        self.levels.sfx
    }
    fn muted(&self) -> bool {
        self.levels.muted
    }
}

/// Recording sink for tests and replays: stores every [`Event`].
#[derive(Clone, Debug, Default)]
pub struct RecordSink {
    levels: Levels,
    log: Vec<Event>,
}

impl RecordSink {
    pub fn new() -> Self {
        Self::default()
    }
    /// All recorded events in order.
    pub fn log(&self) -> &[Event] {
        &self.log
    }
    /// Drain the recorded events.
    pub fn take_log(&mut self) -> Vec<Event> {
        core::mem::take(&mut self.log)
    }
}

impl Audio for RecordSink {
    fn play(&mut self, cue: Cue) {
        self.log.push(Event::Play(cue));
    }
    fn start_music(&mut self, id: TuneId) {
        self.log.push(Event::Music(id));
    }
    fn stop_music(&mut self) {
        self.log.push(Event::Stop);
    }
    fn set_master(&mut self, v: f32) {
        self.levels.set_master(v);
    }
    fn set_music(&mut self, v: f32) {
        self.levels.set_music(v);
    }
    fn set_sfx(&mut self, v: f32) {
        self.levels.set_sfx(v);
    }
    fn set_muted(&mut self, m: bool) {
        self.levels.muted = m;
    }
    fn master(&self) -> f32 {
        self.levels.master
    }
    fn music(&self) -> f32 {
        self.levels.music
    }
    fn sfx(&self) -> f32 {
        self.levels.sfx
    }
    fn muted(&self) -> bool {
        self.levels.muted
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn volumes_clamp_to_unit_range() {
        let mut sink = NullSink::new();
        sink.set_master(2.0);
        assert_eq!(sink.master(), 1.0);
        sink.set_master(-1.0);
        assert_eq!(sink.master(), 0.0);
        sink.set_music(2.0);
        assert_eq!(sink.music(), 1.0);
        sink.set_music(-1.0);
        assert_eq!(sink.music(), 0.0);
        sink.set_sfx(2.0);
        assert_eq!(sink.sfx(), 1.0);
        sink.set_sfx(-1.0);
        assert_eq!(sink.sfx(), 0.0);

        let mut rec = RecordSink::new();
        rec.set_master(2.0);
        assert_eq!(rec.master(), 1.0);
        rec.set_master(-1.0);
        assert_eq!(rec.master(), 0.0);
        // Volume changes are not events.
        assert!(rec.log().is_empty());
    }

    #[test]
    fn mute_flag_round_trips() {
        let mut sink = NullSink::new();
        assert!(!sink.muted());
        sink.set_muted(true);
        assert!(sink.muted());
        sink.set_muted(false);
        assert!(!sink.muted());

        let mut rec = RecordSink::new();
        rec.set_muted(true);
        assert!(rec.muted());
        assert!(rec.log().is_empty());
    }

    #[test]
    fn record_sink_preserves_ordering() {
        let mut rec = RecordSink::new();
        rec.play(Cue::Crumb);
        rec.start_music(TuneId::Title);
        rec.play(Cue::WardenEaten { chain: 2 });
        rec.stop_music();
        rec.start_music(TuneId::Fright);
        assert_eq!(
            rec.log(),
            &[
                Event::Play(Cue::Crumb),
                Event::Music(TuneId::Title),
                Event::Play(Cue::WardenEaten { chain: 2 }),
                Event::Stop,
                Event::Music(TuneId::Fright),
            ]
        );
        let drained = rec.take_log();
        assert_eq!(drained.len(), 5);
        assert!(rec.log().is_empty());
    }

    #[test]
    fn null_sink_never_panics_on_1000_plays() {
        let mut sink = NullSink::new();
        for i in 0..1000 {
            sink.play(Cue::WardenEaten {
                chain: (i % 4) as u8,
            });
            sink.start_music(TuneId::Title);
            sink.stop_music();
        }
    }

    #[test]
    fn tune_for_id_resolves_loops() {
        assert_eq!(tune_for_id(TuneId::Title).unwrap().looped, true);
        assert_eq!(tune_for_id(TuneId::Fright).unwrap().looped, true);
        assert_eq!(tune_for_id(TuneId::None), None);
    }
}
