//! Terminal audio: engine cues become terminal bells and HUD flashes.
//!
//! Terminals have no sample playback, so this sink implements the same
//! [`Audio`](maze_chase_audio::sink::Audio) trait with honest terminal
//! means: a BEL (`\x07`) for sharp one-shot cues when the effective SFX
//! level is audible, a recorded flash request for fright/death beats that
//! the app renders as a status-line highlight, and full volume/mute
//! honoring from [`Settings`](maze_chase_config::settings::Settings).
//! Music slots are tracked (title vs fright) and reported so the HUD can
//! show the current tune; nothing pretends to play samples.

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

/// Cues that request a visual flash on the status line.
fn flash_for(cue: Cue) -> bool {
    matches!(
        cue,
        Cue::Death | Cue::FrightStart | Cue::LevelClear | Cue::GameOver | Cue::ExtraLife
    )
}

/// Terminal [`Audio`] sink: BELs plus flash requests, volumes honored.
#[derive(Clone, Debug)]
pub struct Chime {
    master: f32,
    music: f32,
    sfx: f32,
    muted: bool,
    tune: TuneId,
    /// BEL bytes waiting for the main loop to write.
    bells: usize,
    /// Flash requests waiting for the app to render (newest last).
    flashes: Vec<Cue>,
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
            tune: TuneId::None,
            bells: 0,
            flashes: Vec::new(),
            heard: Vec::new(),
        }
    }

    fn audible(&self) -> bool {
        !self.muted && self.master > 0.0 && self.sfx > 0.0
    }

    /// Drain pending BEL bytes (`\x07` per bell, capped per drain).
    pub fn take_bells(&mut self) -> String {
        let n = self.bells.min(4);
        self.bells = 0;
        "\x07".repeat(n)
    }

    /// Drain pending flash requests.
    pub fn take_flashes(&mut self) -> Vec<Cue> {
        core::mem::take(&mut self.flashes)
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
        if !self.audible() {
            return;
        }
        if bell_for(cue) {
            self.bells += 1;
        }
        if flash_for(cue) {
            self.flashes.push(cue);
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
    fn sharp_cues_ring_and_flash() {
        let mut c = Chime::new();
        c.play(Cue::Death);
        assert_eq!(c.take_bells(), "\x07");
        assert_eq!(c.take_flashes(), vec![Cue::Death]);
        // Crumb ticks are silent by design (they would buzz constantly).
        c.play(Cue::Crumb);
        assert_eq!(c.take_bells(), "");
        assert!(c.take_flashes().is_empty());
        assert_eq!(c.heard(), &[Cue::Death, Cue::Crumb]);
    }

    #[test]
    fn mute_and_zero_levels_silence_everything() {
        let mut c = Chime::new();
        c.set_muted(true);
        c.play(Cue::Death);
        assert_eq!(c.take_bells(), "");
        assert!(c.take_flashes().is_empty());
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
        for _ in 0..10 {
            c.play(Cue::Death);
        }
        assert_eq!(c.take_bells(), "\x07\x07\x07\x07");
        assert_eq!(c.take_bells(), "");
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
