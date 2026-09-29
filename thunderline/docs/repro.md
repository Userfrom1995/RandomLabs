# Reproduction

Any checkout rebuilds bit-identical audio with pinned tooling (Python 3
standard library only, plus `ffmpeg` when present for the compressed
preview). No network, no wall clock, no unseeded randomness.

## One command

```bash
bash thunderline/repro.sh
```

That single script, in order:

1. **Score export** (`tools/export_score.py`): derives `song.mid`,
   `sheet.html`, and `lyrics.json` from `score/song.json`. Two consecutive
   exports are byte-identical.
2. **Render** (`tools/render.py --out thunderline/dist`): synthesizes
   `master.wav` (44.1 kHz 16-bit mono, 156.0 s) plus the four stems and a
   preview (`preview.ogg` via `ffmpeg` when on PATH, else a deterministic
   22.05 kHz `preview.wav` fallback), and writes `manifest.json` with the
   generator string, score/mix hashes, seed, and per-file hashes.
3. **Player preview export** (`tools/export_preview.py`): derives the
   committed `player/audio/` tree the Pages player serves, and records the
   full-rate source hashes in `preview.json`.
4. **Determinism double-render**: renders again to a temp dir and asserts
   bit identity for the master, every stem, and the preview.
5. **Audit gate** (`tools/audit.py --dist thunderline/dist`): 12 checks over
   the rendered tree. Score loads (104 bars, 156.0 s); all artifacts
   present; fixed WAV headers at 44100 Hz; duration inside the 150-210 s
   gate; master peak at or below the 0.89 ceiling with no clipped samples
   and no DC offset; every stem audible; stem-null reconstruction within
   tolerance; manifest hashes match; all 40 lyric lines timed, in order,
   inside track bounds, and sung; lyric blocklist scan clean; final-chorus
   energy above verse energy; MIDI and sheet artifacts valid.
6. **Test suite**: the full `thunderline/tests/` battery (score schema and
   determinism, render gate, audit sabotage gate, tester regression pins,
   headless player runs).

Exit 0 means the whole pipeline reproduces cleanly; anything else fails
with a named mismatch.

## Individual steps

```bash
python3 thunderline/tools/export_score.py
python3 thunderline/tools/render.py --out thunderline/dist
python3 thunderline/tools/export_preview.py
python3 thunderline/tools/audit.py --dist thunderline/dist
python3 -m unittest discover -s thunderline/tests -t .
```

## Notes

- Rendered audio under `dist/` is gitignored build output; it is rebuilt,
  never committed. The committed audio under `player/audio/` is the
  deterministic preview derivation the site plays.
- `manifest.json` is regenerated on every render; the gate compares its
  recorded hashes against the files on disk, so a hand-placed binary fails
  loudly instead of passing quietly.
