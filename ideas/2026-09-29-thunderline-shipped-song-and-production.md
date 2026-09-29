# Thunderline: shipped song and reproducible production

Thunderline is DONE as a product: one original 156-second E-major
rock-and-roll song at `/thunderline/`, composed, performed, mixed, and
mastered entirely by deterministic in-repo synthesis, with a Pages player,
a behind-the-scenes docs surface, and a one-command bit-identical rebuild.

## What shipped

- **The song.** "Ridin' on the thunderline": a night drive that ends at
  sunrise. 104 bars at 160 BPM (intro, three 12-bar verses, two 12-bar
  choruses, lead break, 16-bar lifted final chorus, sung outro tag) over
  the public-domain 12-bar E7-A7-B7 core. All 40 lyric lines, the
  pentatonic-plus-blue-note vocal melody, the riff/solo/tag lead phrases,
  and the bar-by-bar arrangement map are authored in `score/song.json`.
- **The render.** `tools/render.py` (stdlib only, seeded per-voice streams,
  fixed WAV headers) synthesizes the 44.1 kHz master, four stems, and a
  preview from the score. Per-bus EQ plus soft-knee limiter at the 0.89
  ceiling live in `score/mix.json`; short pre-limiter edge fades (20 ms in,
  250 ms out) open and close the track at zero so it never clicks.
- **The proof.** `tools/audit.py` (12 checks: artifacts, format, duration,
  levels, stem audibility, stem-null reconstruction at 0.0014 vs 0.02
  tolerance, manifest provenance, lyric coverage, blocklist IP scan,
  final-chorus energy lift, score artifacts) plus `bash thunderline/repro.sh`
  (export, render, double-render bit identity, audit, full suite).
- **The player.** `thunderline/index.html` mixes the four committed stem
  previews through one WebAudio clock (play/pause/seek, mute/solo, volume),
  synced click-to-seek lyrics, peak overview canvas, arrangement map,
  downloads, master-only fallback, empty/loading/error cards, 390 px
  layout, and a `?selftest=1` in-page suite the headless gate runs.
- **The docs.** `thunderline/docs/` (story, chords/arrangement, mix,
  repro, license) plus a browsable hub, written as one unified product
  view with zero milestone markers, pinned by `tests/test_docs.py`.

## Why it works

Score as single source of truth, mix as code, and audit as a pure function
of the rendered tree. Nothing is hand-placed: words cannot drift from
notes (one export path), stems cannot drift from the master (null
contract), and the player cannot drift from the audio (timings derived
from the same score). The listen pass earned its keep twice: once when the
audit caught unsung outro lyrics, once when edge analysis caught the
start click.

## Key files

- `thunderline/score/song.json`, `score/mix.json`, `score/blocklist.txt`
- `thunderline/tools/render.py`, `audit.py`, `export_score.py`,
  `export_preview.py`
- `thunderline/index.html`, `player/player.js`, `player/player.css`,
  `player/audio/` (committed previews + provenance)
- `thunderline/docs/`, `thunderline/README.md`, `thunderline/repro.sh`
- `progress/481-thunderline.md` (phase epic log)
