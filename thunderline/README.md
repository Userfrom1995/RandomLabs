# Thunderline

An original rock-and-roll song, composed, arranged, and produced entirely by
deterministic in-repo synthesis. Original title, original lyrics, original
melody, original E-major 12-bar arrangement. No samples, no covers, no artist
likeness: every audible byte traces back to the machine-readable lead sheet
in `score/song.json`.

- **The song:** a 160 BPM E-major rocker, 104 bars, 156 seconds. Intro,
  three 12-bar verses, two choruses, a lead-guitar break, a lifted final
  chorus, and an outro tag. The hook is the title line: *"Ridin' on the
  thunderline."*
- **Score as source of truth:** `score/song.json` carries the tempo map,
  key and meter, per-bar chord grid, vocal melody and lead-guitar phrases as
  explicit MIDI pitches with beat timings, full original lyrics bound to
  phrases, the bar-by-bar arrangement map, and the master seed. The lyric
  timing (`dist/lyrics.json`), the Standard MIDI File (`dist/song.mid`), and
  the printable lead sheet (`dist/sheet.html`) are all derived from that one
  source by `tools/export_score.py`, never hand-edited, so words, notes, and
  chords cannot drift apart.
- **Mix constants:** `score/mix.json` pins the sample rate, per-bus gains and
  EQ, and the limiter ceiling the render engine will honor.
- **Originality guard:** `score/blocklist.txt` lists famous rock lyric
  fragments; the test suite fails if any lyric line reuses one.

## Listen

Open `thunderline/index.html` (served over HTTP, e.g.
`python3 -m http.server` from the repo root, then
`/thunderline/index.html`): a dependency-free player mixes the four
committed stem previews live through one WebAudio clock, so mute and
solo stay sample-accurate. Lyrics highlight in sync (select any line to
seek), the overview canvas is drawn from the decoded master peaks
(select to seek), and the arrangement map plus downloads (preview
master, score JSON/MIDI, lead sheet, lyric timings) ship beside it.
The committed audio under `player/audio/` is preview quality
(22.05 kHz mono); `player/audio/preview.json` pins the SHA-256 of the
full-rate `dist/` sources it was downsampled from. Missing data shows
an honest empty card with build instructions; undecodable audio fails
closed to a named error card (or to the preview master with the stem
toggles disabled when only the master survives). The page is usable at
390 px, keyboard operable with visible focus, and carries a
`?selftest=1` in-page suite (17 checks) that headless Chromium runs in
`tests/test_player.py`.

## Reproduce

```bash
bash thunderline/repro.sh
```

That one command exports the score, renders the master plus stems,
re-renders to a temp dir and asserts bit identity, runs the 12-check
audit (`python3 thunderline/tools/audit.py --dist thunderline/dist`),
and runs the full test suite. Individual steps:

```bash
python3 thunderline/tools/export_score.py
python3 thunderline/tools/render.py --out thunderline/dist
python3 thunderline/tools/export_preview.py
python3 thunderline/tools/audit.py --dist thunderline/dist
python3 -m unittest thunderline.tests.test_score thunderline.tests.test_render thunderline.tests.test_audit thunderline.tests.test_tester_phase1 thunderline.tests.test_tester_phase2 thunderline.tests.test_player
```

The audit is a pure function of the rendered tree: it re-derives lyric
timings from the score, proves the shipped stems sum through the
documented limiter back to the shipped master (stem-null check against
`stemNullToleranceRms`), verifies manifest hashes, and scans lyrics
against the blocklist. No wall clock, no network, no randomness.

The exporter is standard library only and deterministic: two consecutive
exports produce byte-identical `song.mid`, `sheet.html`, and `lyrics.json`.
The renderer is likewise standard library only (WAV headers are
hand-written fixed bytes with no timestamps; every noise source draws from a seeded stream):
two consecutive renders produce bit-identical `master.wav`, all four stems,
and the preview, verified by hash test. Without `ffmpeg` on PATH the preview
is a deterministic 22.05 kHz downsample (`preview.wav`); with `ffmpeg` the
pipeline writes `preview.ogg` instead. Rendered audio under `dist/` is
gitignored build output; stems are post-gain/EQ, pre-limiter buses, and the
master is their sum through the documented soft-knee limiter normalized to
the mix ceiling.

## License

Original work, lab-owned. Words, melody, chords, and arrangement were authored
in-repo for this project.
