//! Desktop audio: a rodio playback backend over the shared audio data.
//!
//! [`render_sfx`] turns any layered [`Sfx`] recipe into PCM and
//! [`render_tune`] renders a multi-track [`Tune`] with the shared voice
//! timbres at the one shared [`TEMPO`]; both are pure and deterministic
//! (same data, same samples, every platform). [`RodioSink`] implements the
//! shared [`Audio`] trait on top of rodio: one-shot cues go to a
//! polyphonic SFX sink, loops and stings go to the music bus (the latter
//! on their own sink so a transition can stop the loop without cutting
//! the sting), live volume changes glide over [`FADE_SECS`], and a missing
//! audio device is a clean
//! [`NoAudio`] error so the session can fall back to [`NullSink`] instead
//! of crashing.
//!
//! [`Audio`]: maze_chase_audio::sink::Audio
//! [`NullSink`]: maze_chase_audio::sink::NullSink

use maze_chase_audio::cue::Cue;
use maze_chase_audio::score::{
    presentation_beats, sfx_for_cue, tune_beats, Sfx, Tone, Tune, Voice, ALL_TUNES, TEMPO,
};
use maze_chase_audio::sink::{tune_for_id, Audio, NullSink, TuneId, FADE_SECS};
use rodio::buffer::SamplesBuffer;
use rodio::{OutputStream, OutputStreamHandle, Sink, Source};

/// Playback sample rate (CD-adjacent, cheap to synthesize).
pub const RATE: u32 = 44_100;
/// SFX peak amplitude (headroom for layered tones and overlap).
pub const SFX_PEAK: f32 = 0.5;
/// Music peak amplitude (loops sit under the effects).
pub const MUSIC_PEAK: f32 = 0.32;
/// Shortest edge fade that removes a click without dulling the attack.
const EDGE_SECS: f32 = 0.01;

/// MIDI key to Hz (A4 = 440).
pub fn midi_hz(m: u8) -> f32 {
    440.0 * 2.0f32.powf((m as f32 - 69.0) / 12.0)
}

fn voice_sample(voice: Voice, phase: f32) -> f32 {
    let v = phase * std::f32::consts::TAU;
    match voice {
        Voice::Mallet => v.sin() * 0.72 + (2.0 * v).sin() * 0.20 + (3.0 * v).sin() * 0.08,
        Voice::Drop => v.sin() * 0.90 + (2.0 * v).sin() * 0.10,
        Voice::Reed => v.sin() * 0.72 + (2.0 * v).sin() * 0.18 + (3.0 * v).sin() * 0.10,
        Voice::Drone => v.sin() * 0.50 + (0.5 * v).sin() * 0.28 + (1.5 * v).sin() * 0.22,
        Voice::Glass => v.sin() * 0.62 + (2.01 * v).sin() * 0.26 + (4.02 * v).sin() * 0.12,
        Voice::Bell => v.sin() * 0.60 + (2.76 * v).sin() * 0.24 + (5.40 * v).sin() * 0.16,
        Voice::Pluck => 4.0 * (phase.fract() - 0.5).abs() - 1.0,
    }
}

fn voice_decay(voice: Voice) -> f32 {
    match voice {
        Voice::Mallet | Voice::Pluck => 5.0,
        Voice::Drop => 7.0,
        Voice::Glass => 4.0,
        Voice::Reed => 2.2,
        Voice::Drone => 1.2,
        Voice::Bell => 2.6,
    }
}

fn attack_release(voice: Voice, seconds: f32) -> (f32, f32) {
    let (attack, release): (f32, f32) = match voice {
        Voice::Mallet | Voice::Pluck => (0.004, 0.02),
        Voice::Drop => (0.003, 0.03),
        Voice::Glass => (0.005, 0.04),
        Voice::Reed => (0.03, 0.04),
        Voice::Drone => (0.08, 0.08),
        Voice::Bell => (0.006, 0.12),
    };
    (attack.min(seconds * 0.4), release.min(seconds * 0.4))
}

fn envelope(voice: Voice, t: f32, seconds: f32) -> f32 {
    let (attack, release) = attack_release(voice, seconds);
    let at = if attack > 0.0 {
        (t / attack).min(1.0)
    } else {
        1.0
    };
    let rt = if release > 0.0 {
        ((seconds - t) / release).clamp(0.0, 1.0)
    } else {
        1.0
    };
    let decay = (-voice_decay(voice) * t.max(0.0)).exp();
    at * rt * decay
}

fn scale_to_peak(out: &mut [f32], target: f32) {
    let raw = out.iter().map(|s| s.abs()).fold(0.0f32, f32::max);
    // Normalize to the ceiling instead of only attenuating loud renders:
    // every tune and recipe must land on its bus ceiling, or the desktop
    // and browser layers disagree on loudness for the same score data.
    let gain = if raw > 1e-6 { target / raw } else { 0.0 };
    for sample in out.iter_mut() {
        *sample = (*sample * gain).clamp(-target, target);
    }
}

fn add_tone(out: &mut [f32], start: usize, tone: Tone, pitch: f32, seconds: f32) {
    let n = ((tone.ms as f32 / 1000.0) * RATE as f32).round().max(1.0) as usize;
    if start >= out.len() {
        return;
    }
    let n = n.min(out.len() - start);
    let from = (tone.from_hz * pitch).max(20.0);
    let to = (tone.to_hz * pitch).max(20.0);
    let mut phase = 0.0f32;
    for i in 0..n {
        let t = i as f32 / RATE as f32;
        let frac = i as f32 / n as f32;
        let hz = from + (to - from) * frac;
        phase += hz / RATE as f32;
        let env = envelope(tone.voice, t, seconds);
        out[start + i] += voice_sample(tone.voice, phase) * env * tone.gain;
    }
}

/// Render one layered [`Sfx`] recipe to mono PCM with no variation.
pub fn render_sfx(sfx: Sfx) -> Vec<f32> {
    render_sfx_with(sfx, 0)
}

/// Render one [`Sfx`] recipe with a deterministic variation step
/// (`-2..=2` for the crumb's slight pitch spread; 0 elsewhere).
pub fn render_sfx_with(sfx: Sfx, variation_step: i32) -> Vec<f32> {
    let total_ms = sfx.ms().max(1);
    let n = ((total_ms as f32 / 1000.0) * RATE as f32).round().max(1.0) as usize;
    let mut out = vec![0.0f32; n];
    let pitch = sfx.pitch * (1.0 + sfx.variation * variation_step as f32);
    for tone in sfx.tones {
        let start = ((tone.delay_ms as f32 / 1000.0) * RATE as f32).round() as usize;
        let seconds = tone.ms as f32 / 1000.0;
        add_tone(&mut out, start, *tone, pitch, seconds);
    }
    scale_to_peak(&mut out, SFX_PEAK);
    if let Some(first) = out.first_mut() {
        *first = 0.0;
    }
    if let Some(last) = out.last_mut() {
        *last = 0.0;
    }
    out
}

/// Render a [`Tune`] to mono PCM: every track sequences independently,
/// every note uses its shared voice and velocity, swung eighths follow
/// [`presentation_beats`], and short edge fades keep loop seams click-free.
pub fn render_tune(tune: Tune) -> Vec<f32> {
    let beat_sec = 60.0 / TEMPO;
    let total_secs = tune_beats(&tune) * beat_sec;
    let total = ((total_secs * RATE as f32).round().max(1.0)) as usize;
    let mut out = vec![0.0f32; total];
    let mut cursors = [0.0f32; 4];
    for (index, note) in tune.notes.iter().enumerate() {
        let track = (note.track as usize).min(cursors.len() - 1);
        let start_beat = cursors[track];
        let dur_beats = presentation_beats(&tune, index);
        cursors[track] += dur_beats;
        if note.is_rest() || note.velocity <= 0.0 {
            continue;
        }
        let start = ((start_beat * beat_sec * RATE as f32).round() as usize).min(total);
        let secs = dur_beats * beat_sec;
        let n = ((secs * RATE as f32).round().max(1.0) as usize).min(total - start);
        if n == 0 {
            continue;
        }
        let hz = midi_hz(note.midi);
        let edge = ((EDGE_SECS * RATE as f32) as usize)
            .max(1)
            .min(n / 2)
            .max(1);
        let mut phase = 0.0f32;
        for i in 0..n {
            let t = i as f32 / RATE as f32;
            phase += hz / RATE as f32;
            let attack = (i as f32 / edge as f32).min(1.0);
            let release = ((n - i) as f32 / edge as f32).min(1.0);
            let env = envelope(note.voice, t, secs);
            let sample = voice_sample(note.voice, phase) * env * attack * release;
            out[start + i] += sample * note.velocity;
        }
    }
    scale_to_peak(&mut out, MUSIC_PEAK);
    // Loop-seam fade for `looped` tunes (one-shots keep full tails).
    if tune.looped && out.len() > 2 {
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
    stings: Sink,
    master: f32,
    music_level: f32,
    sfx_level: f32,
    muted: bool,
    tune: TuneId,
    sfx_gain: f32,
    music_gain: f32,
    play_seq: u64,
}

impl RodioSink {
    /// Open the default output device with three sinks (SFX + loop +
    /// stings). `Err(NoAudio)` on headless/voiceless machines: never panics.
    pub fn open() -> Result<Self, NoAudio> {
        let (stream, handle) = OutputStream::try_default().map_err(|_| NoAudio)?;
        let sfx = Sink::try_new(&handle).map_err(|_| NoAudio)?;
        let music = Sink::try_new(&handle).map_err(|_| NoAudio)?;
        let stings = Sink::try_new(&handle).map_err(|_| NoAudio)?;
        let mut sink = Self {
            _stream: stream,
            handle,
            sfx,
            music,
            stings,
            master: 1.0,
            music_level: 1.0,
            sfx_level: 1.0,
            muted: false,
            tune: TuneId::None,
            sfx_gain: 1.0,
            music_gain: 1.0,
            play_seq: 0,
        };
        sink.apply_gains_now();
        Ok(sink)
    }

    /// Currently selected music slot.
    pub fn tune(&self) -> TuneId {
        self.tune
    }

    fn target_sfx(&self) -> f32 {
        if self.muted {
            0.0
        } else {
            self.master * self.sfx_level
        }
    }

    fn target_music(&self) -> f32 {
        if self.muted {
            0.0
        } else {
            self.master * self.music_level
        }
    }

    fn apply_gains_now(&mut self) {
        self.sfx_gain = self.target_sfx();
        self.music_gain = self.target_music();
        self.sfx.set_volume(self.sfx_gain);
        self.music.set_volume(self.music_gain);
        self.stings.set_volume(self.music_gain);
    }

    fn apply_gains(&mut self) {
        self.sfx.set_volume(self.sfx_gain);
        self.music.set_volume(self.music_gain);
        self.stings.set_volume(self.music_gain);
    }

    fn push_sfx(&self, samples: Vec<f32>) {
        if samples.is_empty() {
            return;
        }
        let src = SamplesBuffer::new(1, RATE, samples);
        self.sfx.append(src);
        self.sfx.play();
    }

    fn push_sting(&self, samples: Vec<f32>) {
        if samples.is_empty() {
            return;
        }
        let src = SamplesBuffer::new(1, RATE, samples);
        self.stings.append(src);
        self.stings.play();
    }
}

fn clamp01(v: f32) -> f32 {
    if v.is_nan() {
        0.0
    } else {
        v.clamp(0.0, 1.0)
    }
}

fn approach(current: f32, target: f32, step: f32) -> f32 {
    if (target - current).abs() <= step {
        target
    } else if target > current {
        current + step
    } else {
        current - step
    }
}

/// One fade step for the live volume glides (shared with the startup test).
pub(crate) fn fade_gain(current: f32, target: f32, dt: f32) -> f32 {
    if !dt.is_finite() || dt <= 0.0 {
        return current;
    }
    approach(current, target, dt / FADE_SECS)
}

impl Audio for RodioSink {
    fn play(&mut self, cue: Cue) {
        self.play_seq = self.play_seq.wrapping_add(1);
        if let Some(sfx) = sfx_for_cue(cue) {
            let step = if sfx.variation > 0.0 {
                (self.play_seq % 5) as i32 - 2
            } else {
                0
            };
            self.push_sfx(render_sfx_with(sfx, step));
        } else if let Some(sting) = sting_for_cue(cue) {
            // One-shot tunes ride the music bus on their own sink so they
            // overlap the loop and still follow the music volume.
            self.push_sting(render_tune(sting));
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
                        self.music.set_volume(self.music_gain);
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
    }
    fn set_music(&mut self, v: f32) {
        self.music_level = clamp01(v);
    }
    fn set_sfx(&mut self, v: f32) {
        self.sfx_level = clamp01(v);
    }
    fn set_muted(&mut self, m: bool) {
        self.muted = m;
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

    fn tick(&mut self, dt: f32) {
        if !dt.is_finite() || dt <= 0.0 {
            return;
        }
        self.sfx_gain = fade_gain(self.sfx_gain, self.target_sfx(), dt);
        self.music_gain = fade_gain(self.music_gain, self.target_music(), dt);
        self.apply_gains();
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
    use maze_chase_audio::score::{
        track_count, ALL_CUES, DEFAULT_MASTER, DEFAULT_MUSIC, DEFAULT_SFX, SFX_CRUMB,
        SFX_EXTRA_LIFE, TITLE_LOOP,
    };
    use maze_chase_audio::sink::FADE_SECS;

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
            let expect = ((sfx.ms() as f32 / 1000.0) * RATE as f32).round() as usize;
            assert_eq!(pcm.len(), expect);
            assert!(pcm.iter().all(|&s| (-1.0..=1.0).contains(&s)));
            assert_eq!(pcm[0], 0.0);
            assert_eq!(pcm[pcm.len() - 1], 0.0);
            let peak: f32 = pcm.iter().map(|s| s.abs()).fold(0.0, f32::max);
            assert!(peak > 0.05, "SFX renders near-silent");
        }
    }

    #[test]
    fn layered_sfx_contains_every_voice_layer() {
        let pcm = render_sfx(SFX_EXTRA_LIFE);
        assert!(SFX_EXTRA_LIFE.tones.len() >= 2);
        let expect = ((SFX_EXTRA_LIFE.ms() as f32 / 1000.0) * RATE as f32).round() as usize;
        assert_eq!(pcm.len(), expect);
        // A layered recipe is longer than its first tone alone.
        assert!(SFX_EXTRA_LIFE.ms() > SFX_EXTRA_LIFE.tones[0].ms);
    }

    #[test]
    fn sfx_render_is_deterministic_per_recipe_and_varies_on_request() {
        assert_eq!(render_sfx(SFX_CRUMB), render_sfx(SFX_CRUMB));
        assert_ne!(render_sfx(SFX_CRUMB), render_sfx(SFX_EXTRA_LIFE));
        assert_ne!(
            render_sfx_with(SFX_CRUMB, -2),
            render_sfx_with(SFX_CRUMB, 2),
            "crumb pitch variation is audible in the samples"
        );
        assert_eq!(render_sfx_with(SFX_CRUMB, 0), render_sfx(SFX_CRUMB));
        assert_eq!(
            render_sfx_with(SFX_EXTRA_LIFE, 2),
            render_sfx(SFX_EXTRA_LIFE)
        );
    }

    #[test]
    fn tune_render_matches_note_lengths_and_loops_cleanly() {
        let pcm = render_tune(TITLE_LOOP);
        let expect = (tune_beats(&TITLE_LOOP) * (60.0 / TEMPO) * RATE as f32).round() as usize;
        assert!((pcm.len() as i64 - expect as i64).abs() <= TITLE_LOOP.notes.len() as i64);
        assert!(pcm.iter().all(|&s| (-1.0..=1.0).contains(&s)));
        assert_eq!(pcm[0], 0.0);
        let peak: f32 = pcm.iter().map(|s| s.abs()).fold(0.0, f32::max);
        assert!(peak > 0.1);
        assert!(
            track_count(&TITLE_LOOP) >= 2,
            "title renders multiple tracks"
        );
    }

    #[test]
    fn offline_pcm_levels_are_bounded_and_the_default_mix_keeps_headroom() {
        let peak = |pcm: &[f32]| pcm.iter().map(|s| s.abs()).fold(0.0f32, f32::max);
        let rms =
            |pcm: &[f32]| (pcm.iter().map(|s| s * s).sum::<f32>() / pcm.len().max(1) as f32).sqrt();
        let mut music_peak = 0.0f32;
        let mut music_rms = 0.0f32;
        for tune in ALL_TUNES {
            let pcm = render_tune(*tune);
            assert!(pcm.iter().all(|s| s.is_finite()), "{} is finite", tune.name);
            let tune_peak = peak(&pcm);
            assert!(tune_peak <= MUSIC_PEAK + 1e-4, "{} clips", tune.name);
            assert!(
                (tune_peak - MUSIC_PEAK).abs() <= 1e-3,
                "{} must normalize to the music ceiling, got {tune_peak}",
                tune.name
            );
            assert!(rms(&pcm) > 0.001, "{} renders near-silent", tune.name);
            if tune.looped {
                music_peak = music_peak.max(tune_peak);
                music_rms = music_rms.max(rms(&pcm));
            }
        }
        let mut sfx_peak = 0.0f32;
        for cue in ALL_CUES {
            let Some(sfx) = sfx_for_cue(*cue) else {
                continue;
            };
            let pcm = render_sfx_with(sfx, 0);
            assert!(pcm.iter().all(|s| s.is_finite()), "{cue:?} is finite");
            let cue_peak = peak(&pcm);
            assert!(cue_peak <= SFX_PEAK + 1e-4, "{cue:?} clips");
            assert!(
                (cue_peak - SFX_PEAK).abs() <= 1e-3,
                "{cue:?} must normalize to the SFX ceiling, got {cue_peak}"
            );
            assert!(rms(&pcm) > 0.001, "{cue:?} renders near-silent");
            sfx_peak = sfx_peak.max(cue_peak);
        }
        let mixed_music_peak = music_peak * DEFAULT_MASTER * DEFAULT_MUSIC;
        let mixed_sfx_peak = sfx_peak * DEFAULT_MASTER * DEFAULT_SFX;
        assert!(mixed_music_peak < 0.2, "default music keeps headroom");
        assert!(mixed_sfx_peak < 0.35, "default SFX keeps headroom");
        println!(
            "offline pcm: music peak {:.3} rms {:.3}; defaults {:.3}; sfx peak {:.3}; default {:.3}",
            music_peak, music_rms, mixed_music_peak, sfx_peak, mixed_sfx_peak
        );
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
    fn fade_math_reaches_target_within_the_fade_window() {
        assert_eq!(approach(0.0, 1.0, 0.25), 0.25);
        assert_eq!(approach(1.0, 0.0, 0.25), 0.75);
        assert_eq!(approach(0.9, 1.0, 0.25), 1.0);
        assert_eq!(approach(0.1, 0.0, 0.25), 0.0);
        const { assert!(FADE_SECS > 0.0) };
    }

    #[test]
    fn open_or_null_never_panics_and_honors_volumes() {
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
        audio.tick(0.2);
        audio.start_music(TuneId::None);
        audio.stop_music();
        println!("desktop audio live: {live}");
    }
}
