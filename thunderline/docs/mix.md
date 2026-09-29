# Mix notes

The mix is code: every constant lives in `score/mix.json`, every process
runs in `tools/render.py` (Python standard library only), and the master is
the sum of the four stem buses through the documented chain. There is no
DAW session and no hand riding; re-rendering the same score with the same
script produces bit-identical audio.

## Buses

Four buses, each with a gain, a highpass, and a presence lift:

- **Vocals** (gain 0.9, highpass 120 Hz, +2.0 dB at 2500 Hz): a
  band-limited sawtooth stack through two time-varying formant resonators
  that articulate lyric vowels per syllable. A synthesized voice, honestly
  labeled, not a human impersonation.
- **Guitars** (gain 0.7, highpass 90 Hz, +1.5 dB at 3200 Hz): sawtooth
  power-chord 8th chops with palm-mute patterning, plus the vibrato lead
  (riff on the intro, solo over the lead break, tag doubling on the outro).
- **Bass** (gain 0.8, highpass 40 Hz, +0.5 dB at 800 Hz): triangle/saw
  walking line built from the chord roots with a pluck envelope.
- **Drums** (gain 0.85, highpass 50 Hz, +1.0 dB at 5000 Hz): kick (sine
  pitch drop), snare (tone plus seeded noise burst), hats (seeded
  highpassed noise ticks) on backbeat, breakdown, and half-time patterns.

All noise comes from `random.Random("<masterSeed>:<voice>")` streams, so
event order never affects stream state.

## Master chain

The four buses sum into a soft-knee limiter (threshold 0.89) and normalize
to the 0.89 ceiling. WAV headers are hand-written fixed bytes with no
timestamps. Measured on the shipped render: peak 0.890, zero clipped
samples, zero DC offset, final-chorus RMS 0.211 against verse RMS near
0.17 (the arranged 1.15 dynamics lift, confirmed in audio).

## Edge fades

The track opens and closes with short linear ramps (20 ms in, 250 ms out,
pinned in `score/mix.json` as `fadeInSec` / `fadeOutSec`), applied to every
stem bus *before* the limiter. An early render started mid-waveform and
clicked on play; the fades fix that while keeping the stem-null contract
exact, because the audit re-sums the shipped (already faded) stems through
the same limiter.

## Stem-null contract

Stems are post-gain/EQ, pre-limiter buses. Summing the shipped stems
through the documented limiter reproduces the shipped master; the audit
measures this reconstruction error and requires it under 0.02 RMS (shipped
render measures 0.0014). Soloing stems in the Pages player therefore mixes
exactly what mastering heard, minus only the limiter stage.

## Preview quality

The Pages player serves committed 22.05 kHz mono previews derived
deterministically from `dist/` by `tools/export_preview.py` (16-bit master,
8-bit stems), with `preview.json` pinning the SHA-256 of the full-rate
sources. Full-rate `dist/` audio stays local build output; the previews are
what the site plays.
