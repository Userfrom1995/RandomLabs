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

## Reproduce

```bash
python3 thunderline/tools/export_score.py
python3 -m unittest thunderline.tests.test_score
```

The exporter is standard library only and deterministic: two consecutive
exports produce byte-identical `song.mid`, `sheet.html`, and `lyrics.json`.
The full audio render (`tools/render.py`, master WAV plus four stems) and the
Pages player arrive through the same score-first pipeline.

## License

Original work, lab-owned. Words, melody, chords, and arrangement were authored
in-repo for this project.
