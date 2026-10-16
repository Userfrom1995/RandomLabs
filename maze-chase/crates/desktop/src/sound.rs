//! Desktop audio: a rodio playback backend over the shared audio data.
//!
//! [`render_sfx`] turns any [`Sfx`] recipe into PCM and [`render_tune`]
//! turns any [`Tune`] into PCM at [`TUNE_BPM`]; both are pure and
//! deterministic (same data, same samples, every platform). [`RodioSink`]
//! implements the shared [`Audio`] trait on top of rodio: one-shot cues
//! go to a polyphonic SFX sink, loops/stings go to the music sink, and a
//! missing audio device is a clean [`NoAudio`] error so the session can
//! fall back to [`NullSink`] instead of crashing.
//!
//! [`Audio`]: maze_chase_audio::sink::Audio
//! [`NullSink`]: maze_chase_audio::sink::NullSink

use maze_chase_audio::cue::Cue;
use maze_chase_audio::score::{sfx_for_cue, Sfx, Tune, Wave, ALL_TUNES};
use maze_chase_audio::sink::{tune_for_id, Audio, NullSink, TuneId};
use rodio::buffer::SamplesBuffer;
use rodio::{OutputStream, OutputStreamHandle, Sink, Source};

/// Playback sample rate (CD-adjacent, cheap to synthesize).
pub const RATE: u32 = 44_100;
/// Presentation tempo for tunes (beats per minute). Tune data carries
/// beats only; the layer chooses the tempo, and every layer choice is
/// documented here for the parity matrix.
pub const TUNE_BPM: f32 = 132.0;
/// SFX peak amplitude (headroom for polyphonic overlap).
pub const SFX_PEAK: f32 = 0.5;
/// Music peak amplitude (loops sit under the effects).
pub const MUSIC_PEAK: f32 = 0.32;

/// MIDI key to Hz (A4 = 440).
pub fn midi_hz(m: u8) -> f32 {
    440.0 * 2.0f32.powf((m as f32 - 69.0) / 12.0)
}

fn osc(wave: Wave, phase: f32) -> f32 {
    match wave {
        Wave::Sine => (phase * std::f32::consts::TAU).sin(),
        Wave::Square => {
            if (phase % 1.0) < 0.5 {
                1.0
            } else {
                -1.0
            }
        }
        Wave::Triangle => 4.0 * (phase % 1.0 - 0.5).abs() - 1.0,
        Wave::Noise => {
            // Deterministic hash noise (phase-derived, no RNG state).
            let bits = (phase * 12_989.0).sin() * 43_758.0;
            (bits - bits.floor()) * 2.0 - 1.0
        }
    }
}

/// Render one [`Sfx`] recipe to mono PCM: a linear frequency sweep with
/// an exponential decay envelope (click-free: starts and ends at zero).
pub fn render_sfx(sfx: Sfx) -> Vec<f32> {
    let n = ((sfx.ms as f32 / 1000.0) * RATE as f32).round().max(1.0) as usize;
    let mut out = Vec::with_capacity(n);
    let mut phase = 0.0f32;
    for i in 0..n {
        let t = i as f32 / n as f32;
        let hz = sfx.from_hz + (sfx.to_hz - sfx.from_hz) * t;
        phase += hz / RATE as f32;
        let env = (-4.0 * t).exp() * (1.0 - t).max(0.0);
        out.push((osc(sfx.wave, phase) * env * SFX_PEAK).clamp(-1.0, 1.0));
    }
    // Hard zero at both ends (no click on append).
    if let Some(first) = out.first_mut() {
        *first = 0.0;
    }
    if let Some(last) = out.last_mut() {
        *last = 0.0;
    }
    out
}

/// Render a [`Tune`] to mono PCM: sine plus a soft second harmonic per
/// note, 10 ms edge fades, and a 20 ms loop-seam fade so
/// `repeat_infinite` restarts without a click.
pub fn render_tune(tune: Tune) -> Vec<f32> {
    let beat_sec = 60.0 / TUNE_BPM;
    let mut out = Vec::new();
    for note in tune.notes {
        let secs = note.beats * beat_sec;
        let n = (secs * RATE as f32).round().max(1.0) as usize;
        let hz = midi_hz(note.midi);
        let fade = ((0.01 * RATE as f32) as usize).max(1).min(n / 2);
        for i in 0..n {
            let phase = i as f32 * hz / RATE as f32;
            let attack = (i as f32 / fade as f32).min(1.0);
            let release = ((n - i) as f32 / fade as f32).min(1.0);
            let v = phase * std::f32::consts::TAU;
            let sample = v.sin() * 0.8 + (2.0 * v).sin() * 0.2;
            out.push((sample * attack * release * MUSIC_PEAK).clamp(-1.0, 1.0));
        }
    }
    // Loop-seam fade for `looped` tunes (one-shots keep full tails).
    if tune.looped && !out.is_empty() {
        let seam = ((0.02 * RATE as f32) as usize).max(1).min(out.len() / 2);
        for (i, s) in out.iter_mut().take(seam).enumerate() {
            *s *= i as f32 / seam as f32;
        }
        for (i, s) in out.iter_mut().rev().take(seam).enumerate() {
            *s *= i as f32 / seam as f32;
        }
    }
    out
}

/// Sting tune for a music cue, if the cue carries a one-shot tune
/// rather than a loop slot (Death, LevelClear, GameOver).
fn sting_for_cue(cue: Cue) -> Option<Tune> {
    let name = match cue {
        Cue::Death => "death",
        Cue::LevelClear => "clear",
        Cue::GameOver => "gameover",
        _ => return None,
    };
    ALL_TUNES.iter().copied().find(|t| t.name == name)
}

/// No audio device (or backend) available: the session falls back to
/// [`NullSink`].
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub struct NoAudio;

/// rodio playback backend implementing the shared [`Audio`] trait.
pub struct RodioSink {
    _stream: OutputStream,
    handle: OutputStreamHandle,
    sfx: Sink,
    music: Sink,
    master: f32,
    music_level: f32,
    sfx_level: f32,
    muted: bool,
    tune: TuneId,
}

impl RodioSink {
    /// Open the default output device with two sinks (SFX + music).
    /// `Err(NoAudio)` on headless/voiceless machines: never panics.
    pub fn open() -> Result<Self, NoAudio> {
        let (stream, handle) = OutputStream::try_default().map_err(|_| NoAudio)?;
        let sfx = Sink::try_new(&handle).map_err(|_| NoAudio)?;
        let music = Sink::try_new(&handle).map_err(|_| NoAudio)?;
        let mut sink = Self {
            _stream: stream,
            handle,
            sfx,
            music,
            master: 1.0,
            music_level: 1.0,
            sfx_level: 1.0,
            muted: false,
            tune: TuneId::None,
        };
        sink.apply_levels();
        Ok(sink)
    }

    /// Currently selected music slot.
    pub fn tune(&self) -> TuneId {
        self.tune
    }

    fn apply_levels(&mut self) {
        let base = if self.muted { 0.0 } else { self.master };
        self.sfx.set_volume(base * self.sfx_level);
        self.music.set_volume(base * self.music_level);
    }

    fn push_sfx(&self, samples: Vec<f32>) {
        if samples.is_empty() {
            return;
        }
        let src = SamplesBuffer::new(1, RATE, samples);
        self.sfx.append(src);
        self.sfx.play();
    }
}

fn clamp01(v: f32) -> f32 {
    if v.is_nan() {
        0.0
    } else {
        v.clamp(0.0, 1.0)
    }
}

impl Audio for RodioSink {
    fn play(&mut self, cue: Cue) {
        if let Some(sfx) = sfx_for_cue(cue) {
            self.push_sfx(render_sfx(sfx));
        } else if let Some(sting) = sting_for_cue(cue) {
            // One-shot tunes (death/clear/gameover) play over the loop.
            self.push_sfx(render_tune(sting));
        }
    }

    fn start_music(&mut self, id: TuneId) {
        self.tune = id;
        self.music.stop();
        if let Some(tune) = tune_for_id(id) {
            let samples = render_tune(tune);
            if !samples.is_empty() {
                let handle = &self.handle;
                match Sink::try_new(handle) {
                    Ok(fresh) => {
                        self.music = fresh;
                        self.apply_levels();
                        let src = SamplesBuffer::new(1, RATE, samples).repeat_infinite();
                        self.music.append(src);
                        self.music.play();
                    }
                    Err(_) => self.tune = TuneId::None,
                }
            }
        }
    }

    fn stop_music(&mut self) {
        self.tune = TuneId::None;
        self.music.stop();
    }

    fn set_master(&mut self, v: f32) {
        self.master = clamp01(v);
        self.apply_levels();
    }
    fn set_music(&mut self, v: f32) {
        self.music_level = clamp01(v);
        self.apply_levels();
    }
    fn set_sfx(&mut self, v: f32) {
        self.sfx_level = clamp01(v);
        self.apply_levels();
    }
    fn set_muted(&mut self, m: bool) {
        self.muted = m;
        self.apply_levels();
    }
    fn master(&self) -> f32 {
        self.master
    }
    fn music(&self) -> f32 {
        self.music_level
    }
    fn sfx(&self) -> f32 {
        self.sfx_level
    }
    fn muted(&self) -> bool {
        self.muted
    }
}

/// Open real audio, falling back to [`NullSink`] on voiceless machines.
/// Lets the session own one `Box<dyn Audio>` either way.
pub fn open_or_null() -> (Box<dyn Audio>, bool) {
    match RodioSink::open() {
        Ok(sink) => (Box::new(sink), true),
        Err(_) => (Box::new(NullSink::new()), false),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use maze_chase_audio::score::{SFX_CRUMB, SFX_EXTRA_LIFE, TITLE_LOOP};

    #[test]
    fn midi_a4_is_440_and_octaves_double() {
        assert!((midi_hz(69) - 440.0).abs() < 0.01);
        assert!((midi_hz(81) - 880.0).abs() < 0.01);
        assert!((midi_hz(57) - 220.0).abs() < 0.01);
    }

    #[test]
    fn sfx_render_matches_recipe_length_and_stays_in_range() {
        for sfx in [SFX_CRUMB, SFX_EXTRA_LIFE] {
            let pcm = render_sfx(sfx);
            let expect = ((sfx.ms as f32 / 1000.0) * RATE as f32).round() as usize;
            assert_eq!(pcm.len(), expect);
            assert!(pcm.iter().all(|&s| (-1.0..=1.0).contains(&s)));
            assert_eq!(pcm[0], 0.0);
            assert_eq!(pcm[pcm.len() - 1], 0.0);
            // Audible body: peak well above silence.
            let peak: f32 = pcm.iter().map(|s| s.abs()).fold(0.0, f32::max);
            assert!(peak > 0.1, "SFX renders near-silent");
        }
    }

    #[test]
    fn sfx_render_is_deterministic_per_recipe() {
        assert_eq!(render_sfx(SFX_CRUMB), render_sfx(SFX_CRUMB));
        assert_ne!(render_sfx(SFX_CRUMB), render_sfx(SFX_EXTRA_LIFE));
    }

    #[test]
    fn tune_render_matches_note_lengths_and_loops_cleanly() {
        let pcm = render_tune(TITLE_LOOP);
        let beats: f32 = TITLE_LOOP.notes.iter().map(|n| n.beats).sum();
        let expect = (beats * (60.0 / TUNE_BPM) * RATE as f32).round() as usize;
        assert!((pcm.len() as i64 - expect as i64).abs() <= TITLE_LOOP.notes.len() as i64);
        assert!(pcm.iter().all(|&s| (-1.0..=1.0).contains(&s)));
        // Seam fade: loop restart starts at zero.
        assert_eq!(pcm[0], 0.0);
        let peak: f32 = pcm.iter().map(|s| s.abs()).fold(0.0, f32::max);
        assert!(peak > 0.1);
    }

    #[test]
    fn sting_mapping_covers_music_cues() {
        assert!(sting_for_cue(Cue::Death).is_some());
        assert!(sting_for_cue(Cue::LevelClear).is_some());
        assert!(sting_for_cue(Cue::GameOver).is_some());
        assert!(sting_for_cue(Cue::Crumb).is_none());
        assert!(sting_for_cue(Cue::FrightStart).is_none());
    }

    #[test]
    fn open_or_null_never_panics_and_honors_volumes() {
        // On CI (no device) this exercises the Null fallback; on desks
        // it exercises the rodio backend. Either way the contract holds.
        let (mut audio, live) = open_or_null();
        audio.set_master(2.0);
        assert_eq!(audio.master(), 1.0);
        audio.set_master(-1.0);
        assert_eq!(audio.master(), 0.0);
        audio.set_muted(true);
        assert!(audio.muted());
        audio.play(Cue::Crumb);
        audio.play(Cue::Death);
        audio.start_music(TuneId::Title);
        audio.start_music(TuneId::None);
        audio.stop_music();
        // Report liveness for the log without failing either state.
        println!("desktop audio live: {live}");
    }
}
