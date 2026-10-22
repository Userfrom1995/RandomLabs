//! Terminal audio: engine cues become an opt-in terminal bell.
//!
//! Terminals have no sample playback, so this sink implements the same
//! [`Audio`](maze_chase_audio::sink::Audio) trait with honest terminal
//! means: an opt-in BEL (`\x07`) chime for sharp one-shot cues when the
//! effective SFX level is audible, plus full volume/mute honoring from
//! [`Settings`](maze_chase_config::settings::Settings). The BEL chime is
//! **default OFF** (`terminal_chime`), because an unexpected terminal bell
//! is the classic annoying default. Visual flashes are rendered by the
//! playing surface from game state, so the sink does not queue them and
//! they keep working when muted. Music slots are tracked (title vs fright)
//! and reported so the HUD can show the current tune; nothing pretends to
//! play samples.

use maze_chase_audio::cue::Cue;
use maze_chase_audio::sink::{Audio, TuneId};

/// Cues sharp enough to earn a BEL at full SFX level.
fn bell_for(cue: Cue) -> bool {
    matches!(
        cue,
        Cue::Death
            | Cue::ExtraLife
            | Cue::LevelClear
            | Cue::GameOver
            | Cue::RelishEaten
            | Cue::WardenEaten { .. }
    )
}

/// Retained cue history cap: `heard` is a test/HUD seam, not a session
/// log, so long sessions must not grow it without bound.
pub const MAX_HEARD: usize = 512;

/// Terminal [`Audio`] sink: BELs, volumes honored.
#[derive(Clone, Debug)]
pub struct Chime {
    master: f32,
    music: f32,
    sfx: f32,
    muted: bool,
    chime: bool,
    tune: TuneId,
    /// BEL bytes waiting for the main loop to write.
    bells: usize,
    /// Cues consumed (for tests and the HUD tune line).
    heard: Vec<Cue>,
}

impl Chime {
    pub fn new() -> Self {
        Self {
            master: 1.0,
            music: 1.0,
            sfx: 1.0,
            muted: false,
            chime: false,
            tune: TuneId::None,
            bells: 0,
            heard: Vec::new(),
        }
    }

    fn bells_audible(&self) -> bool {
        self.chime && !self.muted && self.master > 0.0 && self.sfx > 0.0
    }

    /// Enable or disable the opt-in BEL chime (visual twins always fire).
    pub fn set_chime(&mut self, on: bool) {
        self.chime = on;
    }

    /// Whether the BEL chime is enabled.
    pub fn chime(&self) -> bool {
        self.chime
    }

    /// Drain pending BEL bytes (`\x07` per bell, capped per drain).
    pub fn take_bells(&mut self) -> String {
        let n = self.bells.min(4);
        self.bells = 0;
        "\x07".repeat(n)
    }

    /// Currently selected music slot.
    pub fn tune(&self) -> TuneId {
        self.tune
    }

    /// Cues consumed so far (test seam).
    pub fn heard(&self) -> &[Cue] {
        &self.heard
    }

    fn clamp01(v: f32) -> f32 {
        if v.is_nan() {
            0.0
        } else {
            v.clamp(0.0, 1.0)
        }
    }
}

impl Default for Chime {
    fn default() -> Self {
        Self::new()
    }
}

impl Audio for Chime {
    fn play(&mut self, cue: Cue) {
        self.heard.push(cue);
        if self.heard.len() > MAX_HEARD {
            let excess = self.heard.len() - MAX_HEARD;
            self.heard.drain(..excess);
        }
        if self.bells_audible() && bell_for(cue) {
            self.bells += 1;
        }
    }

    fn start_music(&mut self, id: TuneId) {
        self.tune = id;
    }

    fn stop_music(&mut self) {
        self.tune = TuneId::None;
    }

    fn set_master(&mut self, v: f32) {
        self.master = Self::clamp01(v);
    }

    fn set_music(&mut self, v: f32) {
        self.music = Self::clamp01(v);
    }

    fn set_sfx(&mut self, v: f32) {
        self.sfx = Self::clamp01(v);
    }

    fn set_muted(&mut self, m: bool) {
        self.muted = m;
    }

    fn master(&self) -> f32 {
        self.master
    }

    fn music(&self) -> f32 {
        self.music
    }

    fn sfx(&self) -> f32 {
        self.sfx
    }

    fn muted(&self) -> bool {
        self.muted
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sharp_cues_ring() {
        let mut c = Chime::new();
        c.set_chime(true);
        c.play(Cue::Death);
        assert_eq!(c.take_bells(), "\x07");
        // Crumb ticks are silent by design (they would buzz constantly).
        c.play(Cue::Crumb);
        assert_eq!(c.take_bells(), "");
        assert_eq!(c.heard(), &[Cue::Death, Cue::Crumb]);
    }

    #[test]
    fn mute_and_zero_levels_silence_everything() {
        let mut c = Chime::new();
        c.set_chime(true);
        c.set_muted(true);
        c.play(Cue::Death);
        assert_eq!(c.take_bells(), "");
        // Still heard (HUD can show), just not sounded.
        assert_eq!(c.heard().len(), 1);
        c.set_muted(false);
        c.set_sfx(0.0);
        c.play(Cue::Death);
        assert_eq!(c.take_bells(), "");
        c.set_sfx(0.8);
        c.play(Cue::ExtraLife);
        assert_eq!(c.take_bells(), "\x07");
    }

    #[test]
    fn bells_cap_per_drain() {
        let mut c = Chime::new();
        c.set_chime(true);
        for _ in 0..10 {
            c.play(Cue::Death);
        }
        assert_eq!(c.take_bells(), "\x07\x07\x07\x07");
        assert_eq!(c.take_bells(), "");
    }

    #[test]
    fn heard_history_is_capped() {
        let mut c = Chime::new();
        for _ in 0..(MAX_HEARD + 100) {
            c.play(Cue::Crumb);
        }
        assert_eq!(c.heard().len(), MAX_HEARD);
    }

    #[test]
    fn chime_defaults_off() {
        let mut c = Chime::new();
        assert!(!c.chime());
        c.play(Cue::Death);
        assert_eq!(c.take_bells(), "", "BEL is opt-in");
        c.set_chime(true);
        c.play(Cue::Death);
        assert_eq!(c.take_bells(), "\x07");
    }

    #[test]
    fn music_slot_tracks_title_and_fright() {
        let mut c = Chime::new();
        assert_eq!(c.tune(), TuneId::None);
        c.start_music(TuneId::Title);
        assert_eq!(c.tune(), TuneId::Title);
        c.start_music(TuneId::Fright);
        assert_eq!(c.tune(), TuneId::Fright);
        c.stop_music();
        assert_eq!(c.tune(), TuneId::None);
    }
}
