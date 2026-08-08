# Arpeggio

A Markov-chain melody composer that renders original tunes to WAV from the
terminal — a small, dependency-free Python CLI.

## What Was Built

A single-file Python CLI (`arpeggio/arpeggio.py`) that composes original music
and synthesizes it into a mono 16-bit PCM WAV, using nothing but the Python
standard library (`argparse`, `math`, `random`, `wave`, `array`):

- **Markov-chain harmony** — a weighted Markov chain over classic chord
  progressions (I-V-vi-IV, ii-V-I, I-vi-IV-V, and more) picks a fresh chord
  for every bar. The transition table is derived by counting the chord
  transitions inside each progression, weighted by that progression's
  frequency, so the output stays tonal while never repeating itself verbatim.
- **Chord-bound arpeggios** — each bar is arpeggiated from its own diatonic
  triad, so every note belongs to the current harmony. Several arpeggio
  patterns (root-3rd-5th-3rd, full ascending, descending, ...) tile across a
  configurable `--notes-per-bar` grid; pattern index 3 is the root an octave
  up so lines can span two octaves.
- **Digital synthesis** — each note is a sine or triangle oscillator shaped by
  a fast attack and an exponential decay (with a final fade to kill clicks).
  `--harmonic` adds a quieter octave-up partial for warmth. Notes are summed
  into a mono mix, normalized to a safe peak, and written as 16-bit WAV at
  44.1 kHz.
- **Reproducibility** — every random draw flows through a single
  `random.Random` seeded by `--seed`; identical inputs produce byte-identical
  WAV files. Without `--seed`, the chosen seed is printed to stderr so any
  track can be replayed exactly.
- **Bounded output** — `--duration SEC` truncates the piece to whole bars that
  fit within the cap, and an internal limit prevents runaway file sizes.

## Why

The repo's previous terminal build (Automatarium) covered visual animation;
Arpeggio covers the audio domain with the same "complexity from simple rules"
spirit but an entirely different algorithm set: Markov chains + digital
synthesis instead of cellular automata. It is intentionally tiny enough for
one session and, being a generator of music rather than a player, produces a
real artifact (a `.wav` file) with zero external dependencies or assets.

## How It Works

- **Theory layer**: the key's scale provides diatonic triads by stacking every
  other scale tone (`chord()` in `arpeggio.py`); note names, pitch classes,
  and frequencies are pure stdlib math (`note_frequency` uses
  `440 * 2 ** ((midi - 69) / 12)`).
- **Composition**: `build_transitions()` folds the hardcoded progression table
  into `(start, trans)` weight dicts; `compose_progression()` walks the chain
  and guarantees no dead-ends by resolving any reachable chord without
  outgoing edges to the tonic.
- **Arrangement**: `compose_piece()` maps each degree to a chord, picks an
  arpeggio pattern per bar, and tiles it across the note grid.
- **Rendering**: `render_note()` synthesizes one note with an envelope;
  `synthesize()` mixes all notes into one float buffer; `write_wav()`
  normalizes to a safe peak and writes the file via the `wave` module.
- **CLI**: argparse with strict validation for every option (note names,
  scales, bpm, bars, grid density, wave shape, duration), help epilog with
  examples, and `--preview` printing each chord as it is composed.

## Key Files

- `arpeggio/arpeggio.py` — the entire CLI: theory, Markov composition,
  arpeggio arrangement, synthesis, and WAV output.
- `arpeggio/__main__.py` + `arpeggio/__init__.py` — package entry points for
  `python3 -m arpeggio`.
- `arpeggio/README.md` — tool-specific usage guide and option reference.
- `arpeggio/tests/test_arpeggio.py` — 45 stdlib-`unittest` tests.
- `docs/index.md` + `docs/index.html` — documentation site (served on GitHub
  Pages under `/docs/`).

## Notes

- The progression and arpeggio tables are plain data, so extending the musical
  vocabulary is a one-line change per entry.
- Chord spellings in the preview follow sharp names (e.g. `C#`, `G#`); flats
  are accepted as input keys.
- All 45 tests pass: note parsing and frequency math, triad construction,
  Markov-chain validity and reproducibility, synthesis waveform/envelope
  behavior, WAV header correctness, and CLI error handling.
- Verified end-to-end: a `--seed 42` run produces a valid mono 44.1 kHz 16-bit
  WAV, and re-running with the same seed reproduces the file byte-for-byte.
