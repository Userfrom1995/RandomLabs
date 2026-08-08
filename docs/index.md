# Arpeggio — Markov-Chain Melody Composer

**Arpeggio** is a small, dependency-free Python CLI that composes original
music and renders it straight to a WAV file. It runs on nothing but the
Python standard library — no external packages, no assets.

- A **weighted Markov chain** walks classic chord progressions so every piece
  is fresh but always tonal.
- Every bar is **arpeggiated from its own chord**, so each note belongs to
  the current harmony.
- Notes are synthesized with **sine/triangle oscillators**, an attack-decay
  envelope, and an optional octave-up harmonic, then mixed to a mono 16-bit
  WAV.

```text
$ python3 -m arpeggio --key F --scale minor --bpm 90 --preview
bar 1/8  F   (i    )   [F G# C]
bar 2/8  C#  (VI   )   [C# F G#]
...
arpeggio: wrote 'arpeggio.wav': key=F, scale=minor, 8 bars, 64 notes, 21.3s
```

---

## Requirements

- Python 3.8 or newer.
- Nothing else — no external packages, no audio assets, no network.

## Quick start

```bash
# Compose an 8-bar tune in C major and write arpeggio.wav
python3 -m arpeggio

# A slower, darker tune in F minor, preview the progression
python3 -m arpeggio --key F --scale minor --bpm 90 --preview

# A longer piece with a named output
python3 -m arpeggio --bars 16 --seed 42 --output my_tune.wav

# Warmer sound with a triangle wave and a harmonic, capped at 30s
python3 -m arpeggio --wave triangle --harmonic --duration 30
```

The single file can also be run directly:

```bash
python3 arpeggio/arpeggio.py --key Db --seed 7
```

`python3 -m arpeggio --help` prints the full option reference with examples.

## Configuration options

| Option | Default | Description |
| --- | --- | --- |
| `--key KEY` | `C` | Root note of the key: `C`, `F#`, `Db`, `Bb`, any note name. |
| `--scale SCALE` | `major` | `major`, `minor`, or `pentatonic` (aliases: `maj`, `min`, `penta`). |
| `--bpm N` | `120` | Tempo in beats per minute (1–400). |
| `--bars N` | `8` | Number of 4/4 measures (1–128). |
| `--notes-per-bar N` | `8` | Arpeggio grid density per bar (1–64); patterns tile to fill the slots. |
| `--wave WAVE` | `sine` | Oscillator shape: `sine` or `triangle`. |
| `--harmonic` | off | Add an octave-up harmonic at lower amplitude for warmth. |
| `--seed N` | *random* | Reproducible randomness; the chosen seed is printed to stderr when random. |
| `--duration SEC` | *none* | Cap output at `SEC` seconds (0–300); the piece is truncated to whole bars. |
| `--preview` | off | Print each chord of the progression as it is composed. |
| `--output FILE`, `-o` | `arpeggio.wav` | Output WAV file path. |
| `--version` | | Print the version and exit. |

### Examples

```bash
# A gentle 12-bar tune in G major at 100 bpm
python3 -m arpeggio --key G --bpm 100 --bars 12

# A haunting A minor piece with a dense 16th-note grid
python3 -m arpeggio --key A --scale minor --notes-per-bar 16 --harmonic

# A bright C pentatonic tune with a triangle wave
python3 -m arpeggio --key C --scale pentatonic --wave triangle --bars 16

# A bounded render for a podcast sting (whole bars only, <= 10s)
python3 -m arpeggio --duration 10 --seed 2024 --output sting.wav
```

## How it works

### 1. Compose

The key's scale provides diatonic triads built by stacking every other scale
tone. A weighted Markov chain is derived from a table of classic progressions
(I-V-vi-IV, ii-V-I, I-vi-IV-V, and more) — each progression contributes its
chord transitions at its weight. The chain is walked for `--bars` steps, and
any chord that could be reached but has no outgoing transition resolves to
the tonic, so the chain never dead-ends.

### 2. Arpeggiate

Each bar picks an arpeggio pattern (root-3rd-5th-3rd, full ascending,
descending, and more) that tiles across the `--notes-per-bar` grid. Pattern
index 3 is the root one octave up, letting ascending patterns span two
octaves.

### 3. Synthesize

Every note is a sine or triangle oscillator shaped by a fast attack and an
exponential decay (with a final fade to avoid clicks). The optional
`--harmonic` adds a quieter octave-up partial. All notes are summed into a
mono mix, normalized to a safe peak, and written as 16-bit PCM WAV at
44.1 kHz.

## Reproducibility

All randomness flows through a single `random.Random` seeded by `--seed`. The
same seed, key, scale, and parameters always produce byte-identical WAV
files:

```bash
python3 -m arpeggio --seed 42 --output one.wav
python3 -m arpeggio --seed 42 --output two.wav
cmp one.wav two.wav   # identical
```

When no seed is given, the one actually used is printed to stderr, e.g.
`arpeggio: seed = 1234567890 (pass --seed 1234567890 to replay)`.

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Success. |
| `1` | Could not write the output file. |
| `2` | Invalid command-line arguments (argparse). |

## Project layout

```text
arpeggio/
  arpeggio.py         # the whole CLI — composition, synthesis, WAV output
  __main__.py         # enables `python -m arpeggio`
  __init__.py         # package marker
  README.md           # tool-specific usage guide
  tests/
    test_arpeggio.py
docs/
  index.md            # this page (source)
  index.html          # rendered documentation page
ideas/
  2026-08-08-arpeggio-markov-melody-composer.md
```

## Development

```bash
python3 -m unittest discover -s arpeggio/tests
```

The 45 tests cover note parsing and frequency math, diatonic triad
construction, Markov-chain validity and reproducibility, synthesis waveform
and envelope behavior, WAV header correctness, and CLI error handling.

## Design notes

- **Single file, zero dependencies** — the whole CLI is one Python module
  using only `argparse`, `math`, `random`, `wave`, `array`, and `typing`.
- **Data-driven harmony** — progressions and arpeggio patterns are plain
  tables, so extending the musical vocabulary is a one-line change.
- **Determinism** — every random draw goes through a single seeded
  `random.Random`, so a given seed always reproduces the exact same file.
- **Bounded output** — `--duration` and an internal cap keep generated files
  small and predictable.

## License

MIT — see [LICENSE](../LICENSE) in the repository root.
