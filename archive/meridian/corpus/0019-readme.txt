# Arpeggio

A small, dependency-free Python CLI that composes original music and renders
it straight to a WAV file. Nothing but the Python standard library
(`argparse`, `math`, `random`, `wave`, `array`) — no external packages, no
assets.

- **Markov-chain harmony** — a weighted Markov chain walks classic chord
  progressions (I-V-vi-IV, ii-V-I, and more), so every piece is fresh but
  always tonal.
- **Chord-bound melodies** — each bar is arpeggiated from its own chord, so
  every note belongs to the current harmony.
- **Digital synthesis** — sine or triangle oscillators with an attack-decay
  envelope and an optional octave-up harmonic, mixed to a mono 16-bit WAV.
- **Reproducible** — pass `--seed` to replay a tune exactly; without it the
  chosen seed is printed so any track can be regenerated.

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

Or run the single file directly:

```bash
python3 arpeggio/arpeggio.py --key Db --seed 7
```

## Options

| Option | Default | Description |
| --- | --- | --- |
| `--key KEY` | `C` | Root note of the key (any note name: `C`, `F#`, `Db`, `Bb`, …). |
| `--scale SCALE` | `major` | `major`, `minor`, or `pentatonic` (aliases like `maj`, `min`, `penta` work). |
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
| `--help` | | Print full help, including examples. |

## How it works

1. **Compose.** The key's scale provides seven (or five, for pentatonic)
   diatonic triads built by stacking every other scale tone. A weighted
   Markov chain is derived from a table of classic progressions — each
   progression contributes its chord transitions at its weight — and walked
   for `--bars` steps. Any chord that could be reached but has no outgoing
   transition resolves to the tonic, so the chain can never dead-end.
2. **Arpeggiate.** Each bar picks an arpeggio pattern (root-3rd-5th-3rd,
   full ascending, descending, and more) that tiles across the
   `--notes-per-bar` grid. Pattern index 3 is the root one octave up.
3. **Synthesize.** Every note is a sine or triangle oscillator shaped by a
   fast attack and an exponential decay (with a final fade to avoid clicks).
   The optional `--harmonic` adds a quieter octave-up partial. All notes are
   summed into a mono mix, normalized to a safe peak, and written as 16-bit
   PCM WAV at 44.1 kHz.

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

## Development

```bash
# Run the test suite (standard library only)
python3 -m unittest discover -s arpeggio/tests
```

The 45 tests cover note parsing and frequency math, diatonic triad
construction, Markov-chain validity and reproducibility, synthesis waveform
and envelope behavior, WAV header correctness, and CLI error handling.

## Further reading

- [`docs/`](../docs/) — rendered documentation site (also served on GitHub
  Pages under `/docs/`).
- [`ideas/2026-08-08-arpeggio-markov-melody-composer.md`](../ideas/2026-08-08-arpeggio-markov-melody-composer.md)
  — the writeup for this build.
